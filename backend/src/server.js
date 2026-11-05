import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { q, pool, initDb } from './db.js';
import { categories, brand } from './menu.js';
import { initPush, getPublicKey, cleanSub, notifyAdmins, notifyCustomer, statusPayload } from './push.js';

const app = express();
const PORT = process.env.PORT || 4000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'avazbek123';
const DELIVERY_FEE = brand.deliveryFee;
const STATUSES = ['new', 'cooking', 'delivering', 'done', 'cancelled'];
const LANGS = ['uz', 'ru', 'en'];

app.use(cors());

// Express 4 async xatolarni o'zi ushlamaydi — shu o'rama ushlaydi
const ah = (fn) => (req, res, next) => fn(req, res, next).catch(next);

function adminOnly(req, res, next) {
  const given = Buffer.from(String(req.headers['x-admin-password'] || ''));
  const real = Buffer.from(ADMIN_PASSWORD);
  if (given.length !== real.length || !crypto.timingSafeEqual(given, real)) {
    return res.status(401).json({ code: 'bad_password', error: "Parol noto'g'ri" });
  }
  next();
}
const fail = (res, status, code, error) => res.status(status).json({ code, error });

// Odatda 200 KB; rasm yuklashda (faqat admin uchun) 6 MB gacha
const smallJson = express.json({ limit: '200kb' });
const bigJson = express.json({ limit: '6mb' });
app.use((req, res, next) => {
  if (req.path === '/api/admin/upload') return adminOnly(req, res, () => bigJson(req, res, next));
  smallJson(req, res, next);
});

// ---------- Bazadagi qatorlarni API shakliga o'tkazish ----------
const iso = (d) => new Date(d).toISOString();
const toProduct = (r) => ({ id: r.id, category: r.category, name: r.name, names: r.names, price: r.price, available: r.available, image: r.image });
const toPromo = (r) => ({ id: r.id, productId: r.product_id, minQty: r.min_qty, type: r.type, value: r.value, endsAt: r.ends_at, active: r.active, createdAt: iso(r.created_at) });
const toOrder = (r) => ({
  id: r.id, token: r.token, name: r.name, phone: r.phone, address: r.address, comment: r.comment, type: r.type, lang: r.lang,
  push: r.push, items: r.items, subtotal: r.subtotal, deliveryFee: r.delivery_fee, total: r.total, status: r.status,
  createdAt: iso(r.created_at), updatedAt: iso(r.updated_at),
});

const loadProducts = async (where = '', params = []) =>
  (await q(`select * from products ${where} order by id`, params)).rows.map(toProduct);
const loadPromos = async () => (await q('select * from promos order by id')).rows.map(toPromo);

// ---------- Aksiyalar ----------
const endOfDay = (d) => new Date(`${d}T23:59:59+05:00`).getTime(); // Toshkent vaqti
const promoLive = (pr) => pr.active && (!pr.endsAt || Date.now() <= endOfDay(pr.endsAt));

// Frontend (frontend/src/utils/promo.js) bilan bir xil hisob-kitob
function unitPrice(product, qty, promos) {
  let best = product.price;
  for (const pr of promos) {
    if (pr.productId !== product.id || !promoLive(pr) || qty < pr.minQty) continue;
    const raw = pr.type === 'percent' ? (product.price * (100 - pr.value)) / 100 : product.price - pr.value;
    best = Math.min(best, Math.max(0, Math.round(raw / 100) * 100));
  }
  return best;
}

// ---------- Ochiq API ----------
app.get('/api/brand', (_req, res) => res.json(brand));
app.get('/api/categories', (_req, res) => res.json(categories));

app.get('/api/products', ah(async (req, res) => {
  const { category } = req.query;
  res.json(
    category
      ? await loadProducts('where available and category = $1', [String(category)])
      : await loadProducts('where available')
  );
}));

app.get('/api/promos', ah(async (_req, res) => res.json((await loadPromos()).filter(promoLive))));
app.get('/api/push/key', (_req, res) => res.json({ key: getPublicKey() }));

// Mijozga faqat kerakli maydonlar qaytadi (token va push obunasi — yo'q)
const publicOrder = (o) => ({
  id: o.id, status: o.status, type: o.type, items: o.items, subtotal: o.subtotal,
  deliveryFee: o.deliveryFee, total: o.total, createdAt: o.createdAt, updatedAt: o.updatedAt,
});

