import { t } from './i18n';

async function request(url, options = {}) {
  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
  } catch {
    throw new Error(t('err.network'));
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Server xato kodini yuboradi — matn foydalanuvchi tilida chiqadi
    const key = `err.${data.code}`;
    const msg = t(key) !== key ? t(key) : data.error || t('err.generic');
    throw Object.assign(new Error(msg), { code: data.code, status: res.status });
  }
  return data;
}

const A = (pw) => ({ 'x-admin-password': pw });
const body = (b) => JSON.stringify(b);

export const api = {
  brand: () => request('/api/brand'),
  categories: () => request('/api/categories'),
  products: () => request('/api/products'),
  promos: () => request('/api/promos'),
  pushKey: () => request('/api/push/key'),
  createOrder: (b) => request('/api/orders', { method: 'POST', body: body(b) }),
  lookupOrders: (orders) => request('/api/orders/lookup', { method: 'POST', body: body({ orders }) }),
  attachPush: (id, token, subscription, lang) =>
    request(`/api/orders/${id}/push`, { method: 'POST', body: body({ token, subscription, lang }) }),

  adminLogin: (password) => request('/api/admin/login', { method: 'POST', body: body({ password }) }),
  adminOrders: (pw) => request('/api/admin/orders', { headers: A(pw) }),
  adminSetStatus: (pw, id, status) =>
    request(`/api/admin/orders/${id}`, { method: 'PATCH', headers: A(pw), body: body({ status }) }),
  adminPushSubscribe: (pw, subscription) =>
    request('/api/admin/push/subscribe', { method: 'POST', headers: A(pw), body: body({ subscription }) }),

  adminProducts: (pw) => request('/api/admin/products', { headers: A(pw) }),
  adminAddProduct: (pw, b) => request('/api/admin/products', { method: 'POST', headers: A(pw), body: body(b) }),
  adminPatchProduct: (pw, id, b) =>
    request(`/api/admin/products/${id}`, { method: 'PATCH', headers: A(pw), body: body(b) }),
  adminDeleteProduct: (pw, id) => request(`/api/admin/products/${id}`, { method: 'DELETE', headers: A(pw) }),
  adminUpload: (pw, data) => request('/api/admin/upload', { method: 'POST', headers: A(pw), body: body({ data }) }),

  adminPromos: (pw) => request('/api/admin/promos', { headers: A(pw) }),
  adminAddPromo: (pw, b) => request('/api/admin/promos', { method: 'POST', headers: A(pw), body: body(b) }),
  adminPatchPromo: (pw, id, b) =>
    request(`/api/admin/promos/${id}`, { method: 'PATCH', headers: A(pw), body: body(b) }),
  adminDeletePromo: (pw, id) => request(`/api/admin/promos/${id}`, { method: 'DELETE', headers: A(pw) }),
};

export const money = (n) => new Intl.NumberFormat('ru-RU').format(n).replace(/\s/g, ' ');
