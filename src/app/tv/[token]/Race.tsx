'use client';

import { useEffect, useMemo, useRef } from 'react';

import type { DrawEntry } from '@/lib/api';
import { DT, R, W, assign, race, spinEnds, standings } from '@/lib/race';

/** 카메라가 담는 세로 높이 — 작을수록 확대된다 */
const VIEW_FAR = 220;
/** 골인 직전에 여기까지 당긴다 */
const VIEW_NEAR = 78;
/**
 * **달리는 동안 허용하는 제일 좁은 시야.**
 *
 * 예전에는 무리가 뭉치면 [VIEW_NEAR](78)까지 당겼는데, 그러면 배율이 3배가
 * 되면서 **화면 속 이동 속도도 3배**가 된다 — 그게 어지러움의 진짜 원인이었다
 * (2026-09-01 대표 지적). 140 으로 막으니 세로 이동이 433 → 338px/s 로,
 * 가로 흔들림이 절반으로 줄었다. 바짝 당기는 것은 슬로모션 때만 한다.
 */
const VIEW_RACE_NEAR = 140;
/** 카메라가 따라붙는 속도 (0~1, 클수록 딱 붙는다) */
const FOLLOW = 0.04;
/** 목표값 자체를 한 번 더 눅이는 정도 — 두 번 눅이면 훨씬 잔잔하다 */
const AIM = 0.05;
const TRAIL = 12;
/** 못이 맞고 빛이 사그라드는 시간(초) */
const GLOW = 0.5;

/** 출발 카운트다운 — `3 · 2 · 1 · GO` */
const COUNT_SEC = 3.2;
/** 느려지는 배속 — **막대 방부터 골인까지**가 이 속도로 재생된다.
 *
 * 0.3 이면 느린 구간이 16초라 전체의 절반 가까이 되고, 0.55 면 9초라
 * 순식간이다. 0.42 에서 전체 23~44초(중앙 31) · 느린 구간 11초로 잡힌다. */
const SLOW = 0.42;

const COLORS = [
  '#3DA5FF', '#33E08A', '#FFC24B', '#FF5A5A', '#C46BFF', '#33D6FF',
  '#FF6FB5', '#2FE0C8', '#9B8CFF', '#FF9448', '#A8E633', '#5AD1FF',
];
const NEON = '#7DF9FF';
const GOLD = '#FFD54A';
const RANK_COLOR = [GOLD, '#D6DCE4', '#E0A46B'];

type Props = {
  /** 그 달 추첨 시드 — **당첨자는 이 값으로 안 정한다** */
  seed: string;
  /** 몇 번째 재생인가 — 이 값이 레이스 모양을 바꾼다 */
  round: number;
  entries: DrawEntry[];
  winnerIndex: number;
  onFinished: () => void;
};

/**
 * 구슬 레이스 판.
 *
 * ## 틀 때마다 길이 달라진다 (2026-09-01 대표 결정)
 *
 * 시드가 그 달에 하나면 TV 가 **같은 레이스를 한 달 내내 수백 번** 튼다.
 * 매일 오는 회원은 둘째 날부터 누가 1등인지 알고 본다.
 *
 * 그래서 재생 회차(`round`)를 시드에 섞는다. **당첨자는 그대로다** — 서버가
 * 정해 행에 박아 뒀고, [assign] 이 어느 레이스든 1등 구슬에 그 사람을 붙인다.
 * 회차까지 같으면 결과도 같아서 **되짚을 수 있는 것도 그대로**다.
 *
 * ## 다시 틀어도 그 회차는 똑같다
 *
 * 굴리는 것과 그리는 것을 갈라 둔다. 재생 위치를 프레임 수가 아니라 **흐른
 * 시간**으로 잡아서, TV 주사율이 50Hz 든 120Hz 든 구슬이 지나는 길과 걸리는
 * 시간이 같다.
 */
