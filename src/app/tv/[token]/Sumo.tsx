'use client';

import { useEffect, useMemo, useRef } from 'react';

import type { DrawEntry } from '@/lib/api';
import { drawBallLabels, labelSlots } from '@/lib/ballLabels';
import { drawCountdown, rrect } from '@/lib/canvas';
import {
  CX, CY, DT, HEIGHT, R, RING0, W, assign, bout, ringAt,
} from '@/lib/sumo';

/** 출발 카운트다운 */
const COUNT_SEC = 3.2;
/** 부딪힌 자리에 흙먼지가 남는 시간(초) */
const DUST = 0.35;
/** 밀려난 자리에 흙먼지가 남는 시간(초) */
const OUT_DUST = 0.7;

/* ── 색 ── 매장 TV 테마 (농구·축구·뽑기와 같은 규칙) */
const PAGE = '#F2F4F6';
const GROUND = '#F1E6D2';
const RING_IN = '#FCF5E7';
const ROPE = '#DCC69B';
const ROPE_HI = '#F3E7CB';
const GHOST = 'rgba(178,148,100,.22)';
const LINE = 'rgba(255,255,255,.9)';
const EDGE = '#E5E8EB';
const SKIN = '#F2C9A0';
const SKIN_DARK = '#DDAC7A';
const HAIR = '#3A2A20';
const KNOT = '#5C4433';
const G900 = '#191F28';
const BELT_ACCENT = '#E5484D';

