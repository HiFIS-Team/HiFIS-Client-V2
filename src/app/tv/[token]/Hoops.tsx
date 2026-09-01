'use client';

import { useEffect, useMemo, useRef } from 'react';

import type { DrawEntry } from '@/lib/api';
import {
  DT, FLOOR_Y, HEIGHT, HOLE, PEGS, R, TARGET, W,
  assign, hoopXs, shoot,
} from '@/lib/hoops';

/** 출발 카운트다운 */
const COUNT_SEC = 3.2;
/** 마지막 골이 들어가기 이 만큼 전부터 느려진다 (걸음) */
const SLOW_LEAD = 150;
const SLOW = 0.4;
/** 골이 들어간 골대가 빛나는 시간(초) */
const FLASH = 0.7;

const BALL = '#FF8A3D';
const BALL_DARK = '#C4531A';
const RIM = '#FF5A5A';
const NET = 'rgba(255,255,255,.55)';
const NEON = '#7DF9FF';
const GOLD = '#FFD54A';
const RANK_COLOR = [GOLD, '#D6DCE4', '#E0A46B'];

const COLORS = [
  '#3DA5FF', '#33E08A', '#FFC24B', '#FF5A5A', '#C46BFF', '#33D6FF',
  '#FF6FB5', '#2FE0C8', '#9B8CFF', '#FF9448', '#A8E633', '#5AD1FF',
  '#F97316', '#84CC16', '#E879F9', '#38BDF8',
];

type Props = {
  seed: string;
  round: number;
  entries: DrawEntry[];
  winnerIndex: number;
  onFinished: () => void;
};

/**
 * 농구 슛 판 — **미리 던져 둔 것을 재생만 한다.**
 *
 * 판 전체가 한 화면에 들어가서 카메라가 움직일 일이 없다 — 레이스처럼
 * 따라다니지 않으니 어지럽지도 않다. 그래서 참가자가 15명이어도 다 보인다.
 */
