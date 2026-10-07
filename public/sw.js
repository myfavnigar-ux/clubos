self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {}
  const url =
    typeof data.url === "string" && data.url.startsWith("/#")
      ? data.url
      : "/#registrations";
  event.waitUntil(
    self.registration.showNotification(
      String(data.title || "ClubOS update").slice(0, 100),
      {
        body: String(data.body || "Open ClubOS for your latest updates.").slice(
          0,
          300,
        ),
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: String(data.tag || "clubos-update"),
        data: { url },
      },
    ),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const url = new URL(
        event.notification.data?.url || "/#registrations",
        self.location.origin,
      ).href;
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of all) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
// No app or API caching: private profile/payment data stays out of service-worker caches.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
