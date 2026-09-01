/**
 * 매장 TV 추첨 — **컬링** (2026-09-01 대표 요청).
 *
 * 한 사람씩 돌을 하나 밀고, 다 던진 뒤 **하우스 한가운데(버튼)에 제일 가까운
 * 돌**이 당첨이다. 나중에 던진 돌이 앞 돌을 **쳐내기 때문에** 1등이 계속 바뀐다.
 *
 * ## 앞의 다섯과 무엇이 다른가 — **한 명씩 차례로 한다**
 *
 * 레이스·농구·축구·뽑기·밀어내기는 전부 **여럿이 동시에** 움직인다. 여기는
 * 차례가 있다. 그런데도 끝까지 봐야 하는 이유는 **마지막 한 방이 판을 뒤집을
 * 수 있어서**다 — 순차인데 결과가 미리 안 보이는 유일한 짜임이다.
 *
 * ## 당첨자를 조작하지 않는다
 *
 * 앞의 다섯과 같다 — 다 던져 보고 **버튼에 제일 가까운 돌에 당첨자 이름을
 * 붙인다.** 물리를 한 번도 안 건드린다.
 */

export const W = 100;
export const HEIGHT = 182;
export const DT = 1 / 120;
/** 돌 반지름 */
export const R = 4;

/** 던지는 자리 */
export const HACK_Y = 10;
/** 하우스 한가운데(버튼) */
export const HOUSE_X = 50;
export const HOUSE_Y = 130;
/** 하우스 동심원 — 12피트 · 8피트 · 4피트 · 버튼 */
export const RINGS = [28, 19, 10, 3];
/** 이 줄을 넘어가면 아웃 */
export const BACK_Y = 164;
/** 하우스 앞 줄 */
export const HOG_Y = HOUSE_Y - RINGS[0];

/**
 * 얼음 위 감속 — **속도에 안 비례한다.**
 *
 * 얼음 마찰은 거의 일정해서 속도를 곱해 줄이면(`v *= 0.99`) 끝없이 미끄러진다.
 * 초당 이만큼씩 곧게 줄인다 — 그래야 멎는 자리가 예측 가능해진다.
 */
const DECEL = 164;
/** 이보다 느리면 멎은 것으로 본다 */
const STILL_V = 2.5;
/** 돌끼리 부딪힐 때 — 화강암이라 잘 튄다 */
const REST = 0.86;
/**
 * 휘어짐(컬) — **느려질수록 더 휜다.**
 *
 * 컬링의 그 곡선이다. 빠를 때 많이 휘게 하면 포물선이 되어 컬링으로 안 보인다.
 */
const CURL = 34;

/* ── 한 사람 차례 (초) ── */
const AIM = 0.3;
/** 이 안에 다 멎어야 한다 — 안 멎으면 다음 사람으로 넘어간다 */
const MAX_SLIDE = 2.6;
const GAP = 0.18;
/** 다 던진 뒤 결과를 보여주는 시간 */
const FINISH = 2.2;

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

export type Ends = {
  xs: Float32Array;
  ys: Float32Array;
  /** 아직 판에 남아 있나 (아웃되면 0) */
  alive: Uint8Array;
  /** 이미 던졌나 — 아직이면 화면에 안 그린다 */
  thrown: Uint8Array;
  /** 그 걸음에 미끄러지는 중인 돌 (-1 이면 없음) */
  shooter: Int16Array;
  /** 그 걸음에 버튼에 제일 가까운 돌 (-1 이면 없음) */
  lead: Int16Array;
  /** 돌이 돌아간 각도 — 손잡이가 같이 돈다 */
  angle: Float32Array;
  /** 등수 — `order[0]` 이 버튼에 제일 가까운 돌이다 */
  order: number[];
  frames: number;
  balls: number;
};

type Stone = {
  x: number; y: number; vx: number; vy: number;
  spin: number; a: number;
  thrown: boolean; alive: boolean;
};

/** 버튼까지의 거리 */
function toButton(s: Stone): number {
  return Math.hypot(s.x - HOUSE_X, s.y - HOUSE_Y);
}

/**
 * 다 던져 본다 — **걸음마다의 자리를 그대로 담아 돌려준다.**
 *
 * 화면은 이걸 받아 재생만 한다. 재생이 아무리 버벅여도 멎은 자리가 안 바뀐다.
 */
