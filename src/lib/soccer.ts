/**
 * 매장 TV 추첨 — **축구 슛** (2026-09-01 대표 요청).
 *
 * 참가자 수만큼 공을 **한꺼번에 차고**, 골문 앞에서 **골키퍼 장갑 셋이
 * 좌우로 움직이며 막는다.** 장갑에 맞으면 튕기고 공끼리 부딪혀도 튕긴다.
 * **[TARGET] 골을 먼저 넣는 공이 1등**이다.
 *
 * ## 농구와 뭐가 다른가 — **막는 쪽과 뚫리는 쪽이 뒤집혔다**
 *
 * 농구는 바닥이 막혀 있고 **구멍이 움직였다.** 축구는 골문이 뻥 뚫려 있고
 * **막는 장갑이 움직인다.** 그래서 보는 맛이 다르다 — 농구는 구멍이 오기를
 * 기다리고, 축구는 장갑을 피해 들어간다.
 *
 * ## 골문 밖은 벽이다
 *
 * 골문(`MOUTH`) 밖의 골라인은 막혀 있어서 튕겨 나온다. 골대 기둥(`POST_R`)도
 * 동그란 장애물이라 **맞고 나오는 일**이 생긴다 — 실제 축구에서 제일 아쉬운
 * 장면이라 일부러 남겼다.
 *
 * ## 당첨자를 조작하지 않는다
 *
 * 레이스·농구와 같다 — 차 보고 **먼저 넣은 공에 당첨자 이름을 붙인다.**
 * 물리를 한 번도 안 건드린다.
 */

export const W = 100;
/** 골라인 높이 */
export const GOAL_Y = 168;
/**
 * 그리는 판의 높이 — **물리에는 안 쓴다.**
 *
 * 골라인 뒤로 그물이 들어갈 자리다. 세로로 세운 TV(9:16 = 0.5625)에 맞춰
 * 100 : 182 로 잡았다 — 농구와 같은 값이라 두 게임이 같은 크기로 뜬다.
 */
export const HEIGHT = 182;

/**
 * 농구(58)보다 낮다 — **로빙 슛처럼 떠서 날아간다.**
 *
 * 높이면 공이 금세 골문 앞에 깔려서, 골문 밖 구석에 떨어진 공이 아무것도
 * 못 하고 남는다. 58 로 두면 마지막 3초에 굳어 있는 공이 농구의 세 배였다.
 */
const GRAVITY = 36;
/** 잘 튄다 — 안 그러면 골문 앞에 눌러앉는다 */
const RESTITUTION = 0.72;
const WALL_RESTITUTION = 0.76;
const FRICTION = 1.2;
const DRAG = 0.9994;

export const DT = 1 / 120;
const MAX_STEPS = 120 * 150;

/** 축구공 — 농구공(2.6)보다 작다 */
export const R = 2.2;

/** 몇 골을 넣어야 이기나 */
export const TARGET = 3;

/**
 * 골문 반폭 — 가운데(`W/2`) 기준.
 *
 * **골대를 정면에서 크게 본 화면이다.** 실제 비율(골문은 페널티 박스의 5분의 1)
 * 로 좁히면 골문 밖에 떨어진 공이 영영 못 넣고 구석에 쌓인다 — 24 로 뒀을 때
 * 마지막 3초에 굳어 있는 공이 농구의 세 배였다. 38 이면 농구와 같은 수준이다.
 */
export const MOUTH = 38;
/** 골대 기둥 */
export const POST_R = 1.0;

/** 골키퍼 장갑 셋 */
export const GLOVES = 3;
/** 장갑 반길이 · 반두께 (가로로 누운 캡슐이다) */
export const GLOVE_A = 7.5;
export const GLOVE_B = 2.4;
/** 장갑이 서 있는 높이 — 골라인보다 앞이다 */
export const GLOVE_Y = 157;
/**
 * 장갑 **가운데**가 갈 수 있는 반경 — 골문 안으로 가둔다.
 *
 * 이 값 없이 골문 반폭으로 구역을 나눴더니 바깥 장갑이 **골대 기둥 밖까지**
 * 나갔다 (왼쪽 끝이 6까지, 기둥은 12). 손이 골대 밖에 나가 있는 그림이다.
 * 반경을 이렇게 잡으면 어떤 값을 넣어도 장갑 끝이 기둥을 안 넘는다.
 */
const REACH = MOUTH - (GLOVE_A + GLOVE_B);
/** 구역 폭 — 셋이 골문을 고르게 나눠 맡는다 */
const LANE = (REACH * 2) / GLOVES;
/**
 * 좌우로 오가는 반폭 — **자기 구역 안에서만 움직인다.**
 *
 * 셋 다 골문 한가운데를 기준으로 흔들면 가운데에 몰렸다 양쪽 끝이 통째로
 * 비는 때가 생긴다. 구역을 나눠 두면 빈틈이 **골고루 옮겨 다닌다.**
 */
