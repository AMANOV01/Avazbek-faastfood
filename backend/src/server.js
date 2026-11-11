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
// awaiting_payment: mijoz kartaga o'tkazdim degan, admin to'lovni tekshirguncha kutiladigan buyurtma
const STATUSES = ['awaiting_payment', 'new', 'cooking', 'delivering', 'done', 'cancelled'];
const LANGS = ['uz', 'ru', 'en'];
const PAY_CARDS = ['uzcard', 'humo']; // O'zbekiston kartalari

app.set('trust proxy', 1); // Render orqasida haqiqiy IP
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
  lat: r.lat, lng: r.lng, payMethod: r.pay_method, payCard: r.pay_card, payLast4: r.pay_last4, promoCode: r.promo_code, codeDiscount: r.code_discount,
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
// Do'konning to'lov kartalari: admin bir nechta karta saqlaydi, ulardan bittasi "faol" (mijozga shu ko'rsatiladi)
const cardOk = (c) => c && typeof c.id === 'string' && /^\d{16}$/.test(c.number);
async function getCards() {
  const { rows } = await q("select key, value from settings where key in ('pay_cards', 'pay_card_active', 'pay_card_number', 'pay_card_holder', 'pay_card_type')");
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  let cards = Array.isArray(m.pay_cards) ? m.pay_cards.filter(cardOk) : [];
  // Eski (bitta karta) sozlamadan o'tish
  if (!cards.length && typeof m.pay_card_number === 'string' && /^\d{16}$/.test(m.pay_card_number)) {
    cards = [{ id: 'c0', number: m.pay_card_number, holder: m.pay_card_holder || '', type: m.pay_card_type || 'uzcard' }];
  }
  const activeId = cards.some((c) => c.id === m.pay_card_active) ? m.pay_card_active : cards[0]?.id || '';
  return { cards, activeId };
}
async function getPayCard() {
  const { cards, activeId } = await getCards();
  const c = cards.find((x) => x.id === activeId);
  return c ? { number: c.number, holder: c.holder || '', type: PAY_CARDS.includes(c.type) ? c.type : 'uzcard' } : null;
}
app.get('/api/brand', ah(async (_req, res) => res.json({ ...brand, payCard: await getPayCard() })));
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
  payMethod: o.payMethod, payCard: o.payCard, promoCode: o.promoCode, codeDiscount: o.codeDiscount,
});

// ---------- Promokodlar ----------
class Biz extends Error {
  constructor(status, code, error, extra = {}) {
    super(error);
    Object.assign(this, { status, code, extra });
  }
}
const CODE_RE = /^[A-Z0-9_-]{3,20}$/;
const normCode = (v) => String(v ?? '').trim().toUpperCase();
// Telefon raqamning oxirgi 9 raqami (+998 94 437 27 85 → 944372785): "mijoz" shu bo'yicha aniqlanadi
const phoneKey = (p) => {
  const d = String(p ?? '').replace(/\D/g, '');
  return d.length >= 9 ? d.slice(-9) : '';
};
const codeLive = (c) => c.active && (!c.ends_at || Date.now() <= endOfDay(c.ends_at));
const codeExhausted = (c) => c.max_uses !== null && c.used_count >= c.max_uses;

function codeDiscount(c, subtotal) {
  const raw = c.type === 'percent' ? Math.round((subtotal * c.value) / 100 / 100) * 100 : c.value;
  return Math.max(0, Math.min(subtotal, raw));
}

// Promokod shu buyurtma uchun yaroqlimi? (xato bo'lsa Biz tashlaydi)
async function assertCodeUsable(db, c, phoneK, subtotal) {
  if (!c || !c.active) throw new Biz(400, 'code_invalid', "Promokod topilmadi");
  if (!codeLive(c)) throw new Biz(400, 'code_expired', 'Promokod muddati tugagan');
  if (codeExhausted(c)) throw new Biz(400, 'code_used_up', 'Bu promokod allaqachon ishlatilgan');
  if (!phoneK) throw new Biz(400, 'code_phone', 'Promokod uchun telefon raqamingizni kiriting');
  if (c.min_total > subtotal) throw new Biz(400, 'code_min', 'Buyurtma summasi yetarli emas', { min: c.min_total });
  const used = await db.query('select 1 from promo_code_uses where code_id = $1 and phone = $2', [c.id, phoneK]);
  if (used.rowCount) throw new Biz(400, 'code_used', 'Siz bu promokodni allaqachon ishlatgansiz');
}

