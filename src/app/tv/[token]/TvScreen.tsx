'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getJson, type DrawData } from '@/lib/api';

import Claw from './Claw';
import Confetti from './Confetti';
import Curling from './Curling';
import Hoops from './Hoops';
import Pinball from './Pinball';
import Race from './Race';
import Soccer from './Soccer';
import Sumo from './Sumo';
import TvBoard from './TvBoard';

/** 당첨자를 띄워 두는 시간(ms) — 지나면 게임을 다시 튼다 */
const RESULT_HOLD = 20000;
/**
 * 게임이 끝나고 **그 그림을 그대로 두는 시간**(ms).
 *
 * 끝나자마자 넘기면 뚝 끊긴다 (2026-09-01 대표). 1등이 들어온 판을 잠깐
 * 보고 넘어가야 "끝났구나" 가 된다.
 */
const END_HOLD = 900;
/** 두 화면이 겹쳐 넘어가는 시간(ms) — `tv.css` 의 `.stack > .screen.gone` 과 같은 값 */
const FADE = 650;
/** 추첨을 다시 물어보는 주기 — 달이 바뀌면 이 안에 새 추첨으로 갈아탄다 */
const REFRESH = 10 * 60 * 1000;
/**
 * 결과 아래에 깔 컴플레인 줄 수 — 위에 당첨자 카드가 서서 자리가 좁다.
 *
 * 줄 수가 적으면 남는 높이를 나눠 가져서 **칸이 뚱뚱해진다** —
 * `TvBoard` 가 두께에 상한을 두지만, 셋이면 화면도 알맞게 찬다.
 */
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
  /** 지금 위에서 사라지고 있는 화면 — 둘이 잠깐 겹친다 */
  const [leaving, setLeaving] = useState<Phase | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

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
    const list = timers.current;
    return () => {
      list.forEach(clearTimeout);
    };
  }, []);

  /**
   * 잠시 뒤에 한다 — 화면을 떠날 때 다 걷어 낸다.
   *
   * **끝난 것은 목록에서 뺀다.** 한 바퀴에 넷씩 쌓이는데 TV 는 몇 달을
   * 켜 두는 화면이라, 안 빼면 목록이 끝없이 길어진다.
   */
  const later = useCallback((ms: number, fn: () => void) => {
    const id = setTimeout(() => {
      const at = timers.current.indexOf(id);
      if (at >= 0) timers.current.splice(at, 1);
      fn();
    }, ms);
    timers.current.push(id);
  }, []);

  /**
   * 게임이 끝났다 — **끝난 그림을 잠깐 두고, 겹쳐서 결과로 넘어간다.**
   *
   * 예전에는 끝나는 순간 화면이 통째로 갈렸다. 게임은 화면을 꽉 채운 색판이고
   * 결과는 옅은 회색 페이지라, 그 사이에 아무것도 없는 프레임이 생겨서
   * 뚝 끊겨 보였다.
   */
  const onLanded = useCallback(() => {
    later(END_HOLD, () => {
      setLeaving('game');
      setPhase('result');
      later(FADE, () => setLeaving(null));
      later(FADE + RESULT_HOLD, () => {
        setLeaving('result');
        setPhase('game');
        setRound((n) => n + 1);
        later(FADE, () => setLeaving(null));
      });
    });
  }, [later]);

  const playable =
    draw !== null && draw.winnerIndexes.length > 0 && draw.entries.length > 0;

  // 추첨이 없으면 예전 화면 그대로
  if (!playable) return <TvBoard token={token} />;

  const winners = draw.winnerIndexes.map((i) => draw.entries[i]).filter(Boolean);
  const month = Number(draw.period.slice(5, 7));

  // 검은 바탕은 **구슬 레이스만** 쓴다 — 네온 트랙과 발광 구슬이 흰 바탕에서
  // 안 보여서 그렇게 한 것이라, 밝게 그리는 농구·핀볼은 탈 이유가 없다.
  // 모르는 게임이 오면 레이스로 떨어뜨리므로 판정도 레이스 쪽에 붙인다.
  const game =
    draw.game === 'HOOPS' || draw.game === 'SOCCER' || draw.game === 'CURLING'
    || draw.game === 'CLAW' || draw.game === 'SUMO' || draw.game === 'PINBALL'
      ? draw.game
      : 'RACE';

  // 게임 동안은 판이 화면을 통째로 쓴다 — 머리말은 결과 화면이 들고 있다
  const gameClass =
    `screen draw full${game === 'RACE' ? ' racing' : ''}`
    + (leaving === 'game' ? ' gone' : '');
  const gameScreen = (
    <div key={`game-${round}`} className={gameClass}>
      <main className="board">
        {/* 서버가 그 달 게임을 정한다 (`DrawGame`). 안 만든 게임이 오면
            구슬 레이스로 떨어뜨린다 — 벽에 걸린 TV 가 비면 안 된다 */}
        {game === 'HOOPS' ? (
          <Hoops
            key={round}
            seed={draw.seed}
            round={round}
            entries={draw.entries}
            winners={draw.winnerIndexes}
            onFinished={onLanded}
          />
        ) : game === 'SOCCER' ? (
          <Soccer
            key={round}
            seed={draw.seed}
            round={round}
            entries={draw.entries}
            winners={draw.winnerIndexes}
            onFinished={onLanded}
          />
        ) : game === 'CURLING' ? (
          <Curling
            key={round}
            seed={draw.seed}
            round={round}
            entries={draw.entries}
            winners={draw.winnerIndexes}
            onFinished={onLanded}
          />
        ) : game === 'CLAW' ? (
          <Claw
            key={round}
            seed={draw.seed}
            round={round}
            entries={draw.entries}
            winners={draw.winnerIndexes}
            onFinished={onLanded}
          />
        ) : game === 'SUMO' ? (
          <Sumo
            key={round}
            seed={draw.seed}
            round={round}
            entries={draw.entries}
            winners={draw.winnerIndexes}
            onFinished={onLanded}
          />
        ) : game === 'PINBALL' ? (
          <Pinball
            key={round}
            seed={draw.seed}
            entries={draw.entries}
            winners={draw.winnerIndexes}
            onLanded={onLanded}
          />
        ) : (
          <Race
            key={round}
            seed={draw.seed}
            round={round}
            entries={draw.entries}
            winners={draw.winnerIndexes}
            onFinished={onLanded}
          />
        )}
      </main>
    </div>
  );

  const resultScreen = (
    <div key="result" className={`screen draw${leaving === 'result' ? ' gone' : ''}`}>
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
        {/* 게임에서 1·2·3등 한 차례 그대로 선다.
            **3등부터 하나씩 올라온다** — 셋이 같이 뜨면 1등이 1등으로 안 보인다 */}
        <ul className="podium">
          {winners.map((w, i) => (
            <li
              key={`${w.name}-${i}`}
              className={['first', 'second', 'third'][i]}
              style={{ animationDelay: `${(winners.length - 1 - i) * 0.16}s` }}
            >
              {i === 0 ? (
                <svg className="crown" viewBox="0 0 24 24" aria-hidden>
                  <path d="M3 8l4.2 3.1L12 4l4.8 7.1L21 8l-1.6 10H4.6L3 8z" />
                </svg>
              ) : null}
              <span className="rank">{i + 1}등</span>
              {/* 네 글자 이름(`남○○수`)은 카드를 넘긴다 — 그때만 줄인다 */}
              <b data-long={w.name.length >= 4 ? '' : undefined}>{w.name}</b>
              <span className="tel">{w.phone}</span>
            </li>
          ))}
        </ul>
        {/* 안내가 아니라 인사다 — 당첨 안 된 회원이 훨씬 많은 화면이다 */}
        <p className="winner-note">
          한마디 한마디가 저희를 바꿉니다.
          <br />
          설문에 참여해 주신 모든 회원님, 고맙습니다.
        </p>
        {/* 등수는 보는 재미고 **상은 셋이 같다** — 안 적으면 3등이
            덜 받는 줄 안다. 당첨이 한 명뿐인 지점에서는 할 말이 아니라 뺀다 */}
        {winners.length > 1 ? (
          <p className="winner-same">{winners.length}분 모두 같은 상품이에요</p>
        ) : null}
      </section>

      <div className="under">
        <TvBoard token={token} rows={RESULT_ROWS} chrome={false} />
      </div>
    </div>
  );

  /**
   * **들어오는 화면이 아래, 나가는 화면이 위**다 — 위엣것이 옅어지며 걷힌다.
   *
   * 둘을 잠깐 같이 띄워야 겹쳐 넘어간다. 하나만 그리면 그 사이에 아무것도
   * 없는 프레임이 생겨서 화면이 뚝 끊긴다.
   */
  return (
    <div className="stack">
      {phase === 'game' ? gameScreen : resultScreen}
      {leaving && leaving !== phase ? (leaving === 'game' ? gameScreen : resultScreen) : null}
    </div>
  );
}
