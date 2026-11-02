import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { db, save } from './db.js';
import { categories, brand } from './menu.js';

const app = express();
const PORT = process.env.PORT || 4000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'avazbek123';
const DELIVERY_FEE = 8000;
const STATUSES = ['new', 'cooking', 'delivering', 'done', 'cancelled'];

app.use(cors());
app.use(express.json());

function adminOnly(req, res, next) {
  if (req.headers['x-admin-password'] !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Parol noto\'g\'ri' });
  }
  next();
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

app.post('/api/orders', (req, res) => {
  const { name, phone, address, comment, type, items } = req.body || {};
  if (!name || !phone) return res.status(400).json({ error: 'Ism va telefon kerak' });
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Savat bo\'sh' });
  }
  const delivery = type === 'delivery';
  if (delivery && !address) return res.status(400).json({ error: 'Manzil kerak' });

  const lines = [];
  for (const it of items) {
    const p = db.products.find((x) => x.id === Number(it.productId) && x.available);
    const qty = Math.floor(Number(it.qty));
    if (!p || !(qty > 0 && qty <= 50)) {
      return res.status(400).json({ error: 'Noto\'g\'ri mahsulot yoki miqdor' });
    }
    lines.push({ productId: p.id, name: p.name, price: p.price, qty });
  }
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const order = {
    id: db.nextOrderId++,
    name: String(name).slice(0, 80),
    phone: String(phone).slice(0, 30),
    address: delivery ? String(address).slice(0, 200) : '',
    comment: String(comment || '').slice(0, 300),
    type: delivery ? 'delivery' : 'pickup',
    items: lines,
    subtotal,
    deliveryFee: delivery ? DELIVERY_FEE : 0,
    total: subtotal + (delivery ? DELIVERY_FEE : 0),
    status: 'new',
    createdAt: new Date().toISOString(),
  };
  db.orders.unshift(order);
  save();
  res.status(201).json(order);
});

app.get('/api/orders/:id', (req, res) => {
  const order = db.orders.find((o) => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ error: 'Topilmadi' });
  res.json({ id: order.id, status: order.status, total: order.total, createdAt: order.createdAt });
});

// ---------- Admin API ----------
app.post('/api/admin/login', (req, res) => {
  if (req.body?.password === ADMIN_PASSWORD) return res.json({ ok: true });
  res.status(401).json({ error: 'Parol noto\'g\'ri' });
});

app.get('/api/admin/orders', adminOnly, (_req, res) => res.json(db.orders));

app.patch('/api/admin/orders/:id', adminOnly, (req, res) => {
  const order = db.orders.find((o) => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ error: 'Topilmadi' });
  if (!STATUSES.includes(req.body?.status)) {
    return res.status(400).json({ error: 'Noto\'g\'ri holat' });
  }
  order.status = req.body.status;
  save();
  res.json(order);
});

app.get('/api/admin/products', adminOnly, (_req, res) => res.json(db.products));

app.patch('/api/admin/products/:id', adminOnly, (req, res) => {
  const p = db.products.find((x) => x.id === Number(req.params.id));
  if (!p) return res.status(404).json({ error: 'Topilmadi' });
  const { price, available } = req.body || {};
  if (price !== undefined) {
    if (!(Number(price) >= 0)) return res.status(400).json({ error: 'Narx noto\'g\'ri' });
    p.price = Math.round(Number(price));
  }
  if (available !== undefined) p.available = Boolean(available);
  save();
  res.json(p);
});

// ---------- Production: tayyor Vue saytini shu serverdan berish ----------
// `frontend` papkasida `npm run build` qilingandan keyin ishlaydi.
const distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'frontend', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, { maxAge: '7d', index: false }));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`AVAZBEK API: http://localhost:${PORT}  (admin parol: ${ADMIN_PASSWORD})`);
});
