import { defineStore } from 'pinia';

const KEY = 'avz_theme';

function read() {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export const useThemeStore = defineStore('theme', {
  state: () => ({ mode: read() }), // 'dark' = tun, 'light' = kun
  actions: {
    apply() {
      document.documentElement.setAttribute('data-theme', this.mode);
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
  },
});
