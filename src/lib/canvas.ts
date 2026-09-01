/** 캔버스 잔손질 — 게임 화면들이 같이 쓴다 */

/** 모서리 둥근 사각형 — `roundRect` 는 오래된 TV 브라우저에 없다 */
export function rrect(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * 출발 카운트다운 — **네 게임이 같이 쓴다** (농구·축구·뽑기·밀어내기).
 *
 * 게임마다 따로 두면 크기와 결이 갈린다. `left` 는 남은 초, `word` 는 0 이
 * 됐을 때 뜨는 말(`SHOOT!`·`KICK!`…), `accent` 는 그 말의 색이다.
 *
 * **구슬 레이스는 자기 것을 쓴다** — 거기는 화면이 검어서 색이 반대다.
 */
export function drawCountdown(
  ctx: CanvasRenderingContext2D,
  left: number,
  size: { w: number; h: number },
  word: string,
  accent: string,
): void {
  const n = Math.ceil(left);
  const text = n <= 0 ? word : String(Math.min(3, n));
  const p = 1 - (left - Math.floor(left));
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - p * 0.75);
  ctx.translate(size.w / 2, size.h / 2);
  ctx.scale(1 + p * 0.5, 1 + p * 0.5);
  ctx.font = `800 ${size.h * 0.14}px Pretendard, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = size.h * 0.016;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = n <= 0 ? accent : '#191F28';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
