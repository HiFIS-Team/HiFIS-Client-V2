'use client';

import { useEffect, useMemo, useRef } from 'react';

import type { DrawEntry } from '@/lib/api';
import { drawCountdown, rrect } from '@/lib/canvas';
import {
  BOX_L, BOX_R, BOX_T, CHUTE_L, CHUTE_R, DIV_TOP, DIV_X, DT, FLOOR_Y, HEIGHT,
  R, RAIL_Y, TRAY_TOP, TRAY_Y, W, assign, grab,
} from '@/lib/claw';

/** 출발 카운트다운 */
const COUNT_SEC = 3.2;

/* ── 색 ── 매장 TV 테마 그대로 (농구·축구와 같은 규칙) */
const CAB = '#FFFFFF';
const CAB_EDGE = '#E5E8EB';
const BAND_A = '#4593FC';
const BAND_B = '#2A6FF2';
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
 * **세는 동안 캡슐이 쏟아진다.** 쏟는 시간(3.0초)이 카운트다운(3.2초)과
 * 거의 같아서, `GRAB!` 이 뜨는 순간 다 쌓이고 집게가 움직이기 시작한다.
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
      // **끝에서 안 늦춘다** (2026-09-01 대표 결정) — 집게가 넣는 순간은
      // 그 자체로 또렷해서, 늦추면 늘어지기만 한다. 구슬 레이스만 늦춘다.
      // **세는 동안 멈추지 않는다.** 다른 게임은 0프레임이 멈춘 그림이라
      // 얹어 두면 되는데, 여기 0프레임은 캡슐이 아직 공중이라 어색하다.
      // 쏟는 데 걸리는 3.0초가 카운트 3.2초와 거의 같아서, `GRAB!` 이
      // 뜨는 순간 캡슐이 다 쌓이고 집게가 움직이기 시작한다.
      const after = now - COUNT_SEC;
      const f = Math.min(s.frames - 1, Math.max(0, Math.floor(now / DT)));
      const base = f * s.balls;

      const pad = Math.min(size.w, size.h) * 0.015;
      const scale = Math.min((size.w - pad * 2) / W, (size.h - pad * 2) / HEIGHT);
      const ox = (size.w - W * scale) / 2;
      const oy = (size.h - HEIGHT * scale) / 2;
      const X = (x: number) => ox + x * scale;
      const Y = (y: number) => oy + y * scale;
      const S = (v: number) => v * scale;

      // ── 기계 몸통 ── 캐비닛이 곧 화면이다
      ctx.fillStyle = CAB;
      ctx.fillRect(0, 0, size.w, size.h);

      ctx.save();

      // ── 간판 ──
      const band = ctx.createLinearGradient(0, Y(0), size.w, Y(16));
      band.addColorStop(0, BAND_A);
      band.addColorStop(1, BAND_B);
      ctx.fillStyle = band;
      ctx.fillRect(0, 0, size.w, Y(16) - Y(0));
      // 전구 다섯 — 천천히 돌아가며 밝아진다
      for (let k = 0; k < 5; k++) {
        const on = 0.45 + 0.55 * Math.max(0, Math.sin(now * 2.2 - k * 0.7));
        ctx.fillStyle = `rgba(255,255,255,${0.3 + on * 0.6})`;
        ctx.beginPath();
        ctx.arc(X(14 + k * 18), Y(8), S(1.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,.3)';
      ctx.fillRect(0, Y(15.4), size.w, S(0.6));

      // ── 유리통 ──
      const glass = ctx.createLinearGradient(0, Y(BOX_T), 0, Y(FLOOR_Y));
      glass.addColorStop(0, 'rgba(238,246,255,.85)');
      glass.addColorStop(1, 'rgba(220,234,249,.6)');
      ctx.fillStyle = glass;
      rrect(ctx, X(BOX_L), Y(BOX_T), S(BOX_R - BOX_L), S(FLOOR_Y - BOX_T), S(2.4));
      ctx.fill();
      ctx.save();
      rrect(ctx, X(BOX_L), Y(BOX_T), S(BOX_R - BOX_L), S(FLOOR_Y - BOX_T), S(2.4));
      ctx.clip();
      // 부드러운 사선 반사 — 예전에는 각진 사각형이라 유리로 안 보였다
      const sheen = ctx.createLinearGradient(X(BOX_L), Y(FLOOR_Y), X(BOX_L + 44), Y(BOX_T));
      sheen.addColorStop(0, 'rgba(255,255,255,0)');
      sheen.addColorStop(0.45, 'rgba(255,255,255,.5)');
      sheen.addColorStop(0.6, 'rgba(255,255,255,.5)');
      sheen.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sheen;
      ctx.fillRect(X(BOX_L), Y(BOX_T), S(BOX_R - BOX_L), S(FLOOR_Y - BOX_T));
      // 위쪽 안쪽 그림자
      const inner = ctx.createLinearGradient(0, Y(BOX_T), 0, Y(BOX_T + 7));
      inner.addColorStop(0, 'rgba(25,31,40,.10)');
      inner.addColorStop(1, 'rgba(25,31,40,0)');
      ctx.fillStyle = inner;
      ctx.fillRect(X(BOX_L), Y(BOX_T), S(BOX_R - BOX_L), S(7));
      ctx.restore();

      // 레일 — 두 줄로 금속 느낌
      ctx.strokeStyle = RAIL;
      ctx.lineWidth = S(1.2);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(X(BOX_L + 2.5), Y(RAIL_Y));
      ctx.lineTo(X(BOX_R - 2.5), Y(RAIL_Y));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      ctx.lineWidth = S(0.4);
      ctx.beginPath();
      ctx.moveTo(X(BOX_L + 2.5), Y(RAIL_Y - 0.35));
      ctx.lineTo(X(BOX_R - 2.5), Y(RAIL_Y - 0.35));
      ctx.stroke();

      // 배출구 칸막이
      ctx.strokeStyle = GLASS_EDGE;
      ctx.lineWidth = S(1);
      ctx.beginPath();
      ctx.moveTo(X(DIV_X), Y(DIV_TOP));
      ctx.lineTo(X(DIV_X), Y(FLOOR_Y));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = S(0.35);
      ctx.beginPath();
      ctx.moveTo(X(DIV_X - 0.35), Y(DIV_TOP));
      ctx.lineTo(X(DIV_X - 0.35), Y(FLOOR_Y));
      ctx.stroke();
      ctx.restore();

      // ── 배출구 ──
      ctx.save();
      const mouth = ctx.createLinearGradient(0, Y(FLOOR_Y), 0, Y(TRAY_TOP));
      mouth.addColorStop(0, '#CFD6DD');
      mouth.addColorStop(1, CHUTE);
      ctx.fillStyle = mouth;
      rrect(ctx, X(CHUTE_L), Y(FLOOR_Y - 1), S(CHUTE_R - CHUTE_L), S(TRAY_TOP - FLOOR_Y + 2), S(2));
      ctx.fill();
      ctx.restore();

      // ── 트레이 ──
      ctx.fillStyle = TRAY;
      rrect(ctx, X(BOX_L), Y(TRAY_TOP), S(BOX_R - BOX_L), S(TRAY_Y + 4 - TRAY_TOP), S(2.4));
      ctx.fill();
      ctx.save();
      rrect(ctx, X(BOX_L), Y(TRAY_TOP), S(BOX_R - BOX_L), S(TRAY_Y + 4 - TRAY_TOP), S(2.4));
      ctx.clip();
      const dip = ctx.createLinearGradient(0, Y(TRAY_TOP), 0, Y(TRAY_TOP + 5));
      dip.addColorStop(0, 'rgba(25,31,40,.10)');
      dip.addColorStop(1, 'rgba(25,31,40,0)');
      ctx.fillStyle = dip;
      ctx.fillRect(X(BOX_L), Y(TRAY_TOP), S(BOX_R - BOX_L), S(5));
      ctx.restore();
      ctx.strokeStyle = CAB_EDGE;
      ctx.lineWidth = S(0.5);
      rrect(ctx, X(BOX_L), Y(TRAY_TOP), S(BOX_R - BOX_L), S(TRAY_Y + 4 - TRAY_TOP), S(2.4));
      ctx.stroke();

      // 유리통 테두리 (캡슐보다 뒤)
      ctx.strokeStyle = FRAME;
      ctx.lineWidth = S(1);
      rrect(ctx, X(BOX_L), Y(BOX_T), S(BOX_R - BOX_L), S(FLOOR_Y - BOX_T), S(2.4));
      ctx.stroke();

      const cx = s.clawX[f];
      const cy = s.clawY[f];
      const grip = s.grip[f];
      const held = s.held[f];

      // ── 케이블 · 캐리지 · 가운데 발톱 (캡슐 뒤) ──
      ctx.strokeStyle = METAL_DARK;
      ctx.lineWidth = S(0.55);
      ctx.beginPath();
      ctx.moveTo(X(cx), Y(RAIL_Y));
      ctx.lineTo(X(cx), Y(cy));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = S(0.2);
      ctx.beginPath();
      ctx.moveTo(X(cx - 0.22), Y(RAIL_Y));
      ctx.lineTo(X(cx - 0.22), Y(cy));
      ctx.stroke();
      // 레일을 타고 다니는 몸통 — 집게가 어디로 가는지 눈으로 따라가게 된다
      const car = ctx.createLinearGradient(0, Y(RAIL_Y - 1.8), 0, Y(RAIL_Y + 1.8));
      car.addColorStop(0, METAL_HI);
      car.addColorStop(1, METAL);
      ctx.fillStyle = car;
      rrect(ctx, X(cx - 3.6), Y(RAIL_Y - 1.8), S(7.2), S(3.6), S(1.1));
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      rrect(ctx, X(cx - 2.8), Y(RAIL_Y - 1.2), S(5.6), S(0.9), S(0.45));
      ctx.fill();
      prong(ctx, cx, cy, 0, grip, X, Y, S);

      // ── 캡슐 ──
      for (let i = 0; i < s.balls; i++) {
        const x = X(s.xs[base + i]);
        const y = Y(s.ys[base + i]);
        const color = CAPS[byBall[i] % CAPS.length];
        const landed = s.ys[base + i] > TRAY_Y - R - 1.5 && s.xs[base + i] < DIV_X;
        if (landed) {
          const pulse = 0.13 + 0.07 * Math.sin(now * 4);
          ctx.fillStyle = `rgba(49,130,246,${pulse})`;
          ctx.beginPath();
          ctx.arc(x, y, S(R * 1.6), 0, Math.PI * 2);
          ctx.fill();
        }
        const ang = s.angle[base + i];
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.save();
        ctx.shadowColor = 'rgba(25,31,40,.22)';
        ctx.shadowBlur = S(1.2);
        ctx.shadowOffsetY = S(0.6);
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, S(R), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // 위 반 — 사람 색 (위쪽이 밝은 그라데이션)
        const cap = ctx.createLinearGradient(0, -S(R), 0, 0);
        cap.addColorStop(0, shade(color, 0.22));
        cap.addColorStop(1, color);
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, S(R), Math.PI, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = cap;
        ctx.fill();
        ctx.restore();
        // 이음매 — 흰 선 위에 얇은 그림자
        ctx.strokeStyle = 'rgba(255,255,255,.85)';
        ctx.lineWidth = S(0.5);
        ctx.beginPath();
        ctx.moveTo(-S(R * 0.99), 0);
        ctx.lineTo(S(R * 0.99), 0);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(25,31,40,.16)';
        ctx.lineWidth = S(0.24);
        ctx.beginPath();
        ctx.moveTo(-S(R * 0.99), S(0.3));
        ctx.lineTo(S(R * 0.99), S(0.3));
        ctx.stroke();
        ctx.lineWidth = S(0.26);
        ctx.beginPath();
        ctx.arc(0, 0, S(R), 0, Math.PI * 2);
        ctx.stroke();
        // 광택 — 캡슐과 같이 돈다
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.beginPath();
        ctx.ellipse(-S(R * 0.34), -S(R * 0.52), S(R * 0.24), S(R * 0.15), -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.35)';
        ctx.lineWidth = S(0.3);
        ctx.beginPath();
        ctx.arc(0, 0, S(R * 0.74), Math.PI * 1.12, Math.PI * 1.62);
        ctx.stroke();
        ctx.restore();

        // 이름은 **캡슐이 뒤집혀도 똑바로 선다.** 같이 돌리면 거꾸로 선 이름을
        // 멀리서 못 읽는다 — 대신 흰 후광을 둘러 색 반쪽 위에서도 읽히게 한다.
        const label = entries[byBall[i]]?.name ?? '';
        ctx.font = `800 ${S(R * 0.6)}px Pretendard, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';
        ctx.lineWidth = S(R * 0.26);
        ctx.strokeStyle = 'rgba(255,255,255,.92)';
        ctx.strokeText(label, x, y);
        ctx.fillStyle = landed ? PRIMARY : G900;
        ctx.fillText(label, x, y);
      }

      // ── 집게 ──
      prong(ctx, cx, cy, -1, grip, X, Y, S);
      prong(ctx, cx, cy, 1, grip, X, Y, S);
      ctx.save();
      ctx.shadowColor = 'rgba(25,31,40,.25)';
      ctx.shadowBlur = S(1.1);
      ctx.shadowOffsetY = S(0.5);
      const body = ctx.createLinearGradient(0, Y(cy - 2.2), 0, Y(cy + 2.2));
      body.addColorStop(0, METAL_HI);
      body.addColorStop(0.55, METAL);
      body.addColorStop(1, METAL_DARK);
      ctx.fillStyle = body;
      rrect(ctx, X(cx - 4.2), Y(cy - 2.2), S(8.4), S(4.4), S(1.3));
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      rrect(ctx, X(cx - 3.3), Y(cy - 1.6), S(6.6), S(1.1), S(0.55));
      ctx.fill();
      ctx.fillStyle = METAL_DARK;
      ctx.beginPath();
      ctx.arc(X(cx), Y(cy + 1.7), S(0.9), 0, Math.PI * 2);
      ctx.fill();

      if (held >= 0) {
        ctx.strokeStyle = `rgba(49,130,246,${0.22 + grip * 0.33})`;
        ctx.lineWidth = S(0.5);
        ctx.beginPath();
        ctx.arc(X(cx), Y(cy + R * 0.5), S(R * 1.3), 0, Math.PI * 2);
        ctx.stroke();
      }

      if (after <= 0) drawCountdown(ctx, -after, size, 'GRAB!', PRIMARY);

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
 * 발톱 하나 — `side` 가 -1·0·1 이고 가운데 것은 캡슐 뒤에 그린다.
 *
 * `grip` 이 0 이면 활짝, 1 이면 오므린다. 벌어진 정도를 그림으로만 흉내 내는
 * 것이 아니라 **물린 캡슐이 그 사이에 놓이도록** 자리를 맞춰 두었다.
 */
function prong(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, side: number, grip: number,
  X: (v: number) => number, Y: (v: number) => number, S: (v: number) => number,
): void {
  const spread = 2.6 + (1 - grip) * 3.4;
  const len = side === 0 ? R * 0.85 : R * 1.15;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(X(cx + side * 1.1), Y(cy));
    ctx.quadraticCurveTo(
      X(cx + side * spread * 1.35), Y(cy + len * 0.45),
      X(cx + side * spread), Y(cy + len),
    );
  };
  ctx.lineCap = 'round';
  // 어두운 밑선 위에 밝은 금속을 얹어 두께가 있는 것처럼 보이게
  ctx.strokeStyle = METAL_DARK;
  ctx.lineWidth = S(side === 0 ? 1.1 : 1.45);
  path();
  ctx.stroke();
  ctx.strokeStyle = side === 0 ? METAL : METAL_HI;
  ctx.lineWidth = S(side === 0 ? 0.55 : 0.75);
  path();
  ctx.stroke();
  // 발톱 끝
  ctx.fillStyle = METAL_DARK;
  ctx.beginPath();
  ctx.arc(X(cx + side * spread), Y(cy + len), S(side === 0 ? 0.6 : 0.75), 0, Math.PI * 2);
  ctx.fill();
}

/** 색을 밝게 — 캡슐 위쪽 반이 위로 갈수록 밝아진다 */
function shade(hex: string, up: number): string {
  const v = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * up);
  return `rgb(${mix((v >> 16) & 255)},${mix((v >> 8) & 255)},${mix(v & 255)})`;
}
