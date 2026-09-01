'use client';

import { useEffect, useMemo, useRef } from 'react';

import type { DrawEntry } from '@/lib/api';
import { assignWinners } from '@/lib/draw';
import { drawBallLabels, labelSlots } from '@/lib/ballLabels';
import { drawCountdown } from '@/lib/canvas';
import {
  DT, FLOOR_Y, HEIGHT, HOLE, PEGS, R, TARGET, W,
  hoopXs, shoot,
} from '@/lib/hoops';

/** 출발 카운트다운 */
const COUNT_SEC = 3.2;
/** 골이 들어간 골대가 빛나는 시간(초) */
const FLASH = 0.7;

/* ── 색 ── **매장 TV 테마 그대로다** (2026-09-01 대표 요청).
   레이스는 검은 바탕에 네온이라 저 혼자 튀는 화면이었고, 발광 구슬이
   흰 바탕에서는 안 보여서 그렇게 한 것이다. 농구는 그럴 이유가 없다 —
   당첨자·컴플레인 화면과 번갈아 뜨는데 결이 갈리면 딴 화면처럼 보인다.
   그래서 밝은 체육관 결로 가고 색은 앱 토큰(tv.css `:root`)을 따른다. */
const COURT_A = '#FFFDF8';
const COURT_B = '#FFF3E2';
const GRAIN = 'rgba(176,134,84,.09)';
const MARK = 'rgba(176,134,84,.28)';
const G900 = '#191F28';
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
  /** 당첨자들 — 앞에서부터 1·2·3등 자리에 붙는다 */
  winners: number[];
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
export default function Hoops({ seed, round, entries, winners, onFinished }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const done = useRef(false);
  /** 이름표가 지금 놓여 있는 높이 — 칸이 바뀔 때 튀지 않게 따라간다 */
  const labY = useRef<Float32Array | null>(null);

  const n = Math.max(1, entries.length);
  const runSeed = `${seed}:${round}`;
  const s = useMemo(() => shoot(runSeed, n), [runSeed, n]);
  const byBall = useMemo(
    () => assignWinners(runSeed, s.order, n, winners),
    [runSeed, s, winners, n],
  );

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
      // **끝에서 안 늦춘다** (2026-09-01 대표 결정) — 마지막 골이 들어가는
      // 순간은 그 자체로 또렷해서, 늦추면 늘어지기만 한다.
      // 구슬 레이스만 늦춘다 (거기는 아홉이 한 줄로 몰려 들어와서 필요하다).
      const f = Math.min(s.frames - 1, Math.max(0, after <= 0 ? 0 : Math.floor(after / DT)));
      const base = f * s.balls;

      // **판이 남는 자리를 다 쓴다** — 옆에 뺄 것이 없다
      // **화면을 통째로 쓴다** (2026-09-01 대표 요청) — 둥근 카드로 그리면
      // 판이 페이지 안에 들어 있는 것처럼 보인다. 세로 TV(9:16)와 판 비율
      // (100:182)이 거의 같아서, 남는 자리는 바탕색으로 이어 칠하면 안 보인다.
      const scale = Math.min(size.w / W, size.h / HEIGHT);
      const ox = (size.w - W * scale) / 2;
      const oy = (size.h - HEIGHT * scale) / 2;
      const X = (x: number) => ox + x * scale;
      const Y = (y: number) => oy + y * scale;
      const S = (v: number) => v * scale;

      // ── 코트 ── 화면 끝까지 마룻바닥이다
      const floorPaint = ctx.createLinearGradient(0, Y(0), 0, Y(HEIGHT));
      floorPaint.addColorStop(0, COURT_A);
      floorPaint.addColorStop(1, COURT_B);
      ctx.fillStyle = floorPaint;
      ctx.fillRect(0, 0, size.w, size.h);

      ctx.save();
      // 마룻결
      ctx.strokeStyle = GRAIN;
      ctx.lineWidth = S(0.22);
      for (let y = 6; y < HEIGHT; y += 6) {
        ctx.beginPath();
        ctx.moveTo(0, Y(y));
        ctx.lineTo(size.w, Y(y));
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

      labY.current = labelSlots(labY.current, s.balls, 0);
      drawBallLabels(
        ctx,
        Array.from({ length: s.balls }, (_, i) => ({
          cx: X(s.xs[base + i]),
          cy: Y(s.ys[base + i]),
          name: entries[byBall[i]]?.name ?? '',
          goals: s.goals[base + i],
        })),
        {
          top: Y(0), bot: Y(HEIGHT), fs: S(2.9), ballR: S(R),
          hotFrom: TARGET - 1, dot: BALL, smooth: labY.current,
        },
      );
      if (after <= 0) drawCountdown(ctx, -after, size, 'SHOOT!', BALL);

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
