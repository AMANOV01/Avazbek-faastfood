// Bildirishnomalar uchun service worker (sayt yopiq bo'lsa ham push qabul qiladi)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'AVAZBEK LAVASH', body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    (async () => {
      // Ochiq oynalarga ham xabar beramiz — ular ma'lumotni darhol yangilaydi
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      wins.forEach((w) => w.postMessage({ type: 'push', ...data }));
      await self.registration.showNotification(data.title || 'AVAZBEK LAVASH', {
        body: data.body || '',
        tag: data.tag,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        data: { url: data.url || '/' },
      });
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const w of wins) {
        if (new URL(w.url).pathname === new URL(url).pathname && 'focus' in w) return w.focus();
      }
      return self.clients.openWindow(url);
    })()
  );
});