app.post('/api/orders', ah(async (req, res) => {
  const { name, phone, address, comment, type, items, lang, push } = req.body || {};
  if (!name || !phone) return fail(res, 400, 'name_phone', 'Ism va telefon kerak');
  if (!Array.isArray(items) || items.length === 0) return fail(res, 400, 'empty_cart', "Savat bo'sh");
  const delivery = type === 'delivery';
  if (delivery && !address) return fail(res, 400, 'address', 'Manzil kerak');

  // Bir xil mahsulot ikki marta kelsa qo'shib yuboramiz
  const qtys = new Map();
  for (const it of items) {
    const id = Number(it?.productId);
    const qty = Math.floor(Number(it?.qty));
    if (!Number.isInteger(id) || !(qty > 0)) return fail(res, 400, 'bad_item', "Noto'g'ri mahsulot yoki miqdor");
    qtys.set(id, (qtys.get(id) || 0) + qty);
  }
  const products = await loadProducts('where available and id = any($1)', [[...qtys.keys()]]);
  const promos = await loadPromos();
  const lines = [];
  for (const [id, qty] of qtys) {
    const p = products.find((x) => x.id === id);
    if (!p || qty > 50) return fail(res, 400, 'bad_item', "Noto'g'ri mahsulot yoki miqdor");
    lines.push({ productId: p.id, name: p.name, names: p.names, price: unitPrice(p, qty, promos), basePrice: p.price, qty });
  }
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const fee = delivery ? DELIVERY_FEE : 0;
  const { rows } = await q(
    `insert into orders(token, name, phone, address, comment, type, lang, push, items, subtotal, delivery_fee, total)
     values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12) returning *`,
    [
      crypto.randomBytes(12).toString('hex'),
      String(name).slice(0, 80),
      String(phone).slice(0, 30),
      delivery ? String(address).slice(0, 200) : '',
      String(comment || '').slice(0, 300),
      delivery ? 'delivery' : 'pickup',
      LANGS.includes(lang) ? lang : 'uz',
      JSON.stringify(cleanSub(push)),
      JSON.stringify(lines),
      subtotal,
      fee,
      subtotal + fee,
    ]
  );
  const order = toOrder(rows[0]);

  notifyAdmins({
    title: `🛎 Yangi buyurtma #${order.id}`,
    body: `${order.name} · ${new Intl.NumberFormat('ru-RU').format(order.total)} so'm`,
    url: '/admin',
    tag: `new-order-${order.id}`,
    kind: 'new-order',
    orderId: order.id,
  }).catch(() => {});

  res.status(201).json({ ...publicOrder(order), token: order.token });
}));

// Eski (Flutter) ilova uchun: faqat holatni qaytaradi
app.get('/api/orders/:id', ah(async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = Number.isInteger(id) ? await q('select * from orders where id = $1', [id]) : { rows: [] };
  if (!rows[0]) return fail(res, 404, 'not_found', 'Topilmadi');
  const o = toOrder(rows[0]);
  res.json({ id: o.id, status: o.status, total: o.total, createdAt: o.createdAt });
}));

// "Buyurtmalarim": brauzer o'zining buyurtma raqami va maxfiy tokenini yuboradi
app.post('/api/orders/lookup', ah(async (req, res) => {
  const list = Array.isArray(req.body?.orders) ? req.body.orders.slice(0, 40) : [];
  const ids = list.map((x) => Number(x?.id)).filter(Number.isInteger);
  if (!ids.length) return res.json([]);
  const { rows } = await q('select * from orders where id = any($1)', [ids]);
  const out = [];
  for (const r of rows) {
    const o = toOrder(r);
    if (list.some((x) => Number(x.id) === o.id && x.token === o.token)) out.push(publicOrder(o));
  }
  res.json(out);
}));

// Mijoz bildirishnomani keyinroq yoqsa — buyurtmasiga obunani biriktiramiz
app.post('/api/orders/:id/push', ah(async (req, res) => {
  const id = Number(req.params.id);
  const sub = cleanSub(req.body?.subscription);
  if (!Number.isInteger(id) || !sub || typeof req.body?.token !== 'string') return fail(res, 400, 'bad_item', 'Xatolik');
  const { rowCount } = await q(
    'update orders set push = $2::jsonb, lang = coalesce($3, lang) where id = $1 and token = $4',
    [id, JSON.stringify(sub), LANGS.includes(req.body?.lang) ? req.body.lang : null, req.body.token]
  );
  if (!rowCount) return fail(res, 400, 'bad_item', 'Xatolik');
  res.json({ ok: true });
}));

