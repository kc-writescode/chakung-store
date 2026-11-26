// Service Worker for Chakung Store Web Push Notifications
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: "🏔️ Chakung Store", body: event.data.text() };
    }
  }

  const title = data.title || "🏔️ New Order — Chakung Store";
  const options = {
    body: data.body || "A new village produce harvest order was placed.",
    icon: data.icon || "/products/dalle-khursani.jpg",
    badge: data.badge || "/products/dalle-khursani.jpg",
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || "/staff",
    },
    actions: [
      { action: "open", title: "View Order" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/staff";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/staff") && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
