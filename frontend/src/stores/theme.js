import { defineStore } from 'pinia';

const KEY = 'avz_theme';
const NIGHT = '#0b0c0b';
const DAY = '#eef4fb';

function read() {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export const useThemeStore = defineStore('theme', {
  // mode: 'dark' = tun, 'light' = kun.
  // dayImages: public/images/day/ papkasida kunduzgi rasmlar bor-yo'qligi (bor bo'lsa kunduzi o'sha ishlatiladi)
  state: () => ({ mode: read(), dayImages: false }),
  actions: {
    apply() {
      const root = document.documentElement;
      root.setAttribute('data-theme', this.mode);
      root.setAttribute('data-dayimg', this.dayImages ? '1' : '0');
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', this.mode === 'light' ? DAY : NIGHT);
    },
    toggle() {
      this.mode = this.mode === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(KEY, this.mode);
      } catch {
        /* saqlab bo'lmasa ham ishlayveradi */
      }
      this.apply();
    },
    // Kunduzgi rasmlar yuklanganmi? Bitta rasmni sinab ko'ramiz (server bo'lmagan faylga index.html qaytaradi, shuning uchun Image bilan)
    probeDayImages() {
      const img = new Image();
      img.onload = () => {
        this.dayImages = true;
        this.apply();
      };
      img.src = '/images/day/lavash.jpg';
    },
    // Joriy mavzuga mos rasm yo'li: kunduzi kunduzgi rasm (bor bo'lsa), aks holda tungi
    img(name) {
      return `/images/${this.mode === 'light' && this.dayImages ? 'day/' : ''}${name}.jpg`;
    },
    // Kunduzgi rasm topilmasa (masalan bitta fayl yetishmasa) tungisini ko'rsatamiz
    fallback(e) {
      const el = e.target;
      if (el.src.includes('/images/day/')) el.src = el.src.replace('/images/day/', '/images/');
    },
  },
});