// ---------- Admin API ----------
app.post('/api/admin/login', (req, res) => {
  if (req.body?.password === ADMIN_PASSWORD) return res.json({ ok: true });
  fail(res, 401, 'bad_password', "Parol noto'g'ri");
});

app.post('/api/admin/push/subscribe', adminOnly, ah(async (req, res) => {
  const sub = cleanSub(req.body?.subscription);
  if (!sub) return fail(res, 400, 'bad_item', 'Xatolik');
  await q(
    'insert into admin_push(endpoint, sub) values($1, $2::jsonb) on conflict (endpoint) do update set sub = excluded.sub',
    [sub.endpoint, JSON.stringify(sub)]
  );
  res.json({ ok: true });
}));

const adminOrder = ({ push, token, ...rest }) => ({ ...rest, hasPush: Boolean(push) });
app.get('/api/admin/orders', adminOnly, ah(async (_req, res) => {
  const { rows } = await q('select * from orders order by id desc limit 300');
  res.json(rows.map((r) => adminOrder(toOrder(r))));
}));

app.patch('/api/admin/orders/:id', adminOnly, ah(async (req, res) => {
  const id = Number(req.params.id);
  if (!STATUSES.includes(req.body?.status)) return fail(res, 400, 'bad_status', "Noto'g'ri holat");
  const before = Number.isInteger(id) ? (await q('select status from orders where id = $1', [id])).rows[0] : null;
  if (!before) return fail(res, 404, 'not_found', 'Topilmadi');
  const { rows } = await q('update orders set status = $2, updated_at = now() where id = $1 returning *', [id, req.body.status]);
  const order = toOrder(rows[0]);
  if (before.status !== order.status) {
    const payload = statusPayload(order);
    if (payload) notifyCustomer(order, payload).catch(() => {});
  }
  res.json(adminOrder(order));
}));

// --- Mahsulotlar ---
const str = (v, max) => String(v ?? '').trim().slice(0, max);
const IMAGE_RE = /^\/(uploads\/[a-f0-9]{16,40}\.(jpg|png|webp)|images\/[a-z0-9_-]+\.jpg)$/;

function readNames(body, current) {
  const names = { ...(current || {}) };
  for (const l of LANGS) {
    if (body?.names && l in body.names) names[l] = str(body.names[l], 80);
  }
  return names;
}

// Yuklangan rasm hech bir mahsulotda ishlatilmasa, bazadan o'chiramiz
async function removeUpload(url) {
  if (!url?.startsWith('/uploads/')) return;
  await q('delete from images where name = $1 and not exists (select 1 from products where image = $2)', [url.slice('/uploads/'.length), url]);
}

app.get('/api/admin/products', adminOnly, ah(async (_req, res) => res.json(await loadProducts())));

app.post('/api/admin/products', adminOnly, ah(async (req, res) => {
  const b = req.body || {};
  const names = readNames(b, {});
  const price = Math.round(Number(b.price));
  if (!names.uz) return fail(res, 400, 'bad_name', 'Nomi kerak');
  if (!Number.isFinite(price) || price < 0 || price > 100_000_000) return fail(res, 400, 'bad_price', "Narx noto'g'ri");
  if (!categories.some((c) => c.id === b.category)) return fail(res, 400, 'bad_category', "Bo'lim noto'g'ri");
  const image = str(b.image, 120);
  if (image && !IMAGE_RE.test(image)) return fail(res, 400, 'bad_image', "Rasm noto'g'ri");
  const full = { ...names, ru: names.ru || names.uz, en: names.en || names.uz };
  const { rows } = await q(
    'insert into products(category, name, names, price, available, image) values($1,$2,$3::jsonb,$4,$5,$6) returning *',
    [b.category, names.uz, JSON.stringify(full), price, b.available !== false, image]
  );
  res.status(201).json(toProduct(rows[0]));
}));

