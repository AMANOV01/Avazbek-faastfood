import { defineStore } from 'pinia';
import { api } from '../api';

export const useMenuStore = defineStore('menu', {
  state: () => ({ categories: [], products: [], promos: [], brand: null, loaded: false, error: '' }),
  getters: {
    deliveryFee: (s) => s.brand?.deliveryFee ?? 8000,
    productById: (s) => (id) => s.products.find((p) => p.id === id),
    // Faqat mahsuloti sotuvda bor aksiyalar bannerda ko'rinadi
    livePromos: (s) => s.promos.filter((pr) => s.products.some((p) => p.id === pr.productId)),
  },
  actions: {
    async load() {
      if (this.loaded) return;
      await this.reload();
    },
    // Admin yangi mahsulot/aksiya qo'shsa, mijozda ham o'zi yangilanishi uchun vaqti-vaqti bilan chaqiriladi
    async reload() {
      try {
        const [categories, products, promos, brand] = await Promise.all([
          api.categories(),
          api.products(),
          api.promos(),
          api.brand(),
        ]);
        Object.assign(this, { categories, products, promos, brand, loaded: true, error: '' });
      } catch (e) {
        if (!this.loaded) this.error = e.message;
      }
    },
    byCategory(id) {
      return this.products.filter((p) => p.category === id);
    },
  },
});
