/**
 * 매장 TV 추첨 핀볼 — **결정적 시뮬레이션** (2026-09-01 대표 요청).
 *
 * 공이 못(peg)에 튀며 내려와 아래 칸 하나에 떨어진다. 칸 하나가 참가자 한 명이다.
 *
 * ## 왜 물리 엔진을 안 쓰나
 *
 * TV 를 껐다 켜도, 20초 뒤 다시 틀어도 **공이 똑같이 굴러야 한다.** 그래서
 * 세 가지를 지킨다.
 *
 * 1. **고정 시간 간격.** 프레임 간격(`deltaTime`)을 안 쓴다 — 화면이 한 번
 *    버벅이면 공이 다른 데로 간다
 * 2. **`Math.random()` 을 안 쓴다.** 서버가 준 시드에서 뽑는다
 * 3. **부동소수 연산을 여기서만 한다.** 물리 엔진(WASM)을 끼우면 그 빌드가
 *    바뀔 때 결과가 달라질 수 있다
 *
 * ## 당첨자는 물리가 정하지 않는다
 *
 * 서버가 이미 뽑아 뒀다(`winnerIndex`). 여기서는 **그 칸에 떨어지는 발사값을
 * 찾아** 재생할 뿐이다 — 시드에서 후보를 순서대로 꺼내 미리 굴려 보고, 맞는
 * 것을 고른다. 후보를 꺼내는 순서도 시드가 정하므로 **고르는 결과까지 같다.**
 *
 * 화면(canvas)은 여기서 안 그린다 — 좌표만 뱉는다.
 */

import { rng } from './draw';

/** 판 크기 — 9:16 세로 화면 기준의 가상 좌표 (실제 픽셀은 화면에서 맞춘다) */
export const W = 100;
export const H = 178;

/** 물리 상수 — 만지면 공이 굴러가는 모양이 통째로 바뀐다 */
const GRAVITY = 62;
/** 튕기는 정도 (0 안 튐 ~ 1 그대로 튐) */
const RESTITUTION = 0.62;
/** 부딪힐 때 접선 방향으로 깎이는 정도 — 0 이면 미끄러지기만 한다 */
const FRICTION = 0.06;
/** 공기 저항 — 없으면 아래로 갈수록 걷잡을 수 없이 빨라진다 */
const DRAG = 0.9992;
/** 한 걸음의 길이(초). 60fps 화면에서 **두 걸음씩** 밟는다 */
export const DT = 1 / 120;
export const STEPS_PER_FRAME = 2;
/** 이 걸음 수를 넘기면 포기한다 (공이 어딘가 끼었을 때 무한루프 방지) */
const MAX_STEPS = 120 * 40;

export const BALL_R = 2.3;
export const PEG_R = 1.15;

/** 못이 시작하는 높이와 끝나는 높이 */
const PEG_TOP = 46;
const PEG_BOTTOM = 132;
/** 못 줄 수 · 한 줄에 몇 개 */
const PEG_ROWS = 9;
const PEG_COLS = 7;
/** 좌우 벽에서 띄우는 여백 */
const WALL_PAD = 7;

/** 칸(주머니) 윗선 — 여기부터 아래가 칸이다 */
export const POCKET_TOP = 150;

export type Vec = { x: number; y: number };
export type Peg = Vec & { r: number };

/** 판 위의 붙박이들 — 참가자 수에 따라 칸 폭만 달라진다 */
export type Table = {
  pegs: Peg[];
  /** 칸을 가르는 벽의 x 좌표들 (양 끝 벽은 뺀 안쪽 칸막이) */
  dividers: number[];
  /** 칸 개수 = 참가자 수 */
  slots: number;
  slotWidth: number;
};

/**
 * 판을 짠다 — **못 자리는 시드가 아니라 칸 수가 정한다.**
 *
 * 시드로 흩뜨리면 어느 달에는 공이 지나갈 길이 막혀서 특정 칸에 아예 못
 * 떨어진다. 못은 규칙적으로 두고, 튀는 방향은 부딪히는 각도가 정하게 한다.
 */
export function buildTable(slots: number): Table {
  const pegs: Peg[] = [];
  const rowGap = (PEG_BOTTOM - PEG_TOP) / (PEG_ROWS - 1);
  const colGap = (W - WALL_PAD * 2) / PEG_COLS;
  for (let row = 0; row < PEG_ROWS; row++) {
    // 한 줄 걸러 반 칸씩 밀어 둔다 — 공이 곧장 아래로 못 빠진다
    const shift = row % 2 === 0 ? 0 : colGap / 2;
    const count = row % 2 === 0 ? PEG_COLS + 1 : PEG_COLS;
    for (let col = 0; col < count; col++) {
      const x = WALL_PAD + shift + col * colGap;
      if (x < WALL_PAD - 0.1 || x > W - WALL_PAD + 0.1) continue;
      pegs.push({ x, y: PEG_TOP + row * rowGap, r: PEG_R });
    }
  }
  const slotWidth = W / slots;
  const dividers: number[] = [];
  for (let i = 1; i < slots; i++) dividers.push(i * slotWidth);
  return { pegs, dividers, slots, slotWidth };
}

export type Frame = { x: number; y: number; hit: number | null };

/** 한 번 굴린 결과 — 프레임마다의 공 위치와 떨어진 칸 */
export type Run = {
  frames: Frame[];
  slot: number;
  /** 이 발사값으로 다시 굴리면 같은 결과가 나온다 */
  launch: Launch;
};

