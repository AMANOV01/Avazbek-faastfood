import { defineStore } from 'pinia';

// Sahifa ichidagi qisqa xabarlar (toast)
let seq = 0;
export const useNotifyStore = defineStore('notify', {
  state: () => ({ toasts: [] }),
  actions: {
    push({ title, body = '', kind = 'info', key = '', ms = 8000 }) {
      if (key && this.toasts.some((t) => t.key === key)) return;
      const id = ++seq;
      this.toasts.push({ id, key, title, body, kind });
      setTimeout(() => this.dismiss(id), ms);
    },
    dismiss(id) {
      this.toasts = this.toasts.filter((t) => t.id !== id);
    },
  },
});