app.patch('/api/admin/products/:id', adminOnly, ah(async (req, res) => {
  const id = Number(req.params.id);
  const cur = Number.isInteger(id) ? (await loadProducts('where id = $1', [id]))[0] : null;
  if (!cur) return fail(res, 404, 'not_found', 'Topilmadi');
  const p = { ...cur };
  const { price, available, category, image } = req.body || {};
  if (price !== undefined) {
    if (!(Number(price) >= 0) || Number(price) > 100_000_000) return fail(res, 400, 'bad_price', "Narx noto'g'ri");
    p.price = Math.round(Number(price));
  }
  if (available !== undefined) p.available = Boolean(available);
  if (category !== undefined) {
    if (!categories.some((c) => c.id === category)) return fail(res, 400, 'bad_category', "Bo'lim noto'g'ri");
    p.category = category;
  }
  if (req.body?.names) {
    const names = readNames(req.body, cur.names);
    if (!names.uz) return fail(res, 400, 'bad_name', 'Nomi kerak');
    p.names = { ...names, ru: names.ru || names.uz, en: names.en || names.uz };
    p.name = names.uz;
  }
  if (image !== undefined) {
    const img = str(image, 120);
    if (img && !IMAGE_RE.test(img)) return fail(res, 400, 'bad_image', "Rasm noto'g'ri");
    p.image = img;
  }
  const { rows } = await q(
    'update products set category=$2, name=$3, names=$4::jsonb, price=$5, available=$6, image=$7 where id=$1 returning *',
    [id, p.category, p.name, JSON.stringify(p.names), p.price, p.available, p.image]
  );
  if (cur.image !== p.image) await removeUpload(cur.image);
  res.json(toProduct(rows[0]));
}));

app.delete('/api/admin/products/:id', adminOnly, ah(async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = Number.isInteger(id) ? await q('delete from products where id = $1 returning image', [id]) : { rows: [] };
  if (!rows[0]) return fail(res, 404, 'not_found', 'Topilmadi'); // aksiyalari avtomatik o'chadi (cascade)
  await removeUpload(rows[0].image);
  res.json({ ok: true });
}));

// Rasm yuklash: {data: "data:image/jpeg;base64,..."} — fayl turi boshlang'ich baytlar bo'yicha tekshiriladi.
// Rasmlar ham bazada saqlanadi (Render'da fayllar o'chib ketadi, baza esa yo'q).
app.post('/api/admin/upload', adminOnly, ah(async (req, res) => {
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.data || ''));
  if (!m) return fail(res, 400, 'bad_image', "Rasm noto'g'ri");
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 4 * 1024 * 1024) return fail(res, 413, 'image_big', 'Rasm juda katta');
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng = buf.subarray(0, 4).toString('hex') === '89504e47';
  const isWebp = buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP';
  if (!(isJpg || isPng || isWebp)) return fail(res, 400, 'bad_image', "Rasm noto'g'ri");
  const ext = isJpg ? 'jpg' : isPng ? 'png' : 'webp';
  const mime = isJpg ? 'image/jpeg' : isPng ? 'image/png' : 'image/webp';
  const name = `${crypto.randomBytes(12).toString('hex')}.${ext}`;
  await q('insert into images(name, mime, data) values($1,$2,$3)', [name, mime, buf]);
  // Yuklangan-u, mahsulotga biriktirilmagan eski rasmlarni (1 kundan oshgan) tozalaymiz
  q(
    `delete from images where created_at < now() - interval '1 day'
       and not exists (select 1 from products where image = '/uploads/' || images.name)`
  ).catch(() => {});
  res.status(201).json({ url: `/uploads/${name}` });
}));

