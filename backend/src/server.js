import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { db, save, uploadsDir } from './db.js';
import { categories, brand } from './menu.js';
import { publicKey, cleanSub, notifyAdmins, notifyCustomer, statusPayload } from './push.js';

const app = express();
const PORT = process.env.PORT || 4000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'avazbek123';
const DELIVERY_FEE = brand.deliveryFee;
const STATUSES = ['new', 'cooking', 'delivering', 'done', 'cancelled'];
const LANGS = ['uz', 'ru', 'en'];

app.use(cors());

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

// ---------- Aksiyalar ----------
const endOfDay = (d) => new Date(`${d}T23:59:59+05:00`).getTime(); // Toshkent vaqti
const promoLive = (pr) => pr.active && (!pr.endsAt || Date.now() <= endOfDay(pr.endsAt));

// Frontend (frontend/src/utils/promo.js) bilan bir xil hisob-kitob
function unitPrice(product, qty) {
  let best = product.price;
  for (const pr of db.promos) {
    if (pr.productId !== product.id || !promoLive(pr) || qty < pr.minQty) continue;
    const raw = pr.type === 'percent' ? (product.price * (100 - pr.value)) / 100 : product.price - pr.value;
    best = Math.min(best, Math.max(0, Math.round(raw / 100) * 100));
  }
  return best;
}

// ---------- Ochiq API ----------
app.get('/api/brand', (_req, res) => res.json(brand));
app.get('/api/categories', (_req, res) => res.json(categories));

app.get('/api/products', (req, res) => {
  const { category } = req.query;
  let list = db.products.filter((p) => p.available);
  if (category) list = list.filter((p) => p.category === category);
  res.json(list);
});

app.get('/api/promos', (_req, res) => res.json(db.promos.filter(promoLive)));
app.get('/api/push/key', (_req, res) => res.json({ key: publicKey }));

// Mijozga faqat kerakli maydonlar qaytadi (token va push obunasi — yo'q)
const publicOrder = (o) => ({
  id: o.id, status: o.status, type: o.type, items: o.items, subtotal: o.subtotal,
  deliveryFee: o.deliveryFee, total: o.total, createdAt: o.createdAt, updatedAt: o.updatedAt,
});

app.post('/api/orders', (req, res) => {
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
    if (!(qty > 0)) return fail(res, 400, 'bad_item', "Noto'g'ri mahsulot yoki miqdor");
    qtys.set(id, (qtys.get(id) || 0) + qty);
  }
  const lines = [];
  for (const [id, qty] of qtys) {
    const p = db.products.find((x) => x.id === id && x.available);
    if (!p || qty > 50) return fail(res, 400, 'bad_item', "Noto'g'ri mahsulot yoki miqdor");
    const price = unitPrice(p, qty);
    lines.push({ productId: p.id, name: p.name, names: p.names, price, basePrice: p.price, qty });
  }
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const now = new Date().toISOString();
  const order = {
    id: db.nextOrderId++,
    token: crypto.randomBytes(12).toString('hex'),
    name: String(name).slice(0, 80),
    phone: String(phone).slice(0, 30),
    address: delivery ? String(address).slice(0, 200) : '',
    comment: String(comment || '').slice(0, 300),
    type: delivery ? 'delivery' : 'pickup',
    lang: LANGS.includes(lang) ? lang : 'uz',
    push: cleanSub(push),
    items: lines,
    subtotal,
    deliveryFee: delivery ? DELIVERY_FEE : 0,
    total: subtotal + (delivery ? DELIVERY_FEE : 0),
    status: 'new',
    createdAt: now,
    updatedAt: now,
  };
  db.orders.unshift(order);
  save();

  notifyAdmins({
    title: `🛎 Yangi buyurtma #${order.id}`,
    body: `${order.name} · ${new Intl.NumberFormat('ru-RU').format(order.total)} so'm`,
    url: '/admin',
    tag: `new-order-${order.id}`,
    kind: 'new-order',
    orderId: order.id,
  }).catch(() => {});

  res.status(201).json({ ...publicOrder(order), token: order.token });
});

// Eski (Flutter) ilova uchun: faqat holatni qaytaradi
app.get('/api/orders/:id', (req, res) => {
  const order = db.orders.find((o) => o.id === Number(req.params.id));
  if (!order) return fail(res, 404, 'not_found', 'Topilmadi');
  res.json({ id: order.id, status: order.status, total: order.total, createdAt: order.createdAt });
});

// "Buyurtmalarim": brauzer o'zining buyurtma raqami va maxfiy tokenini yuboradi
app.post('/api/orders/lookup', (req, res) => {
  const list = Array.isArray(req.body?.orders) ? req.body.orders.slice(0, 40) : [];
  const out = [];
  for (const { id, token } of list) {
    const o = db.orders.find((x) => x.id === Number(id));
    if (o && typeof token === 'string' && token === o.token) out.push(publicOrder(o));
  }
  res.json(out);
});

