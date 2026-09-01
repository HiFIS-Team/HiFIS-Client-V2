'use client';

import { useEffect, useMemo, useRef } from 'react';

import type { DrawEntry } from '@/lib/api';
import { drawBallLabels, labelSlots } from '@/lib/ballLabels';
import { rrect } from '@/lib/canvas';
import {
  CONES, DT, GLOVE_A, GLOVE_B, GLOVE_Y, GOAL_Y, HEIGHT, MOUTH, POST_R, R, TARGET, W,
  assign, gloveXs, kick,
} from '@/lib/soccer';

/** 출발 카운트다운 */
const COUNT_SEC = 3.2;
/** 마지막 골이 들어가기 이 만큼 전부터 느려진다 (걸음) */
const SLOW_LEAD = 150;
const SLOW = 0.4;
/** 막은 장갑 · 들어간 골문이 빛나는 시간(초) */
const FLASH = 0.6;
const GOAL_FLASH = 0.9;

/* ── 색 ── **매장 TV 테마 그대로다** (농구와 같은 규칙).
   레이스만 검은 바탕을 쓴다 — 네온 트랙과 발광 구슬이 흰 바탕에서 안 보여서
   그렇게 한 것이고, 밝게 그리는 게임은 탈 이유가 없다. */
const PAGE = '#F2F4F6';
const TURF_A = '#EEF8ED';
const TURF_B = '#DBEDDD';
const MOW = 'rgba(108,164,116,.07)';
const TURF_EDGE = '#CFE3D2';
const CHALK = 'rgba(255,255,255,.9)';
const BOARD = '#D1D6DB';
const BOARD_EDGE = '#B4BCC4';
const POST = '#FFFFFF';
const POST_EDGE = 'rgba(25,31,40,.35)';
const NET = 'rgba(25,31,40,.18)';
const GLOVE = '#3182F6';
const GLOVE_EDGE = '#1B58C4';
const GLOVE_HOT = '#FFFFFF';
const CONE = '#FF7A1A';
const BALL = '#FFFFFF';
const BALL_SHADE = '#E6E9ED';
const PATCH = '#232A33';
const G900 = '#191F28';

/** 보드(벽) 두께 — 판 테두리 한가운데에 그린다 */
const RAIL = 1.5;

type Props = {
  seed: string;
  round: number;
  entries: DrawEntry[];
  winnerIndex: number;
  onFinished: () => void;
};

/**
 * 축구 슛 판 — **미리 차 둔 것을 재생만 한다.**
 *
 * 농구와 짜임이 같다(카메라가 안 움직이고 판 전체가 한 화면에 든다). 다른 건
 * **막는 쪽과 뚫리는 쪽이 뒤집혔다**는 것이다 — 농구는 구멍이 움직이고,
 * 축구는 골문이 고정이고 장갑이 움직인다.
 *
 * 벽에 공이 튕기는 이유가 보이게 **실내 축구장(보드가 둘러친 판)** 으로 그린다.
 * 그냥 잔디만 깔면 왜 옆에서 튕기는지가 안 보인다.
 */