export default function Race({ seed, round, entries, winnerIndex, onFinished }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const done = useRef(false);

  const n = Math.max(1, entries.length);
  const runSeed = `${seed}:${round}`;
  const r = useMemo(() => race(runSeed, n), [runSeed, n]);
  const byBall = useMemo(
    () => assign(runSeed, r, Math.min(winnerIndex, n - 1)),
    [runSeed, r, winnerIndex, n],
  );

  /** 구슬이 굴러온 거리 → 무늬가 도는 각도. 좌표에서 뽑으므로 물리는 안 건드린다 */
  const spins = useMemo(() => {
    const out = new Float32Array(r.frames * r.balls);
    for (let f = 1; f < r.frames; f++) {
      for (let i = 0; i < r.balls; i++) {
        const k = f * r.balls + i;
        const p = k - r.balls;
        const dx = r.xs[k] - r.xs[p];
        const dy = r.ys[k] - r.ys[p];
        out[k] = out[p] + (Math.sign(dx) || 1) * Math.hypot(dx, dy) / R;
      }
    }
    return out;
  }, [r]);

  /** 1등이 골인하는 걸음 */
  const leadIn = r.finishedAt[r.order[0]] ?? r.frames - 1;

  /**
   * 느려지고 확대되는 걸음 — **선두가 마지막 통로에 들어서는 순간**이다.
   *
   * 예전에는 "골인 몇 걸음 전" 이라는 **시간 기준**이었다. 그러면 화면에서
   * 아무 일도 안 일어나는 자리에서 갑자기 느려지고, 확대는 부드럽게 따라오느라
   * **느려진 다음에 확대되는** 것처럼 보였다 (2026-09-01 대표 지적).
   *
   * 자리로 잡으면 둘이 같은 순간에 걸린다 — 좁은 통로에 들어서면서 화면이
   * 당겨지고 막대가 크게 보인다.
   */
  const slowFrom = useMemo(() => {
    for (let f = 0; f <= leadIn; f++) {
      for (let i = 0; i < r.balls; i++) {
        if (r.ys[f * r.balls + i] >= r.track.finalY) return f;
      }
    }
    return leadIn;
  }, [r, leadIn]);
  /**
   * 재생을 끝내는 걸음 — **1등이 들어오면 끝난다.**
   *
   * 꼴찌까지 기다리면 그 구간이 통째로 슬로모션이라 9명일 때 화면에서
   * 90초가 됐다. 당첨자는 1등이라 뒤는 볼 이유가 없다 — 넘는 순간을 잠깐
   * 보여주고 결과로 넘긴다.
   */
  const endFrame = Math.min(r.frames - 1, leadIn + 48);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    done.current = false;
    const litAt = new Map<number, number>();
    let raf = 0;
    let start = 0;
    let camY = 0;
    let camX = W / 2;
    /** 카메라가 좇는 목표 — 좌표를 한 번 눅인 값이다 */
    let aimY = 0;
    let aimX = W / 2;
    /** 지금 배율 (px per 칸) — 부드럽게 따라간다 */
    let viewH = 1;
    let first = true;

    let size = { w: 0, h: 0 };
    const fit = () => {
      const box = canvas.parentElement;
      if (!box) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = { w: box.clientWidth, h: box.clientHeight };
      canvas.width = Math.round(size.w * dpr);
      canvas.height = Math.round(size.h * dpr);
      canvas.style.width = `${size.w}px`;
      canvas.style.height = `${size.h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    window.addEventListener('resize', fit);

    const draw = (t: number) => {
      if (!start) start = t;
      const now = (t - start) / 1000;

      // ── 재생 위치 — 카운트다운은 멈춰 있고, 골인 직전은 느려진다 ──
      const after = now - COUNT_SEC;
      let f: number;
      if (after <= 0) {
        f = 0;
      } else if (after < slowFrom * DT) {
        f = Math.floor(after / DT);
      } else {
        f = Math.floor(slowFrom + ((after - slowFrom * DT) * SLOW) / DT);
      }
      f = Math.min(endFrame, Math.max(0, f));
      const base = f * r.balls;
      const slowing = f >= slowFrom;

      // ── 카메라 — **위아래로도 좌우로도 무리를 따라간다** ──
      //
      // 세로 화면(9:16)에서 트랙 폭(100)을 통째로 담으면 배율이 낮아 구슬이
      // 작다. **좌우로도 따라가면** 훨씬 당겨진다 — 트랙 양옆이 화면 밖으로
      // 나가지만 그건 연출이고, 전체 위치는 미니맵이 계속 보여준다
      // (2026-09-01 대표 결정).
      //
      // 대신 **무리가 옆으로 벌어지면 그만큼 뺀다.** 안 그러면 못 밭처럼
      // 좌우로 흩어지는 자리에서 뒤처진 구슬이 화면 밖으로 사라진다.
      let lead = -Infinity;
      let tail = Infinity;
      let left = Infinity;
      let right = -Infinity;
      let sumX = 0;
      for (let i = 0; i < r.balls; i++) {
        const y = r.ys[base + i];
        const x = r.xs[base + i];
        if (y > lead) lead = y;
        if (y < tail) tail = y;
        if (x < left) left = x;
        if (x > right) right = x;
        sumX += x;
      }
      // **가로는 평균을 본다.** 양 끝의 가운데는 구슬 하나가 튈 때마다 흔들린다
      const meanX = sumX / r.balls;
      if (first) {
        aimY = lead;
        aimX = meanX;
      } else {
        aimY += (lead - aimY) * AIM;
        aimX += (meanX - aimX) * AIM;
      }

      // **좌우 여백** — 미니맵·순위표가 트랙을 안 가리게 비워 둔다
      const gutter = Math.min(size.w * 0.13, 200);
      const stageW = size.w - gutter * 2;

      // 담아야 할 크기 — 세로는 무리 간격, 가로는 흩어진 폭이 정한다
      const needH = slowing
        ? VIEW_NEAR
        : Math.min(VIEW_FAR, Math.max(VIEW_RACE_NEAR, (lead - tail) * 1.7 + 46));
      // **선두를 화면 아래쪽에 둔다.** 위가 넓어야 뒤따르는 무리가 담긴다 —
      // 0.4 로 두면 뒤처진 구슬이 화면 밖으로 나가는 프레임이 26%였는데
      // 0.7 로 내리니 6%가 됐다. 골인 직전에는 아래쪽 도착선을 봐야 해서
      // 다시 가운데로 올린다.
      const bias = slowing ? 0.5 : 0.7;
      const needW = Math.min(W, right - left + 34);
      // 둘 다 담기는 배율 중 작은 쪽. **트랙보다 넓게 볼 이유는 없다**
      const wantScale = Math.max(
        stageW / W,
        Math.min(size.h / needH, stageW / needW),
      );
      // **느려질 때는 빨리 당긴다.** 평소 속도(0.03)로 두면 감속은 그 순간
      // 걸리는데 확대는 1초쯤 걸려서 "느려진 다음에 확대되는" 것처럼 보인다
      viewH = first
        ? wantScale
        : viewH + (wantScale - viewH) * (slowing ? 0.11 : 0.02);
      const scale = viewH;

      /** 이 배율에서 실제로 보이는 범위 (칸) */
      const effH = size.h / scale;
      const effW = stageW / scale;

      const wantY = Math.max(0, Math.min(r.track.height - effH, aimY - effH * bias));
      const wantX = effW >= W
        ? W / 2
        : Math.max(effW / 2, Math.min(W - effW / 2, aimX));
      camY = first ? wantY : camY + (wantY - camY) * FOLLOW;
      camX = first ? wantX : camX + (wantX - camX) * FOLLOW;
      first = false;

      const ox = gutter + (effW / 2 - camX) * scale;
      const X = (x: number) => ox + x * scale;
      const Y = (y: number) => (y - camY) * scale;
      const S = (v: number) => v * scale;

      // ── 배경 ──
      const bg = ctx.createLinearGradient(0, 0, 0, size.h);
      bg.addColorStop(0, '#03060B');
      bg.addColorStop(1, '#000000');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size.w, size.h);
      ctx.strokeStyle = 'rgba(125,249,255,.05)';
      ctx.lineWidth = 1;
      const gridGap = S(10);
      for (let gy = -((camY * scale) % gridGap); gy < size.h; gy += gridGap) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(size.w, gy);
        ctx.stroke();
      }

      for (let k = Math.max(0, f - 2); k <= f; k++) {
        for (let i = 0; i < r.balls; i++) {
          const h = r.hits[k * r.balls + i];
          if (h >= 0) litAt.set(h, now);
        }
      }

      // ── 트랙 ──
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#FFFFFF';
      ctx.shadowColor = NEON;
      ctx.shadowBlur = S(2.4);
      for (const s of r.track.segs) {
        if (Math.max(s.ay, s.by) < camY - 8 || Math.min(s.ay, s.by) > camY + effH + 8) continue;
        if (Math.max(s.ax, s.bx) < camX - effW || Math.min(s.ax, s.bx) > camX + effW) continue;
        ctx.lineWidth = S(s.r * 2);
        ctx.beginPath();
        ctx.moveTo(X(s.ax), Y(s.ay));
        ctx.lineTo(X(s.bx), Y(s.by));
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // ── 못 (맞으면 하얗게 터진다) ──
      for (let k = 0; k < r.track.pegs.length; k++) {
        const p = r.track.pegs[k];
        if (p.y < camY - 8 || p.y > camY + effH + 8) continue;
        const lit = litAt.get(k);
        const heat = lit === undefined ? 0 : Math.max(0, 1 - (now - lit) / GLOW);
        ctx.shadowColor = heat > 0 ? '#FFFFFF' : NEON;
        ctx.shadowBlur = S(1.6 + heat * 5);
        ctx.fillStyle = heat > 0 ? '#FFFFFF' : NEON;
        ctx.beginPath();
        ctx.arc(X(p.x), Y(p.y), S(p.r * (1 + heat * 0.7)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      drawFinish(ctx, r, camY, effH, now, X, Y, S);

      // ── 도는 막대 — 물리와 **같은 각도 함수**로 그린다 ──
      for (const sp of r.track.spinners) {
        if (sp.y < camY - 20 || sp.y > camY + effH + 20) continue;
        for (let k = 3; k >= 1; k--) {
          const [px, py, qx, qy] = spinEnds(sp, f - k * 5);
          ctx.globalAlpha = 0.09 * (4 - k);
          ctx.strokeStyle = '#FF9448';
          ctx.lineWidth = S(sp.r * 2);
          ctx.beginPath();
          ctx.moveTo(X(px), Y(py));
          ctx.lineTo(X(qx), Y(qy));
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        const [ax, ay, bx2, by2] = spinEnds(sp, f);
        ctx.shadowColor = '#FF9448';
        ctx.shadowBlur = S(3.4);
        ctx.strokeStyle = '#FFC24B';
        ctx.lineWidth = S(sp.r * 2);
        ctx.beginPath();
        ctx.moveTo(X(ax), Y(ay));
        ctx.lineTo(X(bx2), Y(by2));
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(X(sp.x), Y(sp.y), S(sp.r * 1.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // ── 구슬 ──
      const rank = standings(r, f);
      const rankOf = new Map<number, number>();
      rank.forEach((ball, i) => rankOf.set(ball, i));

      for (let i = 0; i < r.balls; i++) {
        const who = byBall[i];
        const color = COLORS[who % COLORS.length];
        for (let k = TRAIL; k > 0; k--) {
          const pf = f - k * 2;
          if (pf < 0) continue;
          ctx.globalAlpha = (1 - k / TRAIL) * 0.3;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(
            X(r.xs[pf * r.balls + i]), Y(r.ys[pf * r.balls + i]),
            S(R * (1 - k / TRAIL / 1.4)), 0, Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        const bx = X(r.xs[base + i]);
        const by = Y(r.ys[base + i]);
        drawMarble(ctx, bx, by, S(R), color, who, spins[base + i]);

        const place = rankOf.get(i) ?? 99;
        if (place < 3) {
          ctx.strokeStyle = RANK_COLOR[place];
          ctx.lineWidth = S(0.55);
          ctx.beginPath();
          ctx.arc(bx, by, S(R + 0.9), 0, Math.PI * 2);
          ctx.stroke();
        }

        const label = entries[who]?.name ?? '';
        if (label) {
          ctx.font = `800 ${S(2.9)}px Pretendard, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.lineWidth = S(1);
          ctx.strokeStyle = 'rgba(0,0,0,.9)';
          ctx.strokeText(label, bx, by + S(R + 1));
          ctx.fillStyle = color;
          ctx.fillText(label, bx, by + S(R + 1));
        }
      }

      drawMinimap(ctx, r, byBall, camX, camY, effW, effH, f, size, gutter);
      drawBoard(ctx, r, byBall, entries, rank, size, gutter);
      if (after <= 0) drawCountdown(ctx, -after, size);

      if (f >= endFrame && !done.current) {
        done.current = true;
        onFinished();
      }
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', fit);
    };
  }, [r, byBall, spins, slowFrom, endFrame, entries, onFinished]);

  return <canvas ref={canvasRef} className="race" />;
}

