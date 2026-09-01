/**
 * 매장 TV 추첨 — **구슬 레이스** (2026-09-01 대표 요청).
 *
 * 참가자 수만큼 구슬이 같이 출발해 굽은 길을 내려온다. **1등이 당첨자다.**
 *
 * ## 당첨자를 억지로 만들지 않는다
 *
 * 핀볼 때는 "그 칸에 떨어지는 발사값"을 찾아야 했는데, 레이스는 그럴 필요가
 * 없다.
 *
 * ```
 * 1. 시드로 레이스를 굴린다        → 도착 순서가 나온다 (구슬 3번이 1등)
 * 2. 그 1등 구슬에 당첨자 이름을 붙인다  → 나머지는 시드로 섞어 배정
 * ```
 *
 * 구슬은 정직하게 달리고 **이름표만 나중에 얹는다.** 물리를 한 번도 안 건드린다.
 *
 * ## 다시 틀어도 똑같다
 *
 * 핀볼과 같은 세 가지를 지킨다 — **고정 시간 간격** · **시드 난수만** ·
 * **부동소수 연산을 여기서만**. 구슬이 여럿이라 훨씬 어지럽게 흩어지지만,
 * 흩어지는 방식까지 늘 같다.
 *
 * 화면(canvas)은 여기서 안 그린다 — 좌표만 뱉는다.
 */

import { rng } from './draw';

export const W = 100;

/** 물리 상수 — 만지면 레이스가 통째로 달라진다 */
const GRAVITY = 58;
const RESTITUTION = 0.42;
/** 접선 마찰 — **초당** 깎이는 비율이다.
 *
 * 걸음마다 곱하면 안 된다. 발판에 얹혀 있는 동안 `bounce()` 가 초당 120번
 * 불려서 `0.88^120 ≈ 0` — **미끄럼틀 위에서 구슬이 그대로 멈춘다**
 * (실제로 그래서 아무도 도착을 못 했다). */
const FRICTION = 1.5;
const DRAG = 0.9988;
/** 구슬끼리는 덜 튕긴다 — 안 그러면 서로 튕겨 나가 길 밖으로 샌다 */
const BALL_RESTITUTION = 0.28;
/** 도는 막대가 실어 주는 힘 — 1 이면 막대 표면 속도를 그대로 준다 */
const SPIN_PUSH = 1.5;

export const DT = 1 / 120;
/** 이 걸음을 넘기면 포기한다 (구슬이 끼었을 때 무한루프 방지) */
const MAX_STEPS = 120 * 150;

export const R = 2.1;

/** 두께 있는 선분 — 벽이자 발판이다 */
export type Seg = { ax: number; ay: number; bx: number; by: number; r: number };
export type Peg = { x: number; y: number; r: number };

/** 도는 막대 — 구슬을 쳐서 날려 보낸다.
 *
 * **각도를 시계가 아니라 걸음 수로 잰다** (`phase + omega * step * DT`).
 * 흐른 시간으로 재면 화면이 버벅일 때 막대 위치가 달라져서 레이스가 갈린다.
 */
export type Spinner = {
  x: number; y: number;
  /** 막대 전체 길이 */
  len: number;
  r: number;
  /** 도는 빠르기 (라디안/초) — 음수면 반대로 돈다 */
  omega: number;
  /** 시작 각도 */
  phase: number;
};

export type Track = {
  segs: Seg[];
  pegs: Peg[];
  spinners: Spinner[];
  height: number;
  /** 이 선을 넘으면 도착 */
  finishY: number;
  /** 마지막 통로가 시작하는 높이 — 화면이 여기서 확대되고 느려진다 */
  finalY: number;
};

const WALL = 1.1;

/** 그 걸음에서 막대가 놓인 각도 — **화면도 이 함수를 쓴다.**
 *
 * 물리와 화면이 각도를 따로 구하면 그림과 실제 충돌이 어긋난다.
 */
export function spinAngle(sp: Spinner, step: number): number {
  return sp.phase + sp.omega * step * DT;
}

/** 그 걸음에서 막대의 두 끝점 */
export function spinEnds(sp: Spinner, step: number): [number, number, number, number] {
  const a = spinAngle(sp, step);
  const hx = (Math.cos(a) * sp.len) / 2;
  const hy = (Math.sin(a) * sp.len) / 2;
  return [sp.x - hx, sp.y - hy, sp.x + hx, sp.y + hy];
}