// Mijoz bildirishnomani keyinroq yoqsa — buyurtmasiga obunani biriktiramiz
app.post('/api/orders/:id/push', (req, res) => {
  const o = db.orders.find((x) => x.id === Number(req.params.id));
  const sub = cleanSub(req.body?.subscription);
  if (!o || o.token !== req.body?.token || !sub) return fail(res, 400, 'bad_item', 'Xatolik');
  o.push = sub;
  if (LANGS.includes(req.body?.lang)) o.lang = req.body.lang;
  save();
  res.json({ ok: true });
});

// ---------- Admin API ----------
app.post('/api/admin/login', (req, res) => {
  if (req.body?.password === ADMIN_PASSWORD) return res.json({ ok: true });
  fail(res, 401, 'bad_password', "Parol noto'g'ri");
});

app.post('/api/admin/push/subscribe', adminOnly, (req, res) => {
  const sub = cleanSub(req.body?.subscription);
  if (!sub) return fail(res, 400, 'bad_item', 'Xatolik');
  if (!db.adminPush.some((s) => s.endpoint === sub.endpoint)) {
    db.adminPush.push(sub);
    save();
  }
  res.json({ ok: true });
});

const adminOrder = ({ push, token, ...rest }) => ({ ...rest, hasPush: Boolean(push) });
app.get('/api/admin/orders', adminOnly, (_req, res) => res.json(db.orders.map(adminOrder)));

app.patch('/api/admin/orders/:id', adminOnly, (req, res) => {
  const order = db.orders.find((o) => o.id === Number(req.params.id));
  if (!order) return fail(res, 404, 'not_found', 'Topilmadi');
  if (!STATUSES.includes(req.body?.status)) return fail(res, 400, 'bad_status', "Noto'g'ri holat");
  const changed = order.status !== req.body.status;
  order.status = req.body.status;
  order.updatedAt = new Date().toISOString();
  save();
  if (changed) {
    const payload = statusPayload(order);
    if (payload) notifyCustomer(order, payload).catch(() => {});
  }
  res.json(adminOrder(order));
});

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

function removeUpload(url) {
  if (!url?.startsWith('/uploads/')) return;
  if (db.products.some((p) => p.image === url)) return; // boshqa mahsulot ham ishlatayapti
  fs.rm(path.join(uploadsDir, path.basename(url)), { force: true }, () => {});
}

app.get('/api/admin/products', adminOnly, (_req, res) => res.json(db.products));

app.post('/api/admin/products', adminOnly, (req, res) => {
  const b = req.body || {};
  const names = readNames(b, {});
  const price = Math.round(Number(b.price));
  if (!names.uz) return fail(res, 400, 'bad_name', 'Nomi kerak');
  if (!(price >= 0) || !Number.isFinite(price)) return fail(res, 400, 'bad_price', "Narx noto'g'ri");
  if (!categories.some((c) => c.id === b.category)) return fail(res, 400, 'bad_category', 'Bo\'lim noto\'g\'ri');
  const image = str(b.image, 120);
  if (image && !IMAGE_RE.test(image)) return fail(res, 400, 'bad_image', "Rasm noto'g'ri");
  const product = {
    id: db.nextProductId++,
    category: b.category,
    name: names.uz,
    names: { ...names, ru: names.ru || names.uz, en: names.en || names.uz },
    price,
    available: b.available !== false,
    image,
  };
  db.products.push(product);
  save();
  res.status(201).json(product);
});

app.patch('/api/admin/products/:id', adminOnly, (req, res) => {
  const p = db.products.find((x) => x.id === Number(req.params.id));
  if (!p) return fail(res, 404, 'not_found', 'Topilmadi');
  const { price, available, category, image } = req.body || {};
  if (price !== undefined) {
    if (!(Number(price) >= 0)) return fail(res, 400, 'bad_price', "Narx noto'g'ri");
    p.price = Math.round(Number(price));
  }
  if (available !== undefined) p.available = Boolean(available);
  if (category !== undefined) {
    if (!categories.some((c) => c.id === category)) return fail(res, 400, 'bad_category', "Bo'lim noto'g'ri");
    p.category = category;
  }
  if (req.body?.names) {
    const names = readNames(req.body, p.names);
    if (!names.uz) return fail(res, 400, 'bad_name', 'Nomi kerak');
    p.names = { ...names, ru: names.ru || names.uz, en: names.en || names.uz };
    p.name = names.uz;
  }
  if (image !== undefined) {
    const img = str(image, 120);
    if (img && !IMAGE_RE.test(img)) return fail(res, 400, 'bad_image', "Rasm noto'g'ri");
    const old = p.image;
    p.image = img;
    if (old !== img) removeUpload(old);
  }
  save();
  res.json(p);
});

