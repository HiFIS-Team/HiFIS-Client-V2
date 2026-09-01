/**
 * 매장 TV 추첨 — **농구 슛** (2026-09-01 대표 요청).
 *
 * 참가자 수만큼 공을 **한꺼번에** 던지고, 아래에서 **골대 셋이 좌우로 움직인다.**
 * 넣으면 위에서 다시 던져지고, **[TARGET] 골을 먼저 넣는 공이 1등**이다.
 *
 * ## 왜 한 골로 안 끝내나
 *
 * 처음에는 먼저 들어간 공이 1등이었는데, 그러면 **3~5초 만에 승부가 난다.**
 * 나머지 시간은 이미 정해진 결과를 놓고 구경만 하게 된다. 세 골을 넣게
 * 하면 앞서던 공이 뒤집히고 **끝까지 봐야 한다.**
 *
 * ## 왜 한꺼번에 던지나
 *
 * 설문 인원이 지점당 10~15명이다. 한 명씩 던지면 15번을 기다려야 해서
 * 몇 분이 걸린다. 같이 던지면 인원이 늘어도 시간이 거의 안 는다.
 *
 * ## 당첨자를 조작하지 않는다
 *
 * 레이스와 같다 — 던져 보고 **먼저 들어간 공에 당첨자 이름을 붙인다.**
 * 물리를 한 번도 안 건드린다.
 *
 * ## 바닥이 곧 골대다
 *
 * 골대를 원으로 두고 통과를 재면 공이 옆으로 스쳐도 들어간 것처럼 보인다.
 * 대신 **구멍 셋이 뚫린 바닥**으로 만들었다 — 구멍 위를 지나면 빠지고,
 * 아니면 튕긴다. 구멍이 좌우로 움직이니 결국 다 빠진다.
 */

export const W = 100;
/** 골대(바닥)가 있는 높이 */
export const FLOOR_Y = 168;
/**
 * 그리는 판의 높이 — **물리에는 안 쓴다.**
 *
 * 그물이 `FLOOR_Y + 7` 까지 내려오고 넣은 공이 그 언저리에 선다.
 * 세로로 세운 TV(9:16 = 0.5625)에 맞춰 100 : 182 로 잡았다 — 이보다
 * 길게 두면 세로가 먼저 차서 **코트가 좌우로 좁아진다.**
 */
export const HEIGHT = 182;

const GRAVITY = 60;
/** 잘 튄다 — 안 그러면 바닥에 눌러앉아 구멍을 못 만난다 */
const RESTITUTION = 0.74;
const WALL_RESTITUTION = 0.78;
const FRICTION = 1.2;
const DRAG = 0.9994;

export const DT = 1 / 120;
const MAX_STEPS = 120 * 150;

export const R = 2.6;

/** 골대 셋 — 좌우로 쓸고 다닌다 */
export const HOOPS = 3;
/** 몇 골을 넣어야 이기나 */
export const TARGET = 3;
/** 구멍 반폭 — 공 반지름보다 넉넉해야 빠진다 */
export const HOLE = 5.2;
/** 골대 하나가 맡는 구역 폭 */
const LANE = W / HOOPS;
/**
 * 좌우로 움직이는 폭 — **자기 구역 안에서만 움직인다.**
 *
 * 구역 폭에서 구멍 지름을 뺀 만큼이 움직일 수 있는 자리다. 이 값을 넘기면
 * 골대가 판 밖으로 나가거나(실제로 −14.5 까지 나갔다) 옆 골대와 겹쳐서
 * 구멍 두 개가 하나로 이어져 버린다.
 */
const SWEEP = (LANE - HOLE * 2) / 2;
const SWEEP_W = 0.62;

/** 튕겨 주는 기둥·범퍼 */
export type Peg = { x: number; y: number; r: number };
export const PEGS: Peg[] = (() => {
  const out: Peg[] = [];
  for (let row = 0; row < 4; row++) {
    const shift = row % 2 === 0 ? 0 : 9;
    for (let col = 0; col < 6; col++) {
      const x = 11 + shift + col * 18;
      if (x > W - 8) continue;
      out.push({ x, y: 58 + row * 24, r: 1.9 });
    }
  }
  return out;
})();

/** 그 걸음에서 골대 가운데들이 놓인 x — **화면도 이 함수를 쓴다** */
export function hoopXs(step: number): number[] {
  const t = step * DT;
  const out: number[] = [];
  for (let i = 0; i < HOOPS; i++) {
    const base = LANE * (i + 0.5);
    // 골대마다 위상을 달리해 서로 엇갈리게 움직인다
    out.push(base + Math.sin(t * SWEEP_W + (i * Math.PI * 2) / HOOPS) * SWEEP);
  }
  return out;
}

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