function seg(ax: number, ay: number, bx: number, by: number, r = WALL): Seg {
  return { ax, ay, bx, by, r };
}

/**
 * 길을 짠다 — **시드가 아니라 정해진 모양이다.**
 *
 * 시드로 길을 흩뜨리면 어느 달에는 구슬이 끼는 길이 나온다. 길은 고정해 두고,
 * 흩어지는 것은 구슬끼리 부딪히는 데서 나오게 한다.
 *
 * 한 칸(`BAND`)씩 아래로 쌓아 내려간다. 30~60초가 되도록 칸 수를 정했다.
 */
export function buildTrack(): Track {
  const segs: Seg[] = [];
  const pegs: Peg[] = [];
  const spinners: Spinner[] = [];

  /** 꼬인 복도 — 가운뎃길을 주면 좌우 벽을 만들어 준다.
   *
   * **좌우로만 밀어서 벽을 만든다.** 길에 수직으로 밀면 꺾이는 자리 바깥쪽에
   * 홈이 생기는데, 구슬이 딱 거기에 낀다 (발판 끝에서 겪은 것과 같은 사고다).
   * 좌우로 밀면 이웃한 벽 조각이 **끝점을 정확히 공유**해서 홈이 안 생긴다.
   */
  const corridor = (pts: [number, number][], width: number) => {
    const h = width / 2;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      segs.push(seg(ax - h, ay, bx - h, by));
      segs.push(seg(ax + h, ay, bx + h, by));
    }
  };

  // ── 1. 출발 통 (0~30) — 좁은 통에서 같이 떨어진다 ──
  segs.push(seg(30, 0, 30, 18));
  segs.push(seg(70, 0, 70, 18));
  segs.push(seg(30, 18, 37, 30));
  segs.push(seg(70, 18, 63, 30));

  // ── 2. 꼬인 복도 (30~150) — 좌우로 크게 두 번 휜다 ──
  corridor([[50, 30], [26, 66], [74, 104], [50, 150]], 26);
  pegs.push({ x: 26, y: 66, r: 1.4 }, { x: 74, y: 104, r: 1.4 });

  // ── 3. 다이아 방 (150~230) — 가운데 마름모가 무리를 가른다 ──
  segs.push(seg(37, 150, 10, 168), seg(63, 150, 90, 168));
  segs.push(seg(10, 168, 10, 206), seg(90, 168, 90, 206));
  segs.push(seg(10, 206, 38, 230), seg(90, 206, 62, 230));
  // 마름모
  segs.push(seg(50, 168, 66, 190), seg(66, 190, 50, 212));
  segs.push(seg(50, 212, 34, 190), seg(34, 190, 50, 168));
  // **막대가 길을 완전히 막으면 안 된다.** 벽(10)과 막대 끝(17) 사이가
  // 구슬 지름(4.2)보다 넓어야 어느 각도에서도 지나갈 수 있다 — 길이 10 이면
  // 좌우로 5씩 뻗어 양쪽에 5씩 남는다.
  spinners.push(
    { x: 22, y: 186, len: 10, r: 0.9, omega: 2.4, phase: 0 },
    { x: 78, y: 186, len: 10, r: 0.9, omega: -2.4, phase: Math.PI / 2 },
  );

  // ── 4. 빗살 구간 (230~300) — 비스듬한 살이 구슬을 옆으로 튕긴다 ──
  //
  // **살 끝과 벽 사이를 구슬 지름보다 넉넉히 띄운다.** 처음에는 살이 x=84 에서
  // 끝나고 벽이 88 이라 틈이 2.0 밖에 안 됐다 — 구슬(지름 4.2)이 거기 껴서
  // 80레이스에 26번 멈췄다. 살끼리의 틈도 같은 이유로 잰다.
  segs.push(seg(38, 230, 8, 248), seg(62, 230, 92, 248));
  segs.push(seg(8, 248, 8, 300), seg(92, 248, 92, 300));
  for (let row = 0; row < 3; row++) {
    const y = 256 + row * 15;
    const lean = row % 2 === 0 ? 1 : -1;
    for (let k = 0; k < 4; k++) {
      const x = 30 + k * 15; // 살 끝 26.5~78.5 · 벽 8/92 → 양옆 틈 11 이상
      segs.push(seg(x - 3.5 * lean, y - 4, x + 3.5 * lean, y + 4, 0.9));
    }
  }

  // ── 5. 꼬인 복도 (300~420) — 반대로 휜다 ──
  segs.push(seg(8, 300, 34, 314), seg(92, 300, 66, 314));
  corridor([[50, 314], [76, 348], [24, 384], [50, 420]], 24);
  pegs.push({ x: 76, y: 348, r: 1.4 }, { x: 24, y: 384, r: 1.4 });

  // ── 6. 못 밭 (420~510) — 핀볼처럼 튀며 내려온다 ──
  //
  // **바깥 못과 벽 사이도 지름보다 넓어야 한다.** 못(1.3)과 벽(1.1)에 구슬
  // 반지름(2.1)을 두 번 더하면 **6.6 이상** 벌어져 있어야 지나간다.
  // 처음에는 첫 못이 x=14, 벽이 8 이라 3.6 뿐이어서 왼쪽 벽에 줄줄이 껴 있었다.
  segs.push(seg(38, 420, 6, 438), seg(62, 420, 94, 438));
  segs.push(seg(6, 438, 6, 510), seg(94, 438, 94, 510));
  for (let row = 0; row < 6; row++) {
    const shift = row % 2 === 0 ? 0 : 7;
    for (let col = 0; col < 6; col++) {
      const x = 16 + shift + col * 14;
      if (x > 86) continue; // 오른쪽 벽(94)까지 6.6 이상 남긴다
      pegs.push({ x, y: 444 + row * 11, r: 1.3 });
    }
  }

  // ── 7. 막대 방 (510~578) — 뒤엉키는 자리 ──
  //
  // 좁은 통로에는 막대를 못 넣는다 (통로 폭 10 에 막대를 세우면 길이 막힌다).
  // 그래서 **통로 바로 위에 넓은 방**을 두고 거기서 막대가 흔든다.
  //
  // 방 반폭 20 · 막대 반길이 11 → 양옆 9 · 벽과 막대(2.2)를 빼면 6.8 이라
  // 구슬 지름 4.2 가 어느 각도에서도 지나간다.
  segs.push(seg(6, 510, 30, 532), seg(94, 510, 70, 532));
  segs.push(seg(30, 532, 30, 578), seg(70, 532, 70, 578));
  spinners.push(
    { x: 50, y: 544, len: 22, r: 1.1, omega: -3.4, phase: 0.6 },
    { x: 50, y: 566, len: 22, r: 1.1, omega: 3.4, phase: 1.9 },
  );

  // ── 8. 깔때기 + 좁은 통로 (578~646) — **여기부터 확대되고 느려진다** ──
  //
  // 폭 10 — 구슬 지름 4.2 에 벽 2.2 를 빼면 7.8 이라 **한 줄로만** 내려간다.
  // 한 줄로 서는 순간 순위가 굳어서, 마지막에 누가 1등인지가 또렷해진다.
  segs.push(seg(30, 578, 45, 602), seg(70, 578, 55, 602));
  segs.push(seg(45, 602, 45, 640), seg(55, 602, 55, 640));

  // ── 9. 골인 마당 (640~712) — 통로를 빠져나오면 다시 넓어진다 ──
  //
  // 좁은 통로 그대로 골인시키면 `FINISH` 글자와 기둥이 설 자리가 없다.
  // 한 줄로 서서 나온 차례가 여기서 확정된다.
  segs.push(seg(45, 640, 22, 662), seg(55, 640, 78, 662));
  segs.push(seg(22, 662, 22, 712), seg(78, 662, 78, 712));

  const finishY = 700;
  const height = 726;
  /**
   * **화면이 여기서 확대되고 느려진다** — 막대 방에 들어서는 순간이다.
   *
   * 깔때기(578)부터로 잡았더니 골인까지 **1초밖에 안 남아서** 느린 구간이
   * 순식간에 지나갔다. 막대에 뒤엉키는 자리부터가 볼거리라 거기서 건다.
   */
  const finalY = 510;
  // 바깥벽·바닥 — 어떤 경우에도 길 밖으로 안 나가게
  segs.push(seg(0, 0, 0, height));
  segs.push(seg(W, 0, W, height));
  segs.push(seg(0, height, W, height));

  return { segs, pegs, spinners, height, finishY, finalY };
}