export type Launch = { x: number; vx: number };

function reflect(
  ball: { x: number; y: number; vx: number; vy: number },
  nx: number,
  ny: number,
  overlap: number,
): void {
  // 겹친 만큼 밀어낸다 — 안 밀면 다음 걸음에 또 부딪혀 진동한다
  ball.x += nx * overlap;
  ball.y += ny * overlap;
  const vn = ball.vx * nx + ball.vy * ny;
  if (vn >= 0) return; // 이미 멀어지는 중이면 튕기지 않는다
  const tx = -ny;
  const ty = nx;
  const vt = ball.vx * tx + ball.vy * ty;
  const rn = -vn * RESTITUTION;
  const rt = vt * (1 - FRICTION);
  ball.vx = nx * rn + tx * rt;
  ball.vy = ny * rn + ty * rt;
}

/**
 * 한 번 굴린다 — **프레임마다의 좌표를 그대로 담아 돌려준다.**
 *
 * 화면은 이걸 받아 재생만 한다. 굴리는 것과 그리는 것을 갈라 두면 화면이
 * 아무리 버벅여도 공이 지나온 길이 안 바뀐다.
 */
export function simulate(table: Table, launch: Launch): Run {
  const ball = { x: launch.x, y: 10, vx: launch.vx, vy: 0 };
  const frames: Frame[] = [];
  let hit: number | null = null;

  for (let step = 0; step < MAX_STEPS; step++) {
    ball.vy += GRAVITY * DT;
    ball.vx *= DRAG;
    ball.vy *= DRAG;
    ball.x += ball.vx * DT;
    ball.y += ball.vy * DT;

    // 좌우 벽
    if (ball.x < BALL_R) reflect(ball, 1, 0, BALL_R - ball.x);
    if (ball.x > W - BALL_R) reflect(ball, -1, 0, ball.x - (W - BALL_R));

    // 못
    if (ball.y < POCKET_TOP) {
      for (let i = 0; i < table.pegs.length; i++) {
        const peg = table.pegs[i];
        const dx = ball.x - peg.x;
        const dy = ball.y - peg.y;
        const min = BALL_R + peg.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 1e-6;
        reflect(ball, dx / d, dy / d, min - d);
        hit = i;
      }
    }

    // 칸막이 — 윗머리는 둥글게, 아래는 곧은 벽으로 다룬다
    if (ball.y > POCKET_TOP - 6) {
      for (const dx0 of table.dividers) {
        const dx = ball.x - dx0;
        const dy = ball.y - POCKET_TOP;
        if (dy < 0) {
          // 머리(둥근 끝)
          const min = BALL_R + 0.9;
          const d2 = dx * dx + dy * dy;
          if (d2 < min * min) {
            const d = Math.sqrt(d2) || 1e-6;
            reflect(ball, dx / d, dy / d, min - d);
          }
        } else if (Math.abs(dx) < BALL_R + 0.9) {
          const n = dx >= 0 ? 1 : -1;
          reflect(ball, n, 0, BALL_R + 0.9 - Math.abs(dx));
        }
      }
    }

    frames.push({ x: ball.x, y: ball.y, hit });
    hit = null;

    if (ball.y > H - BALL_R) {
      // 바닥 — 여기서 멈춘다
      const slot = Math.min(
        table.slots - 1,
        Math.max(0, Math.floor(ball.x / table.slotWidth)),
      );
      return { frames, slot, launch };
    }
  }
  const slot = Math.min(
    table.slots - 1,
    Math.max(0, Math.floor(ball.x / table.slotWidth)),
  );
  return { frames, slot, launch };
}

/** 후보 발사값을 시드에서 순서대로 꺼낸다 — 꺼내는 순서까지 늘 같다 */
function* launches(seed: string): Generator<Launch> {
  const next = rng(seed);
  while (true) {
    yield {
      // 가운데 언저리에서 떨어뜨린다 — 벽에 붙여 놓으면 한쪽으로만 흐른다
      x: W * 0.5 + (next() - 0.5) * W * 0.34,
      vx: (next() - 0.5) * 26,
    };
  }
}

/**
 * **그 칸에 떨어지는 발사값을 찾아** 굴린 결과를 돌려준다.
 *
 * 물리는 진짜다 — 공을 억지로 끌어당기지 않는다. 시드에서 꺼낸 후보를
 * 차례로 미리 굴려 보고 당첨 칸에 들어간 첫 번째를 고른다. 후보 순서가
 * 시드로 정해져 있으니 **몇 번을 다시 틀어도 같은 발사, 같은 길**이다.
 *
 * 못 찾으면(`tries` 를 다 써도) 제일 가까운 칸에 떨어진 것을 쓴다 — 화면이
 * 안 뜨는 것보다 낫다. 칸이 열 개 안쪽이라 실제로는 몇 번 안에 찾는다.
 */
export function runForSlot(
  seed: string,
  slots: number,
  target: number,
  tries = 400,
): Run {
  const table = buildTable(slots);
  const gen = launches(seed);
  let best: Run | null = null;
  for (let i = 0; i < tries; i++) {
    const run = simulate(table, gen.next().value as Launch);
    if (run.slot === target) return run;
    if (
      best === null ||
      Math.abs(run.slot - target) < Math.abs(best.slot - target)
    ) {
      best = run;
    }
  }
  return best as Run;
}
