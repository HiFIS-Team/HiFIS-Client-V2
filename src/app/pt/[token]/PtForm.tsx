'use client';

import { useEffect, useRef, useState } from 'react';

import { getJson, postJson } from '@/lib/api';

type Topic = { code: string; praise: string; improve: string };

/** 고른 주제 하나 — 글(`note`)은 **안 적어도 된다** */
type Answer = { topic: string; note: string };

type PageData = {
  memberName: string;
  trainerName: string;
  trainerAvatarColor: string;
  branchName: string;
  sessionNo: number;
  totalSessions: number;
  answered: boolean;
  /** 객관식 항목표 — **서버가 준다** (`app/services/pt_topics.py`) */
  topics: Topic[];
};

/**
 * 만족도 다섯 칸 — **말이 붙어 있다.**
 *
 * 별로 받으면 몇 개가 보통인지 사람마다 달라서 값이 안 모인다
 * (넷이 박한 사람도 있고 다섯이 기본인 사람도 있다).
 */
const GRADES = [
  { no: 1, label: '많이 아쉬워요' },
  { no: 2, label: '조금 아쉬워요' },
  { no: 3, label: '보통이에요' },
  { no: 4, label: '만족해요' },
  { no: 5, label: '아주 만족해요' },
];

/**
 * 재등록 여부 — 서버 `RenewIntent` 와 값이 같아야 한다.
 *
 * **`MAYBE`(고민중)를 안 낸다** (2026-09-09 요청). 예전에는 셋이었는데,
 * 이 칸을 쓰는 이유가 **회원이 원하는 요일의 수업 자리를 잡아 두는 것**이라
 * '고민중' 으로는 자리를 비워 둘지 말지를 못 정한다.
 *
 * 값은 enum 에 그대로 남겨 둔다 — 옛 답변이 들어와도 깨지지 않는다.
 */
const RENEWS = [
  { value: 'YES', mark: 'O', title: '재등록할게요' },
  { value: 'NO', mark: 'X', title: '이번엔 어려워요' },
] as const;

const STEPS = ['intro', '1', '2', '3', '4'] as const;
const LAST = STEPS.length - 1;

/** 세로 가운데로 세우는 화면 — 글이 짧아서 위로 몰리는 것들 */
const CENTERED = new Set(['intro', 'done', 'fatal']);

type Fatal = { title: string; body: React.ReactNode };

/**
 * 만족도·바라는 점 아래에 붙는 안내.
 *
 * **문구를 바꿨다 (2026-09-09 요청).** 예전에는 "트레이너에게 직접 전해지지
 * 않아요" 였는데, 안 보인다는 말로 시작하면 **읽는 사람이 눈치를 보게 된다** —
 * 왜 못 보게 하나 싶어진다. 이제는 솔직하게 적어달라고 청하고, 그 말이
 * 실제로 쓰인다는 것을 같이 말한다.
 *
 * **서버는 그대로 막혀 있다** — `GET /pt-surveys` 가 자기가 수업한 것을 빼고
 * 준다. 화면에서 안 말할 뿐이지 트레이너가 볼 수 있게 된 것이 아니다.
 */
/** 보낼 모양으로 — 빈 글은 `null` 이다 (빈 문자열을 남기면 셀 때 걸린다) */
function pack(a: Answer) {
  return { topic: a.topic, note: a.note.trim() || null };
}

/**
 * 객관식 한 판 — 좋았던 점·보완할 점이 **같은 컴포넌트**를 쓴다.
 *
 * 문구만 `praise` 로 갈린다. 두 벌로 베끼면 한쪽만 고치는 일이 반드시 생긴다.
 *
 * **고른 칸에만 글칸이 열린다.** 여덟 칸에 글칸을 다 깔아 두면 화면이 길어져서
 * 고르기 전에 지친다 — 고른 뒤에 여는 것이 곧 "여기 적어주세요" 라는 신호다.
 */
