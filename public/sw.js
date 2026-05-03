self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('/'));
});

self.addEventListener('message', e => {
  if (e.data?.type === 'SCHEDULE_NOTIFICATIONS') {
    scheduleAll(e.data.times);
  }
});

const timers = [];

function scheduleAll(times) {
  timers.forEach(t => clearTimeout(t));
  timers.length = 0;

  const messages = {
    '08:00': { title: 'Gus Coach 💪', body: '¿Ya desayunaste? Registra tu desayuno.' },
    '16:00': { title: 'Gus Coach 💪', body: 'Tarde — ¿qué has comido hoy? Regístralo.' },
    '21:00': { title: 'Gus Coach 💪', body: 'Hora del check-in del día. ¿Cómo fue?' },
  };

  times.forEach(time => {
    const msUntil = msUntilTime(time);
    const msg = messages[time] || { title: 'Gus Coach 💪', body: 'Recuerda registrar tu comida.' };
    const t = setTimeout(() => {
      self.registration.showNotification(msg.title, {
        body: msg.body,
        icon: '/apple-touch-icon.png',
        badge: '/apple-touch-icon.png',
        tag: `meal-${time}`,
        renotify: true,
      });
      // Reprogramar para mañana
      scheduleAll(times);
    }, msUntil);
    timers.push(t);
  });
}

function msUntilTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  return target - now;
}
