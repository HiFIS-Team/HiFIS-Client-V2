'use client';

import { useEffect, useMemo, useRef } from 'react';

import type { DrawEntry } from '@/lib/api';
import { drawBallLabels, labelSlots } from '@/lib/ballLabels';
import { drawCountdown, rrect } from '@/lib/canvas';
import {
  BACK_Y, DT, HACK_Y, HEIGHT, HOG_Y, HOUSE_X, HOUSE_Y, R, RINGS, W,
  assign, deliver,
} from '@/lib/curling';

/** 출발 카운트다운 */
const COUNT_SEC = 3.2;
/** 아웃된 돌이 사라지며 남는 자국(초) */
const GHOST = 0.55;

/* ── 색 ── 매장 TV 테마 (농구·축구·뽑기·밀어내기와 같은 규칙) */
const PAGE = '#F2F4F6';
const ICE_A = '#F6FBFF';
const ICE_B = '#E7F1FB';
const ICE_EDGE = '#D8E6F3';
const LINE = '#C3D3E2';
const CHALK = 'rgba(255,255,255,.9)';
const R12 = '#DCEBFF';
const R8 = '#FFFFFF';
const R4 = '#FFE1E1';
const PRIMARY = '#3182F6';
const GRANITE_HI = '#98A3AF';
const GRANITE = '#6E7885';
const GRANITE_DARK = '#4A535E';
const G900 = '#191F28';

/** 손잡이 색 — 사람마다 다르다 */
const GRIPS = [
  '#E5484D', '#3182F6', '#22A06B', '#F2A93B', '#8B5CF6', '#E45BA8',
  '#0EA5A5', '#F97316', '#5B7CFA', '#84CC16', '#DB2777', '#0891B2',
  '#B45309', '#7C3AED', '#059669', '#DC2626',
];

type Props = {
  seed: string;
  round: number;
  entries: DrawEntry[];
  winnerIndex: number;
  onFinished: () => void;
};

/**
 * 컬링 판 — **미리 다 던져 둔 것을 재생만 한다.**
 *
 * 앞의 다섯과 달리 **한 명씩 차례로** 던진다. 그런데도 끝까지 봐야 하는 것은
 * 나중 돌이 앞 돌을 쳐내기 때문이다 — 재 보니 1등이 평균 열 번 바뀐다.
 */
