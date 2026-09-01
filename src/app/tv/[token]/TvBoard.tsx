'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getJson, type Resolved, type TvData } from '@/lib/api';

const MAX = 5; // 한 화면에 세우는 줄 수 (기본값 — 추첨 결과 아래에서는 줄인다)
const REFRESH = 15000; // 서버에 다시 물어보는 주기 — 해결하면 이만큼 안에 뜬다
const LEAD_HOLD = 10000; // 머리말을 바꾸는 주기
const SLIDE = 800; // 줄이 미끄러지는 시간 (CSS transition 과 맞춘다)

/**
 * 화면 머리말 — **돌아가며 바뀐다.** 하나로 고정하면 해결된 게 한 건뿐일 때
 * 같은 화면이 종일 걸려 있다.
 *
 * '고쳤습니다' 처럼 조치를 알리는 말이 아니라, **회원 목소리가 매장을 키운다**는
 * 쪽으로 쓴다. 무엇을 고쳤는지는 아래 줄들이 이미 말해 준다.
 * 뒷줄이 파랗게 강조된다. [앞줄, 뒷줄]
 */
const LEADS: [string, string][] = [
  ['회원님 목소리로', '피트니스스타는 자랍니다'],
  ['한 말씀 한 말씀이', '더 좋은 곳을 만듭니다'],
  ['들을수록', '피트니스스타는 나아집니다'],
  ['오늘도 한 가지', '회원님과 함께 바꿉니다'],
  ['회원님이 만드는', '더 나은 피트니스스타'],
];

/** 화면에 붙어 있는 줄 하나 — `slot` 이 -1 이면 화면 위(들어오기 전), MAX 면 아래다 */
type Row = Resolved & { slot: number; visible: boolean };

