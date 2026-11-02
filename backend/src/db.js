import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { products } from './menu.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const file = path.join(dir, 'db.json');

function load() {
  if (!fs.existsSync(file)) {
    fs.mkdirSync(dir, { recursive: true });
    const initial = { products, orders: [], nextOrderId: 1 };
    fs.writeFileSync(file, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const state = load();

export const db = state;
export function save() {
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
}
