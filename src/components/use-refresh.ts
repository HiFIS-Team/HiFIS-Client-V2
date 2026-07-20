"use client";

import { useCallback, useState } from "react";
import { useToast } from "@/components/toast";

/**
 * 새로고침 버튼 공용 훅.
 *
 * 백엔드가 붙기 전이라 실제로 다시 불러올 데이터는 없다. 그래서
 * - 아이콘을 잠깐 회전시켜(`busy`) "지금 불러오는 중"을 보여주고
 * - `reload`가 있으면 목 데이터를 다시 만들고
 * - 끝나면 토스트로 알린다. (새로고침은 화면에 눈에 띄는 변화가 없어서
 *   토스트가 없으면 눌러도 아무 일도 안 일어난 것처럼 보인다)
 *
 * 백엔드가 붙으면 `reload` 자리에 실제 refetch만 꽂으면 된다.
 */
export function useRefresh(message: string, reload?: () => void) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    if (busy) return;
    setBusy(true);
    reload?.();
    setTimeout(() => {
      setBusy(false);
      show(message);
    }, 600);
  }, [busy, message, reload, show]);

  return { busy, refresh };
}
