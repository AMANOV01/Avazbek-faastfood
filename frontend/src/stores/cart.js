import { defineStore } from 'pinia';
import { useMenuStore } from './menu';
import { unitPrice } from '../utils/promo';

const KEY = 'avazbek_cart_v1';

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]').map((l) => ({ id: l.id, qty: l.qty }));
  } catch {
    return [];
  }
}

export const useCartStore = defineStore('cart', {
  state: () => ({ lines: read() }), // [{id, qty}] — narx va nom menyudan olinadi
  getters: {
    // Menyudan o'chirilgan yoki sotuvdan olingan mahsulotlar savatda ko'rinmaydi
    detail() {
      const menu = useMenuStore();
      if (!menu.loaded) return [];
      return this.lines
        .map((l) => {
          const product = menu.productById(l.id);
          if (!product) return null;
          const unit = unitPrice(product, l.qty, menu.promos);
          return { id: l.id, product, qty: l.qty, base: product.price, unit, total: unit * l.qty, saved: (product.price - unit) * l.qty };
        })
        .filter(Boolean);
    },
    count() {
      const menu = useMenuStore();
      return menu.loaded ? this.detail.reduce((n, l) => n + l.qty, 0) : this.lines.reduce((n, l) => n + l.qty, 0);
    },
    subtotal() {
      return this.detail.reduce((n, l) => n + l.total, 0);
    },
    discount() {
      return this.detail.reduce((n, l) => n + l.saved, 0);
    },
  },
  actions: {
    persist() {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.lines));
      } catch {
        /* saqlab bo'lmasa ham ishlayveradi */
      }
    },
    qtyOf(id) {
      return this.lines.find((l) => l.id === id)?.qty || 0;
    },
    add(p) {
      const line = this.lines.find((l) => l.id === p.id);
      if (line) line.qty = Math.min(50, line.qty + 1);
      else this.lines.push({ id: p.id, qty: 1 });
      this.persist();
    },
    remove(id) {
      const i = this.lines.findIndex((l) => l.id === id);
      if (i === -1) return;
      if (this.lines[i].qty > 1) this.lines[i].qty--;
      else this.lines.splice(i, 1);
      this.persist();
    },
    clear() {
      this.lines = [];
      this.persist();
    },
  },
});
