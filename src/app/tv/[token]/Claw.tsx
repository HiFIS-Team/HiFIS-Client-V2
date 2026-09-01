'use client';

import { useEffect, useMemo, useRef } from 'react';

import type { DrawEntry } from '@/lib/api';
import { rrect } from '@/lib/canvas';
import {
  BOX_L, BOX_R, BOX_T, CHUTE_L, CHUTE_R, DIV_TOP, DIV_X, DT, FLOOR_Y, HEIGHT,
  R, RAIL_Y, TRAY_TOP, TRAY_Y, W, assign, grab,
} from '@/lib/claw';

/** 마지막이 다가오면 이 만큼 전부터 느려진다 (걸음) */
const SLOW_LEAD = 150;
const SLOW = 0.4;

/* ── 색 ── 매장 TV 테마 그대로 (농구·축구와 같은 규칙) */
const PAGE = '#F2F4F6';
const CAB = '#FFFFFF';
const CAB_EDGE = '#E5E8EB';
const BAND_A = '#4593FC';
const BAND_B = '#2A6FF2';
const GLASS = 'rgba(232,243,255,.5)';
const GLASS_EDGE = '#D8E6F7';
const FRAME = '#D1D6DB';
const RAIL = '#AEB6C0';
const METAL = '#6B7684';
const METAL_HI = '#AEB6C0';
const METAL_DARK = '#4E5968';
const CHUTE = '#E4E9EE';
const TRAY = '#EDF1F4';
const G900 = '#191F28';
const PRIMARY = '#3182F6';

/** 캡슐 위쪽 반 색 — 사람마다 다르다 */
const CAPS = [
  '#FF8A3D', '#3DA5FF', '#33E08A', '#FFC24B', '#FF6FB5', '#C46BFF',
  '#2FE0C8', '#FF5A5A', '#9B8CFF', '#A8E633', '#5AD1FF', '#F97316',
  '#E879F9', '#38BDF8', '#84CC16', '#FB7185',
];

type Props = {
  seed: string;
  round: number;
  entries: DrawEntry[];
  winnerIndex: number;
  onFinished: () => void;
};

/**
 * 뽑기 기계 판 — **미리 뽑아 둔 것을 재생만 한다.**
 *
 * **카운트다운이 없다.** 다른 게임은 멈춘 그림에 3·2·1 을 얹으면 되는데,
 * 여기서 0프레임은 캡슐이 아직 공중에 떠 있는 그림이라 3초를 세우면
 * 고장 난 것처럼 보인다. **캡슐이 쏟아지는 것 자체가 도입부**다.
 */
