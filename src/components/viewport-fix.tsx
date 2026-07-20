"use client";

import { useEffect } from "react";

/**
 * 키보드가 올라올 때 화면이 깨지는 문제 해결.
 *
 * iOS Safari는 키보드가 떠도 `100dvh`(레이아웃 뷰포트)가 줄지 않는다.
 * → 하단탭·입력바 같은 하단 고정 요소가 키보드 뒤로 숨거나 화면이 밀려 올라간다.
 * VisualViewport로 "실제로 보이는 높이"를 재서 CSS 변수에 넣고,
 * 프레임/오버레이가 그 높이를 쓰도록 한다. (globals.css의 .app-frame / .overlay-frame)
 *
 * - `--app-height` : 실제 보이는 뷰포트 높이
 * - `--kb`         : 키보드 높이
 * - `data-kb="open"` : 키보드 열림 (하단탭 숨김 등에 사용)
 */
export function ViewportFix() {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;

    if (!vv) {
      root.style.setProperty("--app-height", "100dvh");
      root.style.setProperty("--kb", "0px");
      return;
    }

    const apply = () => {
      const kb = Math.max(0, window.innerHeight - vv.height);
      root.style.setProperty("--app-height", `${vv.height}px`);
      root.style.setProperty("--kb", `${kb}px`);
      // 80px 이상 줄었으면 키보드로 간주 (주소창 접힘 등과 구분)
      if (kb > 80) root.setAttribute("data-kb", "open");
      else root.removeAttribute("data-kb");
    };

    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    window.addEventListener("orientationchange", apply);

    // 포커스된 입력창이 키보드에 가리지 않게 스크롤
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t || typeof t.matches !== "function") return;
      if (!t.matches("input, textarea, [contenteditable]")) return;
      // 키보드 애니메이션이 끝난 뒤 위치를 잡아야 정확함
      setTimeout(() => t.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
    };
    document.addEventListener("focusin", onFocusIn);

    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
      window.removeEventListener("orientationchange", apply);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  return null;
}