export type Shots = {
  xs: Float32Array;
  ys: Float32Array;
  /** 그 프레임에 부딪힌 못 (-1 이면 없음) */
  hits: Int16Array;
  /** 프레임마다의 골 수 — 순위표가 이걸 그린다 */
  goals: Uint8Array;
  /** 그 프레임에 골이 들어갔나 (골대 번호, 아니면 -1) — 화면이 골대를 빛나게 한다 */
  scored: Int8Array;
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

/**
 * 다 던진다 — **프레임마다의 좌표를 그대로 담아 돌려준다.**
 *
 * 화면은 이걸 받아 재생만 한다. 재생이 아무리 버벅여도 공이 지나온 길과
 * 들어간 차례가 안 바뀐다.
 */
export function shoot(seed: string, count: number): Shots {
  const n = Math.max(1, count);
  const next = rng(`${seed}:hoops`);
  const balls: Ball[] = Array.from({ length: n }, (_, i) => ({
    // 위에서 좌우로 흩어 던진다
    x: 8 + ((i + 0.5) / n) * (W - 16) + (next() - 0.5) * 3,
    y: 6 + (next() - 0.5) * 5,
    vx: (next() - 0.5) * 30,
    vy: 6 + next() * 10,
    done: false,
    markY: 0,
    markStep: 0,
    goals: 0,
  }));

  const xs: number[] = [];
  const ys: number[] = [];
  const hits: number[] = [];
  const goals: number[] = [];
  const scored: number[] = [];
  const order: number[] = [];

  for (let step = 0; step < MAX_STEPS; step++) {
    const holes = hoopXs(step);

    for (let i = 0; i < n; i++) {
      const b = balls[i];
      if (b.done) {
        xs.push(b.x);
        ys.push(b.y);
        hits.push(-1);
        goals.push(b.goals);
        scored.push(-1);
        continue;
      }
      b.vy += GRAVITY * DT;
      b.vx *= DRAG;
      b.vy *= DRAG;
      b.x += b.vx * DT;
      b.y += b.vy * DT;

      // 좌우 벽 · 천장
      if (b.x < R) bounce(b, 1, 0, R - b.x, WALL_RESTITUTION);
      if (b.x > W - R) bounce(b, -1, 0, b.x - (W - R), WALL_RESTITUTION);
      if (b.y < R) bounce(b, 0, 1, R - b.y, WALL_RESTITUTION);

      let hit = -1;
      let goal = -1;
      for (let k = 0; k < PEGS.length; k++) {
        const p = PEGS[k];
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        const min = R + p.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min) continue;
        const d = Math.sqrt(d2) || 1e-6;
        bounce(b, dx / d, dy / d, min - d, RESTITUTION + 0.1);
        hit = k;
      }

      // ── 골대(구멍 뚫린 바닥) ──
      if (b.y > FLOOR_Y - R) {
        let through = -1;
        for (let k = 0; k < holes.length; k++) {
          // **구멍 안에 온전히 들어와야** 빠진다 — 가장자리에 걸치면 림에 맞는다
          if (Math.abs(b.x - holes[k]) < HOLE - R * 0.55) {
            through = k;
            break;
          }
        }
        if (through >= 0) {
          if (b.y > FLOOR_Y + R) {
            b.goals += 1;
            goal = through;
            if (b.goals >= TARGET) {
              b.done = true;
              order.push(i);
            } else {
              // 다시 위에서 던진다 — 자리와 세기는 시드가 정한다
              b.x = 8 + next() * (W - 16);
              b.y = 5;
              b.vx = (next() - 0.5) * 30;
              b.vy = 6 + next() * 10;
              b.markY = b.y;
              b.markStep = step;
            }
          }
        } else {
          // 림 — 구멍 가장자리에 부딪히면 튄다
          for (const hx of holes) {
            for (const rim of [hx - HOLE, hx + HOLE]) {
              const dx = b.x - rim;
              const dy = b.y - FLOOR_Y;
              const min = R + 0.9;
              const d2 = dx * dx + dy * dy;
              if (d2 >= min * min) continue;
              const d = Math.sqrt(d2) || 1e-6;
              bounce(b, dx / d, dy / d, min - d, RESTITUTION);
              hit = -2;
            }
          }
          if (b.y > FLOOR_Y - R) bounce(b, 0, -1, b.y - (FLOOR_Y - R), RESTITUTION);
        }
      }

      // 안 빠지고 맴돌면 살짝 밀어 준다 (레이스와 같은 규칙)
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
      hits.push(hit >= 0 ? hit : -1);
      goals.push(b.goals);
      scored.push(goal);
    }

    // 공끼리
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

  /** 남은 공은 골 수로, 같으면 아래에 있던 순으로 세운다 */
  function done(frames: number): Shots {
    const rest = balls
      .map((b, i) => ({ i, g: b.goals, y: b.y }))
      .filter(({ i }) => !order.includes(i))
      .sort((a, b) => (a.g !== b.g ? b.g - a.g : b.y - a.y))
      .map(({ i }) => i);
    return {
      xs: Float32Array.from(xs), ys: Float32Array.from(ys),
      hits: Int16Array.from(hits),
      goals: Uint8Array.from(goals), scored: Int8Array.from(scored),
      order: [...order, ...rest], frames, balls: n,
    };
  }
}

/** 공 번호 → 참가자 번호 — **먼저 들어간 공에 당첨자를 붙인다** */
export function assign(seed: string, s: Shots, winner: number): number[] {
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
