"use client";

import { useEffect, useMemo } from "react";

/**
 * 헤더 검색에서 결과를 누르면 "어느 페이지의 무엇"으로 가는지 전달하는 통로.
 *
 * 페이지 이동만으로는 목록에서 그 항목이 선택되지 않으므로, 검색 쪽에서 target을 담아두고
 * 도착한 페이지가 첫 렌더에서 꺼내 초기 state로 쓴다.
 *
 * 설계 메모:
 * - **URL 쿼리(`?id=`) 대신** 모듈 변수를 쓰는 이유: `useSearchParams()`를 정적 프리렌더
 *   페이지의 클라이언트 컴포넌트에서 쓰면 Suspense 경계를 요구해서 빌드가 깨진다.
 * - **Context + useEffect(setState) 대신** "렌더 중 읽기 + 마운트 후 비우기" 구조인 이유:
 *   effect 안에서 setState를 하면 렌더가 두 번 돌고 lint(`set-state-in-effect`)에도 걸린다.
 *   여기선 `useState(nav?.id ?? null)`처럼 **초기값으로만** 쓰므로 그럴 일이 없다.
 * - `peek`은 읽기만 하고 지우지 않는다(StrictMode 이중 렌더에서도 같은 값). 실제 비우기는
 *   마운트 후 effect에서 한 번만 한다.
 */
export type NavTarget = { path: string; id?: string; q?: string };

let pending: NavTarget | null = null;

/** 검색에서 이동 직전에 호출 */
export function setNavTarget(t: NavTarget) {
  pending = t;
}

function peek(path: string): NavTarget | null {
  return pending && pending.path === path ? pending : null;
}

/**
 * 이 페이지로 온 target을 첫 렌더에서 읽는다(없으면 null).
 * 마운트 후 비워서 다음 방문에 다시 걸리지 않게 한다.
 */
export function useNavTargetFor(path: string): NavTarget | null {
  const target = useMemo(() => peek(path), [path]);
  useEffect(() => {
    if (pending && pending.path === path) pending = null;
  }, [path]);
  return target;
}