/** 샅바 색 — 사람마다 다르다 */
const BELTS = [
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
 * 밀어내기 판 — **미리 다 밀어내 본 것을 재생만 한다.**
 *
 * **위에서 내려다본 그림이다.** 앞의 다섯은 다 중력이 아래로 당기는 세로
 * 판이었는데 여기는 아래가 없다 — 그래서 씨름꾼을 위에서 본 모양으로 그린다
 * (머리와 어깨가 보이고 팔이 앞으로 뻗어 있다).
 */
export default function Sumo({ seed, round, entries, winnerIndex, onFinished }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const done = useRef(false);
  const labY = useRef<Float32Array | null>(null);

  const n = Math.max(1, entries.length);
  const runSeed = `${seed}:${round}`;
  const s = useMemo(() => bout(runSeed, n), [runSeed, n]);
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
    const bumpAt = new Map<number, number>();
    const outAt = new Map<number, number>();
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

      // ── 흙바닥 ──
      const rad = S(3.2);
      ctx.save();
      ctx.shadowColor = 'rgba(25,31,40,.10)';
      ctx.shadowBlur = S(2.6);
      ctx.shadowOffsetY = S(0.8);
      ctx.fillStyle = GROUND;
      rrect(ctx, X(0), Y(0), S(W), S(HEIGHT), rad);
      ctx.fill();
      ctx.restore();

      // ── 판(도효) ──
      const ring = ringAt(f);
      // 처음 크기 흔적 — 얼마나 좁아졌는지 보인다
      ctx.strokeStyle = GHOST;
      ctx.lineWidth = S(0.5);
      ctx.setLineDash([S(2), S(2.6)]);
      ctx.beginPath();
      ctx.arc(X(CX), Y(CY), S(RING0), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // 판 안
      ctx.fillStyle = RING_IN;
      ctx.beginPath();
      ctx.arc(X(CX), Y(CY), S(ring), 0, Math.PI * 2);
      ctx.fill();
      // 짚 테두리
      ctx.strokeStyle = ROPE;
      ctx.lineWidth = S(2.2);
      ctx.beginPath();
      ctx.arc(X(CX), Y(CY), S(ring), 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = ROPE_HI;
      ctx.lineWidth = S(0.7);
      ctx.beginPath();
      ctx.arc(X(CX), Y(CY), S(ring - 0.75), 0, Math.PI * 2);
      ctx.stroke();
      // 가운데 시키리센 두 줄
      if (ring > 10) {
        ctx.strokeStyle = LINE;
        ctx.lineWidth = S(0.7);
        ctx.lineCap = 'round';
        for (const dx of [-2.2, 2.2]) {
          ctx.beginPath();
          ctx.moveTo(X(CX + dx), Y(CY - Math.min(5, ring * 0.28)));
          ctx.lineTo(X(CX + dx), Y(CY + Math.min(5, ring * 0.28)));
          ctx.stroke();
        }
      }

      // 부딪힘·밀려남 기억 (재생이 느려도 놓치지 않게 몇 걸음 훑는다)
      for (let k = Math.max(0, f - 2); k <= f; k++) {
        for (let i = 0; i < s.balls; i++) {
          if (s.bump[k * s.balls + i]) bumpAt.set(i, now);
          if (k > 0 && s.live[(k - 1) * s.balls + i] && !s.live[k * s.balls + i]) {
            outAt.set(i, now);
          }
        }
      }

      // ── 밀려난 사람 먼저 (판 위 사람이 그 위로 온다) ──
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < s.balls; i++) {
          const live = s.live[base + i] === 1;
          if ((pass === 0) === live) continue;
          const x = X(s.xs[base + i]);
          const y = Y(s.ys[base + i]);
          // 밀려나며 인 흙먼지
          const od = outAt.get(i);
          if (od !== undefined) {
            const heat = Math.max(0, 1 - (now - od) / OUT_DUST);
            if (heat > 0) {
              ctx.fillStyle = `rgba(190,160,110,${heat * 0.5})`;
              ctx.beginPath();
              ctx.arc(x, y, S(R * (1.1 + (1 - heat) * 1.4)), 0, Math.PI * 2);
              ctx.fill();
            }
          }
          const bd = bumpAt.get(i);
          if (live && bd !== undefined) {
            const heat = Math.max(0, 1 - (now - bd) / DUST);
            if (heat > 0) {
              ctx.strokeStyle = `rgba(160,130,85,${heat * 0.6})`;
              ctx.lineWidth = S(0.6);
              ctx.beginPath();
              ctx.arc(x, y, S(R * (1.05 + (1 - heat) * 0.7)), 0, Math.PI * 2);
              ctx.stroke();
            }
          }
          wrestler(ctx, x, y, s.face[base + i], BELTS[byBall[i] % BELTS.length], live, S);
        }
      }

      // ── 이름 ──
      labY.current = labelSlots(labY.current, s.balls, 0);
      // **한 번에 그린다.** 판 위 사람과 밀려난 사람을 따로 그리면 서로
      // 겹치는 것을 못 본다 — 막 밀려난 사람은 판 가장자리에 딱 붙어 있다.
      drawBallLabels(
        ctx,
        Array.from({ length: s.balls }, (_, i) => ({
          id: i,
          cx: X(s.xs[base + i]),
          cy: Y(s.ys[base + i]),
          name: entries[byBall[i]]?.name ?? '',
          goals: 0,
          dim: s.live[base + i] === 0,
        })),
        {
          top: Y(0), bot: Y(HEIGHT), fs: S(2.9), ballR: S(R),
          hotFrom: 99, dot: G900, smooth: labY.current,
        },
      );

      if (after <= 0) drawCountdown(ctx, -after, size, 'PUSH!', BELT_ACCENT);

      ctx.strokeStyle = EDGE;
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
 * 씨름꾼 한 사람 — **위에서 내려다본 모양이다.**
 *
 * 앞(`+x`)을 보고 있고, 팔이 앞으로 뻗어 있어 **누구를 밀고 있는지**가 보인다.
 * 몸통 둘레의 띠가 샅바고, 그게 그 사람 색이다 — 어느 각도에서 봐도 보인다.
 */
function wrestler(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, face: number, belt: string, live: boolean,
  S: (v: number) => number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(face);
  if (!live) ctx.globalAlpha = 0.5;

  const round = (dx: number, dy: number, r: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(S(dx), S(dy), S(r), 0, Math.PI * 2);
    ctx.fill();
  };

  // 그림자
  if (live) {
    ctx.fillStyle = 'rgba(120,95,60,.22)';
    ctx.beginPath();
    ctx.ellipse(S(0.3), S(0.5), S(R * 1.0), S(R * 0.92), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 다리 둘 (뒤) · 팔 둘 (앞)
  round(-R * 0.62, -R * 0.42, R * 0.3, SKIN_DARK);
  round(-R * 0.62, R * 0.42, R * 0.3, SKIN_DARK);
  round(R * 0.5, -R * 0.7, R * 0.31, SKIN);
  round(R * 0.5, R * 0.7, R * 0.31, SKIN);
  // 몸통
  const body = ctx.createRadialGradient(
    S(-R * 0.25), S(-R * 0.25), S(R * 0.15), 0, 0, S(R * 0.92),
  );
  body.addColorStop(0, '#F8D8B4');
  body.addColorStop(1, SKIN);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, S(R * 0.92), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,80,45,.28)';
  ctx.lineWidth = S(0.22);
  ctx.stroke();
  // 샅바 — 몸통을 두른 띠
  ctx.strokeStyle = belt;
  ctx.lineWidth = S(R * 0.3);
  ctx.beginPath();
  ctx.arc(0, 0, S(R * 0.74), 0, Math.PI * 2);
  ctx.stroke();
  // 머리 — 위에서 보면 머리카락이 대부분이고 앞쪽에 이마가 보인다
  round(R * 0.24, 0, R * 0.44, HAIR);
  ctx.save();
  ctx.beginPath();
  ctx.arc(S(R * 0.24), 0, S(R * 0.44), 0, Math.PI * 2);
  ctx.clip();
  round(R * 0.52, 0, R * 0.3, '#F8D8B4');
  ctx.restore();
  // 상투
  ctx.fillStyle = KNOT;
  ctx.beginPath();
  ctx.ellipse(S(R * 0.06), 0, S(R * 0.2), S(R * 0.11), 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
