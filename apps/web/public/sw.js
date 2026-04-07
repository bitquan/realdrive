self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || "RealDrive";
  const body = payload.body || "You have a new update.";
  const url = payload.url || "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: payload.icon || "/logo.png",
      tag: payload.tag || "realdrive-notification",
      data: {
        url,
        metadata: payload.metadata || null
      }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((client) => "focus" in client);
      if (existing) {
        existing.focus();
        existing.navigate(targetUrl);
        return;
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
