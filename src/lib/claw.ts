/**
 * 매장 TV 추첨 — **뽑기 기계** (2026-09-01 대표 요청).
 *
 * 참가자 수만큼 캡슐이 유리통에 쏟아져 쌓이고, 집게가 내려가 하나를 문다.
 * **몇 번은 놓친다** — 인형뽑기가 원래 그렇고, 그게 볼 맛이다. 마지막에
 * 문 캡슐이 배출구로 떨어지고 **그 캡슐이 당첨**이다.
 *
 * ## 앞의 셋과 무엇이 다른가 — **각본과 물리가 섞여 있다**
 *
 * 레이스·농구·축구는 처음부터 끝까지 물리다. 여기서는 **집게가 각본대로**
 * 움직이고(내려가고 · 물고 · 올리고 · 놓고), **캡슐만 물리**다. 집게까지
 * 물리로 만들면 잡히는 힘을 조절하다 세월을 보낸다 — 실제 기계도 집게는
 * 정해진 대로 움직이고 잡히느냐만 운이다.
 *
 * ## 당첨자를 조작하지 않는다
 *
 * 앞의 셋과 같다 — **집게가 무는 것은 그때 제일 가까이 있던 캡슐**이고,
 * 그게 어디 있는지는 쌓인 모양이 정한다. 다 굴려 본 뒤 **뽑힌 캡슐에
 * 당첨자 이름을 붙인다.** 물리를 한 번도 안 건드린다.
 */

export const W = 100;
export const HEIGHT = 182;
export const DT = 1 / 120;
/** 캡슐 반지름 — 이름 세 글자가 안에 들어가야 해서 크다 */
export const R = 4.4;

/* ── 기계 ── */
export const BOX_L = 8;
export const BOX_R = 92;
export const BOX_T = 22;
/** 유리통 바닥 */
export const FLOOR_Y = 138;
/**
 * 배출구 칸막이 — **캡슐이 저 혼자 배출구로 못 들어가게 막는다.**
 *
 * 없으면 쏟을 때 왼쪽으로 튄 캡슐이 그냥 떨어져서, 아무도 안 뽑았는데
 * 당첨이 되어 버린다. 집게는 이 위로 넘어간다.
 */
export const DIV_X = 26;
export const DIV_TOP = 44;
export const CHUTE_L = 9;
export const CHUTE_R = 25;
export const TRAY_TOP = 158;
export const TRAY_Y = 172;
/** 집게가 매달려 다니는 높이 */
export const RAIL_Y = 30;
/** 들어 올렸을 때 집게가 서는 높이 — 칸막이보다 위다 */
export const CLAW_TOP = 34;
/** 배출구 한가운데 */
export const CHUTE_X = (CHUTE_L + CHUTE_R) / 2;

const GRAVITY = 60;
/** 캡슐은 잘 안 튄다 — 쌓여야 한다 */
const REST = 0.16;
const WALL_REST = 0.2;
const DRAG = 0.992;
/** 이보다 느리면 세운다 — 안 그러면 더미가 미세하게 떨린다 */
const SLEEP = 0.5;
/** 겹침을 푸는 반복 횟수 — 쌓기는 한 번으로 안 된다 */
const RELAX = 6;

/* ── 각본 (초) ── */
const POUR = 3.0;
const AIM = 0.9;
const DOWN = 1.1;
const CLOSE = 0.35;
const UP = 1.1;
const CROSS = 1.2;
/**
 * 놓친 캡슐이 떨어지는 자리의 왼쪽 한계 — **칸막이보다 오른쪽이어야 한다.**
 *
 * 더 왼쪽에서 놓으면 배출구로 굴러 들어가서 **아무도 안 뽑았는데 당첨**이 된다.
 */
const DROP_X = 36;
const OPEN = 0.3;
/** 배출구로 떨어져 트레이에 앉을 때까지 — **넉넉히 잡은 상한이다** */
const SETTLE = 4.5;
/** 트레이에 앉은 뒤 보여주는 시간 */
const HOLD = 0.9;

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

export type Grab = {
  xs: Float32Array;
  ys: Float32Array;
  /** 집게 자리와 무는 정도(0 열림 · 1 닫힘) */
  clawX: Float32Array;
  clawY: Float32Array;
  grip: Float32Array;
  /** 그 프레임에 물고 있는 캡슐 (-1 이면 없음) */
  held: Int16Array;
  /** 놓친 프레임이면 1 — 화면이 흔들어 준다 */
  slipped: Uint8Array;
  /** 등수 — `order[0]` 이 결국 뽑힌 캡슐이다 */
  order: number[];
  /** 몇 번 놓쳤나 */
  misses: number;
  frames: number;
  balls: number;
};