export function deliver(seed: string, count: number): Ends {
  const n = Math.max(1, count);
  const next = rng(`${seed}:curling`);
  const stones: Stone[] = Array.from({ length: n }, () => ({
    x: HOUSE_X, y: HACK_Y, vx: 0, vy: 0, spin: 0, a: 0, thrown: false, alive: true,
  }));

  // 던지는 차례를 섞는다 — 참가자 목록 순서가 곧 차례면 매달 같아 보인다
  const turn = Array.from({ length: n }, (_, i) => i);
  for (let i = turn.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [turn[i], turn[j]] = [turn[j], turn[i]];
  }
  // 버튼까지 딱 닿을 세기를 기준으로 조금씩 세거나 약하게 던진다
  const need = Math.sqrt(2 * DECEL * (HOUSE_Y - HACK_Y));
  const shots = turn.map(() => {
    /**
     * 반쯤은 **테이크아웃** — 세게 던져 앞 돌을 쳐낸다.
     *
     * 안 넣으면 다들 얌전히 하우스에 쌓여서 **1등이 세 번밖에 안 바뀐다**
     * (12명이면 그게 확률이 정하는 값이다). 쳐내야 판이 뒤집힌다.
     */
    const heavy = next() < 0.45;
    return {
      speed: need * (heavy ? 1.25 + next() * 0.3 : 0.9 + next() * 0.18),
      angle: (next() - 0.5) * 0.17,
      spin: next() < 0.5 ? -1 : 1,
      from: (next() - 0.5) * 10,
    };
  });

  const xs: number[] = [];
  const ys: number[] = [];
  const alives: number[] = [];
  const throwns: number[] = [];
  const shooters: number[] = [];
  const leads: number[] = [];
  const angs: number[] = [];

  let at = 0;
  let stage: 'aim' | 'slide' | 'gap' | 'finish' = 'aim';
  let t0 = 0;
  let shooter = -1;

  const MAX = Math.ceil((n * (AIM + MAX_SLIDE + GAP) + FINISH + 2) / DT);
  for (let step = 0; step < MAX; step++) {
    const t = (step - t0) * DT;

    if (stage === 'aim') {
      const i = turn[at];
      const sh = shots[at];
      stones[i].x = HOUSE_X + sh.from;
      stones[i].y = HACK_Y;
      // 자리를 잡는 동안에도 화면에 보인다 — 던질 돌이 준비된 게 보여야 한다
      stones[i].thrown = true;
      stones[i].spin = sh.spin;
      if (t >= AIM) {
        stones[i].vx = Math.sin(sh.angle) * sh.speed;
        stones[i].vy = Math.cos(sh.angle) * sh.speed;
        shooter = i;
        stage = 'slide';
        t0 = step;
      }
    }

    // ── 돌 ──
    let moving = false;
    for (let i = 0; i < n; i++) {
      const s = stones[i];
      if (!s.thrown || !s.alive) continue;
      const v = Math.hypot(s.vx, s.vy);
      if (v > STILL_V) {
        moving = true;
        // 곧게 줄어드는 마찰
        const nv = Math.max(0, v - DECEL * DT);
        s.vx = (s.vx / v) * nv;
        s.vy = (s.vy / v) * nv;
        // 컬 — 느릴수록 더 휜다
        if (nv > 0) {
          const bend = (CURL * s.spin * DT) / (1 + nv / 26);
          const nx = -s.vy / nv;
          const ny = s.vx / nv;
          s.vx += nx * bend;
          s.vy += ny * bend;
        }
        s.x += s.vx * DT;
        s.y += s.vy * DT;
        // 컬링 돌은 미끄러지는 내내 천천히 돈다 (그래서 휜다)
        s.a += s.spin * 2.4 * DT;
      } else {
        s.vx = 0;
        s.vy = 0;
      }
      // 옆줄·백라인을 넘으면 아웃
      if (s.x < R || s.x > W - R || s.y > BACK_Y) {
        s.alive = false;
        if (shooter === i) shooter = -1;
      }
    }

    // 돌끼리 — **나중 돌이 앞 돌을 쳐낸다**
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = stones[i];
        const b = stones[j];
        if (!a.thrown || !b.thrown || !a.alive || !b.alive) continue;
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
        const imp = (-(1 + REST) * rel) / 2;
        a.vx -= nx * imp; a.vy -= ny * imp;
        b.vx += nx * imp; b.vy += ny * imp;
      }
    }

    if (stage === 'slide' && (!moving || t >= MAX_SLIDE)) {
      shooter = -1;
      stage = at + 1 >= n ? 'finish' : 'gap';
      t0 = step;
    } else if (stage === 'gap' && t >= GAP) {
      at += 1;
      stage = 'aim';
      t0 = step;
    }

    // 지금 버튼에 제일 가까운 돌
    let lead = -1;
    let bd = Infinity;
    for (let i = 0; i < n; i++) {
      const s = stones[i];
      if (!s.thrown || !s.alive) continue;
      const d = toButton(s);
      if (d < bd) { bd = d; lead = i; }
    }

    for (let i = 0; i < n; i++) {
      xs.push(stones[i].x);
      ys.push(stones[i].y);
      alives.push(stones[i].alive ? 1 : 0);
      throwns.push(stones[i].thrown ? 1 : 0);
      angs.push(stones[i].a);
    }
    shooters.push(shooter);
    leads.push(lead);

    if (stage === 'finish' && t >= FINISH) break;
  }

  const frames = shooters.length;
  const rank = Array.from({ length: n }, (_, i) => i).sort((a, b) => {
    const A = stones[a];
    const B = stones[b];
    if (A.alive !== B.alive) return A.alive ? -1 : 1;
    return toButton(A) - toButton(B);
  });
  return {
    xs: Float32Array.from(xs), ys: Float32Array.from(ys),
    alive: Uint8Array.from(alives), thrown: Uint8Array.from(throwns),
    shooter: Int16Array.from(shooters), lead: Int16Array.from(leads),
    angle: Float32Array.from(angs),
    order: rank, frames, balls: n,
  };
}

/** 돌 번호 → 참가자 번호 — **버튼에 제일 가까운 돌에 당첨자를 붙인다** */
export function assign(seed: string, s: Ends, winner: number): number[] {
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
