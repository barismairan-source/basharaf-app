// sw-push.js — minimal Web Push service worker for با شرف.
// Only handles push delivery + notification click; no offline caching.

self.addEventListener('push', (event) => {
  let data = { title: 'با شرف', body: '', url: '/dashboard' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // non-JSON payload — keep defaults
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      dir: 'rtl',
      lang: 'fa',
      data: { url: data.url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
