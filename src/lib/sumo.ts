/**
 * 매장 TV 추첨 — **밀어내기(씨름)** (2026-09-01 대표 요청).
 *
 * 이름이 붙은 씨름꾼들이 둥근 판 위에서 서로 밀친다. **판 밖으로 밀려나면
 * 탈락**이고, 판이 천천히 좁아져서 반드시 끝난다. **마지막까지 남은 사람이 당첨.**
 *
 * ## 앞의 다섯과 무엇이 다른가 — **중력이 없고, 도착이 아니라 탈락이다**
 *
 * 레이스·농구·축구·핀볼·뽑기는 전부 중력이 아래로 당기는 세로 판에서
 * **먼저 도착한 쪽**이 이겼다. 여기는 **위에서 내려다본 판**이고 아래로
 * 당기는 힘이 없다. 이기는 방법도 반대다 — 하나씩 사라지고 남는 쪽이 이긴다.
 *
 * ## 서로 밀치게 하는 힘
 *
 * 중력이 없으니 가만 두면 아무도 안 움직인다. 그래서 각자 **제일 가까운
 * 상대 쪽으로 밀어붙인다**(`ACCEL`). 힘은 사람마다 조금씩 다르고(`power`),
 * 밀어붙이는 세기가 주기적으로 세졌다 약해진다 — 그래야 미끄러지듯 붙어
 * 있지 않고 **부딪혔다 떨어졌다** 한다.
 *
 * ## 당첨자를 조작하지 않는다
 *
 * 앞의 다섯과 같다 — 다 밀어내 보고 **마지막까지 남은 사람에게 당첨자
 * 이름을 붙인다.** 물리를 한 번도 안 건드린다.
 */

export const W = 100;
export const HEIGHT = 182;
export const DT = 1 / 120;
/** 씨름꾼 반지름 */
export const R = 5;

/** 판 한가운데 */
export const CX = 50;
export const CY = 91;
/** 처음 판 크기와 끝까지 좁아졌을 때 */
export const RING0 = 44;
export const RING1 = 8;
/**
 * 이 시간에 걸쳐 [RING0] 에서 [RING1] 로 좁아진다.
 *
 * **판이 끝까지 안 좁아지면 안 끝난다.** 15 에서 멈추게 뒀더니 힘이 비슷한
 * 둘이 25초를 버티는 경기가 나왔다 (한 경기는 90초). 8 까지 줄이면
 * 둘이 다 남아 있을 자리가 없어서 반드시 끝난다.
 */
const SHRINK_SEC = 20;

/** 맞붙기 전 서로 노려보는 시간 */
const FACE_OFF = 1.0;
/** 마지막 한 사람이 남은 뒤 보여주는 시간 */
const HOLD = 1.4;

/** 상대 쪽으로 밀어붙이는 힘 */
const ACCEL = 105;
/** 바닥 마찰 — 이게 없으면 끝없이 빨라진다 */
const FRIC = 3.2;
/** 부딪혔을 때 튕기는 정도 — 씨름이라 많이 안 튄다 */
const REST = 0.32;
/** 이만큼 세게 부딪히면 화면이 흙먼지를 그린다 */
const BUMP_V = 26;
/** 판 밖으로 이만큼 넘어가면 탈락 */
const OUT_MARGIN = 0.35;

const MAX_STEPS = 120 * 90;

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

/** 그 걸음의 판 크기 — **화면도 이 함수를 쓴다** */
export function ringAt(step: number): number {
  const u = Math.min(1, Math.max(0, (step * DT - FACE_OFF) / SHRINK_SEC));
  return RING0 - (RING0 - RING1) * u;
}

export type Bout = {
  xs: Float32Array;
  ys: Float32Array;
  /** 바라보는 쪽 */
  face: Float32Array;
  /** 아직 판 위에 있나 */
  live: Uint8Array;
  /** 그 걸음에 세게 부딪혔나 */
  bump: Uint8Array;
  /** 등수 — `order[0]` 이 마지막까지 남은 사람이다 */
  order: number[];
  frames: number;
  balls: number;
};

type Wrestler = {
  x: number; y: number; vx: number; vy: number;
  face: number;
  /** 사람마다 밀어붙이는 힘이 조금씩 다르다 */
  power: number;
  /** 밀어붙이는 세기가 세졌다 약해지는 주기 */
  beat: number; phase: number;
  out: boolean;
};

/** 각도를 -π ~ π 로 */
function wrap(a: number): number {
  let v = a;
  while (v > Math.PI) v -= Math.PI * 2;
  while (v < -Math.PI) v += Math.PI * 2;
  return v;
}

/**
 * 다 밀어내 본다 — **걸음마다의 자리를 그대로 담아 돌려준다.**
 *
 * 화면은 이걸 받아 재생만 한다. 재생이 아무리 버벅여도 밀려난 차례가 안 바뀐다.
 */