// Oddiy cheklov: bitta IP promokodni ko'p marta taxmin qilib ko'rmasin
const hits = new Map();
const rateLimit = (max, windowMs) => (req, res, next) => {
  const now = Date.now();
  const rec = hits.get(req.ip);
  if (!rec || rec.reset < now) hits.set(req.ip, { n: 1, reset: now + windowMs });
  else if (++rec.n > max) return fail(res, 429, 'too_many', "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring");
  if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  next();
};

// Savatdagi mahsulotlar → narxlangan qatorlar (aksiya server tomonda hisoblanadi)
async function priceLines(items) {
  if (!Array.isArray(items) || items.length === 0) throw new Biz(400, 'empty_cart', "Savat bo'sh");
  // Bir xil mahsulot ikki marta kelsa qo'shib yuboramiz
  const qtys = new Map();
  for (const it of items) {
    const id = Number(it?.productId);
    const qty = Math.floor(Number(it?.qty));
    if (!Number.isInteger(id) || !(qty > 0)) throw new Biz(400, 'bad_item', "Noto'g'ri mahsulot yoki miqdor");
    qtys.set(id, (qtys.get(id) || 0) + qty);
  }
  const products = await loadProducts('where available and id = any($1)', [[...qtys.keys()]]);
  const promos = await loadPromos();
  const lines = [];
  for (const [id, qty] of qtys) {
    const p = products.find((x) => x.id === id);
    if (!p || qty > 50) throw new Biz(400, 'bad_item', "Noto'g'ri mahsulot yoki miqdor");
    lines.push({ productId: p.id, name: p.name, names: p.names, price: unitPrice(p, qty, promos), basePrice: p.price, qty });
  }
  return { lines, subtotal: lines.reduce((s, l) => s + l.price * l.qty, 0) };
}

// Mijoz promokodni qo'llashdan oldin tekshirib ko'radi (hali ishlatilmaydi)
app.post('/api/promo-codes/check', rateLimit(40, 10 * 60_000), ah(async (req, res) => {
  const { subtotal } = await priceLines(req.body?.items);
  const { rows } = await q('select * from promo_codes where code = $1', [normCode(req.body?.code)]);
  await assertCodeUsable({ query: q }, rows[0], phoneKey(req.body?.phone), subtotal);
  const c = rows[0];
  res.json({ code: c.code, type: c.type, value: c.value, discount: codeDiscount(c, subtotal) });
}));

