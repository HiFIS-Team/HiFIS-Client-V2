'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getJson, type DrawData } from '@/lib/api';

import Confetti from './Confetti';
import Pinball from './Pinball';
import TvBoard from './TvBoard';

/** 당첨자를 띄워 두는 시간(ms) — 지나면 게임을 다시 튼다 */
const RESULT_HOLD = 20000;
/** 추첨을 다시 물어보는 주기 — 달이 바뀌면 이 안에 새 추첨으로 갈아탄다 */
const REFRESH = 10 * 60 * 1000;
/** 결과 아래에 깔 컴플레인 줄 수 — 위에 당첨자 카드가 서서 자리가 좁다 */
const RESULT_ROWS = 3;

type Phase = 'game' | 'result';

/**
 * 매장 TV — **추첨과 컴플레인이 한 바퀴를 돈다** (2026-09-01 대표 요청).
 *
 * ```
 *   핀볼이 굴러간다 (약 9초)
 *        ↓ 당첨 칸에 떨어진다
 *   🎆 폭죽 + 당첨자 · 그 아래 해결된 컴플레인
 *        ↓ 20초
 *   다시 핀볼  ← 같은 시드라 똑같이 굴러간다
 * ```
 *
 * **추첨이 없으면 예전 화면 그대로다.** 그 달 설문이 한 건도 없었거나 아직
 * 안 뽑힌 달이면 컴플레인만 보여준다 — 벽에 걸린 TV 가 오류로 바뀌면 안 된다.
 */
export default function TvScreen({ token }: { token: string }) {
  const [draw, setDraw] = useState<DrawData | null>(null);
  const [phase, setPhase] = useState<Phase>('game');
  /** 판을 새로 짜는 열쇠 — 올리면 핀볼이 처음부터 다시 굴러간다 */
  const [round, setRound] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    getJson<DrawData>(`/tv/${encodeURIComponent(token)}/draw`, { cache: 'no-store' })
      .then((data) => {
        setDraw((prev) => {
          // 같은 추첨이면 상태를 안 건드린다 — 굴러가는 중에 판이 새로 짜이면 안 된다
          if (prev && prev.period === data.period && prev.seed === data.seed) return prev;
          return data;
        });
      })
      // 인터넷이 잠깐 끊겨도 화면은 그대로 둔다 (컴플레인 화면과 같은 규칙)
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    load();
    const tick = setInterval(load, REFRESH);
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  /** 공이 떨어졌다 — 결과를 20초 보여주고 다시 튼다 */
  const onLanded = useCallback(() => {
    setPhase('result');
    timer.current = setTimeout(() => {
      setPhase('game');
      setRound((n) => n + 1);
    }, RESULT_HOLD);
  }, []);

  const playable =
    draw !== null && draw.winnerIndex !== null && draw.entries.length > 0;

  // 추첨이 없으면 예전 화면 그대로
  if (!playable) return <TvBoard token={token} />;

  const winner = draw.entries[draw.winnerIndex as number];
  const month = Number(draw.period.slice(5, 7));

  if (phase === 'game') {
    return (
      <div className="screen draw">
        <header className="head">
          <div className="brand">
            <span className="dot" />
            <b>피트니스스타</b>
          </div>
          <div className="branch">{month}월 추첨</div>
        </header>
        <p className="lead">
          이번 달 주인공은
          <br />
          <em>누구일까요?</em>
        </p>
        <main className="board">
          <Pinball
            key={round}
            seed={draw.seed}
            entries={draw.entries}
            winnerIndex={draw.winnerIndex as number}
            onLanded={onLanded}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="screen draw">
      <Confetti seed={`${draw.seed}:${round}`} />
      <header className="head">
        <div className="brand">
          <span className="dot" />
          <b>피트니스스타</b>
        </div>
        <div className="branch">{month}월 추첨</div>
      </header>

      <section className="winner">
        <p className="winner-tag">{month}월 당첨</p>
        <p className="winner-name">{winner.name}</p>
        <p className="winner-phone">{winner.phone}</p>
        <p className="winner-note">매장에서 따로 연락드릴게요</p>
      </section>

      <div className="under">
        <TvBoard token={token} rows={RESULT_ROWS} chrome={false} />
      </div>
    </div>
  );
}