function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 해결`;
}

type Props = {
  token: string;
  /** 세울 줄 수 — 추첨 결과 아래에 깔릴 때는 자리가 좁아 줄인다 */
  rows?: number;
  /** 위 머리(브랜드·지점)와 머리말을 그릴지 — 추첨 화면은 제 머리를 따로 쓴다 */
  chrome?: boolean;
};

/** 칸 두께 상한(vmin) — 다섯 줄짜리 본 화면의 칸과 같은 두께다 */
const CARD_MAX = 24;

export default function TvBoard({ token, rows: MAX_ROWS = MAX, chrome = true }: Props) {
  const [branch, setBranch] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [hasRows, setHasRows] = useState(false);
  const [lead, setLead] = useState(0);
  const [leadOut, setLeadOut] = useState(false);

  // 칸 높이를 화면에서 재서 나눈다. TV 마다 비율이 달라서 vmin 으로 박아 두면
  // 어떤 화면에서는 다섯 번째 줄이 잘린다.
  const stageRef = useRef<HTMLElement>(null);
  const [box, setBox] = useState({ cardH: 0, gap: 0 });

  const first = useRef(true);
  /** 다음 프레임에 제자리로 보낼 목록 — 붙자마자 옮기면 전환이 안 걸린다 */
  const pending = useRef<Resolved[] | null>(null);
  /** 지금 서 있어야 하는 id — 지울 때 이 값으로 거른다 (그 사이 새 응답이 와도 안전) */
  const desired = useRef<Set<string>>(new Set());

  const measure = useCallback(() => {
    const h = stageRef.current?.clientHeight ?? 0;
    const gap = Math.round(h * 0.022);
    // **칸이 두꺼워지는 데 상한을 둔다.**
    //
    // 남는 높이를 줄 수로 그냥 나누면, 줄이 적은 화면(당첨자 아래 컴플레인)에서
    // 한 칸이 화면 절반을 먹어 카드가 뚱뚱해 보인다. 다섯 줄짜리 본 화면의
    // 칸 두께(약 24vmin)를 넘지 않게 막는다 — 남는 자리는 그냥 비운다.
    const u = Math.min(window.innerWidth, window.innerHeight) / 100;
    const even = (h - gap * (MAX_ROWS - 1)) / MAX_ROWS;
    setBox({ gap, cardH: Math.round(Math.min(even, u * CARD_MAX)) });
  }, [MAX_ROWS]);

  // ── 받아오기 ────────────────────────────────────────────────
  const load = useCallback(() => {
    getJson<TvData>(`/tv/${encodeURIComponent(token)}/resolved`, { cache: 'no-store' })
      .then((data) => {
        setBranch(data.branchName || '');
        const want = (data.resolved ?? []).slice(0, MAX_ROWS);
        const wantIds = new Set(want.map((w) => w.id));
        desired.current = wantIds;
        pending.current = want;
        setHasRows(want.length > 0);

        setRows((prev) => {
          const old = new Map(prev.map((r) => [r.id, r]));
          // 1) 새 줄은 화면 **위쪽 밖**에 미리 붙인다. 첫 화면은 그냥 제자리다
          const staying: Row[] = want.map((item, idx) => {
            const was = old.get(item.id);
            if (was) return { ...was, ...item };
            return first.current
              ? { ...item, slot: idx, visible: true }
              : { ...item, slot: -1, visible: false };
          });
          // 2) 빠질 줄은 맨 아래 자리로 내려보낸다 (지우는 건 SLIDE 뒤)
          const leaving: Row[] = prev
            .filter((r) => !wantIds.has(r.id))
            .map((r) => ({ ...r, slot: MAX_ROWS, visible: false }));
          return [...staying, ...leaving];
        });

        setTimeout(() => {
          setRows((prev) => prev.filter((r) => desired.current.has(r.id)));
        }, SLIDE);
      })
      // 인터넷이 잠깐 끊겨도 **화면은 그대로 둔다.** 벽에 걸린 TV 가
      // 오류 문구로 바뀌는 것보다 마지막 화면이 남아 있는 게 낫다
      .catch(() => {});
  }, [token, MAX_ROWS]);

  // 3) 한 프레임 뒤에 제자리로 보낸다 — 그래야 아래 줄들이 미끄러져 내려간다
  useEffect(() => {
    const want = pending.current;
    if (!want) return;
    pending.current = null;
    if (first.current) {
      first.current = false; // 첫 화면은 이미 제자리에 그렸다
      return;
    }
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() =>
        setRows((prev) =>
          prev.map((r) => {
            const idx = want.findIndex((w) => w.id === r.id);
            return idx >= 0 ? { ...r, slot: idx, visible: true } : r;
          }),
        ),
      );
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [rows]);

  // ── 도는 것들 ───────────────────────────────────────────────
  useEffect(() => {
    measure();
    load();
    const tick = setInterval(load, REFRESH);
    const roll = setInterval(() => {
      setLeadOut(true);
      setTimeout(() => {
        // 바로 앞과 같은 것은 피한다 — 연달아 같은 말이 나오면 안 도는 것처럼 보인다
        setLead((n) => {
          if (LEADS.length < 2) return n;
          let i = n;
          while (i === n) i = Math.floor(Math.random() * LEADS.length);
          return i;
        });
        setLeadOut(false);
      }, 500);
    }, LEAD_HOLD);

    // TV 는 몇 달씩 켜 둔다 — 브라우저가 절전으로 멈췄다 깨어나면 바로 다시 받는다
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener('visibilitychange', onVisible);
    // 화면 크기가 바뀌면 칸 높이를 다시 잰다 — 줄은 그 값으로 다시 놓인다
    window.addEventListener('resize', measure);
    return () => {
      clearInterval(tick);
      clearInterval(roll);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('resize', measure);
    };
  }, [load, measure]);

  return (
    <div className={`screen${chrome ? '' : ' bare'}`}>
      {chrome && (
        <>
          <header className="head">
            <div className="brand">
              <span className="dot" />
              <b>피트니스스타</b>
            </div>
            <div className="branch">{branch}</div>
          </header>

          <p className={`lead${leadOut ? ' out' : ''}`}>
            {LEADS[lead][0]}
            <br />
            <em>{LEADS[lead][1]}</em>
          </p>
        </>
      )}

      <main className="stage" ref={stageRef}>
        {/* 아직 해결된 게 없을 때 — 벽에 빈 화면을 걸어 둘 수는 없다 */}
        <section className={`idle${hasRows ? ' off' : ''}`}>
          <div className="check">
            <svg viewBox="0 0 24 24">
              <path d="M12 20s-7-4.3-9-8.4A5 5 0 0 1 12 6.2 5 5 0 0 1 21 11.6c-2 4.1-9 8.4-9 8.4z" />
            </svg>
          </div>
          <p>불편하셨던 점을 말씀해 주세요.</p>
        </section>

        {rows.map((r) => (
          <article
            key={r.id}
            className="row"
            style={{
              height: box.cardH,
              transform: `translateY(${r.slot * (box.cardH + box.gap)}px)`,
              opacity: r.visible ? 1 : 0,
            }}
          >
            <span className="tick">
              <svg viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <div className="body">
              <p className="quote">{r.text}</p>
              <p className="when">{dateLabel(r.resolvedAt)}</p>
            </div>
          </article>
        ))}
      </main>
    </div>
  );
}
