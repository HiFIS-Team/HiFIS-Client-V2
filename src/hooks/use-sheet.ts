"use client";

import { useState } from "react";

/**
 * 바텀시트(아래에서 올라오는 것)의 열림/닫힘 애니메이션.
 *
 * 문제: `{open && <Sheet/>}`는 닫는 순간 바로 언마운트돼서 닫힘 애니메이션이 안 나온다(깜빡 사라짐).
 * 해결: 닫는 동안 잠깐 더 마운트해두고 아래로 내려가는 애니메이션을 재생한 뒤, 끝나면 언마운트한다.
 *
 * ⚠️ lint 회피: `useEffect + setState`(set-state-in-effect)를 쓰지 않는다.
 *   - 마운트: 렌더 중 조건부 setState (React의 "prop 바뀔 때 state 조정" 정석 패턴)
 *   - 언마운트: 시트 요소의 `onAnimationEnd`(이벤트)에서 처리
 *
 * 사용:
 *   const sheet = useSheet(open);
 *   {sheet.mounted && (
 *     <div className="overlay-frame fixed ...">
 *       <button className={sheet.closing ? "animate-fade-out" : "animate-fade-in"} onClick={close} />
 *       <div className={sheet.closing ? "animate-sheet-down" : "animate-sheet-up"} {...sheet.sheetProps}>...</div>
 *     </div>
 *   )}
 */
export function useSheet(open: boolean) {
  const [mounted, setMounted] = useState(open);

  // 열리면 즉시 마운트 (렌더 중 조건부 set — 무한 루프 없음)
  if (open && !mounted) setMounted(true);

  const closing = mounted && !open;

  // 닫힘 애니메이션이 끝나면 언마운트. (자식 애니메이션이 버블링될 수 있어 sheet-down만 처리)
  const sheetProps = {
    onAnimationEnd: (e: React.AnimationEvent) => {
      if (closing && e.animationName.includes("sheet-down")) setMounted(false);
    },
  };

  return { mounted, closing, sheetProps };
}
