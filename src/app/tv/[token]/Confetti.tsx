'use client';

import { useEffect, useRef } from 'react';

import { rng } from '@/lib/draw';

/** 조각이 다 사라질 때까지 · 마지막에 사라지는 데 걸리는 시간(초) */
const LIFE = 6.2;
const FADE = 1.3;

/** 대포 세 발 — 한 번에 다 터뜨리면 한순간에 끝난다 */
const SHOTS = [0, 0.55, 1.15];
const PER_SHOT = 90;
/** 위에서 내려오는 조각 — **이게 없으면 밑에서 솟는 느낌만 남는다** */
const RAIN = 190;
/** 위에서 내려오는 조각이 뿌려지는 시간 */
const RAIN_SEC = 3.4;

const G = 780;
/** 종이는 금방 느려진다 — 없으면 끝없이 빨라져 총알처럼 보인다 */
const DRAG = 1.35;

/** 금·분홍을 섞었다 — 브랜드 색만 쓰면 잔치 느낌이 안 난다 */
const COLORS = [
  '#3182F6', '#4593FC', '#22C55E', '#F59E0B', '#EF4444',
  '#B44BD9', '#FFD54A', '#FF7AB6', '#2FE0C8',
];

/** 색을 밝게 — 조각 뒷면이다 (금박이 뒤집힐 때 반짝이는 그것) */
function back(hex: string): string {
  const v = parseInt(hex.slice(1), 16);
  const up = (c: number) => Math.round(c + (255 - c) * 0.5);
  return `rgb(${up((v >> 16) & 255)},${up((v >> 8) & 255)},${up(v & 255)})`;
}

type Piece = {
  x: number; y: number; vx: number; vy: number;
  spin: number; angle: number;
  w: number; h: number;
  /** 0 종이 · 1 리본 · 2 동그라미 */
  kind: number;
  /** 팔랑이며 좌우로 흔들리는 폭과 주기 */
  sway: number; swayW: number; phase: number;
  /** 이 시각부터 나온다 */
  born: number;
  color: string; back: string;
};

/**
 * 폭죽 — 당첨자가 뜰 때 터진다.
 *
 * **시드로 뿌린다.** 같은 추첨을 다시 틀면 조각까지 같은 자리로 날아간다 —
 * 공이 지나는 길을 시드로 고정한 것과 같은 이유다.
 *
 * ## 아래에서만 쏘면 축하로 안 보인다
 *
 * 처음에는 아래 양쪽 구석에서만 쐈는데 **밑에서 솟는 느낌**만 났다 (2026-09-01
 * 대표). 무대 대포는 원래 아래에서 쏘는 게 맞지만, 그것만 있으면 위가 텅 빈다.
 * **위에서 내려오는 조각**([RAIN])을 같이 뿌려야 화면 전체가 잔치가 된다.
 *
 * 대포도 한 번이 아니라 **세 발**로 나눠 쏜다 — 한 번에 터뜨리면 한순간에
 * 끝나서 20초 동안 걸려 있는 결과 화면이 금세 조용해진다.
 *
 * 재 보니 대포 조각의 **100%가 당첨자 카드 위까지** 올라가고, 꼭대기가
 * 화면 높이의 18%(중앙)다. 17%는 화면 위로 나갔다 되돌아 내려온다.
 */
export default function Confetti({ seed }: { seed: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const next = rng(`${seed}:confetti`);
    const unit = Math.min(w, h);
    const pieces: Piece[] = [];

    /** 조각 하나의 생김새 — 대포든 비든 같다 */
    const shape = (born: number) => {
      const kind = next() < 0.22 ? 1 : next() < 0.78 ? 0 : 2;
      const color = COLORS[Math.floor(next() * COLORS.length)];
      const size = unit / 110;
      return {
        spin: (next() - 0.5) * 13,
        angle: next() * Math.PI * 2,
        w: kind === 1 ? (2.6 + next() * 2) * size : (6 + next() * 7) * size,
        h: kind === 1 ? (20 + next() * 18) * size : (9 + next() * 11) * size,
        kind,
        sway: (18 + next() * 46) * (next() < 0.5 ? -1 : 1),
        swayW: 1.6 + next() * 2.6,
        phase: next() * 9,
        born,
        color,
        back: back(color),
      };
    };

    // ── 아래 양쪽에서 쏘는 대포 ──
    for (const at of SHOTS) {
      for (let i = 0; i < PER_SHOT; i++) {
        const left = i % 2 === 0;
        // **가파르게 쏜다.** 61도로 쏘던 것은 X 성분이 커서, 높이 올리려고
        // 세게 쏘면 화면 밖으로 날아가고 약하게 쏘면 화면 절반까지밖에
        // 못 올라갔다 (당첨자 카드 아래에 머물러서 '밑에서 솟는' 느낌이었다).
        // 77도로 세우면 같은 세기로 **전부 카드 위까지** 올라간다.
        const power = (0.9 + next() * 0.5) * unit * 2.7;
        const angle = (left ? -1.344 : -1.798) + (next() - 0.5) * 0.44;
        pieces.push({
          x: left ? w * 0.05 : w * 0.95,
          y: h * 0.97,
          vx: Math.cos(angle) * power,
          vy: Math.sin(angle) * power,
          ...shape(at),
        });
      }
    }
    // ── 위에서 내려오는 것 ──
    for (let i = 0; i < RAIN; i++) {
      pieces.push({
        x: next() * w,
        y: -unit * (0.05 + next() * 0.45),
        vx: (next() - 0.5) * unit * 0.2,
        vy: unit * (0.1 + next() * 0.3),
        ...shape(next() * RAIN_SEC),
      });
    }

    let raf = 0;
    let start = 0;
    let prev = 0;
    const step = (t: number) => {
      if (!start) { start = t; prev = t; }
      const elapsed = (t - start) / 1000;
      // **실제 흐른 시간으로 움직인다** — 1/60 을 박아 두면 120Hz 화면에서
      // 두 배로 빨리 날아간다
      const dt = Math.min(1 / 30, (t - prev) / 1000);
      prev = t;
      if (elapsed > LIFE) {
        ctx.clearRect(0, 0, w, h);
        return;
      }
      ctx.clearRect(0, 0, w, h);
      const fade = elapsed > LIFE - FADE ? (LIFE - elapsed) / FADE : 1;
      for (const p of pieces) {
        if (elapsed < p.born) continue;
        p.vy += G * dt;
        p.vx -= p.vx * DRAG * dt;
        p.vy -= p.vy * DRAG * dt;
        p.x += (p.vx + Math.sin((elapsed + p.phase) * p.swayW) * p.sway) * dt;
        p.y += p.vy * dt;
        p.angle += p.spin * dt;
        if (p.y > h + 60) continue;

        // 뒤집히면 뒷면이 보인다 — 금박이 반짝이는 그것
        const flip = Math.cos(p.angle);
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle * 0.6);
        ctx.fillStyle = flip < 0 ? p.back : p.color;
        if (p.kind === 2) {
          ctx.beginPath();
          ctx.ellipse(0, 0, p.w / 2, (p.w / 2) * Math.abs(flip), 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const hh = p.h * Math.max(0.12, Math.abs(flip));
          ctx.fillRect(-p.w / 2, -hh / 2, p.w, hh);
        }
        ctx.restore();
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [seed]);

  return <canvas ref={canvasRef} className="confetti" />;
}
