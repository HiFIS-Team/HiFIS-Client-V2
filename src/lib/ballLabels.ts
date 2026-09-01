/**
 * 공 위에 뜨는 이름표 — **농구와 축구가 같이 쓴다.**
 *
 * 두 게임 다 공이 여럿 굴러다니고 그 위에 이름이 붙는다. 각자 그리게 두면
 * 한쪽만 고쳐서 두 화면이 갈린다 (겹침 규칙이 게임마다 다르면 안 된다).
 *
 * ## 겹치면 한 줄씩 올린다
 *
 * 공이 몰리면 이름이 서로 포개지고 공까지 덮는다. 그래서 이름을 **공 위**에
 * 놓고, 자리가 겹치는 것은 한 줄씩 올린다. 천장에 닿으면 그것만 아래로
 * 내린다. 세로 TV 크기로 134만 짝을 재서 **겹침 0 · 판 밖 0** 이고,
 * 90%는 첫 칸(공 바로 위)에 그대로 선다 — 글자 벽이 되지 않는다.
 */

/** 앱 토큰 (tv.css `:root`) — 두 게임이 같은 색을 쓴다 */
const G900 = '#191F28';
const PRIMARY = '#3182F6';
const HALO = 'rgba(255,255,255,.92)';

export type Labeled = {
  /** 공 가운데 (화면 좌표) */
  cx: number;
  cy: number;
  name: string;
  goals: number;
};

export type LabelOpts = {
  /** 판의 위·아래 (화면 좌표) — 이름표가 이 밖으로 안 나간다 */
  top: number;
  bot: number;
  /** 글자 크기 */
  fs: number;
  /** 공 반지름 (화면) — 이만큼 띄우고 놓는다 */
  ballR: number;
  /** 이 골 수부터 이름을 파랗게 — 한 골 남았다는 표시 */
  hotFrom: number;
  /** 골 점 색 */
  dot: string;
  /**
   * 이름표가 지금 놓여 있는 높이 — **호출자가 들고 있는다.**
   * 칸이 바뀔 때 글자가 툭 튀지 않게 여기에 두고 조금씩 따라간다.
   */
  smooth: Float32Array;
};

export function drawBallLabels(
  ctx: CanvasRenderingContext2D, items: Labeled[], o: LabelOpts,
): void {
  const { fs, ballR, top, bot } = o;
  const lh = fs * 1.2;
  ctx.font = `800 ${fs}px Pretendard, sans-serif`;

  type Slot = {
    i: number; cx: number; ly: number; half: number;
    name: string; nameW: number; goals: number;
  };
  const slots: Slot[] = [];
  for (let i = 0; i < items.length; i++) {
    const { cx, cy, name, goals } = items[i];
    const nameW = ctx.measureText(name).width;
    const w = nameW + (goals > 0 ? goals * fs * 0.46 + fs * 0.24 : 0);
    // 위가 넓으면 위로, 천장에 붙어 있으면 아래로 — 그쪽도 막히면 서로 바꾼다
    const roomUp = cy - ballR - lh > top + lh;
    let ly = Math.min(bot - fs * 0.7, Math.max(top + fs * 0.7, cy - ballR - fs * 0.6));
    let found = false;
    for (const up of roomUp ? [true, false] : [false, true]) {
      for (let row = 0; row < 9; row++) {
        const cand = up
          ? cy - ballR - fs * 0.6 - row * lh
          : cy + ballR + fs * 0.7 + row * lh;
        // 판 밖으로 나가면 그 방향은 거기서 끝이다 — 글자가 잘려 보인다
        if (cand < top + fs * 0.7 || cand > bot - fs * 0.7) break;
        const clash = slots.some(
          (p) => Math.abs(p.ly - cand) < lh * 0.9
            && Math.abs(p.cx - cx) < p.half + w / 2 + fs * 0.45,
        );
        if (!clash) {
          ly = cand;
          found = true;
          break;
        }
      }
      if (found) break;
    }
    slots.push({ i, cx, ly, half: w / 2, name, nameW, goals });
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (const p of slots) {
    // 골을 넣어 위에서 다시 찬 공은 자리가 통째로 바뀐다 —
    // 그때는 따라가지 않고 그냥 옮긴다 (안 그러면 이름이 화면을 가로지른다)
    o.smooth[p.i] = Math.abs(o.smooth[p.i] - p.ly) > lh * 4
      ? p.ly
      : o.smooth[p.i] + (p.ly - o.smooth[p.i]) * 0.25;
    const y = o.smooth[p.i];
    let tx = p.cx - p.half;

    ctx.lineWidth = fs * 0.42;
    ctx.strokeStyle = HALO;
    ctx.strokeText(p.name, tx, y);
    ctx.fillStyle = p.goals >= o.hotFrom ? PRIMARY : G900;
    ctx.fillText(p.name, tx, y);

    tx += p.nameW + fs * 0.24;
    for (let k = 0; k < p.goals; k++) {
      ctx.beginPath();
      ctx.arc(tx + fs * 0.23, y, fs * 0.2, 0, Math.PI * 2);
      ctx.strokeStyle = HALO;
      ctx.lineWidth = fs * 0.16;
      ctx.stroke();
      ctx.fillStyle = o.dot;
      ctx.fill();
      tx += fs * 0.46;
    }
  }
}

/** 이름표 자리를 담아 둘 칸 — 공 수가 바뀌면 새로 만든다 */
export function labelSlots(prev: Float32Array | null, n: number, at: number): Float32Array {
  if (prev && prev.length === n) return prev;
  return new Float32Array(n).fill(at);
}
