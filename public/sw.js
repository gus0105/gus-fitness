self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Handle push notifications from server
self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Gus Coach', {
      body: data.body || '',
      icon: '/apple-touch-icon.png',
      badge: '/apple-touch-icon.png',
      tag: data.tag || 'gus-coach',
      renotify: true,
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || '/'));
});
