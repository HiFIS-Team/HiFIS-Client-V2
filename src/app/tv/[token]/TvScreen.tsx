'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getJson, type DrawData } from '@/lib/api';
import { cast } from '@/lib/draw';

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
/**
 * 릴스에서 당첨자를 띄워 두는 시간(ms) — 매장 TV(20초)보다 짧다.
 *
 * TV 는 20초 뒤 다시 트는 화면이라 그 사이가 길어도 되는데, 릴스는 **한
 * 바퀴로 끝나는 영상**이라 마지막에 20초를 세워 두면 끝에서 늘어진다.
 *
 * **폭죽이 걷힐 시간을 준다.** 6초로 뒀더니 깨끗한 마지막이 0.5초뿐이었다 —
 * 폭죽이 다 사라지는 데 6.6초가 걸려서, 영상이 종이더미로 끝났다.
 * 지금은 마지막 3초가 시상대만 남는다 (실제로 재서 정한 값이다).
 */
const REELS_HOLD = 9500;

type Phase = 'game' | 'result';

/** 렌더러가 잡는 손잡이 — [ReelsPage] 참고 */
type ReelsBridge = { ready: boolean; done: boolean };

declare global {
  interface Window {
    /** 릴스 화면이 준비됐나 · 끝났나 — 렌더러가 이걸 보고 녹화를 켜고 끈다 */
    __reels?: ReelsBridge;
    /** 게임을 튼다 — 이걸 부르기 전에는 릴스가 빈 화면으로 기다린다 */
    __reelsStart?: () => void;
  }
}

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
export default function TvScreen({
  token,
  reels = false,
}: {
  token: string;
  /** 릴스용인가 — 전화·컴플레인을 빼고 한 바퀴로 끝낸다 ([ReelsPage]) */
  reels?: boolean;
}) {
  const [draw, setDraw] = useState<DrawData | null>(null);
  const [phase, setPhase] = useState<Phase>('game');
  /**
   * 게임을 틀어도 되나 — **릴스만 기다린다.**
   *
   * 안 기다리면 추첨을 받아오는 사이에 게임이 이미 굴러가서, 녹화를 켜는
   * 순간에는 이미 몇 초가 지나 있다. 영상 앞이 잘려 보인다.
   */
  const [go, setGo] = useState(!reels);
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
      // 릴스는 다시 안 튼다 — 당첨자를 잠깐 두고 '끝났다' 고 알린다
      if (reels) {
        later(FADE + REELS_HOLD, () => {
          if (window.__reels) window.__reels.done = true;
        });
        return;
      }
      later(FADE + RESULT_HOLD, () => {
        setLeaving('result');
        setPhase('game');
        setRound((n) => n + 1);
        later(FADE, () => setLeaving(null));
      });
    });
  }, [later, reels]);

  const playable =
    draw !== null && draw.winnerIndexes.length > 0 && draw.entries.length > 0;

  /**
   * 렌더러가 붙잡을 손잡이를 창에 걸어 둔다 — **릴스에서만**.
   *
   * `ready` 가 참이 되면 녹화를 켜고 [Window.__reelsStart] 를 부른다.
   * 그때부터 게임이 굴러가므로 영상 첫 프레임이 게임 첫 프레임과 같다.
   */
  useEffect(() => {
    if (!reels) return;
    window.__reels = { ready: false, done: false };
    window.__reelsStart = () => setGo(true);
    return () => {
      delete window.__reels;
      delete window.__reelsStart;
    };
  }, [reels]);

  useEffect(() => {
    if (reels && window.__reels) window.__reels.ready = playable;
  }, [reels, playable]);

  // 추첨이 없으면 예전 화면 그대로 — **릴스는 찍을 것이 없어 빈 화면이다**
  if (!playable) return reels ? <div className="stack" /> : <TvBoard token={token} />;

  // 릴스는 녹화가 켜질 때까지 기다린다 (위 [Window.__reelsStart])
  if (!go) return <div className="stack" />;

  const winners = draw.winnerIndexes.map((i) => draw.entries[i]).filter(Boolean);
  // **판에 세우는 사람은 `MAX_CAST` 까지다** — 당첨자 셋은 반드시 들어간다.
  //
  // 자리 번호를 **`shown` 안에서 다시 찾는다.** `0·1·2` 로 박아 두면
  // 상한에 안 걸리는 지점(40명 이하)에서 엉뚱한 사람이 1등이 된다 —
  // 그때 `cast` 는 명단을 그대로 돌려주기 때문이다.
  const shown = cast(draw.seed, draw.entries.length, draw.winnerIndexes);
  const castEntries = shown.map((i) => draw.entries[i]);
  const castWinners = draw.winnerIndexes.map((i) => shown.indexOf(i)).filter((i) => i >= 0);
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
            entries={castEntries}
            winners={castWinners}
            onFinished={onLanded}
          />
        ) : game === 'SOCCER' ? (
          <Soccer
            key={round}
            seed={draw.seed}
            round={round}
            entries={castEntries}
            winners={castWinners}
            onFinished={onLanded}
          />
        ) : game === 'CURLING' ? (
          <Curling
            key={round}
            seed={draw.seed}
            round={round}
            entries={castEntries}
            winners={castWinners}
            onFinished={onLanded}
          />
        ) : game === 'CLAW' ? (
          <Claw
            key={round}
            seed={draw.seed}
            round={round}
            entries={castEntries}
            winners={castWinners}
            onFinished={onLanded}
          />
        ) : game === 'SUMO' ? (
          <Sumo
            key={round}
            seed={draw.seed}
            round={round}
            entries={castEntries}
            winners={castWinners}
            onFinished={onLanded}
          />
        ) : game === 'PINBALL' ? (
          <Pinball
            key={round}
            seed={draw.seed}
            entries={castEntries}
            winners={castWinners}
            onLanded={onLanded}
          />
        ) : (
          <Race
            key={round}
            seed={draw.seed}
            round={round}
            entries={castEntries}
            winners={castWinners}
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
              {/* **릴스에는 안 넣는다** — 매장 TV 는 회원만 보지만 인스타는
                  아무나 본다. 가린 이름 + 뒤 4자리면 그 동네에서는 누군지
                  알 수 있고, 당첨자는 어차피 매장이 안다 */}
              {reels ? null : <span className="tel">{w.phone}</span>}
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

      {/* **릴스에는 안 깐다** — 컴플레인 본문에 직원 이름이 들 수 있고,
          짧은 세로 영상이라 게임과 당첨자가 주인공이다 */}
      {reels ? null : (
        <div className="under">
          <TvBoard token={token} rows={RESULT_ROWS} chrome={false} />
        </div>
      )}
    </div>
  );

  /**
   * **들어오는 화면이 아래, 나가는 화면이 위**다 — 위엣것이 옅어지며 걷힌다.
   *
   * 둘을 잠깐 같이 띄워야 겹쳐 넘어간다. 하나만 그리면 그 사이에 아무것도
   * 없는 프레임이 생겨서 화면이 뚝 끊긴다.
   */
  return (
    <div className={`stack${reels ? ' reels' : ''}`}>
      {phase === 'game' ? gameScreen : resultScreen}
      {leaving && leaving !== phase ? (leaving === 'game' ? gameScreen : resultScreen) : null}
    </div>
  );
}
