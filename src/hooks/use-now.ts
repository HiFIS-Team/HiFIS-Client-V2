"use client";

import { useSyncExternalStore } from "react";

/**
 * 매초 갱신되는 현재 시각(ms). 클라이언트 마운트 전(SSR·하이드레이션)에는 0.
 *
 * useSyncExternalStore 로 구현 → 시계/시간대 인사를 effect 내부 setState 없이(=set-state-in-effect 회피)
 * 그리며, 앱 전체가 setInterval 하나만 공유한다(구독자 0이면 타이머 정지).
 *   - getServerSnapshot=0, 최초 클라 스냅샷도 0 → 서버 마크업과 일치(하이드레이션 불일치 없음).
 *   - 구독 직후 즉시 1회 tick → placeholder(0)에서 실제 시각으로 전환.
 * 소비 측은 `const now = useNow(); const d = now ? new Date(now) : null;` 처럼 쓴다.
 * (new Date(number) 는 인자 결정적이라 render 에서 호출해도 순수.)
 */

let current = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function tick() {
  current = Date.now();
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!timer) {
    timer = setInterval(tick, 1000);
    // 첫 구독 시 마이크로태스크로 즉시 1회 갱신(1초 기다리지 않고 실시각 반영)
    Promise.resolve().then(tick);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

const getSnapshot = () => current;
const getServerSnapshot = () => 0;

export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