type Cap = {
  x: number; y: number; vx: number; vy: number;
  /** 배출구로 떨어진 캡슐 — 벽이 달라진다 */
  out: boolean;
};

/** 부드럽게 오가는 보간 */
function ease(u: number): number {
  const t = Math.max(0, Math.min(1, u));
  return t * t * (3 - 2 * t);
}

/**
 * 다 뽑아 본다 — **프레임마다의 자리를 그대로 담아 돌려준다.**
 *
 * 화면은 이걸 받아 재생만 한다. 재생이 아무리 버벅여도 쌓인 모양과
 * 뽑힌 캡슐이 안 바뀐다.
 */
export function grab(seed: string, count: number): Grab {
  const n = Math.max(1, count);
  const next = rng(`${seed}:claw`);
  const PILE_L = DIV_X + R;
  const PILE_R = BOX_R - R;

  // 유리통 안에 느슨하게 흩어 놓고 떨어뜨린다.
  // **바닥 아래에서 시작하지 않게 막는다** — 설문 인원이 지점당 10~15명이라
  // 여섯 줄이면 넉넉하지만, 사람이 확 늘면 아래 줄이 통 밖에서 생긴다.
  const caps: Cap[] = Array.from({ length: n }, (_, i) => {
    const col = i % 6;
    const row = Math.floor(i / 6);
    return {
      x: PILE_L + 3 + col * ((PILE_R - PILE_L - 6) / 5) + (next() - 0.5) * 4,
      y: Math.min(FLOOR_Y - R - 1, BOX_T + 8 + row * (R * 2.3)) + (next() - 0.5) * 3,
      vx: (next() - 0.5) * 10,
      vy: next() * 6,
      out: false,
    };
  });

  /** 몇 번 만에 뽑히나 — 두세 번 놓치고 잡는다 */
  const tries = 2 + Math.floor(next() * 3);
  const aimAt = Array.from({ length: tries }, () =>
    PILE_L + 4 + next() * (PILE_R - PILE_L - 8));
  /** 실패하는 시도에서 통으로 가다 놓는 지점 (가는 길의 몇 할쯤) */
  const dropAt = Array.from({ length: tries }, () => 0.3 + next() * 0.4);

  const xs: number[] = [];
  const ys: number[] = [];
  const cxs: number[] = [];
  const cys: number[] = [];
  const grips: number[] = [];
  const helds: number[] = [];
  const slips: number[] = [];

  let claw = { x: (PILE_L + PILE_R) / 2, y: RAIL_Y, grip: 0 };
  let held = -1;
  let winner = -1;
  let misses = 0;

  type Stage = 'pour' | 'aim' | 'down' | 'close' | 'up' | 'cross' | 'open' | 'settle';
  let stage: Stage = 'pour';
  let t0 = 0;
  let attempt = 0;
  let from = { x: claw.x, y: claw.y };
  let grabY = FLOOR_Y - R;
  let step = 0;

  const MAX = Math.ceil(
    (POUR + tries * (AIM + DOWN + CLOSE + UP + CROSS) + OPEN + SETTLE + HOLD + 2) / DT);
  /** 당첨 캡슐이 트레이에 앉은 걸음 */
  let landed = -1;

  for (step = 0; step < MAX; step++) {
    const t = (step - t0) * DT;

    // ── 집게 각본 ──
    switch (stage) {
      case 'pour':
        if (t >= POUR) { stage = 'aim'; t0 = step; from = { ...claw }; }
        break;
      case 'aim': {
        const u = ease(t / AIM);
        claw.x = from.x + (aimAt[attempt] - from.x) * u;
        claw.y = from.y + (RAIL_Y - from.y) * u;
        claw.grip = 0;
        if (t >= AIM) {
          stage = 'down';
          t0 = step;
          from = { ...claw };
          // 그 자리 더미의 꼭대기까지 내려간다
          let top = FLOOR_Y - R;
          for (const c of caps) {
            if (c.out) continue;
            if (Math.abs(c.x - claw.x) < R * 1.6) top = Math.min(top, c.y);
          }
          grabY = top;
        }
        break;
      }
      case 'down': {
        claw.y = from.y + (grabY - from.y) * ease(t / DOWN);
        if (t >= DOWN) { stage = 'close'; t0 = step; }
        break;
      }
      case 'close': {
        claw.grip = ease(t / CLOSE);
        if (t >= CLOSE) {
          // **제일 가까운 캡슐을 문다** — 어느 것이 잡힐지는 쌓인 모양이 정한다
          let best = -1;
          let bd = Infinity;
          for (let i = 0; i < n; i++) {
            const c = caps[i];
            if (c.out) continue;
            const d = Math.hypot(c.x - claw.x, c.y - claw.y);
            if (d < bd) { bd = d; best = i; }
          }
          held = best;
          stage = 'up';
          t0 = step;
          from = { ...claw };
        }
        break;
      }
      case 'up': {
        claw.y = from.y + (CLAW_TOP - from.y) * ease(t / UP);
        if (t >= UP) { stage = 'cross'; t0 = step; from = { ...claw }; }
        break;
      }
      case 'cross': {
        claw.x = from.x + (CHUTE_X - from.x) * ease(t / CROSS);
        claw.y = CLAW_TOP;
        // **마지막이 아니면 통으로 가다가 떨어뜨린다** (2026-09-01 대표 요청).
        // 들자마자 놓으면 그냥 미끄러진 것으로 보이는데, 옮기다 놓치면
        // "아 다 왔는데" 가 된다 — 인형뽑기가 사람을 붙잡는 자리다.
        const dropX = Math.max(DROP_X, from.x + (CHUTE_X - from.x) * dropAt[attempt]);
        if (attempt < tries - 1 && claw.x <= dropX) {
          held = -1;
          claw.grip = 0;
          misses += 1;
          attempt += 1;
          stage = 'aim';
          t0 = step;
          from = { ...claw };
          break;
        }
        if (t >= CROSS) { stage = 'open'; t0 = step; }
        break;
      }
      case 'open': {
        claw.grip = 1 - ease(t / OPEN);
        if (t >= OPEN) {
          winner = held;
          if (winner >= 0) {
            caps[winner].out = true;
            caps[winner].vx = 0;
            caps[winner].vy = 2;
          }
          held = -1;
          stage = 'settle';
          t0 = step;
        }
        break;
      }
      case 'settle':
        break;
    }

    // ── 캡슐 ──
    for (let i = 0; i < n; i++) {
      const c = caps[i];
      if (i === held) {
        // 물린 캡슐은 집게를 따라간다
        c.x = claw.x;
        c.y = claw.y + R * 0.5;
        c.vx = 0;
        c.vy = 0;
        continue;
      }
      c.vy += GRAVITY * DT;
      c.vx *= DRAG;
      c.vy *= DRAG;
      c.x += c.vx * DT;
      c.y += c.vy * DT;

      const lo = c.out ? BOX_L + R : DIV_X + R;
      const hi = c.out ? DIV_X - R : BOX_R - R;
      const bot = c.out ? TRAY_Y - R : FLOOR_Y - R;
      if (c.x < lo) { c.x = lo; c.vx = -c.vx * WALL_REST; }
      if (c.x > hi) { c.x = hi; c.vx = -c.vx * WALL_REST; }
      if (!c.out && c.y < BOX_T + R) { c.y = BOX_T + R; c.vy = -c.vy * WALL_REST; }
      if (c.y > bot) { c.y = bot; c.vy = -c.vy * REST; c.vx *= 0.86; }
    }

    // 캡슐끼리 — 튕기고, 겹친 것을 여러 번 풀어 준다 (쌓기는 한 번으로 안 된다)
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = caps[i];
        const b = caps[j];
        if (a.out !== b.out) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        const min = R * 2;
        if (d2 >= min * min || d2 === 0) continue;
        const d = Math.sqrt(d2) || 1e-6;
        const nx = dx / d;
        const ny = dy / d;
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rel < 0) {
          const imp = (-(1 + REST) * rel) / 2;
          if (i !== held) { a.vx -= nx * imp; a.vy -= ny * imp; }
          if (j !== held) { b.vx += nx * imp; b.vy += ny * imp; }
        }
      }
    }
    for (let k = 0; k < RELAX; k++) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const a = caps[i];
          const b = caps[j];
          if (a.out !== b.out) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d2 = dx * dx + dy * dy;
          const min = R * 2;
          if (d2 >= min * min || d2 === 0) continue;
          const d = Math.sqrt(d2) || 1e-6;
          const push = (min - d) / 2;
          const nx = (dx / d) * push;
          const ny = (dy / d) * push;
          if (i !== held) { a.x -= nx; a.y -= ny; }
          if (j !== held) { b.x += nx; b.y += ny; }
        }
      }
      // 밀려난 것을 벽 안으로 되돌린다
      for (let i = 0; i < n; i++) {
        const c = caps[i];
        if (i === held) continue;
        const lo = c.out ? BOX_L + R : DIV_X + R;
        const hi = c.out ? DIV_X - R : BOX_R - R;
        const bot = c.out ? TRAY_Y - R : FLOOR_Y - R;
        c.x = Math.max(lo, Math.min(hi, c.x));
        if (!c.out) c.y = Math.max(BOX_T + R, c.y);
        c.y = Math.min(bot, c.y);
      }
    }
    // 거의 멎었으면 세운다 — 안 그러면 더미가 미세하게 떨린다.
    //
    // **받쳐 주는 것이 있을 때만 재운다.** 그냥 느리다고 재우면 한 걸음 만에
    // 중력이 붙인 속도(0.5)가 문턱을 못 넘어서 **공중에 뜬 캡슐이 거기 그대로
    // 박힌다** — 집게가 놓친 캡슐이 안 떨어지고 허공에 서 있었다.
    for (let i = 0; i < n; i++) {
      const c = caps[i];
      if (i === held) continue;
      if (Math.hypot(c.vx, c.vy) >= SLEEP) continue;
      const bot = c.out ? TRAY_Y - R : FLOOR_Y - R;
      let held_up = c.y >= bot - 0.35;
      for (let j = 0; j < n && !held_up; j++) {
        if (j === i || j === held) continue;
        const o = caps[j];
        if (o.out !== c.out || o.y <= c.y + R * 0.5) continue;
        const dx = o.x - c.x;
        const dy = o.y - c.y;
        if (dx * dx + dy * dy < R * 2.25 * (R * 2.25)) held_up = true;
      }
      if (held_up) { c.vx = 0; c.vy = 0; }
    }

    // 내려가는 집게가 더미를 헤집는다 (밀기만 한다 — 집게는 안 밀린다)
    if (stage === 'down' || stage === 'close') {
      for (let i = 0; i < n; i++) {
        const c = caps[i];
        if (i === held || c.out) continue;
        const dx = c.x - claw.x;
        const dy = c.y - claw.y;
        const min = R + R * 0.55;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min || d2 === 0) continue;
        const d = Math.sqrt(d2) || 1e-6;
        c.x += (dx / d) * (min - d);
        c.y += (dy / d) * (min - d);
      }
    }

    for (let i = 0; i < n; i++) {
      xs.push(caps[i].x);
      ys.push(caps[i].y);
    }
    cxs.push(claw.x);
    cys.push(claw.y);
    grips.push(claw.grip);
    helds.push(held);
    slips.push(stage === 'aim' && (step - t0) * DT < 0.3 && attempt > 0 ? 1 : 0);

    // 당첨 캡슐이 트레이에 앉고 [HOLD] 만큼 보여준 뒤 끝난다.
    // **시간으로만 끊으면 안 된다** — 떨어지는 데 걸리는 시간이 캡슐 수와
    // 놓친 횟수에 따라 달라서, 2.2초로 끊었더니 아직 슈트 한가운데였다.
    if (stage === 'settle') {
      const c = winner >= 0 ? caps[winner] : null;
      if (landed < 0 && c && c.y > TRAY_Y - R - 0.6 && Math.abs(c.vy) < 1.5) landed = step;
      if (landed >= 0 && (step - landed) * DT >= HOLD) break;
      if ((step - t0) * DT >= SETTLE + HOLD) break;
    }
  }

  const frames = cxs.length;
  const rest: number[] = [];
  for (let i = 0; i < n; i++) if (i !== winner) rest.push(i);
  return {
    xs: Float32Array.from(xs), ys: Float32Array.from(ys),
    clawX: Float32Array.from(cxs), clawY: Float32Array.from(cys),
    grip: Float32Array.from(grips), held: Int16Array.from(helds),
    slipped: Uint8Array.from(slips),
    order: winner >= 0 ? [winner, ...rest] : [...rest],
    misses, frames, balls: n,
  };
}

/** 캡슐 번호 → 참가자 번호 — **뽑힌 캡슐에 당첨자를 붙인다** */
export function assign(seed: string, s: Grab, winner: number): number[] {
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
