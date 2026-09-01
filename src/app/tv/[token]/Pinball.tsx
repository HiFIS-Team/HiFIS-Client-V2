'use client';

import { useEffect, useMemo, useRef } from 'react';

import type { DrawEntry } from '@/lib/api';
import {
  BALL_R,
  DT,
  H,
  PEG_R,
  POCKET_TOP,
  W,
  buildTable,
  runForSlot,
} from '@/lib/pinball';

/** 못이 맞고 나서 빛이 사그라드는 시간(초) */
const GLOW = 0.45;
/** 공 뒤에 남는 잔상 개수 */
const TRAIL = 14;

/** 색 — `tv.css` 토큰과 같은 값이다 (canvas 라 CSS 변수를 못 쓴다) */
const C = {
  board: '#FFFFFF',
  boardEdge: '#E5E8EB',
  peg: '#D1D6DB',
  pegHit: '#3182F6',
  slotOdd: '#F2F4F6',
  slotWin: '#E8F3FF',
  divider: '#D1D6DB',
  text: '#6B7684',
  textWin: '#3182F6',
  ballA: '#FFFFFF',
  ballB: '#8B95A1',
} as const;

type Props = {
  seed: string;
  entries: DrawEntry[];
  winnerIndex: number;
  /** 공이 칸에 떨어졌을 때 — 부모가 결과 화면으로 넘어간다 */
  onLanded: () => void;
};

/**
 * 핀볼 판 — **미리 굴려 둔 길을 재생만 한다.**
 *
 * 공이 어디로 갈지는 [runForSlot] 이 화면을 그리기 전에 다 계산해 둔다.
 * 그래서 TV 가 버벅여도, 주사율이 50Hz 든 120Hz 든 **공이 지나는 길은 같다** —
 * 재생 위치를 프레임 수가 아니라 **흐른 시간**으로 잡기 때문이다.
 */
export default function Pinball({ seed, entries, winnerIndex, onLanded }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landed = useRef(false);

  const slots = Math.max(1, entries.length);
  // 굴리는 것은 **딱 한 번**이다 — 다시 그릴 때마다 굴리면 길이 흔들린다
  const run = useMemo(
    () => runForSlot(seed, slots, Math.min(winnerIndex, slots - 1)),
    [seed, slots, winnerIndex],
  );
  const table = useMemo(() => buildTable(slots), [slots]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    landed.current = false;
    /** 못이 마지막으로 맞은 시각(초) — 빛이 사그라드는 데 쓴다 */
    const litAt = new Map<number, number>();
    let raf = 0;
    let start = 0;

    /** 화면 크기를 재서 캔버스를 맞춘다 — TV 마다 해상도가 다르다 */
    const fit = () => {
      const box = canvas.parentElement;
      if (!box) return { scale: 1, ox: 0, oy: 0 };
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = box.clientWidth;
      const ch = box.clientHeight;
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // 판 비율을 지키며 가운데에 놓는다
      const scale = Math.min(cw / W, ch / H);
      return { scale, ox: (cw - W * scale) / 2, oy: (ch - H * scale) / 2 };
    };

    let view = fit();
    const onResize = () => {
      view = fit();
    };
    window.addEventListener('resize', onResize);

    const draw = (t: number) => {
      if (!start) start = t;
      const elapsed = (t - start) / 1000;
      // **흐른 시간으로 재생 위치를 잡는다** — 프레임을 세면 주사율에 끌려간다
      const i = Math.min(run.frames.length - 1, Math.floor(elapsed / DT));
      const now = elapsed;

      const { scale, ox, oy } = view;
      const X = (x: number) => ox + x * scale;
      const Y = (y: number) => oy + y * scale;
      const S = (v: number) => v * scale;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ── 판 ──
      ctx.fillStyle = C.board;
      ctx.strokeStyle = C.boardEdge;
      ctx.lineWidth = S(0.5);
      roundRect(ctx, X(0), Y(0), S(W), S(H), S(3));
      ctx.fill();
      ctx.stroke();

      // ── 칸 ──
      for (let s = 0; s < table.slots; s++) {
        const x0 = X(s * table.slotWidth);
        const w = S(table.slotWidth);
        const win = landed.current && s === run.slot;
        ctx.fillStyle = win ? C.slotWin : s % 2 ? C.slotOdd : C.board;
        ctx.fillRect(x0, Y(POCKET_TOP), w, S(H - POCKET_TOP));

        const label = entries[s]?.name ?? '';
        if (label) {
          ctx.fillStyle = win ? C.textWin : C.text;
          ctx.font = `${win ? 800 : 600} ${S(Math.min(5.5, table.slotWidth * 0.42))}px Pretendard, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, x0 + w / 2, Y(POCKET_TOP + (H - POCKET_TOP) / 2));
        }
      }
      // 칸막이
      ctx.strokeStyle = C.divider;
      ctx.lineWidth = S(1.2);
      ctx.lineCap = 'round';
      for (const dx of table.dividers) {
        ctx.beginPath();
        ctx.moveTo(X(dx), Y(POCKET_TOP));
        ctx.lineTo(X(dx), Y(H - 1));
        ctx.stroke();
      }

      // ── 못 ──
      for (let p = 0; p < table.pegs.length; p++) {
        const peg = table.pegs[p];
        const lit = litAt.get(p);
        const age = lit === undefined ? Infinity : now - lit;
        const heat = age < GLOW ? 1 - age / GLOW : 0;
        if (heat > 0) {
          ctx.shadowColor = C.pegHit;
          ctx.shadowBlur = S(3.5) * heat;
        }
        ctx.fillStyle = heat > 0 ? mix(C.peg, C.pegHit, heat) : C.peg;
        ctx.beginPath();
        ctx.arc(X(peg.x), Y(peg.y), S(PEG_R * (1 + heat * 0.45)), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // ── 공이 지나온 잔상 ──
      for (let k = TRAIL; k > 0; k--) {
        const f = run.frames[Math.max(0, i - k * 3)];
        if (!f) continue;
        ctx.globalAlpha = (1 - k / TRAIL) * 0.22;
        ctx.fillStyle = C.pegHit;
        ctx.beginPath();
        ctx.arc(X(f.x), Y(f.y), S(BALL_R * (1 - k / TRAIL / 1.6)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // ── 공 ──
      const f = run.frames[i];
      const g = ctx.createRadialGradient(
        X(f.x) - S(BALL_R * 0.35), Y(f.y) - S(BALL_R * 0.4), S(BALL_R * 0.15),
        X(f.x), Y(f.y), S(BALL_R),
      );
      g.addColorStop(0, C.ballA);
      g.addColorStop(1, C.ballB);
      ctx.shadowColor = 'rgba(25,31,40,.28)';
      ctx.shadowBlur = S(2.4);
      ctx.shadowOffsetY = S(0.8);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(X(f.x), Y(f.y), S(BALL_R), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // 이번에 맞은 못을 기록한다 — 뒤늦게 그려도 빛이 안 튄다
      for (let k = Math.max(0, i - 2); k <= i; k++) {
        const hit = run.frames[k]?.hit;
        if (hit !== null && hit !== undefined && !litAt.has(hit)) litAt.set(hit, now);
        else if (hit !== null && hit !== undefined) litAt.set(hit, now);
      }

      if (i >= run.frames.length - 1) {
        if (!landed.current) {
          landed.current = true;
          onLanded();
        }
      }
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [run, table, entries, onLanded]);

  return <canvas ref={canvasRef} className="pinball" />;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 두 색 사이 — 못이 맞을 때 회색에서 파랑으로 넘어간다 */
function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
