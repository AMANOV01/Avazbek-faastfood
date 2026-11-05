import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { products, namesFor } from './menu.js';

export const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
export const uploadsDir = path.join(dataDir, 'uploads');
const file = path.join(dataDir, 'db.json');

function load() {
  fs.mkdirSync(uploadsDir, { recursive: true });
  let state;
  if (fs.existsSync(file)) {
    state = JSON.parse(fs.readFileSync(file, 'utf8'));
  } else {
    state = { products, orders: [], nextOrderId: 1 };
  }

  // Eski db.json fayllarini yangi tuzilishga o'tkazish (ma'lumot yo'qolmaydi)
  state.products ||= [];
  state.orders ||= [];
  state.nextOrderId ||= 1;
  state.promos ||= [];
  state.adminPush ||= [];
  for (const p of state.products) {
    p.names = { ...namesFor(p.name), ...(p.names || {}) };
    p.names.uz = p.name;
    p.image ||= '';
  }
  const maxProduct = state.products.reduce((m, p) => Math.max(m, p.id), 0);
  state.nextProductId = Math.max(state.nextProductId || 0, maxProduct + 1);
  const maxPromo = state.promos.reduce((m, p) => Math.max(m, p.id), 0);
  state.nextPromoId = Math.max(state.nextPromoId || 0, maxPromo + 1);
  return state;
}

const state = load();

export const db = state;
export function save() {
  // Avval vaqtinchalik faylga yozamiz — server o'chib qolsa ham db.json buzilmaydi
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, file);
}
save();
