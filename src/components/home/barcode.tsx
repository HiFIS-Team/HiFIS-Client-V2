"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

/**
 * 실제 Code128 바코드 렌더 (지점 스캐너가 읽는 값).
 * jsbarcode 가 SVG 를 그린 뒤, 생성된 픽셀 크기를 viewBox 로 옮기고
 * width/height 속성을 제거해 CSS(`w-full` 등)로 반응형 스케일되게 한다.
 * (막대 폭 비율은 x 균등 스케일이라 보존 → 스캔 가능)
 */
export function Barcode({ value, className }: { value: string; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg || !value) return;
    try {
      JsBarcode(svg, value, {
        format: "CODE128",
        displayValue: false,
        width: 2,
        height: 100,
        margin: 0,
        background: "transparent",
        lineColor: "#000000",
      });
      // jsbarcode 가 viewBox="0 0 W H"(숫자, 정확)를 이미 설정한다 — 그대로 두고,
      // 고정 px 크기(width/height "…px")만 제거 + none 으로 카드 너비에 꽉 채운다.
      // ⚠️ getAttribute("width")는 "174px"라 그걸 viewBox 에 넣으면 무효 → 바코드가 한쪽으로 치우침.
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      svg.setAttribute("preserveAspectRatio", "none");
    } catch {
      /* 유효하지 않은 값 — 빈 상태 유지 */
    }
  }, [value]);

  return <svg ref={ref} className={className} aria-label={`바코드 ${value}`} />;
}