// --- Aksiyalar ---
async function readPromo(b, existing = {}) {
  const pr = { ...existing };
  if (b.productId !== undefined) pr.productId = Number(b.productId);
  const [product] = Number.isInteger(pr.productId) ? await loadProducts('where id = $1', [pr.productId]) : [];
  if (!product) return { error: 'not_found' };
  if (b.minQty !== undefined) pr.minQty = Math.floor(Number(b.minQty));
  if (b.type !== undefined) pr.type = b.type;
  if (b.value !== undefined) pr.value = Math.round(Number(b.value));
  if (b.endsAt !== undefined) pr.endsAt = /^\d{4}-\d{2}-\d{2}$/.test(b.endsAt) ? b.endsAt : '';
  if (b.active !== undefined) pr.active = Boolean(b.active);

  if (!(pr.minQty >= 1 && pr.minQty <= 50)) return { error: 'bad_qty' };
  if (!['percent', 'amount'].includes(pr.type)) return { error: 'bad_promo' };
  const max = pr.type === 'percent' ? 90 : product.price;
  if (!(pr.value >= 1 && pr.value <= max)) return { error: 'bad_promo' };
  return { pr };
}
const promoErr = { not_found: [404, 'Topilmadi'], bad_qty: [400, "Miqdor noto'g'ri"], bad_promo: [400, "Chegirma noto'g'ri"] };
const withLive = (p) => ({ ...p, live: promoLive(p) });

app.get('/api/admin/promos', adminOnly, ah(async (_req, res) => res.json((await loadPromos()).map(withLive))));

app.post('/api/admin/promos', adminOnly, ah(async (req, res) => {
  const { pr, error } = await readPromo(req.body || {}, { active: true, endsAt: '' });
  if (error) return fail(res, promoErr[error][0], error, promoErr[error][1]);
  const { rows } = await q(
    'insert into promos(product_id, min_qty, type, value, ends_at, active) values($1,$2,$3,$4,$5,$6) returning *',
    [pr.productId, pr.minQty, pr.type, pr.value, pr.endsAt, pr.active]
  );
  res.status(201).json(withLive(toPromo(rows[0])));
}));

app.patch('/api/admin/promos/:id', adminOnly, ah(async (req, res) => {
  const id = Number(req.params.id);
  const cur = Number.isInteger(id) ? (await q('select * from promos where id = $1', [id])).rows[0] : null;
  if (!cur) return fail(res, 404, 'not_found', 'Topilmadi');
  const { pr, error } = await readPromo(req.body || {}, toPromo(cur));
  if (error) return fail(res, promoErr[error][0], error, promoErr[error][1]);
  const { rows } = await q(
    'update promos set product_id=$2, min_qty=$3, type=$4, value=$5, ends_at=$6, active=$7 where id=$1 returning *',
    [id, pr.productId, pr.minQty, pr.type, pr.value, pr.endsAt, pr.active]
  );
  res.json(withLive(toPromo(rows[0])));
}));

app.delete('/api/admin/promos/:id', adminOnly, ah(async (req, res) => {
  const id = Number(req.params.id);
  const r = Number.isInteger(id) ? await q('delete from promos where id = $1', [id]) : { rowCount: 0 };
  if (!r.rowCount) return fail(res, 404, 'not_found', 'Topilmadi');
  res.json({ ok: true });
}));

// ---------- Yuklangan rasmlar (bazadan) va tayyor Vue sayti ----------
app.get('/uploads/:name', ah(async (req, res) => {
  if (!/^[a-f0-9]{16,40}\.(jpg|png|webp)$/.test(req.params.name)) return res.sendStatus(404);
  const { rows } = await q('select mime, data from images where name = $1', [req.params.name]);
  if (!rows[0]) return res.sendStatus(404);
  res.set({ 'Content-Type': rows[0].mime, 'Cache-Control': 'public, max-age=2592000, immutable', 'X-Content-Type-Options': 'nosniff' });
  res.send(rows[0].data);
}));

// `frontend` papkasida `npm run build` qilingandan keyin ishlaydi.
const distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'frontend', 'dist');
if (fs.existsSync(distDir)) {
  app.use(
    express.static(distDir, {
      maxAge: '7d',
      index: false,
      setHeaders(res, file) {
        // Service worker har doim yangi bo'lishi kerak
        if (file.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache');
      },
    })
  );
  app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

// Kutilmagan xatolar: serverni yiqitmaymiz, mijozga tushunarli javob beramiz
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Xato:', err);
  if (res.headersSent) return;
  fail(res, 500, 'server', 'Server xatosi');
});

await initDb();
await initPush();
const server = app.listen(PORT, () => {
  console.log(`AVAZBEK API: http://localhost:${PORT}  (admin parol: ${ADMIN_PASSWORD === 'avazbek123' ? 'standart — almashtiring!' : 'o\'rnatilgan'})`);
});
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => server.close(() => pool.end().finally(() => process.exit(0))));
}