export default function Claw({ seed, round, entries, winnerIndex, onFinished }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const done = useRef(false);

  const n = Math.max(1, entries.length);
  const runSeed = `${seed}:${round}`;
  const s = useMemo(() => grab(runSeed, n), [runSeed, n]);
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
      let f: number;
      if (now < slowFrom * DT) f = Math.floor(now / DT);
      else f = Math.floor(slowFrom + ((now - slowFrom * DT) * SLOW) / DT);
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

      // ── 기계 몸통 ──
      const rad = S(3.2);
      ctx.save();
      ctx.shadowColor = 'rgba(25,31,40,.10)';
      ctx.shadowBlur = S(2.6);
      ctx.shadowOffsetY = S(0.8);
      ctx.fillStyle = CAB;
      rrect(ctx, X(0), Y(0), S(W), S(HEIGHT), rad);
      ctx.fill();
      ctx.restore();

      // 간판 띠
      ctx.save();
      rrect(ctx, X(0), Y(0), S(W), S(HEIGHT), rad);
      ctx.clip();
      const band = ctx.createLinearGradient(X(0), 0, X(W), 0);
      band.addColorStop(0, BAND_A);
      band.addColorStop(1, BAND_B);
      ctx.fillStyle = band;
      ctx.fillRect(X(0), Y(0), S(W), S(16));
      ctx.restore();

      // ── 유리통 ──
      ctx.fillStyle = GLASS;
      rrect(ctx, X(BOX_L), Y(BOX_T), S(BOX_R - BOX_L), S(FLOOR_Y - BOX_T), S(2));
      ctx.fill();
      // 유리 반사
      ctx.save();
      rrect(ctx, X(BOX_L), Y(BOX_T), S(BOX_R - BOX_L), S(FLOOR_Y - BOX_T), S(2));
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath();
      ctx.moveTo(X(BOX_L + 6), Y(FLOOR_Y));
      ctx.lineTo(X(BOX_L + 26), Y(BOX_T));
      ctx.lineTo(X(BOX_L + 36), Y(BOX_T));
      ctx.lineTo(X(BOX_L + 16), Y(FLOOR_Y));
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 레일
      ctx.strokeStyle = RAIL;
      ctx.lineWidth = S(1.1);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(X(BOX_L + 2), Y(RAIL_Y));
      ctx.lineTo(X(BOX_R - 2), Y(RAIL_Y));
      ctx.stroke();

      // 배출구 칸막이 — 캡슐이 저 혼자 못 들어간다
      ctx.strokeStyle = GLASS_EDGE;
      ctx.lineWidth = S(1);
      ctx.beginPath();
      ctx.moveTo(X(DIV_X), Y(DIV_TOP));
      ctx.lineTo(X(DIV_X), Y(FLOOR_Y));
      ctx.stroke();

      // ── 배출구 · 트레이 ──
      ctx.fillStyle = CHUTE;
      ctx.fillRect(X(CHUTE_L), Y(FLOOR_Y), S(CHUTE_R - CHUTE_L), S(TRAY_TOP - FLOOR_Y));
      ctx.fillStyle = TRAY;
      rrect(ctx, X(BOX_L), Y(TRAY_TOP), S(BOX_R - BOX_L), S(TRAY_Y + 4 - TRAY_TOP), S(2));
      ctx.fill();
      ctx.strokeStyle = CAB_EDGE;
      ctx.lineWidth = S(0.5);
      rrect(ctx, X(BOX_L), Y(TRAY_TOP), S(BOX_R - BOX_L), S(TRAY_Y + 4 - TRAY_TOP), S(2));
      ctx.stroke();

      // 유리통 테두리 (캡슐보다 뒤)
      ctx.strokeStyle = FRAME;
      ctx.lineWidth = S(1);
      rrect(ctx, X(BOX_L), Y(BOX_T), S(BOX_R - BOX_L), S(FLOOR_Y - BOX_T), S(2));
      ctx.stroke();

      const cx = s.clawX[f];
      const cy = s.clawY[f];
      const grip = s.grip[f];
      const held = s.held[f];

      // 케이블 · 가운데 발톱은 캡슐 뒤에
      ctx.strokeStyle = RAIL;
      ctx.lineWidth = S(0.55);
      ctx.beginPath();
      ctx.moveTo(X(cx), Y(RAIL_Y));
      ctx.lineTo(X(cx), Y(cy));
      ctx.stroke();
      prong(ctx, cx, cy, 0, grip, METAL_DARK, X, Y, S);

      // ── 캡슐 ──
      for (let i = 0; i < s.balls; i++) {
        const x = X(s.xs[base + i]);
        const y = Y(s.ys[base + i]);
        const color = CAPS[byBall[i] % CAPS.length];
        const landed = s.ys[base + i] > TRAY_Y - R - 1.5 && s.xs[base + i] < DIV_X;
        if (landed) {
          ctx.fillStyle = 'rgba(49,130,246,.16)';
          ctx.beginPath();
          ctx.arc(x, y, S(R * 1.5), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.save();
        ctx.shadowColor = 'rgba(25,31,40,.20)';
        ctx.shadowBlur = S(1);
        ctx.shadowOffsetY = S(0.5);
        // 아래 반 — 흰색
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(x, y, S(R), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // 위 반 — 사람 색
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, S(R), Math.PI, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
        // 이음선 · 테두리
        ctx.strokeStyle = 'rgba(25,31,40,.18)';
        ctx.lineWidth = S(0.28);
        ctx.beginPath();
        ctx.moveTo(x - S(R), y);
        ctx.lineTo(x + S(R), y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, S(R), 0, Math.PI * 2);
        ctx.stroke();
        // 빛 반사
        ctx.fillStyle = 'rgba(255,255,255,.45)';
        ctx.beginPath();
        ctx.ellipse(x - S(R * 0.32), y - S(R * 0.5), S(R * 0.26), S(R * 0.16), -0.5, 0, Math.PI * 2);
        ctx.fill();
        // 이름 — 아래 흰 반에
        ctx.font = `800 ${S(R * 0.62)}px Pretendard, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = landed ? PRIMARY : G900;
        ctx.fillText(entries[byBall[i]]?.name ?? '', x, y + S(R * 0.42));
      }

      // ── 집게 ──
      prong(ctx, cx, cy, -1, grip, METAL, X, Y, S);
      prong(ctx, cx, cy, 1, grip, METAL, X, Y, S);
      ctx.save();
      ctx.shadowColor = 'rgba(25,31,40,.22)';
      ctx.shadowBlur = S(1);
      ctx.shadowOffsetY = S(0.4);
      ctx.fillStyle = METAL;
      rrect(ctx, X(cx - 4), Y(cy - 2.1), S(8), S(4.2), S(1.2));
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = METAL_HI;
      rrect(ctx, X(cx - 3.2), Y(cy - 1.5), S(6.4), S(1.3), S(0.6));
      ctx.fill();

      if (held >= 0) {
        // 물고 있는 표시 — 집게가 조여진 정도만큼 반짝인다
        ctx.strokeStyle = `rgba(49,130,246,${0.25 + grip * 0.35})`;
        ctx.lineWidth = S(0.5);
        ctx.beginPath();
        ctx.arc(X(cx), Y(cy + R * 0.5), S(R * 1.25), 0, Math.PI * 2);
        ctx.stroke();
      }

      // 기계 테두리는 맨 위에
      ctx.strokeStyle = CAB_EDGE;
      ctx.lineWidth = S(0.5);
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
  }, [s, byBall, slowFrom, entries, onFinished]);

  return <canvas ref={canvasRef} className="race" />;
}

/**
 * 발톱 하나 — `side` 가 -1·0·1 이고 가운데 것은 캡슐 뒤에 그린다.
 *
 * `grip` 이 0 이면 활짝, 1 이면 오므린다. 벌어진 정도를 그림으로만 흉내 내는
 * 것이 아니라 **물린 캡슐이 그 사이에 놓이도록** 자리를 맞춰 두었다.
 */
function prong(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, side: number, grip: number, color: string,
  X: (v: number) => number, Y: (v: number) => number, S: (v: number) => number,
): void {
  const spread = 2.6 + (1 - grip) * 3.4;
  const len = side === 0 ? R * 0.85 : R * 1.15;
  ctx.strokeStyle = color;
  ctx.lineWidth = S(side === 0 ? 0.9 : 1.15);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(X(cx + side * 1.1), Y(cy));
  ctx.quadraticCurveTo(
    X(cx + side * spread * 1.35), Y(cy + len * 0.45),
    X(cx + side * spread), Y(cy + len),
  );
  ctx.stroke();
}