export function bout(seed: string, count: number): Bout {
  const n = Math.max(1, count);
  const next = rng(`${seed}:sumo`);
  // 판 가장자리 안쪽에 둥글게 세운다 — 가운데를 보고 선다
  // **가장자리 가까이 세운다.** 가운데 몰아 세웠더니 판이 거기까지 좁아질
  // 때까지(10초쯤) 아무도 안 밀려나서, 앞부분이 통째로 비었다.
  const start = RING0 * 0.72;
  const spin = next() * Math.PI * 2;
  const men: Wrestler[] = Array.from({ length: n }, (_, i) => {
    const a = spin + (i / n) * Math.PI * 2 + (next() - 0.5) * 0.25;
    const r = start + (next() - 0.5) * 14;
    return {
      x: CX + Math.cos(a) * r,
      y: CY + Math.sin(a) * r,
      vx: 0,
      vy: 0,
      face: wrap(a + Math.PI),
      power: 0.78 + next() * 0.44,
      beat: 1.6 + next() * 1.6,
      phase: next() * Math.PI * 2,
      out: false,
    };
  });

  const xs: number[] = [];
  const ys: number[] = [];
  const faces: number[] = [];
  const lives: number[] = [];
  const bumps: number[] = [];
  /** 밀려난 차례 — 먼저 나간 사람이 앞이다 */
  const gone: number[] = [];
  let endAt = -1;

  for (let step = 0; step < MAX_STEPS; step++) {
    const t = step * DT;
    const ring = ringAt(step);
    const bump = new Array<number>(n).fill(0);

    for (let i = 0; i < n; i++) {
      const m = men[i];
      if (!m.out) {
        if (t >= FACE_OFF) {
          // 제일 가까운 상대 쪽으로 밀어붙인다
          let tx = CX;
          let ty = CY;
          let bd = Infinity;
          for (let j = 0; j < n; j++) {
            if (j === i || men[j].out) continue;
            const dx = men[j].x - m.x;
            const dy = men[j].y - m.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < bd) { bd = d2; tx = men[j].x; ty = men[j].y; }
          }
          const dx = tx - m.x;
          const dy = ty - m.y;
          const d = Math.hypot(dx, dy) || 1e-6;
          // 밀어붙이는 세기가 세졌다 약해진다 — 붙어서 미끄러지지 않고 부딪힌다
          const surge = 0.55 + 0.85 * Math.max(0, Math.sin(t * m.beat + m.phase));
          m.vx += (dx / d) * ACCEL * m.power * surge * DT;
          m.vy += (dy / d) * ACCEL * m.power * surge * DT;
          m.face += wrap(Math.atan2(dy, dx) - m.face) * 0.12;
        }
      }
      m.vx -= m.vx * FRIC * DT;
      m.vy -= m.vy * FRIC * DT;
      m.x += m.vx * DT;
      m.y += m.vy * DT;
      // 밀려난 사람은 나간 쪽으로 미끄러지다 멎는다
      if (m.out) {
        m.x = Math.max(R, Math.min(W - R, m.x));
        m.y = Math.max(R, Math.min(HEIGHT - R, m.y));
      }
    }

    // ── 부딪히기 ── 판 위에 있는 사람끼리만
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = men[i];
        const b = men[j];
        if (a.out || b.out) continue;
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
        if (-rel > BUMP_V) { bump[i] = 1; bump[j] = 1; }
        const imp = (-(1 + REST) * rel) / 2;
        a.vx -= nx * imp; a.vy -= ny * imp;
        b.vx += nx * imp; b.vy += ny * imp;
      }
    }
    // 밀려난 사람끼리 겹치지 않게 (판 밖에 널브러진 그림이라 겹치면 지저분하다)
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = men[i];
        const b = men[j];
        if (!a.out || !b.out) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        const min = R * 1.9;
        if (d2 >= min * min || d2 === 0) continue;
        const d = Math.sqrt(d2) || 1e-6;
        const push = (min - d) / 2;
        a.x -= (dx / d) * push; a.y -= (dy / d) * push;
        b.x += (dx / d) * push; b.y += (dy / d) * push;
      }
    }

    // ── 밀려났나 ──
    for (let i = 0; i < n; i++) {
      const m = men[i];
      if (m.out) continue;
      const d = Math.hypot(m.x - CX, m.y - CY);
      if (d <= ring + R * OUT_MARGIN) continue;
      m.out = true;
      gone.push(i);
      // 나간 기세로 조금 더 미끄러진다
      const nx = (m.x - CX) / (d || 1e-6);
      const ny = (m.y - CY) / (d || 1e-6);
      m.vx += nx * 16;
      m.vy += ny * 16;
    }

    for (let i = 0; i < n; i++) {
      xs.push(men[i].x);
      ys.push(men[i].y);
      faces.push(men[i].face);
      lives.push(men[i].out ? 0 : 1);
      bumps.push(bump[i]);
    }

    // 한 사람만 남으면 잠깐 보여주고 끝낸다
    if (endAt < 0 && gone.length >= n - 1) endAt = step;
    if (endAt >= 0 && (step - endAt) * DT >= HOLD) break;
  }

  const frames = Math.floor(xs.length / n);
  const rest: number[] = [];
  for (let i = 0; i < n; i++) if (!gone.includes(i)) rest.push(i);
  return {
    xs: Float32Array.from(xs), ys: Float32Array.from(ys),
    face: Float32Array.from(faces), live: Uint8Array.from(lives),
    bump: Uint8Array.from(bumps),
    // 마지막까지 남은 사람이 1등, 그다음은 늦게 밀려난 순서다
    order: [...rest, ...gone.slice().reverse()],
    frames, balls: n,
  };
}

/** 씨름꾼 번호 → 참가자 번호 — **마지막까지 남은 사람에게 당첨자를 붙인다** */
export function assign(seed: string, s: Bout, winner: number): number[] {
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
