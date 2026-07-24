/* HiFIS 서비스워커 — 웹푸시 수신 표시 + 클릭 시 딥링크 이동.
 * 서버 payload: { type, title, body, link } (app/services/notifications.py).
 * 정적 캐싱은 안 함(오프라인 캐시 필요해지면 여기 확장). 설치 즉시 활성화.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: event.data && event.data.text ? event.data.text() : "HiFIS" };
  }
  const title = data.title || "HiFIS";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { link: data.link || "/" },
    // 같은 종류 알림은 하나로 갱신(채팅 등 연속 알림 폭주 완화). 유형 없으면 개별 표시.
    tag: data.type || undefined,
    renotify: Boolean(data.type),
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // 이미 열린 창이 있으면 그 창을 링크로 이동 + 포커스
      for (const client of clientList) {
        if ("focus" in client) {
          if ("navigate" in client) client.navigate(link).catch(() => {});
          return client.focus();
        }
      }
      // 없으면 새 창
      if (self.clients.openWindow) return self.clients.openWindow(link);
    }),
  );
});
