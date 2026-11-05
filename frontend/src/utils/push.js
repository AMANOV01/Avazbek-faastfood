// Brauzer bildirishnomalari (Web Push). Hamma funksiya xatoda null qaytaradi — buyurtma jarayoniga xalaqit bermaydi.
import { api } from '../api';

const KEY_STORE = 'avz_push_key';

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const permission = () => (pushSupported() ? Notification.permission : 'unsupported');

// iPhone'da Safari oddiy sahifada bildirishnomani qo'llamaydi (faqat "Ekranga qo'shilgan" ilovada)
export const isIosBrowser = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches;

function keyToBytes(b64) {
  const s = (b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

export async function registerWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

// ask=true bo'lsa ruxsat so'raydi (faqat tugma bosilganda chaqiring)
export async function getSubscription({ ask = false } = {}) {
  if (!pushSupported()) return null;
  try {
    if (Notification.permission === 'default' && ask) await Notification.requestPermission();
    if (Notification.permission !== 'granted') return null;

    await registerWorker();
    const reg = await navigator.serviceWorker.ready;
    const { key } = await api.pushKey();
    let sub = await reg.pushManager.getSubscription();
    // Server kaliti almashgan bo'lsa (masalan ma'lumotlar tozalangan), eski obuna ishlamaydi
    if (sub && localStorage.getItem(KEY_STORE) !== key) {
      await sub.unsubscribe();
      sub = null;
    }
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(key) });
      localStorage.setItem(KEY_STORE, key);
    }
    return sub.toJSON();
  } catch {
    return null;
  }
}

export function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1175].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.connect(g);
      g.connect(ctx.destination);
      const t0 = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
      o.start(t0);
      o.stop(t0 + 0.18);
    });
  } catch {
    /* ovoz chalib bo'lmasa ham muammo emas */
  }
}
