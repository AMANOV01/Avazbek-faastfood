async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Xatolik yuz berdi');
  return data;
}

export const api = {
  brand: () => request('/api/brand'),
  categories: () => request('/api/categories'),
  products: () => request('/api/products'),
  createOrder: (body) => request('/api/orders', { method: 'POST', body: JSON.stringify(body) }),
  orderStatus: (id) => request(`/api/orders/${id}`),

  adminLogin: (password) =>
    request('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) }),
  adminOrders: (pw) => request('/api/admin/orders', { headers: { 'x-admin-password': pw } }),
  adminSetStatus: (pw, id, status) =>
    request(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'x-admin-password': pw },
      body: JSON.stringify({ status }),
    }),
  adminProducts: (pw) => request('/api/admin/products', { headers: { 'x-admin-password': pw } }),
  adminPatchProduct: (pw, id, body) =>
    request(`/api/admin/products/${id}`, {
      method: 'PATCH',
      headers: { 'x-admin-password': pw },
      body: JSON.stringify(body),
    }),
};

export const money = (n) => new Intl.NumberFormat('ru-RU').format(n).replace(/ /g, ' ');