const SWEEP = LANE / 2;
/** 장갑마다 속도가 조금씩 다르다 — 같으면 움직임이 금방 외워진다 */
const SWEEP_W = [0.74, 0.61, 0.88];

/** 그 걸음에서 장갑 가운데들이 놓인 x — **화면도 이 함수를 쓴다** */
export function gloveXs(step: number): number[] {
  const t = step * DT;
  const out: number[] = [];
  for (let i = 0; i < GLOVES; i++) {
    const base = W / 2 - REACH + LANE * (i + 0.5);
    out.push(base + Math.sin(t * SWEEP_W[i] + (i * Math.PI * 2) / GLOVES) * SWEEP);
  }
  return out;
}

/** 훈련용 라바콘 — 튕겨 주는 장애물 */
export type Cone = { x: number; y: number; r: number };
export const CONES: Cone[] = (() => {
  const out: Cone[] = [];
  for (let row = 0; row < 3; row++) {
    const shift = row % 2 === 0 ? 0 : 11;
    for (let col = 0; col < 5; col++) {
      const x = 12 + shift + col * 22;
      if (x > W - 9) continue;
      out.push({ x, y: 62 + row * 30, r: 1.8 });
    }
  }
  return out;
})();

/** 시드 난수 — 같은 시드면 같은 수열 (mulberry32) */
export function rng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Kicks = {
  xs: Float32Array;
  ys: Float32Array;
  /** 프레임마다의 골 수 — 이름 옆 점이 이걸 그린다 */
  goals: Uint8Array;
  /** 그 프레임에 골이 들어갔나 (1이면 들어갔다) — 화면이 골문을 빛나게 한다 */
  scored: Uint8Array;
  /** 그 프레임에 장갑에 막혔나 (장갑 번호, 아니면 -1) */
  saved: Int8Array;
  /** 등수 — `order[0]` 이 [TARGET] 을 먼저 채운 공이다 */
  order: number[];
  frames: number;
  balls: number;
};

type Ball = {
  x: number; y: number; vx: number; vy: number;
  done: boolean; markY: number; markStep: number; goals: number;
};