export default function Curling({ seed, round, entries, winnerIndex, onFinished }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const done = useRef(false);
  const labY = useRef<Float32Array | null>(null);

  const n = Math.max(1, entries.length);
  const runSeed = `${seed}:${round}`;
  const s = useMemo(() => deliver(runSeed, n), [runSeed, n]);
  const byBall = useMemo(
    () => assign(runSeed, s, Math.min(winnerIndex, n - 1)),
    [runSeed, s, winnerIndex, n],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    done.current = false;
    labY.current = null;
    const outAt = new Map<number, { at: number; x: number; y: number }>();
    let raf = 0;
    let start = 0;

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
      const after = now - COUNT_SEC;
      const f = Math.min(s.frames - 1, Math.max(0, after <= 0 ? 0 : Math.floor(after / DT)));
      const base = f * s.balls;

      const pad = Math.min(size.w, size.h) * 0.015;
      const scale = Math.min((size.w - pad * 2) / W, (size.h - pad * 2) / HEIGHT);
      const ox = (size.w - W * scale) / 2;
      const oy = (size.h - HEIGHT * scale) / 2;
      const X = (x: number) => ox + x * scale;
      const Y = (y: number) => oy + y * scale;
      const S = (v: number) => v * scale;

      ctx.fillStyle = PAGE;
      ctx.fillRect(0, 0, size.w, size.h);

      // ── 얼음 ──
      const rad = S(3.2);
      ctx.save();
      ctx.shadowColor = 'rgba(25,31,40,.10)';
      ctx.shadowBlur = S(2.6);
      ctx.shadowOffsetY = S(0.8);
      const ice = ctx.createLinearGradient(0, Y(0), 0, Y(HEIGHT));
      ice.addColorStop(0, ICE_A);
      ice.addColorStop(1, ICE_B);
      ctx.fillStyle = ice;
      rrect(ctx, X(0), Y(0), S(W), S(HEIGHT), rad);
      ctx.fill();
      ctx.restore();

      ctx.save();
      rrect(ctx, X(0), Y(0), S(W), S(HEIGHT), rad);
      ctx.clip();

      // ── 하우스 ── 바깥부터 안으로
      const paint = [R12, R8, R4, PRIMARY];
      RINGS.forEach((r, k) => {
        ctx.fillStyle = paint[k];
        ctx.beginPath();
        ctx.arc(X(HOUSE_X), Y(HOUSE_Y), S(r), 0, Math.PI * 2);
        ctx.fill();
      });
      RINGS.forEach((r) => {
        ctx.strokeStyle = 'rgba(25,31,40,.08)';
        ctx.lineWidth = S(0.3);
        ctx.beginPath();
        ctx.arc(X(HOUSE_X), Y(HOUSE_Y), S(r), 0, Math.PI * 2);
        ctx.stroke();
      });

      // ── 선 ── 센터 · 티 · 호그 · 백
      ctx.strokeStyle = LINE;
      ctx.lineWidth = S(0.4);
      ctx.beginPath();
      ctx.moveTo(X(HOUSE_X), Y(0));
      ctx.lineTo(X(HOUSE_X), Y(BACK_Y));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(X(0), Y(HOUSE_Y));
      ctx.lineTo(X(W), Y(HOUSE_Y));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(X(0), Y(BACK_Y));
      ctx.lineTo(X(W), Y(BACK_Y));
      ctx.stroke();
      // 호그라인은 굵다
      ctx.strokeStyle = 'rgba(49,130,246,.35)';
      ctx.lineWidth = S(1.1);
      ctx.beginPath();
      ctx.moveTo(X(0), Y(HOG_Y));
      ctx.lineTo(X(W), Y(HOG_Y));
      ctx.stroke();
      // 던지는 자리
      ctx.strokeStyle = CHALK;
      ctx.lineWidth = S(0.9);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(X(HOUSE_X - 5), Y(HACK_Y - 4));
      ctx.lineTo(X(HOUSE_X + 5), Y(HACK_Y - 4));
      ctx.stroke();
      ctx.restore();

      // 아웃된 돌 기억 (재생이 느려도 놓치지 않게 몇 걸음 훑는다)
      for (let k = Math.max(1, f - 2); k <= f; k++) {
        for (let i = 0; i < s.balls; i++) {
          if (s.alive[(k - 1) * s.balls + i] && !s.alive[k * s.balls + i]) {
            outAt.set(i, {
              at: now,
              x: s.xs[(k - 1) * s.balls + i],
              y: s.ys[(k - 1) * s.balls + i],
            });
          }
        }
      }

      // ── 지금 1등 ── 버튼에서 점선으로 이어 준다
      const lead = s.lead[f];
      if (lead >= 0 && s.thrown[base + lead] && s.alive[base + lead]) {
        ctx.strokeStyle = 'rgba(49,130,246,.5)';
        ctx.lineWidth = S(0.45);
        ctx.setLineDash([S(1.6), S(1.6)]);
        ctx.beginPath();
        ctx.moveTo(X(HOUSE_X), Y(HOUSE_Y));
        ctx.lineTo(X(s.xs[base + lead]), Y(s.ys[base + lead]));
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // ── 아웃된 돌 자국 ──
      for (const [, g] of outAt) {
        const heat = Math.max(0, 1 - (now - g.at) / GHOST);
        if (heat <= 0) continue;
        ctx.globalAlpha = heat * 0.5;
        stone(ctx, X(g.x), Y(g.y), 0, '#B0B8C1', S);
        ctx.globalAlpha = 1;
      }

      // ── 돌 ──
      for (let i = 0; i < s.balls; i++) {
        if (!s.thrown[base + i] || !s.alive[base + i]) continue;
        const x = X(s.xs[base + i]);
        const y = Y(s.ys[base + i]);
        if (lead === i) {
          ctx.strokeStyle = 'rgba(49,130,246,.85)';
          ctx.lineWidth = S(0.6);
          ctx.beginPath();
          ctx.arc(x, y, S(R * 1.32), 0, Math.PI * 2);
          ctx.stroke();
        }
        stone(ctx, x, y, s.angle[base + i], GRIPS[byBall[i] % GRIPS.length], S);
      }

      // ── 이름 ──
      labY.current = labelSlots(labY.current, s.balls, 0);
      drawBallLabels(
        ctx,
        Array.from({ length: s.balls }, (_, i) => i)
          .filter((i) => s.thrown[base + i] === 1 && s.alive[base + i] === 1)
          .map((i) => ({
            id: i,
            cx: X(s.xs[base + i]),
            cy: Y(s.ys[base + i]),
            name: entries[byBall[i]]?.name ?? '',
            goals: 0,
          })),
        {
          top: Y(0), bot: Y(HEIGHT), fs: S(2.9), ballR: S(R),
          hotFrom: 99, dot: G900, smooth: labY.current,
        },
      );

      if (after <= 0) drawCountdown(ctx, -after, size, 'THROW!', PRIMARY);

      ctx.strokeStyle = ICE_EDGE;
      ctx.lineWidth = S(0.6);
      rrect(ctx, X(0), Y(0), S(W), S(HEIGHT), rad);
      ctx.stroke();

      if (f >= s.frames - 1 && !done.current) {
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
  }, [s, byBall, entries, onFinished]);

  return <canvas ref={canvasRef} className="race" />;
}

/**
 * 돌 하나 — 화강암 몸에 **손잡이가 사람 색**이다.
 *
 * 실제 컬링 돌도 손잡이가 팀 색이라, 위에서 보면 그것으로 구분한다.
 * 손잡이는 돌과 같이 돈다 — 미끄러지는 내내 천천히 도는 것이 컬링이다.
 */
function stone(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, a: number, grip: string,
  S: (v: number) => number,
): void {
  ctx.save();
  ctx.shadowColor = 'rgba(25,31,40,.22)';
  ctx.shadowBlur = S(1.1);
  ctx.shadowOffsetY = S(0.5);
  const g = ctx.createRadialGradient(
    x - S(R * 0.3), y - S(R * 0.35), S(R * 0.15), x, y, S(R),
  );
  g.addColorStop(0, GRANITE_HI);
  g.addColorStop(1, GRANITE);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, S(R), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = GRANITE_DARK;
  ctx.lineWidth = S(0.3);
  ctx.beginPath();
  ctx.arc(x, y, S(R), 0, Math.PI * 2);
  ctx.stroke();
  // 띠 — 화강암 옆면
  ctx.strokeStyle = 'rgba(255,255,255,.28)';
  ctx.lineWidth = S(0.5);
  ctx.beginPath();
  ctx.arc(x, y, S(R * 0.78), 0, Math.PI * 2);
  ctx.stroke();

  // 손잡이
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.fillStyle = grip;
  rrect(ctx, -S(R * 0.19), -S(R * 0.62), S(R * 0.38), S(R * 1.24), S(R * 0.19));
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, S(R * 0.34), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.beginPath();
  ctx.arc(0, 0, S(R * 0.15), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