export default function Soccer({ seed, round, entries, winnerIndex, onFinished }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const done = useRef(false);
  const labY = useRef<Float32Array | null>(null);

  const n = Math.max(1, entries.length);
  const runSeed = `${seed}:${round}`;
  const s = useMemo(() => kick(runSeed, n), [runSeed, n]);
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
    const savedAt = new Map<number, number>();
    let goalAt = -99;
    let goalX = W / 2;
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

      const pad = Math.min(size.w, size.h) * 0.015;
      const scale = Math.min((size.w - pad * 2) / W, (size.h - pad * 2) / HEIGHT);
      const ox = (size.w - W * scale) / 2;
      const oy = (size.h - HEIGHT * scale) / 2;
      const X = (x: number) => ox + x * scale;
      const Y = (y: number) => oy + y * scale;
      const S = (v: number) => v * scale;

      ctx.fillStyle = PAGE;
      ctx.fillRect(0, 0, size.w, size.h);

      // ── 잔디 ──
      const rad = S(3.2);
      ctx.save();
      ctx.shadowColor = 'rgba(25,31,40,.10)';
      ctx.shadowBlur = S(2.6);
      ctx.shadowOffsetY = S(0.8);
      const turf = ctx.createLinearGradient(0, Y(0), 0, Y(HEIGHT));
      turf.addColorStop(0, TURF_A);
      turf.addColorStop(1, TURF_B);
      ctx.fillStyle = turf;
      rrect(ctx, X(0), Y(0), S(W), S(HEIGHT), rad);
      ctx.fill();
      ctx.restore();

      ctx.save();
      rrect(ctx, X(0), Y(0), S(W), S(HEIGHT), rad);
      ctx.clip();
      // 잔디 깎은 자국
      ctx.fillStyle = MOW;
      for (let y = 0; y < HEIGHT; y += 26) ctx.fillRect(X(0), Y(y), S(W), S(13));
      // 흰 선 — 하프라인 · 페널티 박스 · 스폿 · 아크
      ctx.strokeStyle = CHALK;
      ctx.lineWidth = S(0.55);
      ctx.beginPath();
      ctx.moveTo(X(0), Y(10));
      ctx.lineTo(X(W), Y(10));
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(X(W / 2), Y(10), S(16), 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(X(8), Y(GOAL_Y));
      ctx.lineTo(X(8), Y(128));
      ctx.lineTo(X(W - 8), Y(128));
      ctx.lineTo(X(W - 8), Y(GOAL_Y));
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(X(W / 2), Y(146), S(15), Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = CHALK;
      ctx.beginPath();
      ctx.arc(X(W / 2), Y(146), S(0.8), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ── 골문 · 그물 ──
      const left = W / 2 - MOUTH;
      const right = W / 2 + MOUTH;
      const goalHeat = Math.max(0, 1 - (now - goalAt) / GOAL_FLASH);
      ctx.save();
      rrect(ctx, X(0), Y(0), S(W), S(HEIGHT), rad);
      ctx.clip();
      ctx.fillStyle = goalHeat > 0
        ? `rgba(49,130,246,${0.06 + goalHeat * 0.16})`
        : 'rgba(25,31,40,.035)';
      ctx.fillRect(X(left), Y(GOAL_Y), S(MOUTH * 2), S(HEIGHT - GOAL_Y));
      ctx.strokeStyle = NET;
      ctx.lineWidth = S(0.22);
      for (let x = left; x <= right; x += 4) {
        ctx.beginPath();
        ctx.moveTo(X(x), Y(GOAL_Y));
        ctx.lineTo(X(x), Y(HEIGHT));
        ctx.stroke();
      }
      for (let y = GOAL_Y; y <= HEIGHT; y += 3.5) {
        ctx.beginPath();
        ctx.moveTo(X(left), Y(y));
        ctx.lineTo(X(right), Y(y));
        ctx.stroke();
      }
      ctx.restore();

      // ── 보드(벽) ── 옆·위, 그리고 골문 밖의 골라인
      ctx.strokeStyle = BOARD;
      ctx.lineWidth = S(RAIL);
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(X(0), Y(GOAL_Y));
      ctx.lineTo(X(0), Y(rad / scale));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(X(W), Y(GOAL_Y));
      ctx.lineTo(X(W), Y(rad / scale));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(X(rad / scale), Y(0));
      ctx.lineTo(X(W - rad / scale), Y(0));
      ctx.stroke();
      ctx.lineCap = 'round';
      for (const [a, b] of [[0, left], [right, W]] as const) {
        ctx.beginPath();
        ctx.moveTo(X(a), Y(GOAL_Y));
        ctx.lineTo(X(b), Y(GOAL_Y));
        ctx.stroke();
      }
      ctx.strokeStyle = BOARD_EDGE;
      ctx.lineWidth = S(0.3);
      for (const [a, b] of [[0, left], [right, W]] as const) {
        ctx.beginPath();
        ctx.moveTo(X(a), Y(GOAL_Y - RAIL / 2));
        ctx.lineTo(X(b), Y(GOAL_Y - RAIL / 2));
        ctx.stroke();
      }

      // 골 넣은 자리에서 고리가 퍼진다
      if (goalHeat > 0) {
        ctx.strokeStyle = `rgba(49,130,246,${goalHeat * 0.55})`;
        ctx.lineWidth = S(0.7);
        ctx.beginPath();
        ctx.arc(X(goalX), Y(GOAL_Y), S(3 + (1 - goalHeat) * 22), 0, Math.PI * 2);
        ctx.stroke();
      }

      // 골대 기둥
      for (const px of [left, right]) {
        ctx.fillStyle = POST;
        ctx.strokeStyle = POST_EDGE;
        ctx.lineWidth = S(0.3);
        ctx.beginPath();
        ctx.arc(X(px), Y(GOAL_Y), S(POST_R), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // ── 라바콘 ──
      for (const c of CONES) {
        ctx.fillStyle = 'rgba(25,31,40,.10)';
        ctx.beginPath();
        ctx.ellipse(X(c.x), Y(c.y + c.r * 0.8), S(c.r * 1.15), S(c.r * 0.42), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = CONE;
        ctx.beginPath();
        ctx.moveTo(X(c.x), Y(c.y - c.r));
        ctx.lineTo(X(c.x + c.r), Y(c.y + c.r * 0.8));
        ctx.lineTo(X(c.x - c.r), Y(c.y + c.r * 0.8));
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.75)';
        ctx.lineWidth = S(0.28);
        ctx.beginPath();
        ctx.moveTo(X(c.x - c.r * 0.42), Y(c.y + c.r * 0.05));
        ctx.lineTo(X(c.x + c.r * 0.42), Y(c.y + c.r * 0.05));
        ctx.stroke();
      }

      // 막은 장갑 기억 (재생이 느려도 놓치지 않게 몇 걸음 훑는다)
      for (let k = Math.max(0, f - 2); k <= f; k++) {
        for (let i = 0; i < s.balls; i++) {
          const g = s.saved[k * s.balls + i];
          if (g >= 0) savedAt.set(g, now);
          if (s.scored[k * s.balls + i]) {
            goalAt = now;
            goalX = s.xs[k * s.balls + i];
          }
        }
      }

      // ── 골키퍼 장갑 ──
      gloveXs(f).forEach((gx, k) => {
        const lit = savedAt.get(k);
        const heat = lit === undefined ? 0 : Math.max(0, 1 - (now - lit) / FLASH);
        const x0 = X(gx - GLOVE_A - GLOVE_B);
        const y0 = Y(GLOVE_Y - GLOVE_B);
        const w = S((GLOVE_A + GLOVE_B) * 2);
        const h = S(GLOVE_B * 2);
        ctx.save();
        ctx.shadowColor = 'rgba(25,31,40,.22)';
        ctx.shadowBlur = S(1.2);
        ctx.shadowOffsetY = S(0.5);
        ctx.fillStyle = heat > 0 ? GLOVE_HOT : GLOVE;
        rrect(ctx, x0, y0, w, h, S(GLOVE_B));
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = heat > 0 ? GLOVE : GLOVE_EDGE;
        ctx.lineWidth = S(0.32);
        rrect(ctx, x0, y0, w, h, S(GLOVE_B));
        ctx.stroke();
        // 손가락 사이 · 손바닥
        ctx.strokeStyle = heat > 0 ? 'rgba(49,130,246,.5)' : 'rgba(255,255,255,.55)';
        ctx.lineWidth = S(0.3);
        for (let i = 1; i <= 3; i++) {
          const fx = X(gx - GLOVE_A + (GLOVE_A * 2 * i) / 4);
          ctx.beginPath();
          ctx.moveTo(fx, Y(GLOVE_Y - GLOVE_B * 0.9));
          ctx.lineTo(fx, Y(GLOVE_Y - GLOVE_B * 0.1));
          ctx.stroke();
        }
        ctx.fillStyle = heat > 0 ? 'rgba(49,130,246,.25)' : 'rgba(255,255,255,.3)';
        rrect(
          ctx, X(gx - GLOVE_A * 0.72), Y(GLOVE_Y + GLOVE_B * 0.05),
          S(GLOVE_A * 1.44), S(GLOVE_B * 0.75), S(GLOVE_B * 0.35),
        );
        ctx.fill();
      });

      // ── 공 ──
      for (let i = 0; i < s.balls; i++) {
        const bx = X(s.xs[base + i]);
        const by = Y(s.ys[base + i]);
        // 잔상
        for (let k = 6; k > 0; k--) {
          const pf = f - k * 2;
          if (pf < 0) continue;
          ctx.globalAlpha = (1 - k / 6) * 0.12;
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(X(s.xs[pf * s.balls + i]), Y(s.ys[pf * s.balls + i]), S(R * 0.8), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        ctx.save();
        ctx.shadowColor = 'rgba(25,31,40,.28)';
        ctx.shadowBlur = S(1.1);
        ctx.shadowOffsetY = S(0.5);
        const g = ctx.createRadialGradient(
          bx - S(R * 0.35), by - S(R * 0.4), S(R * 0.15), bx, by, S(R),
        );
        g.addColorStop(0, BALL);
        g.addColorStop(1, BALL_SHADE);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(bx, by, S(R), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 축구공 무늬 — 가운데 오각형에서 이음선이 뻗는다. 굴러간 만큼 돈다
        const rr = S(R);
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(s.xs[base + i] * 0.5);
        ctx.fillStyle = PATCH;
        ctx.beginPath();
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
          const px = Math.cos(a) * rr * 0.4;
          const py = Math.sin(a) * rr * 0.4;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(35,42,51,.55)';
        ctx.lineWidth = S(0.26);
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * rr * 0.4, Math.sin(a) * rr * 0.4);
          ctx.lineTo(Math.cos(a) * rr * 0.92, Math.sin(a) * rr * 0.92);
          ctx.stroke();
        }
        ctx.restore();
        ctx.strokeStyle = 'rgba(25,31,40,.22)';
        ctx.lineWidth = S(0.22);
        ctx.beginPath();
        ctx.arc(bx, by, S(R), 0, Math.PI * 2);
        ctx.stroke();
      }

      // 잔디 테두리는 공보다 위에 — 공이 판 밖으로 새는 것처럼 안 보이게
      ctx.strokeStyle = TURF_EDGE;
      ctx.lineWidth = S(0.5);
      rrect(ctx, X(0), Y(0), S(W), S(HEIGHT), rad);
      ctx.stroke();

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
          hotFrom: TARGET - 1, dot: GLOVE, smooth: labY.current,
        },
      );
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
  const text = n <= 0 ? 'KICK!' : String(Math.min(3, n));
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
  ctx.fillStyle = n <= 0 ? GLOVE : G900;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