/** 구슬 무늬 — **사람마다 다르다.** 색만 다르면 멀리서 안 갈린다 */
const PATTERNS = 6;

function drawMarble(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, rad: number,
  color: string, who: number, spin: number,
): void {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = rad * 1.6;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // 무늬는 구슬 안에서만 그린다
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(spin);
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.strokeStyle = 'rgba(255,255,255,.85)';

  switch (who % PATTERNS) {
    case 0: // 줄무늬
      for (let i = -2; i <= 2; i++) ctx.fillRect(-rad, i * rad * 0.42 - rad * 0.09, rad * 2, rad * 0.18);
      break;
    case 1: // 소용돌이
      ctx.lineWidth = rad * 0.24;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 3; a += 0.12) {
        const rr = (a / (Math.PI * 3)) * rad;
        ctx[a === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.stroke();
      break;
    case 2: // 점박이
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * rad * 0.5, Math.sin(a) * rad * 0.5, rad * 0.19, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 3: // 반반
      ctx.beginPath();
      ctx.arc(0, 0, rad, -Math.PI / 2, Math.PI / 2);
      ctx.fill();
      break;
    case 4: // 고리
      ctx.lineWidth = rad * 0.26;
      ctx.beginPath();
      ctx.arc(0, 0, rad * 0.58, 0, Math.PI * 2);
      ctx.stroke();
      break;
    default: { // 별
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 === 0 ? rad * 0.82 : rad * 0.34;
        ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();

  // 빛나는 점 — 도는 무늬 위에 얹혀 구슬처럼 보인다
  const g = ctx.createRadialGradient(
    cx - rad * 0.36, cy - rad * 0.4, rad * 0.05, cx - rad * 0.3, cy - rad * 0.34, rad * 0.7,
  );
  g.addColorStop(0, 'rgba(255,255,255,.95)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.fill();
}

/** 출발 카운트다운 — `3 · 2 · 1 · GO` */
function drawCountdown(
  ctx: CanvasRenderingContext2D, left: number, size: { w: number; h: number },
): void {
  const n = Math.ceil(left);
  const text = n <= 0 ? 'GO!' : String(Math.min(3, n));
  // 한 칸 안에서 커지며 옅어진다
  const p = 1 - (left - Math.floor(left));
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - p * 0.75);
  ctx.translate(size.w / 2, size.h / 2);
  ctx.scale(1 + p * 0.5, 1 + p * 0.5);
  ctx.font = `800 ${size.h * 0.16}px Pretendard, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = NEON;
  ctx.shadowBlur = size.h * 0.05;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** 골인 — 금빛 띠 + 흐르는 빗금 + FINISH */
function drawFinish(
  ctx: CanvasRenderingContext2D,
  r: ReturnType<typeof race>,
  camY: number, viewH: number, now: number,
  X: (x: number) => number, Y: (y: number) => number, S: (v: number) => number,
): void {
  if (r.track.finishY < camY - 30 || r.track.finishY > camY + viewH + 12) return;
  const y = Y(r.track.finishY);
  const bandH = S(7);

  const band = ctx.createLinearGradient(0, y - bandH, 0, y + bandH);
  band.addColorStop(0, 'rgba(255,213,74,0)');
  band.addColorStop(0.5, 'rgba(255,213,74,.3)');
  band.addColorStop(1, 'rgba(255,213,74,0)');
  ctx.fillStyle = band;
  ctx.fillRect(X(0), y - bandH, S(W), bandH * 2);

  ctx.save();
  ctx.beginPath();
  ctx.rect(X(0), y - bandH * 0.5, S(W), bandH);
  ctx.clip();
  const gap = S(5);
  const drift = (now * S(9)) % (gap * 2);
  ctx.strokeStyle = 'rgba(255,213,74,.75)';
  ctx.lineWidth = S(1.6);
  for (let sx = -bandH * 2; sx < S(W) + bandH * 2; sx += gap * 2) {
    ctx.beginPath();
    ctx.moveTo(X(0) + sx + drift, y + bandH);
    ctx.lineTo(X(0) + sx + drift + bandH, y - bandH);
    ctx.stroke();
  }
  ctx.restore();

  ctx.shadowColor = GOLD;
  ctx.shadowBlur = S(5);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = S(0.75);
  for (const dy of [-bandH * 0.5, bandH * 0.5]) {
    ctx.beginPath();
    ctx.moveTo(X(0), y + dy);
    ctx.lineTo(X(W), y + dy);
    ctx.stroke();
  }
  ctx.fillStyle = GOLD;
  for (const px of [X(3), X(W - 3)]) {
    ctx.fillRect(px - S(1), y - S(12), S(2), S(12));
    ctx.beginPath();
    ctx.arc(px, y - S(12), S(1.7), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.font = `800 ${S(6.2)}px Pretendard, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowBlur = S(7);
  ctx.fillStyle = 'rgba(255,238,178,.96)';
  ctx.fillText('F I N I S H', X(50), y - S(4.5));
  ctx.shadowBlur = 0;
}

/** 왼쪽 미니맵 — **트랙 밖 여백**에 놓는다 (겹치면 길이 안 보인다) */
function drawMinimap(
  ctx: CanvasRenderingContext2D,
  r: ReturnType<typeof race>,
  byBall: number[],
  camX: number, camY: number, effW: number, effH: number, frame: number,
  size: { w: number; h: number },
  gutter: number,
): void {
  // 여백 폭에 맞춰 크기를 정한다 — 트랙 비율(가로:세로)을 지킨다
  const maxW = gutter * 0.62;
  const maxH = size.h * 0.66;
  const k = Math.min(maxW / W, maxH / r.track.height);
  const mw = W * k;
  const mh = r.track.height * k;
  const mx = (gutter - mw) / 2;
  const my = (size.h - mh) / 2;

  ctx.fillStyle = 'rgba(4,10,18,.8)';
  ctx.fillRect(mx - 5, my - 5, mw + 10, mh + 10);
  ctx.strokeStyle = 'rgba(125,249,255,.28)';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx - 5, my - 5, mw + 10, mh + 10);

  ctx.strokeStyle = 'rgba(255,255,255,.3)';
  for (const s2 of r.track.segs) {
    ctx.beginPath();
    ctx.moveTo(mx + s2.ax * k, my + s2.ay * k);
    ctx.lineTo(mx + s2.bx * k, my + s2.by * k);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(125,249,255,.5)';
  for (const p of r.track.pegs) ctx.fillRect(mx + p.x * k - 0.5, my + p.y * k - 0.5, 1, 1);
  ctx.fillStyle = '#FFC24B';
  for (const sp of r.track.spinners) {
    ctx.beginPath();
    ctx.arc(mx + sp.x * k, my + sp.y * k, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = GOLD;
  ctx.beginPath();
  ctx.moveTo(mx, my + r.track.finishY * k);
  ctx.lineTo(mx + mw, my + r.track.finishY * k);
  ctx.stroke();
  // 지금 보고 있는 칸 — 좌우로도 따라가므로 가로도 표시한다
  ctx.strokeStyle = 'rgba(125,249,255,.85)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(
    mx + Math.max(0, camX - effW / 2) * k,
    my + camY * k,
    Math.min(W, effW) * k,
    effH * k,
  );
  ctx.lineWidth = 1;

  const base = frame * r.balls;
  for (let i = 0; i < r.balls; i++) {
    ctx.fillStyle = COLORS[byBall[i] % COLORS.length];
    ctx.beginPath();
    ctx.arc(mx + r.xs[base + i] * k, my + r.ys[base + i] * k, Math.max(2, mw * 0.06), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 오른쪽 순위표 — **트랙 밖 여백**에 놓는다 */
function drawBoard(
  ctx: CanvasRenderingContext2D,
  r: ReturnType<typeof race>,
  byBall: number[],
  entries: DrawEntry[],
  rank: number[],
  size: { w: number; h: number },
  gutter: number,
): void {
  const bw = gutter * 0.86;
  const bx = size.w - gutter + (gutter - bw) / 2;
  // 이름 세 글자가 들어가는 크기 — 여백 폭이 기준이다
  const fs = Math.min(bw * 0.2, size.h * 0.022);
  const row = fs * 1.85;
  const shown = Math.min(rank.length, 10);
  const by = size.h * 0.06;

  ctx.fillStyle = 'rgba(4,10,18,.8)';
  ctx.fillRect(bx - 6, by - 8, bw + 12, row * shown + 16);
  ctx.strokeStyle = 'rgba(125,249,255,.28)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx - 6, by - 8, bw + 12, row * shown + 16);

  ctx.textBaseline = 'middle';
  for (let i = 0; i < shown; i++) {
    const ball = rank[i];
    const color = COLORS[byBall[ball] % COLORS.length];
    const cy = by + row * i + row / 2;

    ctx.textAlign = 'left';
    ctx.font = `800 ${fs * 0.9}px Pretendard, sans-serif`;
    ctx.fillStyle = i < 3 ? RANK_COLOR[i] : 'rgba(255,255,255,.4)';
    ctx.fillText(`${i + 1}`, bx, cy);

    ctx.beginPath();
    ctx.arc(bx + fs * 1.35, cy, fs * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.font = `${i === 0 ? 800 : 600} ${fs}px Pretendard, sans-serif`;
    ctx.fillStyle = i === 0 ? '#FFFFFF' : 'rgba(255,255,255,.72)';
    ctx.fillText(entries[byBall[ball]]?.name ?? '', bx + fs * 2.05, cy);
  }
}