/** 이 시간(초) 동안 이만큼도 못 내려가면 낀 것으로 본다 */
const STALL_SEC = 1.6;
const STALL_MOVE = 1.0;

type Ball = {
  x: number; y: number; vx: number; vy: number; done: boolean;
  /** 끼었는지 재는 값 — 마지막으로 내려간 지점과 그때의 걸음 */
  markY: number; markStep: number;
};

function bounce(
  b: Ball, nx: number, ny: number, overlap: number, rest: number,
): void {
  b.x += nx * overlap;
  b.y += ny * overlap;
  const vn = b.vx * nx + b.vy * ny;
  if (vn >= 0) return;
  const tx = -ny;
  const ty = nx;
  const vt = b.vx * tx + b.vy * ty;
  const rn = -vn * rest;
  const rt = vt * (1 - FRICTION * DT);
  b.vx = nx * rn + tx * rt;
  b.vy = ny * rn + ty * rt;
}

/** 점에서 선분까지 — 가장 가까운 지점을 돌려준다 */
function closest(px: number, py: number, s: Seg): [number, number] {
  const dx = s.bx - s.ax;
  const dy = s.by - s.ay;
  const len2 = dx * dx + dy * dy || 1e-9;
  let t = ((px - s.ax) * dx + (py - s.ay) * dy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return [s.ax + dx * t, s.ay + dy * t];
}

export type Race = {
  /** 프레임마다 구슬 좌표 — `[frame][ball]` 을 편평하게 담는다 */
  xs: Float32Array;
  ys: Float32Array;
  /** 그 프레임에 부딪힌 못 번호 (-1 이면 안 부딪힘) — 화면이 못을 빛나게 한다 */
  hits: Int16Array;
  frames: number;
  balls: number;
  /** 도착한 차례 — `order[0]` 이 1등 구슬 번호다 */
  order: number[];
  /** 구슬이 도착선을 넘은 프레임 (아직이면 -1) */
  finishedAt: number[];
  track: Track;
};

/**
 * 레이스를 굴린다 — **프레임마다의 좌표를 그대로 담아 돌려준다.**
 *
 * 화면은 이걸 받아 재생만 한다. 굴리는 것과 그리는 것을 갈라 두면 TV 가
 * 아무리 버벅여도 구슬이 지나온 길이 안 바뀐다.
 */
export function race(seed: string, count: number): Race {
  const track = buildTrack();
  const next = rng(`${seed}:race`);
  const n = Math.max(1, count);

  const balls: Ball[] = Array.from({ length: n }, (_, i) => ({
    // 출발선에 나란히 — 아주 조금씩 흩어 놓아야 처음부터 겹치지 않는다
    x: 34 + ((i + 0.5) / n) * 32 + (next() - 0.5) * 1.2,
    y: 4 + (next() - 0.5) * 2,
    vx: (next() - 0.5) * 2,
    vy: 0,
    done: false,
    markY: 0,
    markStep: 0,
  }));

  const xs: number[] = [];
  const ys: number[] = [];
  const hits: number[] = [];
  const hitNow = new Array<number>(n).fill(-1);
  const order: number[] = [];
  const finishedAt = new Array<number>(n).fill(-1);

  for (let step = 0; step < MAX_STEPS; step++) {
    for (let i = 0; i < n; i++) {
      const b = balls[i];
      if (b.done) continue;
      b.vy += GRAVITY * DT;
      b.vx *= DRAG;
      b.vy *= DRAG;
      b.x += b.vx * DT;
      b.y += b.vy * DT;

      for (const s of track.segs) {
        const [cx, cy] = closest(b.x, b.y, s);
        const dx = b.x - cx;
        const dy = b.y - cy;
        const min = R + s.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 1e-6;
        bounce(b, dx / d, dy / d, min - d, RESTITUTION);
      }
      // ── 도는 막대 ──
      //
      // 벽처럼 튕기는 것으로 끝내면 **가만히 서 있는 막대와 똑같다.** 맞은
      // 자리가 도는 속도(`ω × 반지름`)를 같이 실어 줘야 실제로 날아간다.
      for (const sp of track.spinners) {
        if (Math.abs(b.y - sp.y) > sp.len) continue;
        const [ax, ay, bx2, by2] = spinEnds(sp, step);
        const [cx, cy] = closest(b.x, b.y, { ax, ay, bx: bx2, by: by2, r: sp.r });
        const dx = b.x - cx;
        const dy = b.y - cy;
        const min = R + sp.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 1e-6;
        bounce(b, dx / d, dy / d, min - d, RESTITUTION + 0.2);
        // 맞은 자리의 회전 속도 — 축에서 멀수록 세게 날아간다
        b.vx += -sp.omega * (cy - sp.y) * SPIN_PUSH;
        b.vy += sp.omega * (cx - sp.x) * SPIN_PUSH;
      }

      for (let k = 0; k < track.pegs.length; k++) {
        const p = track.pegs[k];
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        const min = R + p.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 1e-6;
        bounce(b, dx / d, dy / d, min - d, RESTITUTION + 0.15);
        hitNow[i] = k; // 화면이 이 못을 잠깐 빛나게 한다
      }
    }

    // 구슬끼리 — 둘 다 같은 무게라 반씩 밀어낸다
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = balls[i];
        const b = balls[j];
        if (a.done || b.done) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        const min = R * 2;
        if (d2 >= min * min || d2 === 0) continue;
        const d = Math.sqrt(d2) || 1e-6;
        const nx = dx / d;
        const ny = dy / d;
        const push = (min - d) / 2;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rel >= 0) continue;
        const imp = (-(1 + BALL_RESTITUTION) * rel) / 2;
        a.vx -= nx * imp;
        a.vy -= ny * imp;
        b.vx += nx * imp;
        b.vy += ny * imp;
      }
    }

    // ── 낀 구슬 빼내기 ──
    //
    // 길을 아무리 다듬어도 구슬이 많으면(12개쯤) 서로 밀며 홈에 얹히는 일이
    // 400번에 두어 번 난다. 그때 그대로 두면 **레이스가 안 끝난다.**
    //
    // **미는 힘도 시드에서 뽑는다** — 같은 레이스를 다시 틀면 같은 자리에서
    // 같은 방향으로 빠져나온다.
    for (let i = 0; i < n; i++) {
      const b = balls[i];
      if (b.done) continue;
      if (b.y > b.markY + STALL_MOVE) {
        b.markY = b.y;
        b.markStep = step;
      } else if (step - b.markStep > STALL_SEC / DT) {
        b.vx += (next() < 0.5 ? -1 : 1) * (7 + next() * 6);
        b.vy -= 4;
        b.markStep = step;
      }
    }

    for (let i = 0; i < n; i++) {
      const b = balls[i];
      if (!b.done && b.y >= track.finishY) {
        b.done = true;
        finishedAt[i] = step;
        order.push(i);
      }
      xs.push(b.x);
      ys.push(b.y);
      hits.push(hitNow[i]);
      hitNow[i] = -1;
    }

    if (order.length === n) {
      return {
        xs: Float32Array.from(xs),
        ys: Float32Array.from(ys),
        hits: Int16Array.from(hits),
        frames: step + 1,
        balls: n,
        order,
        finishedAt,
        track,
      };
    }
  }

  // 다 못 들어왔으면 남은 것을 내려온 순서대로 세운다 (끼었을 때 대비)
  const left = balls
    .map((b, i) => ({ i, y: b.y }))
    .filter(({ i }) => !order.includes(i))
    .sort((a, b) => b.y - a.y)
    .map(({ i }) => i);
  return {
    xs: Float32Array.from(xs),
    ys: Float32Array.from(ys),
    hits: Int16Array.from(hits),
    frames: Math.floor(xs.length / n),
    balls: n,
    order: [...order, ...left],
    finishedAt,
    track,
  };
}

/** 그 프레임에서의 순위 — 아래로 많이 내려온 순 (도착한 것은 도착 차례대로) */
export function standings(r: Race, frame: number): number[] {
  const rows: { i: number; done: number; y: number }[] = [];
  for (let i = 0; i < r.balls; i++) {
    const at = r.finishedAt[i];
    rows.push({
      i,
      done: at >= 0 && at <= frame ? at : Number.MAX_SAFE_INTEGER,
      y: r.ys[frame * r.balls + i],
    });
  }
  rows.sort((a, b) => (a.done !== b.done ? a.done - b.done : b.y - a.y));
  return rows.map((r2) => r2.i);
}
