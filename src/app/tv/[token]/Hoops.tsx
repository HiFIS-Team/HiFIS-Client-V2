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

/* ── 색 ── **매장 TV 테마 그대로다** (2026-09-01 대표 요청).
   레이스는 검은 바탕에 네온이라 저 혼자 튀는 화면이었고, 발광 구슬이
   흰 바탕에서는 안 보여서 그렇게 한 것이다. 농구는 그럴 이유가 없다 —
   당첨자·컴플레인 화면과 번갈아 뜨는데 결이 갈리면 딴 화면처럼 보인다.
   그래서 밝은 체육관 결로 가고 색은 앱 토큰(tv.css `:root`)을 따른다. */
const PAGE = '#F2F4F6';
const COURT_A = '#FFFDF8';
const COURT_B = '#FFF3E2';
const COURT_EDGE = '#F0E2CD';
const GRAIN = 'rgba(176,134,84,.09)';
const MARK = 'rgba(176,134,84,.28)';
const G900 = '#191F28';
const PRIMARY = '#3182F6';
const PEG_FILL = '#E8F3FF';
const PEG_EDGE = '#9EC7FF';
const RIM = '#FF7A1A';
const RIM_HOT = '#FFC24B';
const NET = 'rgba(25,31,40,.22)';
const BALL_HI = '#FFC489';
const BALL = '#F2761B';
const SEAM = 'rgba(138,52,6,.7)';

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
 *
 * **순위표를 옆에 안 세운다.** 세워 두면 가로의 4분의 1을 먹어서 코트가
 * 그만큼 작아지는데(실제로 그래서 작아 보였다), 골 수는 어차피 이름 옆
 * 점으로 붙어 있어 판 안에서 다 읽힌다.
 */
