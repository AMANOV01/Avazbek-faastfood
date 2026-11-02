import { defineStore } from 'pinia';

const KEY = 'avazbek_cart_v1';

export const useCartStore = defineStore('cart', {
  state: () => ({
    lines: JSON.parse(localStorage.getItem(KEY) || '[]'), // [{id, name, price, qty}]
  }),
  getters: {
    count: (s) => s.lines.reduce((n, l) => n + l.qty, 0),
    subtotal: (s) => s.lines.reduce((n, l) => n + l.price * l.qty, 0),
  },
  actions: {
    persist() {
      localStorage.setItem(KEY, JSON.stringify(this.lines));
    },
    qtyOf(id) {
      return this.lines.find((l) => l.id === id)?.qty || 0;
    },
    add(p) {
      const line = this.lines.find((l) => l.id === p.id);
      if (line) line.qty++;
      else this.lines.push({ id: p.id, name: p.name, price: p.price, qty: 1 });
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
