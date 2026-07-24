/**
 * 웹푸시 등록 — 로그인 후 registerPush(), 로그아웃 시 unregisterPush().
 *
 * 흐름: SW 등록 → 알림 권한 요청 → VAPID publicKey 로 pushManager.subscribe →
 *       결과(endpoint,keys)를 POST /push/subscribe 로 서버에 저장.
 * 지원 안 되는 환경(구형 브라우저, 권한 거부, HTTP)에서는 조용히 종료 — 인앱 알림은 그대로 동작.
 *
 * ⚠️ iOS Safari 는 홈 화면에 "앱 추가"(PWA 설치) 상태 + iOS 16.4+ 에서만 웹푸시가 온다.
 *    설치 안 된 iOS 브라우저 탭에서는 구독이 안 만들어질 수 있음(권한/구독 실패 → 조용히 스킵).
 */

import { getVapidPublicKey, subscribePush, unsubscribePush, type PushSubscribeBody } from "@/lib/api/hifis";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function toBody(sub: PushSubscription): PushSubscribeBody | null {
  const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;
  return { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
}

function supported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** 로그인 후 호출 — 이미 구독돼 있으면 서버에만 재등록(소유자 갱신). 실패는 삼킨다. */
export async function registerPush(): Promise<void> {
  if (!supported()) return;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    if (Notification.permission === "denied") return;
    if (Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return;
    }
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const { publicKey } = await getVapidPublicKey();
      // .buffer(ArrayBuffer) 로 넘김 — TS 5.7의 Uint8Array<ArrayBufferLike> ↦ BufferSource 불일치 회피
      const appServerKey = urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer;
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey,
      });
    }
    const body = toBody(sub);
    if (body) await subscribePush(body); // 서버에 소유자(현재 로그인 유저)로 저장/갱신
  } catch {
    /* 미지원·권한거부·네트워크 — 인앱 알림은 그대로라 무시 */
  }
}

/** 로그아웃 시 호출(토큰 살아있을 때) — 이 기기로 더는 푸시 안 오게 서버 구독 삭제. */
export async function unregisterPush(): Promise<void> {
  if (!supported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (!sub) return;
    const body = toBody(sub);
    if (body) await unsubscribePush(body);
  } catch {
    /* best-effort */
  }
}
