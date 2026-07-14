self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : 'You have a new XMUM Hangouts update.' };
  }

  const title = payload.title || 'XMUM Hangouts';
  const options = {
    body: payload.body || 'You have a new update.',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag || 'xmum-hangouts-update',
    renotify: Boolean(payload.renotify),
    data: {
      url: payload.url || '/',
      notificationId: payload.notificationId || null
    }
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      typeof self.registration.setAppBadge === 'function' && Number.isFinite(payload.badgeCount)
        ? self.registration.setAppBadge(payload.badgeCount)
        : Promise.resolve()
    ])
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const sameOriginClient = clientList.find(client => new URL(client.url).origin === self.location.origin);
      if (sameOriginClient) {
        return sameOriginClient.navigate(targetUrl).then(client => client.focus());
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
