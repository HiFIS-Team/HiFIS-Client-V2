'use client';

import { useEffect, useRef } from 'react';

import { rng } from '@/lib/pinball';

/** 조각 수 · 사는 시간(초) */
const COUNT = 160;
const LIFE = 2.6;

const COLORS = ['#3182F6', '#4593FC', '#22C55E', '#F59E0B', '#EF4444', '#B44BD9'];

type Piece = {
  x: number; y: number; vx: number; vy: number;
  spin: number; angle: number; w: number; h: number; color: string;
};

/**
 * 폭죽 — 당첨자가 뜰 때 한 번 터진다.
 *
 * **시드로 뿌린다.** 같은 추첨을 다시 틀면 조각까지 같은 자리로 날아간다 —
 * 공이 지나는 길을 시드로 고정한 것과 같은 이유다.
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
    // 왼쪽·오른쪽 아래에서 가운데 위로 쏜다 (무대 폭죽처럼)
    const pieces: Piece[] = Array.from({ length: COUNT }, (_, i) => {
      const left = i % 2 === 0;
      const spread = (next() - 0.5) * 1.1;
      const power = 620 + next() * 420;
      const angle = (left ? -1.02 : -2.12) + spread * 0.5;
      return {
        x: left ? w * 0.06 : w * 0.94,
        y: h * 0.92,
        vx: Math.cos(angle) * power * (left ? 1 : 1),
        vy: Math.sin(angle) * power,
        spin: (next() - 0.5) * 12,
        angle: next() * Math.PI * 2,
        w: 6 + next() * 8,
        h: 9 + next() * 12,
        color: COLORS[Math.floor(next() * COLORS.length)],
      };
    });

    let raf = 0;
    let start = 0;
    const step = (t: number) => {
      if (!start) start = t;
      const elapsed = (t - start) / 1000;
      if (elapsed > LIFE) {
        ctx.clearRect(0, 0, w, h);
        return;
      }
      const dt = 1 / 60;
      ctx.clearRect(0, 0, w, h);
      const fade = elapsed > LIFE - 0.8 ? (LIFE - elapsed) / 0.8 : 1;
      for (const p of pieces) {
        p.vy += 900 * dt;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.angle += p.spin * dt;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        // 세로로 눌러 그리면 종이가 팔랑이는 것처럼 보인다
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.angle)));
        ctx.restore();
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [seed]);

  return <canvas ref={canvasRef} className="confetti" />;
}
