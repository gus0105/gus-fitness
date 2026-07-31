self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Handle server push notifications
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

// Schedule local notifications as fallback
self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE_LOCAL') {
    scheduleLocal(e.data.slots);
  }
});

let timers = [];

function scheduleLocal(slots) {
  timers.forEach(t => clearTimeout(t));
  timers = [];
  if (!slots?.length) return;

  slots.forEach(slot => {
    const ms = msUntilTime(slot.time);
    const t = setTimeout(() => {
      self.registration.showNotification(slot.title, {
        body: slot.body,
        icon: '/apple-touch-icon.png',
        badge: '/apple-touch-icon.png',
        tag: `local-${slot.time}`,
        renotify: true,
      });
      // Reschedule for tomorrow
      scheduleLocal(slots);
    }, ms);
    timers.push(t);
  });
}

function msUntilTime(t) {
  const [h, m] = t.split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target - now;
}
