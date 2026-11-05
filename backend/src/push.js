// Web Push (telefon/kompyuter bildirishnomalari)
// VAPID kalitlari birinchi ishga tushishda avtomatik yaratiladi va db.json da saqlanadi.
// Ishonchli bo'lishi uchun VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY ni muhit o'zgaruvchisi sifatida ham berish mumkin.
import webpush from 'web-push';
import { db, save } from './db.js';

let keys;
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  keys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
} else {
  if (!db.vapid) {
    db.vapid = webpush.generateVAPIDKeys();
    save();
  }
  keys = db.vapid;
}
webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'https://avazbek.uz', keys.publicKey, keys.privateKey);

export const publicKey = keys.publicKey;

function isValidSub(sub) {
  return (
    sub && typeof sub.endpoint === 'string' && sub.endpoint.startsWith('https://') &&
    sub.endpoint.length < 600 && sub.keys && typeof sub.keys.p256dh === 'string' && typeof sub.keys.auth === 'string'
  );
}
export function cleanSub(sub) {
  if (!isValidSub(sub)) return null;
  return { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } };
}

// Bitta obunaga yuborish. Obuna o'lik bo'lsa (404/410) — true qaytaradi (o'chirish kerak).
async function sendOne(sub, payload) {
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 60 * 60 * 24 });
    return false;
  } catch (e) {
    return e.statusCode === 404 || e.statusCode === 410;
  }
}

export async function notifyAdmins(payload) {
  const dead = [];
  await Promise.all(
    db.adminPush.map(async (sub) => {
      if (await sendOne(sub, payload)) dead.push(sub.endpoint);
    })
  );
  if (dead.length) {
    db.adminPush = db.adminPush.filter((s) => !dead.includes(s.endpoint));
    save();
  }
}

export async function notifyCustomer(order, payload) {
  if (!order.push) return;
  if (await sendOne(order.push, payload)) {
    order.push = null;
    save();
  }
}

// Mijozga yuboriladigan matnlar (buyurtma berilgan paytdagi tilda)
const STATUS_TEXT = {
  cooking: {
    uz: 'Buyurtmangiz tayyorlanmoqda 🔥',
    ru: 'Ваш заказ готовится 🔥',
    en: 'Your order is being prepared 🔥',
  },
  delivering: {
    uz: "Buyurtmangiz yo'lda 🛵",
    ru: 'Ваш заказ в пути 🛵',
    en: 'Your order is on the way 🛵',
  },
  done: {
    uz: 'Buyurtmangiz yakunlandi. Yoqimli ishtaha!',
    ru: 'Заказ выполнен. Приятного аппетита!',
    en: 'Order completed. Enjoy your meal!',
  },
  cancelled: {
    uz: 'Buyurtmangiz bekor qilindi',
    ru: 'Ваш заказ отменён',
    en: 'Your order was cancelled',
  },
};

export function statusPayload(order) {
  const t = STATUS_TEXT[order.status];
  if (!t) return null;
  const lang = t[order.lang] ? order.lang : 'uz';
  return {
    title: `AVAZBEK LAVASH · #${order.id}`,
    body: t[lang],
    url: `/order/${order.id}`,
    tag: `order-${order.id}`,
    kind: 'status',
    orderId: order.id,
    status: order.status,
  };
}