function bounce(b: Ball, nx: number, ny: number, overlap: number, rest: number): void {
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

/** 공을 새로 찬다 — 자리와 세기는 시드가 정한다 */
function kickOff(b: Ball, next: () => number, step: number): void {
  b.x = 8 + next() * (W - 16);
  b.y = 5;
  b.vx = (next() - 0.5) * 30;
  b.vy = 8 + next() * 10;
  b.markY = b.y;
  b.markStep = step;
}

/**
 * 다 찬다 — **프레임마다의 좌표를 그대로 담아 돌려준다.**
 *
 * 화면은 이걸 받아 재생만 한다. 재생이 아무리 버벅여도 공이 지나온 길과
 * 들어간 차례가 안 바뀐다.
 */
export function kick(seed: string, count: number): Kicks {
  const n = Math.max(1, count);
  const next = rng(`${seed}:soccer`);
  const balls: Ball[] = Array.from({ length: n }, (_, i) => ({
    // 위에서 좌우로 흩어 찬다
    x: 8 + ((i + 0.5) / n) * (W - 16) + (next() - 0.5) * 3,
    y: 6 + (next() - 0.5) * 5,
    vx: (next() - 0.5) * 30,
    vy: 8 + next() * 10,
    done: false,
    markY: 0,
    markStep: 0,
    goals: 0,
  }));

  const xs: number[] = [];
  const ys: number[] = [];
  const goals: number[] = [];
  const scored: number[] = [];
  const saved: number[] = [];
  const order: number[] = [];
  const left = W / 2 - MOUTH;
  const right = W / 2 + MOUTH;

  for (let step = 0; step < MAX_STEPS; step++) {
    const hands = gloveXs(step);

    for (let i = 0; i < n; i++) {
      const b = balls[i];
      if (b.done) {
        xs.push(b.x);
        ys.push(b.y);
        goals.push(b.goals);
        scored.push(0);
        saved.push(-1);
        continue;
      }
      b.vy += GRAVITY * DT;
      b.vx *= DRAG;
      b.vy *= DRAG;
      b.x += b.vx * DT;
      b.y += b.vy * DT;

      // 옆줄 · 천장
      if (b.x < R) bounce(b, 1, 0, R - b.x, WALL_RESTITUTION);
      if (b.x > W - R) bounce(b, -1, 0, b.x - (W - R), WALL_RESTITUTION);
      if (b.y < R) bounce(b, 0, 1, R - b.y, WALL_RESTITUTION);

      let save = -1;
      let goal = 0;

      // ── 라바콘 ──
      for (let k = 0; k < CONES.length; k++) {
        const p = CONES[k];
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        const min = R + p.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 1e-6;
        bounce(b, dx / d, dy / d, min - d, RESTITUTION + 0.1);
      }

      // ── 골키퍼 장갑 ── 가로로 누운 캡슐이라 가운데 선에서 가장 가까운 점을 잰다
      for (let k = 0; k < hands.length; k++) {
        const cx = Math.max(hands[k] - GLOVE_A, Math.min(hands[k] + GLOVE_A, b.x));
        const dx = b.x - cx;
        const dy = b.y - GLOVE_Y;
        const min = R + GLOVE_B;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 1e-6;
        // 장갑은 **쳐내는** 것이라 공보다 잘 튕긴다
        bounce(b, dx / d, dy / d, min - d, RESTITUTION + 0.16);
        save = k;
      }

      // ── 골문 ──
      if (b.y > GOAL_Y - R) {
        // **골문 안에 온전히 들어와야** 들어간다 — 기둥에 걸치면 맞고 나온다
        const inside = Math.abs(b.x - W / 2) < MOUTH - R * 0.55;
        if (inside) {
          if (b.y > GOAL_Y + R) {
            b.goals += 1;
            goal = 1;
            if (b.goals >= TARGET) {
              b.done = true;
              order.push(i);
            } else {
              kickOff(b, next, step);
            }
          }
        } else {
          // 골대 기둥
          for (const px of [left, right]) {
            const dx = b.x - px;
            const dy = b.y - GOAL_Y;
            const min = R + POST_R;
            const d2 = dx * dx + dy * dy;
            if (d2 >= min * min) continue;
            const d = Math.sqrt(d2) || 1e-6;
            bounce(b, dx / d, dy / d, min - d, RESTITUTION);
          }
          if (b.y > GOAL_Y - R) bounce(b, 0, -1, b.y - (GOAL_Y - R), RESTITUTION);
        }
      }

      // 안 들어가고 맴돌면 살짝 밀어 준다 (레이스·농구와 같은 규칙)
      if (b.y > b.markY + 1) {
        b.markY = b.y;
        b.markStep = step;
      } else if (step - b.markStep > 2.4 / DT) {
        b.vx += (next() < 0.5 ? -1 : 1) * (9 + next() * 8);
        b.vy -= 6;
        b.markStep = step;
        b.markY = b.y;
      }

      xs.push(b.x);
      ys.push(b.y);
      goals.push(b.goals);
      scored.push(goal);
      saved.push(save);
    }

    // 공끼리 — **지들끼리 막아도 튕긴다**
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
        a.x -= nx * push; a.y -= ny * push;
        b.x += nx * push; b.y += ny * push;
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rel >= 0) continue;
        const imp = (-(1 + 0.4) * rel) / 2;
        a.vx -= nx * imp; a.vy -= ny * imp;
        b.vx += nx * imp; b.vy += ny * imp;
      }
    }

    // **먼저 채운 공이 나오면 거기서 끝난다** — 이미 승부가 났는데 나머지가
    // 다 넣을 때까지 기다리면 결과를 알고 몇십 초를 더 봐야 한다
    if (order.length > 0) return done(step + 1);
  }
  return done(Math.floor(xs.length / n));

  /** 남은 공은 골 수로, 같으면 골문에 가까웠던 순으로 세운다 */
  function done(frames: number): Kicks {
    const rest = balls
      .map((b, i) => ({ i, g: b.goals, y: b.y }))
      .filter(({ i }) => !order.includes(i))
      .sort((a, b) => (a.g !== b.g ? b.g - a.g : b.y - a.y))
      .map(({ i }) => i);
    return {
      xs: Float32Array.from(xs), ys: Float32Array.from(ys),
      goals: Uint8Array.from(goals),
      scored: Uint8Array.from(scored), saved: Int8Array.from(saved),
      order: [...order, ...rest], frames, balls: n,
    };
  }
}

/** 공 번호 → 참가자 번호 — **먼저 넣은 공에 당첨자를 붙인다** */
export function assign(seed: string, s: Kicks, winner: number): number[] {
  const n = s.balls;
  const others: number[] = [];
  for (let i = 0; i < n; i++) if (i !== winner) others.push(i);
  const next = rng(`${seed}:assign`);
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const byBall = new Array<number>(n);
  byBall[s.order[0]] = winner;
  let k = 0;
  for (let rank = 1; rank < n; rank++) byBall[s.order[rank]] = others[k++];
  return byBall;
}
