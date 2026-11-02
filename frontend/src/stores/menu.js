import { defineStore } from 'pinia';
import { api } from '../api';

export const useMenuStore = defineStore('menu', {
  state: () => ({ categories: [], products: [], brand: null, loaded: false, error: '' }),
  actions: {
    async load() {
      if (this.loaded) return;
      try {
        const [categories, products, brand] = await Promise.all([
          api.categories(),
          api.products(),
          api.brand(),
        ]);
        Object.assign(this, { categories, products, brand, loaded: true, error: '' });
      } catch (e) {
        this.error = e.message;
      }
    },
    byCategory(id) {
      return this.products.filter((p) => p.category === id);
    },
  },
});