app.delete('/api/admin/products/:id', adminOnly, (req, res) => {
  const i = db.products.findIndex((x) => x.id === Number(req.params.id));
  if (i === -1) return fail(res, 404, 'not_found', 'Topilmadi');
  const [p] = db.products.splice(i, 1);
  db.promos = db.promos.filter((pr) => pr.productId !== p.id);
  save();
  removeUpload(p.image);
  res.json({ ok: true });
});

// Rasm yuklash: {data: "data:image/jpeg;base64,..."} — fayl turi boshlang'ich baytlar bo'yicha tekshiriladi
app.post('/api/admin/upload', adminOnly, (req, res) => {
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.data || ''));
  if (!m) return fail(res, 400, 'bad_image', "Rasm noto'g'ri");
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 4 * 1024 * 1024) return fail(res, 413, 'image_big', 'Rasm juda katta');
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng = buf.subarray(0, 4).toString('hex') === '89504e47';
  const isWebp = buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP';
  if (!(isJpg || isPng || isWebp)) return fail(res, 400, 'bad_image', "Rasm noto'g'ri");
  const ext = isJpg ? 'jpg' : isPng ? 'png' : 'webp';
  const name = `${crypto.randomBytes(12).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(uploadsDir, name), buf);
  res.status(201).json({ url: `/uploads/${name}` });
});

// --- Aksiyalar ---
function readPromo(b, existing = {}) {
  const pr = { ...existing };
  if (b.productId !== undefined) {
    if (!db.products.some((p) => p.id === Number(b.productId))) return { error: 'not_found' };
    pr.productId = Number(b.productId);
  }
  if (b.minQty !== undefined) pr.minQty = Math.floor(Number(b.minQty));
  if (b.type !== undefined) pr.type = b.type;
  if (b.value !== undefined) pr.value = Math.round(Number(b.value));
  if (b.endsAt !== undefined) pr.endsAt = /^\d{4}-\d{2}-\d{2}$/.test(b.endsAt) ? b.endsAt : '';
  if (b.active !== undefined) pr.active = Boolean(b.active);

  if (!(pr.minQty >= 1 && pr.minQty <= 50)) return { error: 'bad_qty' };
  if (!['percent', 'amount'].includes(pr.type)) return { error: 'bad_promo' };
  const product = db.products.find((p) => p.id === pr.productId);
  const max = pr.type === 'percent' ? 90 : product.price;
  if (!(pr.value >= 1 && pr.value <= max)) return { error: 'bad_promo' };
  return { pr };
}
const promoErr = { not_found: [404, 'Topilmadi'], bad_qty: [400, "Miqdor noto'g'ri"], bad_promo: [400, "Chegirma noto'g'ri"] };

app.get('/api/admin/promos', adminOnly, (_req, res) => res.json(db.promos.map((p) => ({ ...p, live: promoLive(p) }))));

app.post('/api/admin/promos', adminOnly, (req, res) => {
  const { pr, error } = readPromo(req.body || {}, { active: true, endsAt: '' });
  if (error) return fail(res, promoErr[error][0], error, promoErr[error][1]);
  const promo = { id: db.nextPromoId++, ...pr, createdAt: new Date().toISOString() };
  db.promos.push(promo);
  save();
  res.status(201).json({ ...promo, live: promoLive(promo) });
});

app.patch('/api/admin/promos/:id', adminOnly, (req, res) => {
  const promo = db.promos.find((x) => x.id === Number(req.params.id));
  if (!promo) return fail(res, 404, 'not_found', 'Topilmadi');
  const { pr, error } = readPromo(req.body || {}, promo);
  if (error) return fail(res, promoErr[error][0], error, promoErr[error][1]);
  Object.assign(promo, pr);
  save();
  res.json({ ...promo, live: promoLive(promo) });
});

app.delete('/api/admin/promos/:id', adminOnly, (req, res) => {
  const before = db.promos.length;
  db.promos = db.promos.filter((x) => x.id !== Number(req.params.id));
  if (db.promos.length === before) return fail(res, 404, 'not_found', 'Topilmadi');
  save();
  res.json({ ok: true });
});

// ---------- Yuklangan rasmlar va tayyor Vue sayti ----------
app.use('/uploads', express.static(uploadsDir, { maxAge: '30d', immutable: true }));

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

app.listen(PORT, () => {
  console.log(`AVAZBEK API: http://localhost:${PORT}  (admin parol: ${ADMIN_PASSWORD})`);
});