export default function Hoops({ seed, round, entries, winnerIndex, onFinished }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const done = useRef(false);
  /** 이름표가 지금 놓여 있는 높이 — 칸이 바뀔 때 튀지 않게 따라간다 */
  const labY = useRef<Float32Array | null>(null);

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
    labY.current = null;
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

      // **판이 남는 자리를 다 쓴다** — 옆에 뺄 것이 없다
      const pad = Math.min(size.w, size.h) * 0.015;
      const scale = Math.min((size.w - pad * 2) / W, (size.h - pad * 2) / HEIGHT);
      const ox = (size.w - W * scale) / 2;
      const oy = (size.h - HEIGHT * scale) / 2;
      const X = (x: number) => ox + x * scale;
      const Y = (y: number) => oy + y * scale;
      const S = (v: number) => v * scale;

      ctx.fillStyle = PAGE;
      ctx.fillRect(0, 0, size.w, size.h);

      // ── 코트 ──
      const cw = S(W);
      const ch = S(HEIGHT);
      const rad = S(3.2);
      ctx.save();
      ctx.shadowColor = 'rgba(25,31,40,.10)';
      ctx.shadowBlur = S(2.6);
      ctx.shadowOffsetY = S(0.8);
      const floorPaint = ctx.createLinearGradient(0, Y(0), 0, Y(HEIGHT));
      floorPaint.addColorStop(0, COURT_A);
      floorPaint.addColorStop(1, COURT_B);
      ctx.fillStyle = floorPaint;
      rrect(ctx, X(0), Y(0), cw, ch, rad);
      ctx.fill();
      ctx.restore();

      ctx.save();
      rrect(ctx, X(0), Y(0), cw, ch, rad);
      ctx.clip();
      // 마룻결
      ctx.strokeStyle = GRAIN;
      ctx.lineWidth = S(0.22);
      for (let y = 6; y < HEIGHT; y += 6) {
        ctx.beginPath();
        ctx.moveTo(X(0), Y(y));
        ctx.lineTo(X(W), Y(y));
        ctx.stroke();
      }
      // 코트 선 — 센터 서클과 자유투 선
      ctx.strokeStyle = MARK;
      ctx.lineWidth = S(0.5);
      ctx.beginPath();
      ctx.arc(X(W / 2), Y(FLOOR_Y * 0.5), S(21), 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(X(0), Y(FLOOR_Y - 26));
      ctx.lineTo(X(W), Y(FLOOR_Y - 26));
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = COURT_EDGE;
      ctx.lineWidth = S(0.5);
      rrect(ctx, X(0), Y(0), cw, ch, rad);
      ctx.stroke();

      for (let k = Math.max(0, f - 2); k <= f; k++) {
        for (let i = 0; i < s.balls; i++) {
          const g = s.scored[k * s.balls + i];
          if (g >= 0) flashAt.set(g, now);
        }
      }

      // ── 범퍼 ──
      ctx.lineWidth = S(0.4);
      for (const p of PEGS) {
        ctx.fillStyle = PEG_FILL;
        ctx.strokeStyle = PEG_EDGE;
        ctx.beginPath();
        ctx.arc(X(p.x), Y(p.y), S(p.r), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // ── 바닥 + 골대 셋 ──
      const holes = hoopXs(f);
      ctx.strokeStyle = G900;
      ctx.lineWidth = S(1.5);
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
        // 골이 들어간 자리에서 고리가 퍼진다
        if (heat > 0) {
          ctx.strokeStyle = `rgba(255,122,26,${heat * 0.5})`;
          ctx.lineWidth = S(0.7);
          ctx.beginPath();
          ctx.arc(X(hx), Y(FLOOR_Y), S(HOLE + (1 - heat) * 12), 0, Math.PI * 2);
          ctx.stroke();
        }
        // 그물
        ctx.strokeStyle = NET;
        ctx.lineWidth = S(0.3);
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
        // 림 — 골이 들어가면 밝아진다
        ctx.strokeStyle = heat > 0 ? RIM_HOT : RIM;
        ctx.lineWidth = S(1.4);
        for (const rx of [hx - HOLE, hx + HOLE]) {
          ctx.beginPath();
          ctx.arc(X(rx), Y(FLOOR_Y), S(0.95), 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // ── 공 ──
      for (let i = 0; i < s.balls; i++) {
        const bx = X(s.xs[base + i]);
        const by = Y(s.ys[base + i]);
        // 잔상
        for (let k = 6; k > 0; k--) {
          const pf = f - k * 2;
          if (pf < 0) continue;
          ctx.globalAlpha = (1 - k / 6) * 0.14;
          ctx.fillStyle = BALL;
          ctx.beginPath();
          ctx.arc(X(s.xs[pf * s.balls + i]), Y(s.ys[pf * s.balls + i]), S(R * 0.8), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        ctx.save();
        ctx.shadowColor = 'rgba(140,60,10,.28)';
        ctx.shadowBlur = S(1.2);
        ctx.shadowOffsetY = S(0.5);
        const g = ctx.createRadialGradient(
          bx - S(R * 0.35), by - S(R * 0.4), S(R * 0.1), bx, by, S(R),
        );
        g.addColorStop(0, BALL_HI);
        g.addColorStop(1, BALL);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bx, by, S(R), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 농구공 이음선 — 좌우로 움직인 만큼 굴러간다
        const rr = S(R);
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(s.xs[base + i] * 0.42);
        ctx.strokeStyle = SEAM;
        ctx.lineWidth = S(0.28);
        ctx.beginPath();
        ctx.moveTo(-rr, 0);
        ctx.lineTo(rr, 0);
        ctx.moveTo(0, -rr);
        ctx.lineTo(0, rr);
        ctx.moveTo(-rr * 0.7, -rr * 0.71);
        ctx.quadraticCurveTo(0, 0, -rr * 0.7, rr * 0.71);
        ctx.moveTo(rr * 0.7, -rr * 0.71);
        ctx.quadraticCurveTo(0, 0, rr * 0.7, rr * 0.71);
        ctx.stroke();
        ctx.restore();
      }

      drawLabels(ctx, s, byBall, entries, f, labY, X, Y, S);
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

/** 모서리 둥근 사각형 — `roundRect` 는 오래된 TV 브라우저에 없다 */
function rrect(
  ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * 이름표 — **겹치면 위로 한 칸씩 밀어 놓는다.**
 *
 * 공이 바닥에 몰리면 이름이 서로 포개지고 공까지 덮는다 (실제로 셋이 겹쳤다).
 * 그래서 공 **위**에 놓고, 자리가 겹치는 것은 한 줄씩 올린다. 천장에 붙어
 * 자리가 없으면 그것만 아래로 내린다.
 *
 * 칸이 바뀔 때 글자가 툭 튀지 않게 [labY] 로 부드럽게 따라가되, 골을 넣어
 * 위에서 다시 던져진 공은 **그냥 옮긴다** — 안 그러면 이름이 화면을 가로지른다.
 */
function drawLabels(
  ctx: CanvasRenderingContext2D,
  s: ReturnType<typeof shoot>,
  byBall: number[],
  entries: DrawEntry[],
  frame: number,
  labY: { current: Float32Array | null },
  X: (v: number) => number,
  Y: (v: number) => number,
  S: (v: number) => number,
): void {
  const base = frame * s.balls;
  const fs = S(2.9);
  const lh = fs * 1.2;
  const top = Y(0);
  const bot = Y(HEIGHT);
  ctx.font = `800 ${fs}px Pretendard, sans-serif`;

  type Slot = {
    i: number; cx: number; ly: number; half: number;
    name: string; nameW: number; goals: number;
  };
  const slots: Slot[] = [];
  for (let i = 0; i < s.balls; i++) {
    const name = entries[byBall[i]]?.name ?? '';
    const goals = s.goals[base + i];
    const nameW = ctx.measureText(name).width;
    const w = nameW + (goals > 0 ? goals * fs * 0.46 + fs * 0.24 : 0);
    const cx = X(s.xs[base + i]);
    const cy = Y(s.ys[base + i]);
    // 위가 넓으면 위로, 천장에 붙어 있으면 아래로 — 그쪽도 막히면 서로 바꾼다
    const roomUp = cy - S(R) - lh > top + lh;
    let ly = Math.min(bot - fs * 0.7, Math.max(top + fs * 0.7, cy - S(R) - fs * 0.6));
    let found = false;
    for (const up of roomUp ? [true, false] : [false, true]) {
      for (let row = 0; row < 9; row++) {
        const cand = up
          ? cy - S(R) - fs * 0.6 - row * lh
          : cy + S(R) + fs * 0.7 + row * lh;
        // 판 밖으로 나가면 그 방향은 거기서 끝이다 — 글자가 잘려 보인다
        if (cand < top + fs * 0.7 || cand > bot - fs * 0.7) break;
        const clash = slots.some(
          (p) => Math.abs(p.ly - cand) < lh * 0.9
            && Math.abs(p.cx - cx) < p.half + w / 2 + fs * 0.45,
        );
        if (!clash) {
          ly = cand;
          found = true;
          break;
        }
      }
      if (found) break;
    }
    slots.push({ i, cx, ly, half: w / 2, name, nameW, goals });
  }

  if (!labY.current || labY.current.length !== s.balls) {
    labY.current = Float32Array.from(slots.map((p) => p.ly));
  }
  const smooth = labY.current;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (const p of slots) {
    // 다시 던져진 공은 자리가 통째로 바뀐다 — 그때는 따라가지 않고 옮긴다
    smooth[p.i] = Math.abs(smooth[p.i] - p.ly) > lh * 4
      ? p.ly
      : smooth[p.i] + (p.ly - smooth[p.i]) * 0.25;
    const y = smooth[p.i];
    let tx = p.cx - p.half;

    ctx.lineWidth = fs * 0.42;
    ctx.strokeStyle = 'rgba(255,255,255,.92)';
    ctx.lineJoin = 'round';
    ctx.strokeText(p.name, tx, y);
    // 한 골만 더 넣으면 끝나는 공은 파랗게 — 어디를 봐야 하는지 알려 준다
    ctx.fillStyle = p.goals >= TARGET - 1 ? PRIMARY : G900;
    ctx.fillText(p.name, tx, y);

    tx += p.nameW + fs * 0.24;
    for (let k = 0; k < p.goals; k++) {
      ctx.beginPath();
      ctx.arc(tx + fs * 0.23, y, fs * 0.2, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,.92)';
      ctx.lineWidth = fs * 0.16;
      ctx.stroke();
      ctx.fillStyle = BALL;
      ctx.fill();
      tx += fs * 0.46;
    }
  }
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
  ctx.lineWidth = size.h * 0.016;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = n <= 0 ? BALL : G900;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
