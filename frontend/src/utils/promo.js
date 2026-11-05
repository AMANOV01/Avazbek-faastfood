// Aksiya hisob-kitobi. Backend (server.js → unitPrice) bilan bir xil bo'lishi shart.
import { t, formatDay } from '../i18n';
import { money } from '../api';

export function unitPrice(product, qty, promos) {
  let best = product.price;
  for (const pr of promos) {
    if (pr.productId !== product.id || qty < pr.minQty) continue;
    const raw = pr.type === 'percent' ? (product.price * (100 - pr.value)) / 100 : product.price - pr.value;
    best = Math.min(best, Math.max(0, Math.round(raw / 100) * 100));
  }
  return best;
}

export const promosOf = (productId, promos) =>
  promos.filter((p) => p.productId === productId).sort((a, b) => a.minQty - b.minQty);

export function promoText(pr) {
  return t(pr.type === 'percent' ? 'promo.pct' : 'promo.amt', {
    n: pr.minQty,
    v: pr.type === 'percent' ? pr.value : money(pr.value),
  });
}
export function promoShort(pr) {
  return t(pr.type === 'percent' ? 'promo.short.pct' : 'promo.short.amt', {
    v: pr.type === 'percent' ? pr.value : money(pr.value),
  });
}
export const untilText = (pr) => (pr.endsAt ? t('promo.until', { date: formatDay(pr.endsAt) }) : '');