function Picks({
  topics,
  praise,
  value,
  onToggle,
  onNote,
}: {
  topics: Topic[];
  praise: boolean;
  value: Answer[];
  onToggle: (code: string) => void;
  onNote: (code: string, note: string) => void;
}) {
  return (
    <div className="picks">
      {topics.map((t) => {
        const hit = value.find((a) => a.topic === t.code);
        return (
          <div key={t.code} className={`pick-wrap${hit ? ' on' : ''}`}>
            <button
              className="pick"
              type="button"
              aria-pressed={!!hit}
              onClick={() => onToggle(t.code)}
            >
              <span className="tick">
                <svg viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span>{praise ? t.praise : t.improve}</span>
            </button>
            {hit ? (
              <div className="pick-note">
                <textarea
                  maxLength={300}
                  value={hit.note}
                  onChange={(e) => onNote(t.code, e.target.value)}
                  placeholder={
                    praise
                      ? '어떤 점이 좋았는지 적어주세요 (안 적으셔도 돼요)'
                      : '어떻게 해주시면 좋을지 적어주세요 (안 적으셔도 돼요)'
                  }
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Secret({ lead = false }: { lead?: boolean }) {
  return (
    <div className={`secret${lead ? ' lead' : ''}`}>
      <svg viewBox="0 0 24 24">
        <path d="M20.5 11.5a7.5 7.5 0 0 1-7.5 7.5H8.6L4.5 21.5v-3.9a7.5 7.5 0 1 1 16-6.1z" />
        <path d="M8.8 11.6h6.4M8.8 8.4h4.2" />
      </svg>
      <span>
        <b>가감 없이 솔직하게 적어주세요.</b>
        <br />
        센터 발전을 위해 적극적으로 반영하겠습니다.
      </span>
    </div>
  );
}

export default function PtForm({ token }: { token: string }) {
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState<Fatal | null>(null);
  const [done, setDone] = useState(false);
  const [data, setData] = useState<PageData | null>(null);

  const [i, setI] = useState(0);
  const [grade, setGrade] = useState(0);
  const [praise, setPraise] = useState<Answer[]>([]);
  const [improve, setImprove] = useState<Answer[]>([]);
  const [renew, setRenew] = useState('');

  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    getJson<PageData>(`/pt-survey/${encodeURIComponent(token)}`)
      .then((d) => {
        if (!alive) return;
        setData(d);
        document.title = `${d.trainerName} 트레이너 — 수업 어떠셨나요?`;
        if (d.answered) {
          // 문자에 링크가 남아 있어서 다시 누르는 일이 흔하다.
          // **틀렸다고 하지 않는다** — 이미 해 준 일이다
          setFatal({
            title: '이미 보내주셨어요',
            body: (
              <>
                소중한 의견 고맙습니다.
                <br />
                남겨주신 이야기는 잘 전달됐어요.
              </>
            ),
          });
          return;
        }
        setReady(true);
      })
      .catch(() => {
        if (!alive) return;
        setFatal({
          title: '설문을 열 수 없어요',
          body: (
            <>
              링크가 오래되었거나 주소가 잘못되었습니다.
              <br />
              매장에 문의해주세요.
            </>
          ),
        });
      });
    return () => {
      alive = false;
    };
  }, [token]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [i, done, fatal]);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  /** 누르면 넣고 다시 누르면 뺀다 — 뺄 때 적어 둔 글도 같이 사라진다 */
  function toggle(set: typeof setPraise, code: string) {
    set((prev) =>
      prev.some((a) => a.topic === code)
        ? prev.filter((a) => a.topic !== code)
        : [...prev, { topic: code, note: '' }],
    );
  }

  function note(set: typeof setPraise, code: string, text: string) {
    set((prev) => prev.map((a) => (a.topic === code ? { ...a, note: text } : a)));
  }

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2400);
  }

  const step = STEPS[i];
  // **객관식은 둘 다 필수다** (2026-09-16 결정) — 글은 안 적어도 된다.
  // 고르는 것까지 건너뛰게 두면 예전 서술형처럼 아무것도 안 남는다
  const canGo =
    step === '1'
      ? grade > 0
      : step === '2'
        ? praise.length > 0
        : step === '3'
          ? improve.length > 0
          : step === '4'
            ? !!renew
            : true;
  const showCard = fatal ? 'fatal' : done ? 'done' : step;
  const hideChrome = !ready || !!fatal || done;

  function next() {
    if (step === '4') {
      void submit();
      return;
    }
    setI((n) => n + 1);
  }

  async function submit() {
    if (sending) return;
    setSending(true);
    try {
      await postJson(`/pt-survey/${encodeURIComponent(token)}`, {
        satisfaction: grade,
        praise: praise.map(pack),
        improve: improve.map(pack),
        renew,
      });
      setDone(true);
    } catch {
      setSending(false);
      showToast('보내지 못했어요. 잠시 후 다시 눌러주세요.');
    }
  }

  return (
    <>
      <div className="shell">
        <header className="top" hidden={hideChrome || i === 0}>
          <div className="top-row">
            <button
              className={`back${i > 0 ? ' show' : ''}`}
              aria-label="이전"
              onClick={() => setI((n) => (n > 0 ? n - 1 : n))}
            >
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="bar">
              <span style={{ width: `${(i / LAST) * 100}%` }} />
            </div>
            <div className="step-no">
              {i} / {LAST}
            </div>
          </div>
        </header>

        <main
          className={`body${CENTERED.has(showCard) ? ' center' : ''}`}
        >
          {/* 0. 인트로 */}
          <section className={`card${showCard === 'intro' ? ' on' : ''}`}>
            {/* **아바타·지점 알약을 안 그린다 (2026-08-20 요청).**
                문자로 받는 것이라 회원은 이미 어느 센터인지 알고, 지점 이름이
                `전 지점`(HQ)으로 뜨는 트레이너도 있어 회원에게는 뜻이 없다. */}
            <div className="hero">
              <h1>
                {data ? (
                  <>
                    {data.memberName} 님,
                    <br />
                    수업 어떠셨나요?
                  </>
                ) : (
                  '수업 어떠셨나요?'
                )}
              </h1>
              <p className="sub">
                {data ? (
                  <>
                    <b>{data.trainerName}</b> 트레이너와 {data.sessionNo}회차까지 함께했어요.
                    <br />
                    앞으로가 더 좋아지도록 한 말씀 남겨주세요.
                  </>
                ) : null}
              </p>
              {/* 줄마다 **한 문장**으로 끊는다 — 쉼표로 이으면 폭이 좁은 폰에서
                  한 줄이 넘쳐 '않 / 고,' 처럼 낱말 가운데가 잘린다
                  (`word-break:keep-all` 과 같이 걸어야 안 잘린다) */}
              <div className="hero-note">
                <b>30초면 끝나요.</b>
                <br />
                가감 없이 솔직하게 적어주세요.
                <br />
                센터 발전을 위해 적극적으로 반영하겠습니다.
              </div>
            </div>
          </section>

          {/* 1. 만족도 */}
          <section className={`card${showCard === '1' ? ' on' : ''}`}>
            <h1>
              지금까지 수업은
              <br />
              <em>어떠셨나요?</em>
            </h1>
            <p className="sub">가장 가까운 것 하나만 골라주세요.</p>
            <div className="scale">
              {GRADES.map((g) => (
                <button
                  key={g.no}
                  className="grade"
                  type="button"
                  aria-pressed={grade === g.no}
                  onClick={() => setGrade(g.no)}
                >
                  <span className="no">{g.no}</span>
                  <span>{g.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 2. 좋았던 점 — **객관식으로 바꿨다 (2026-09-16).**
              서술형 한 칸이던 때는 "좋아요~" 만 쌓였다. 무엇이 좋았는지를
              알아야 그 트레이너의 무엇을 지켜야 하는지가 나온다. */}
          <section className={`card${showCard === '2' ? ' on' : ''}`}>
            {/* **회원의 목표를 먼저 묻는다 (2026-09-16 요청).**
                `어떤 점이 좋으셨나요` 는 감상을 묻는 말이라 "다 좋아요" 로
                끝난다. 운동이 목표대로 가고 있는지를 물으면 고르는 사람이
                자기 목표에 비추어 보게 된다.

                뒤 화면과 **짝을 맞춘 문장이다** — `운동이 목표대로` ·
                `수업이 원하시던 방향과`. 둘이 따로 놀면 같은 질문을 두 번
                하는 것처럼 읽힌다 */}
            <h1 className="ask">
              {data ? (
                <>
                  <em>{data.memberName}</em> 님,
                  <br />
                  운동이 목표대로 되고 있나요?
                </>
              ) : (
                '운동이 목표대로 되고 있나요?'
              )}
            </h1>
            <p className="sub">잘 되고 있는 점을 모두 골라주세요.</p>
            <Picks
              topics={data?.topics ?? []}
              praise
              value={praise}
              onToggle={(c) => toggle(setPraise, c)}
              onNote={(c, t) => note(setPraise, c, t)}
            />
          </section>

          {/* 3. 보완할 점 — **2번과 주제가 같고 말만 요청형이다.**
              주제가 갈리면 "식단은 칭찬 3 · 요청 5" 로 못 센다 */}
          <section className={`card${showCard === '3' ? ' on' : ''}`}>
            {/* `바라는 점이 있으신가요` 는 없어도 되는 것을 짜내라는 말로
                읽힌다. 앞 화면과 같은 틀로 **방향이 맞는지**를 묻는다 */}
            <h1 className="ask">
              {data ? (
                <>
                  <em>{data.memberName}</em> 님,
                  <br />
                  수업이 원하시던 방향과 맞나요?
                </>
              ) : (
                '수업이 원하시던 방향과 맞나요?'
              )}
            </h1>
            <p className="sub">
              아쉬운 점을 정확히 말씀해 주시면 그대로 반영하겠습니다.
            </p>
            {/* **고르기 전에 읽어야 하는 말이라 위로 올렸다 (2026-09-16 요청).**
                아래에 두면 다 고르고 내려온 다음에야 보여서, 솔직하게 적어
                달라는 청이 이미 늦는다 */}
            <Secret lead />
            <Picks
              topics={data?.topics ?? []}
              praise={false}
              value={improve}
              onToggle={(c) => toggle(setImprove, c)}
              onNote={(c, t) => note(setImprove, c, t)}
            />
          </section>

          {/* 4. 재등록 여부 — **왜 묻는지를 먼저 말한다** (2026-09-09 요청).
              그냥 "이어서 하실 계획인가요" 로 물으면 영업으로 읽히는데,
              실제 용건은 **그 요일 수업 자리를 잡아 두는 것**이다. */}
          <section className={`card${showCard === '4' ? ' on' : ''}`}>
            <h1>
              재등록 여부를
              <br />
              <em>알려주세요</em>
            </h1>
            <p className="sub">
              현재 원하시는 요일에 PT 수업 스케줄을
              <br />
              유지하기 위해 꼭 체크해주세요.
            </p>
            <div className="ox">
              {RENEWS.map((r) => (
                <button
                  key={r.value}
                  className="oxbtn"
                  type="button"
                  aria-pressed={renew === r.value}
                  onClick={() => setRenew(r.value)}
                >
                  <span className="ox-mark">{r.mark}</span>
                  <b>{r.title}</b>
                </button>
              ))}
            </div>
            {data ? (
              <p className="oxhint">
                남은 회차는 {Math.max(data.totalSessions - data.sessionNo, 0)}회예요.
              </p>
            ) : null}
          </section>

          {/* 4. 완료 */}
          <section className={`card${showCard === 'done' ? ' on' : ''}`}>
            <div className="done">
              <div className="ring">
                <svg viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {/* **트레이너 이름을 안 쓴다.** 답변은 서버가 그 트레이너에게 안
                  보여주는데(`GET /pt-surveys`), '○○ 님께 전해드릴게요' 로
                  끝나면 안 지킬 약속을 하는 셈이다 */}
              <h1>잘 받았어요</h1>
              <p className="sub">
                매장 운영진이 확인하고
                <br />
                수업에 반영하겠습니다.
              </p>
            </div>
          </section>

          {/* 링크가 틀렸거나 이미 낸 뒤 */}
          <section className={`card${showCard === 'fatal' ? ' on' : ''}`}>
            <div className="fatal">
              <h1>{fatal?.title ?? '설문을 열 수 없어요'}</h1>
              <p className="sub" style={{ marginTop: 10 }}>
                {fatal?.body}
              </p>
            </div>
          </section>
        </main>

        <footer className="foot" hidden={hideChrome}>
          <button className="cta" disabled={!canGo || sending} onClick={next}>
            {sending ? (
              <span className="spin" />
            ) : step === 'intro' ? (
              '시작하기'
            ) : step === '4' ? (
              '보내기'
            ) : (
              '다음'
            )}
          </button>
        </footer>
      </div>

      <div className={`toast${toast ? ' on' : ''}`}>{toast}</div>
    </>
  );
}
