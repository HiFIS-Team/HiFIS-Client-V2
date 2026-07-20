// 바코드 (고정 패턴 목업) — 교대로 [막대, 공백] 폭. 짝수 인덱스 = 검정 막대.
const MODULES = [
  3, 1, 1, 2, 1, 3, 1, 1, 2, 2, 1, 3, 2, 1, 1, 1, 3, 1, 2, 1, 1, 2, 3, 1, 1, 3,
  1, 2, 2, 1, 1, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 1, 1, 2, 1, 3, 2, 1,
  1, 3, 1, 2, 2, 1, 1, 3,
];

export function Barcode({ className }: { className?: string }) {
  const total = MODULES.reduce((a, b) => a + b, 0);
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  MODULES.forEach((w, i) => {
    if (i % 2 === 0) bars.push({ x, w });
    x += w;
  });
  return (
    <svg viewBox={`0 0 ${total} 100`} preserveAspectRatio="none" className={className} aria-label="바코드">
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y="0" width={b.w} height="100" fill="#000" />
      ))}
    </svg>
  );
}
