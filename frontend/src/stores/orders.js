import { defineStore } from 'pinia';
import { api } from '../api';
import { t } from '../i18n';
import { useNotifyStore } from './notify';
import { getSubscription } from '../utils/push';
import { lang } from '../i18n';

const MINE = 'avz_orders';
const SEEN = 'avz_order_seen';
const FINAL = ['done', 'cancelled'];

const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* saqlab bo'lmasa ham ishlayveradi */
  }
};

export const useOrdersStore = defineStore('orders', {
  // mine: shu brauzerda berilgan buyurtmalar [{id, token}], data: serverdan kelgan holatlar
  state: () => ({ mine: read(MINE, []), data: {}, seen: read(SEEN, {}), ready: false, timer: null }),
  getters: {
    list: (s) => s.mine.map((m) => s.data[m.id]).filter(Boolean).sort((a, b) => b.id - a.id),
    activeCount() {
      return this.list.filter((o) => !FINAL.includes(o.status)).length;
    },
  },
  actions: {
    remember(order) {
      this.mine.push({ id: order.id, token: order.token });
      this.data[order.id] = order;
      this.seen[order.id] = order.status;
      write(MINE, this.mine);
      write(SEEN, this.seen);
    },

    async refresh() {
      if (!this.mine.length) {
        this.ready = true;
        return;
      }
      // Yakunlangan buyurtmalarni qayta so'ramaymiz (birinchi yuklashdan tashqari)
      const need = this.mine.filter((m) => !this.data[m.id] || !FINAL.includes(this.data[m.id].status));
      if (!need.length) return;
      try {
        const fresh = await api.lookupOrders(need);
        const notify = useNotifyStore();
        const found = new Set(fresh.map((o) => o.id));
        for (const o of fresh) {
          this.data[o.id] = o;
          const before = this.seen[o.id];
          if (before && before !== o.status) {
            notify.push({
              kind: 'status',
              key: `status-${o.id}-${o.status}`,
              title: t('toast.status', { id: o.id, status: t(`status.${o.status}`) }),
            });
          }
          this.seen[o.id] = o.status;
        }
        // Server tomonda topilmagan (ma'lumot tozalangan) buyurtmalarni ro'yxatdan olib tashlaymiz
        const gone = need.filter((m) => !found.has(m.id)).map((m) => m.id);
        if (gone.length) {
          this.mine = this.mine.filter((m) => !gone.includes(m.id));
          write(MINE, this.mine);
        }
        write(SEEN, this.seen);
      } catch {
        /* tarmoq vaqtincha uzilgan — keyingi urinishda */
      } finally {
        this.ready = true;
      }
    },

    start() {
      this.refresh();
      clearInterval(this.timer);
      this.timer = setInterval(() => {
        if (!document.hidden) this.refresh();
      }, 10000);
      document.addEventListener('visibilitychange', () => !document.hidden && this.refresh());
    },

    // Bildirishnoma yoqilganda barcha faol buyurtmalarga biriktiramiz
    async enablePush() {
      const sub = await getSubscription({ ask: true });
      if (!sub) return false;
      const active = this.mine.filter((m) => !FINAL.includes(this.data[m.id]?.status));
      await Promise.all(active.map((m) => api.attachPush(m.id, m.token, sub, lang.value).catch(() => {})));
      return true;
    },
    async attachTo(order, sub) {
      if (sub) await api.attachPush(order.id, order.token, sub, lang.value).catch(() => {});
    },
  },
});
