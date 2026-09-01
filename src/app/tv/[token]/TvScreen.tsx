'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getJson, type DrawData } from '@/lib/api';

import Claw from './Claw';
import Confetti from './Confetti';
import Hoops from './Hoops';
import Pinball from './Pinball';
import Race from './Race';
import Soccer from './Soccer';
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
 *   구슬 레이스 (약 30~40초) — 참가자 수만큼 달린다
 *        ↓ 1등이 도착선을 넘는다
 *   🎆 폭죽 + 당첨자 · 그 아래 해결된 컴플레인
 *        ↓ 20초
 *   다시 레이스  ← 같은 시드라 똑같이 달린다
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

  /** 레이스가 끝났다 — 결과를 20초 보여주고 다시 튼다 */
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

  // 검은 바탕은 **구슬 레이스만** 쓴다 — 네온 트랙과 발광 구슬이 흰 바탕에서
  // 안 보여서 그렇게 한 것이라, 밝게 그리는 농구·핀볼은 탈 이유가 없다.
  // 모르는 게임이 오면 레이스로 떨어뜨리므로 판정도 레이스 쪽에 붙인다.
  const game =
    draw.game === 'HOOPS' || draw.game === 'SOCCER'
    || draw.game === 'CLAW' || draw.game === 'PINBALL'
      ? draw.game
      : 'RACE';

  if (phase === 'game') {
    return (
      <div className={`screen draw${game === 'RACE' ? ' racing' : ''}`}>
        <header className="head">
          <div className="brand">
            <span className="dot" />
            <b>피트니스스타</b>
          </div>
          <div className="branch">{month}월 추첨</div>
        </header>
        <main className="board">
          {/* 서버가 그 달 게임을 정한다 (`DrawGame`). 안 만든 게임이 오면
              구슬 레이스로 떨어뜨린다 — 벽에 걸린 TV 가 비면 안 된다 */}
          {game === 'HOOPS' ? (
            <Hoops
              key={round}
              seed={draw.seed}
              round={round}
              entries={draw.entries}
              winnerIndex={draw.winnerIndex as number}
              onFinished={onLanded}
            />
          ) : game === 'SOCCER' ? (
            <Soccer
              key={round}
              seed={draw.seed}
              round={round}
              entries={draw.entries}
              winnerIndex={draw.winnerIndex as number}
              onFinished={onLanded}
            />
          ) : game === 'CLAW' ? (
            <Claw
              key={round}
              seed={draw.seed}
              round={round}
              entries={draw.entries}
              winnerIndex={draw.winnerIndex as number}
              onFinished={onLanded}
            />
          ) : game === 'PINBALL' ? (
            <Pinball
              key={round}
              seed={draw.seed}
              entries={draw.entries}
              winnerIndex={draw.winnerIndex as number}
              onLanded={onLanded}
            />
          ) : (
            <Race
              key={round}
              seed={draw.seed}
              round={round}
              entries={draw.entries}
              winnerIndex={draw.winnerIndex as number}
              onFinished={onLanded}
            />
          )}
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