app.post('/api/orders', rateLimit(60, 10 * 60_000), ah(async (req, res) => {
  const { name, phone, address, comment, type, items, lang, push, lat, lng, payMethod, promoCode, paid } = req.body || {};
  if (!name || !phone) return fail(res, 400, 'name_phone', 'Ism va telefon kerak');
  const delivery = type === 'delivery';

  // Yetkazib berishda manzil xaritadan belgilanadi: koordinatalar shart (O'zbekiston hududida)
  const la = Number(lat);
  const ln = Number(lng);
  if (delivery && !(Number.isFinite(la) && Number.isFinite(ln) && la >= 37 && la <= 46 && ln >= 55 && ln <= 74)) {
    return fail(res, 400, 'location', 'Xaritadan manzilni belgilang');
  }
  if (!['cash', 'card'].includes(payMethod)) return fail(res, 400, 'bad_pay', "To'lov usulini tanlang");
  // Karta bilan to'lovda buyurtma faqat mijoz do'kon kartasiga o'tkazganini tasdiqlagandan keyin yaratiladi;
  // admin pul tushganini tekshirib tasdiqlamaguncha u oshxonaga o'tmaydi.
  const shopCard = payMethod === 'card' ? await getPayCard() : null;
  if (payMethod === 'card' && !shopCard) return fail(res, 400, 'no_card', "Karta orqali to'lov hozircha mavjud emas");
  if (payMethod === 'card' && paid !== true) return fail(res, 400, 'pay_required', "Avval to'lovni amalga oshiring");

  const { lines, subtotal } = await priceLines(items);
  const fee = delivery ? DELIVERY_FEE : 0;
  const codeText = normCode(promoCode);

  const client = await pool.connect();
  let order;
  try {
    await client.query('begin');
    let discount = 0;
    let usedCode = '';
    if (codeText) {
      // for update: bir vaqtda ikki kishi oxirgi ishlatilishni olib ketmasin
      const { rows } = await client.query('select * from promo_codes where code = $1 for update', [codeText]);
      const c = rows[0];
      await assertCodeUsable(client, c, phoneKey(phone), subtotal);
      discount = codeDiscount(c, subtotal);
      usedCode = c.code;
      await client.query('insert into promo_code_uses(code_id, phone) values($1,$2)', [c.id, phoneKey(phone)]);
      await client.query('update promo_codes set used_count = used_count + 1 where id = $1', [c.id]);
    }
    const addr = delivery ? String(address || '').trim().slice(0, 200) || `${la.toFixed(5)}, ${ln.toFixed(5)}` : '';
    const ins = await client.query(
      `insert into orders(token, name, phone, address, comment, type, lang, push, items, subtotal, delivery_fee, total,
                          lat, lng, pay_method, pay_card, promo_code, code_discount, status, pay_last4)
       values($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) returning *`,
      [
        crypto.randomBytes(12).toString('hex'),
        String(name).slice(0, 80),
        String(phone).slice(0, 30),
        addr,
        String(comment || '').slice(0, 300),
        delivery ? 'delivery' : 'pickup',
        LANGS.includes(lang) ? lang : 'uz',
        JSON.stringify(cleanSub(push)),
        JSON.stringify(lines),
        subtotal,
        fee,
        subtotal - discount + fee,
        delivery ? la : null,
        delivery ? ln : null,
        payMethod,
        shopCard ? shopCard.type : '',
        usedCode,
        discount,
        shopCard ? 'awaiting_payment' : 'new',
        shopCard ? shopCard.number.slice(-4) : '',
      ]
    );
    order = toOrder(ins.rows[0]);
    if (usedCode) await client.query('update promo_code_uses set order_id = $2 where code_id = (select id from promo_codes where code = $3) and phone = $1', [phoneKey(phone), order.id, usedCode]);
    await client.query('commit');
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    client.release();
  }

  notifyAdmins({
    title: order.status === 'awaiting_payment' ? `💳 To'lovni tekshiring #${order.id}` : `🛎 Yangi buyurtma #${order.id}`,
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

// --- To'lov kartalari (admin) ---
app.get('/api/admin/cards', adminOnly, ah(async (_req, res) => res.json(await getCards())));
app.put('/api/admin/cards', adminOnly, ah(async (req, res) => {
  const list = Array.isArray(req.body?.cards) ? req.body.cards : [];
  if (list.length > 10) throw new Biz(400, 'bad_card_number', "Ko'pi bilan 10 ta karta");
  const cards = list.map((c, i) => ({
    id: /^[a-z0-9]{1,12}$/i.test(c?.id || '') ? c.id : `c${Date.now().toString(36)}${i}`,
    number: String(c?.number ?? '').replace(/\D/g, ''),
    holder: String(c?.holder ?? '').trim().slice(0, 60),
    type: PAY_CARDS.includes(c?.type) ? c.type : 'uzcard',
  }));
  if (cards.some((c) => c.number.length !== 16)) throw new Biz(400, 'bad_card_number', "Karta raqami 16 ta raqamdan iborat bo'lsin");
  if (new Set(cards.map((c) => c.id)).size !== cards.length) throw new Biz(400, 'bad_card_number', 'Takroriy karta');
  const activeId = cards.some((c) => c.id === req.body?.activeId) ? req.body.activeId : cards[0]?.id || '';
  for (const [k, v] of [['pay_cards', cards], ['pay_card_active', activeId]]) {
    await q('insert into settings(key, value) values($1, $2::jsonb) on conflict (key) do update set value = excluded.value', [k, JSON.stringify(v)]);
  }
  // Eski bitta-karta kalitlari endi ishlatilmaydi: bo'sh karta ro'yxati eskisini qayta tiklab qo'ymasin
  await q("delete from settings where key in ('pay_card_number', 'pay_card_holder', 'pay_card_type')");
  res.json({ cards, activeId });
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

// --- Promokodlar (admin) ---
const toCode = (r) => ({
  id: r.id, code: r.code, type: r.type, value: r.value, minTotal: r.min_total, maxUses: r.max_uses,
  usedCount: r.used_count, endsAt: r.ends_at, active: r.active, createdAt: iso(r.created_at),
  live: codeLive(r) && !codeExhausted(r),
});
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // o/0, i/1 kabi adashtiradigan belgilarsiz
const randomCode = () => Array.from(crypto.randomBytes(7), (b) => ALPHABET[b % ALPHABET.length]).join('');

function readCode(b) {
  const type = b.type;
  const value = Math.round(Number(b.value));
  if (!['percent', 'amount'].includes(type) || !(value >= 1) || (type === 'percent' && value > 90) || value > 100_000_000) {
    throw new Biz(400, 'bad_promo', "Chegirma noto'g'ri");
  }
  const minTotal = b.minTotal === '' || b.minTotal == null ? 0 : Math.round(Number(b.minTotal));
  if (!(minTotal >= 0) || minTotal > 100_000_000) throw new Biz(400, 'bad_promo', "Chegirma noto'g'ri");
  const maxUses = b.maxUses === '' || b.maxUses == null ? null : Math.floor(Number(b.maxUses));
  if (maxUses !== null && !(maxUses >= 1 && maxUses <= 1_000_000)) throw new Biz(400, 'bad_qty', "Miqdor noto'g'ri");
  const endsAt = /^\d{4}-\d{2}-\d{2}$/.test(b.endsAt || '') ? b.endsAt : '';
  return { type, value, minTotal, maxUses, endsAt };
}

app.get('/api/admin/codes', adminOnly, ah(async (_req, res) => {
  res.json((await q('select * from promo_codes order by id desc')).rows.map(toCode));
}));

app.post('/api/admin/codes', adminOnly, ah(async (req, res) => {
  const b = req.body || {};
  const code = normCode(b.code) || randomCode();
  if (!CODE_RE.test(code)) throw new Biz(400, 'bad_code', "Promokod 3–20 ta lotin harf, raqam, - yoki _ bo'lsin");
  const d = readCode(b);
  try {
    const { rows } = await q(
      'insert into promo_codes(code, type, value, min_total, max_uses, ends_at) values($1,$2,$3,$4,$5,$6) returning *',
      [code, d.type, d.value, d.minTotal, d.maxUses, d.endsAt]
    );
    res.status(201).json(toCode(rows[0]));
  } catch (e) {
    if (e.code === '23505') throw new Biz(409, 'code_exists', 'Bunday promokod bor');
    throw e;
  }
}));

app.patch('/api/admin/codes/:id', adminOnly, ah(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || typeof req.body?.active !== 'boolean') throw new Biz(400, 'not_found', 'Topilmadi');
  const { rows } = await q('update promo_codes set active = $2 where id = $1 returning *', [id, req.body.active]);
  if (!rows[0]) throw new Biz(404, 'not_found', 'Topilmadi');
  res.json(toCode(rows[0]));
}));

app.delete('/api/admin/codes/:id', adminOnly, ah(async (req, res) => {
  const id = Number(req.params.id);
  const r = Number.isInteger(id) ? await q('delete from promo_codes where id = $1', [id]) : { rowCount: 0 };
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
  if (err instanceof Biz) return res.status(err.status).json({ code: err.code, error: err.message, ...err.extra });
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