export default function Hoops({ seed, round, entries, winnerIndex, onFinished }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const done = useRef(false);

  const n = Math.max(1, entries.length);
  const runSeed = `${seed}:${round}`;
  const s = useMemo(() => shoot(runSeed, n), [runSeed, n]);
  const byBall = useMemo(
    () => assign(runSeed, s, Math.min(winnerIndex, n - 1)),
    [runSeed, s, winnerIndex, n],
  );
  const slowFrom = Math.max(0, s.frames - SLOW_LEAD);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    done.current = false;
    const flashAt = new Map<number, number>();
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
      let f: number;
      if (after <= 0) f = 0;
      else if (after < slowFrom * DT) f = Math.floor(after / DT);
      else f = Math.floor(slowFrom + ((after - slowFrom * DT) * SLOW) / DT);
      f = Math.min(s.frames - 1, Math.max(0, f));
      const base = f * s.balls;

      // 순위표 자리를 뺀 나머지에 판을 담는다 — **판 전체가 늘 보인다**
      const gutter = Math.min(size.w * 0.26, 340);
      const stageW = size.w - gutter;
      const scale = Math.min(stageW / W, size.h / HEIGHT);
      const ox = (stageW - W * scale) / 2;
      const oy = (size.h - HEIGHT * scale) / 2;
      const X = (x: number) => ox + x * scale;
      const Y = (y: number) => oy + y * scale;
      const S = (v: number) => v * scale;

      const bg = ctx.createLinearGradient(0, 0, 0, size.h);
      bg.addColorStop(0, '#05070C');
      bg.addColorStop(1, '#000000');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size.w, size.h);

      // 코트 테두리
      ctx.strokeStyle = 'rgba(125,249,255,.22)';
      ctx.lineWidth = S(0.7);
      ctx.strokeRect(X(0), Y(0), S(W), S(FLOOR_Y));

      for (let k = Math.max(0, f - 2); k <= f; k++) {
        for (let i = 0; i < s.balls; i++) {
          const g = s.scored[k * s.balls + i];
          if (g >= 0) flashAt.set(g, now);
        }
      }

      // ── 범퍼 ──
      ctx.fillStyle = NEON;
      ctx.shadowColor = NEON;
      ctx.shadowBlur = S(1.6);
      for (const p of PEGS) {
        ctx.beginPath();
        ctx.arc(X(p.x), Y(p.y), S(p.r), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // ── 바닥 + 골대 셋 ──
      const holes = hoopXs(f);
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = S(1.6);
      ctx.lineCap = 'round';
      // 구멍을 뺀 바닥 조각들
      const edges = [0, ...holes.flatMap((h) => [h - HOLE, h + HOLE]), W];
      for (let k = 0; k < edges.length; k += 2) {
        if (edges[k + 1] - edges[k] < 0.3) continue;
        ctx.beginPath();
        ctx.moveTo(X(edges[k]), Y(FLOOR_Y));
        ctx.lineTo(X(edges[k + 1]), Y(FLOOR_Y));
        ctx.stroke();
      }
      holes.forEach((hx, k) => {
        const lit = flashAt.get(k);
        const heat = lit === undefined ? 0 : Math.max(0, 1 - (now - lit) / FLASH);
        // 림
        ctx.strokeStyle = heat > 0 ? '#FFFFFF' : RIM;
        ctx.shadowColor = heat > 0 ? '#FFFFFF' : RIM;
        ctx.shadowBlur = S(2 + heat * 6);
        ctx.lineWidth = S(1.5);
        for (const rx of [hx - HOLE, hx + HOLE]) {
          ctx.beginPath();
          ctx.arc(X(rx), Y(FLOOR_Y), S(0.9), 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        // 그물
        ctx.strokeStyle = NET;
        ctx.lineWidth = S(0.35);
        for (let c = 0; c <= 5; c++) {
          const top = hx - HOLE + (HOLE * 2 * c) / 5;
          const bot = hx - HOLE * 0.55 + (HOLE * 1.1 * c) / 5;
          ctx.beginPath();
          ctx.moveTo(X(top), Y(FLOOR_Y));
          ctx.lineTo(X(bot), Y(FLOOR_Y + 7));
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.moveTo(X(hx - HOLE * 0.55), Y(FLOOR_Y + 7));
        ctx.lineTo(X(hx + HOLE * 0.55), Y(FLOOR_Y + 7));
        ctx.stroke();
      });

      // ── 공 ──
      for (let i = 0; i < s.balls; i++) {
        const who = byBall[i];
        const bx = X(s.xs[base + i]);
        const by = Y(s.ys[base + i]);
        const color = COLORS[who % COLORS.length];
        // 잔상
        for (let k = 6; k > 0; k--) {
          const pf = f - k * 2;
          if (pf < 0) continue;
          ctx.globalAlpha = (1 - k / 6) * 0.2;
          ctx.fillStyle = BALL;
          ctx.beginPath();
          ctx.arc(X(s.xs[pf * s.balls + i]), Y(s.ys[pf * s.balls + i]), S(R * 0.8), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        ctx.shadowColor = BALL;
        ctx.shadowBlur = S(2.4);
        const g = ctx.createRadialGradient(bx - S(R * 0.35), by - S(R * 0.4), S(R * 0.1), bx, by, S(R));
        g.addColorStop(0, '#FFC08A');
        g.addColorStop(1, BALL);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bx, by, S(R), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // 농구공 줄
        ctx.strokeStyle = BALL_DARK;
        ctx.lineWidth = S(0.3);
        ctx.beginPath();
        ctx.moveTo(bx - S(R), by);
        ctx.lineTo(bx + S(R), by);
        ctx.moveTo(bx, by - S(R));
        ctx.lineTo(bx, by + S(R));
        ctx.stroke();

        // 이름 · 골 수
        const label = entries[who]?.name ?? '';
        ctx.font = `800 ${S(2.6)}px Pretendard, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.lineWidth = S(0.9);
        ctx.strokeStyle = 'rgba(0,0,0,.9)';
        ctx.strokeText(label, bx, by + S(R + 0.6));
        ctx.fillStyle = color;
        ctx.fillText(label, bx, by + S(R + 0.6));
      }

      drawBoard(ctx, s, byBall, entries, f, size, gutter);
      if (after <= 0) drawCountdown(ctx, -after, size);

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
  }, [s, byBall, slowFrom, entries, onFinished]);

  return <canvas ref={canvasRef} className="race" />;
}

function drawCountdown(
  ctx: CanvasRenderingContext2D, left: number, size: { w: number; h: number },
): void {
  const n = Math.ceil(left);
  const text = n <= 0 ? 'SHOOT!' : String(Math.min(3, n));
  const p = 1 - (left - Math.floor(left));
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - p * 0.75);
  ctx.translate(size.w / 2, size.h / 2);
  ctx.scale(1 + p * 0.5, 1 + p * 0.5);
  ctx.font = `800 ${size.h * 0.14}px Pretendard, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = BALL;
  ctx.shadowBlur = size.h * 0.05;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** 오른쪽 순위표 — **골 수**로 세운다 (레이스는 위치로 셌다) */
function drawBoard(
  ctx: CanvasRenderingContext2D,
  s: ReturnType<typeof shoot>,
  byBall: number[],
  entries: DrawEntry[],
  frame: number,
  size: { w: number; h: number },
  gutter: number,
): void {
  const base = frame * s.balls;
  const rank = Array.from({ length: s.balls }, (_, i) => i).sort((a, b) => {
    const ga = s.goals[base + a];
    const gb = s.goals[base + b];
    return ga !== gb ? gb - ga : s.ys[base + b] - s.ys[base + a];
  });

  const bw = gutter * 0.84;
  const bx = size.w - gutter + (gutter - bw) / 2;
  const shown = Math.min(rank.length, 16);
  const fs = Math.min(bw * 0.17, (size.h * 0.86) / shown / 1.8);
  const row = fs * 1.8;
  const by = (size.h - row * shown) / 2;

  ctx.fillStyle = 'rgba(4,10,18,.8)';
  ctx.fillRect(bx - 8, by - 10, bw + 16, row * shown + 20);
  ctx.strokeStyle = 'rgba(125,249,255,.28)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx - 8, by - 10, bw + 16, row * shown + 20);

  ctx.textBaseline = 'middle';
  for (let i = 0; i < shown; i++) {
    const ball = rank[i];
    const who = byBall[ball];
    const cy = by + row * i + row / 2;
    const goals = s.goals[base + ball];

    ctx.textAlign = 'left';
    ctx.font = `800 ${fs * 0.9}px Pretendard, sans-serif`;
    ctx.fillStyle = i < 3 ? RANK_COLOR[i] : 'rgba(255,255,255,.4)';
    ctx.fillText(`${i + 1}`, bx, cy);

    ctx.font = `${i === 0 ? 800 : 600} ${fs}px Pretendard, sans-serif`;
    ctx.fillStyle = i === 0 ? '#FFFFFF' : 'rgba(255,255,255,.72)';
    ctx.fillText(entries[who]?.name ?? '', bx + fs * 1.3, cy);

    // 골 — 채운 동그라미로
    for (let k = 0; k < TARGET; k++) {
      ctx.beginPath();
      ctx.arc(bx + bw - fs * (TARGET - k) * 0.72, cy, fs * 0.24, 0, Math.PI * 2);
      if (k < goals) {
        ctx.fillStyle = BALL;
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
}
