'use client';

import { useEffect, useRef, useState } from 'react';

import { getJson, postJson } from '@/lib/api';

type PageData = {
  memberName: string;
  trainerName: string;
  trainerAvatarColor: string;
  branchName: string;
  sessionNo: number;
  totalSessions: number;
  answered: boolean;
};

/**
 * 만족도 다섯 칸 — **말이 붙어 있다.**
 *
 * 별로 받으면 몇 개가 보통인지 사람마다 달라서 값이 안 모인다
 * (넷이 박한 사람도 있고 다섯이 기본인 사람도 있다).
 */
const GRADES = [
  { no: 5, label: '아주 만족해요' },
  { no: 4, label: '만족해요' },
  { no: 3, label: '보통이에요' },
  { no: 2, label: '조금 아쉬워요' },
  { no: 1, label: '많이 아쉬워요' },
];

/** 연장 여부 — 서버 `RenewIntent` 와 값이 같아야 한다 */
const RENEWS = [
  { value: 'YES', title: '연장할게요', note: '이어서 수업받고 싶어요' },
  { value: 'MAYBE', title: '조금 더 생각해볼게요', note: '아직 정하지 못했어요' },
  { value: 'NO', title: '이번엔 어려울 것 같아요', note: '사정이 생겼어요' },
] as const;

const STEPS = ['intro', '1', '2', '3'] as const;
const LAST = STEPS.length - 1;

type Fatal = { title: string; body: React.ReactNode };

export default function PtForm({ token }: { token: string }) {
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState<Fatal | null>(null);
  const [done, setDone] = useState(false);
  const [data, setData] = useState<PageData | null>(null);

  const [i, setI] = useState(0);
  const [grade, setGrade] = useState(0);
  const [request, setRequest] = useState('');
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

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2400);
  }

  const step = STEPS[i];
  const canGo = step === '1' ? grade > 0 : step === '3' ? !!renew : true;
  const showCard = fatal ? 'fatal' : done ? 'done' : step;
  const hideChrome = !ready || !!fatal || done;

  function next() {
    if (step === '3') {
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
        request: request.trim() || null,
        renew,
      });
      setDone(true);
    } catch {
      setSending(false);
      showToast('보내지 못했어요. 잠시 후 다시 눌러주세요.');
    }
  }

  const initial = data ? (Array.from(data.trainerName)[0] ?? '?') : '?';

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

        <main className="body">
          {/* 0. 인트로 */}
          <section className={`card${showCard === 'intro' ? ' on' : ''}`}>
            <div className="hero">
              <div
                className="ava-big"
                style={{ background: data?.trainerAvatarColor ?? '#D1D6DB' }}
              >
                {initial}
              </div>
              <div className="branch-pill">{data?.branchName || '불러오는 중'}</div>
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
              <div className="hero-note">
                <b>30초면 끝나요.</b>
                <br />
                남겨주신 이야기는 트레이너에게 그대로 전해지고,
                <br />
                아쉬운 점은 매장에서 바로 확인합니다.
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

          {/* 2. 바라는 점 */}
          <section className={`card${showCard === '2' ? ' on' : ''}`}>
            <h1>
              {data ? (
                <>
                  앞으로 <em>{data.trainerName}</em> 님에게
                  <br />
                  바라는 점이 있으신가요?
                </>
              ) : (
                '바라는 점이 있으신가요?'
              )}
            </h1>
            <p className="sub">짧아도 괜찮아요. 그대로 전해드릴게요.</p>
            <textarea
              maxLength={500}
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="예) 스트레칭을 조금만 더 봐주시면 좋겠어요."
            />
            <div className="count">{request.length} / 500</div>
          </section>

          {/* 3. 연장 여부 */}
          <section className={`card${showCard === '3' ? ' on' : ''}`}>
            <h1>
              수업이 끝나면
              <br />
              <em>이어서 하실 계획인가요?</em>
            </h1>
            <p className="sub">
              {data
                ? `남은 회차는 ${Math.max(data.totalSessions - data.sessionNo, 0)}회예요.`
                : ''}
            </p>
            <div className="choices">
              {RENEWS.map((r) => (
                <button
                  key={r.value}
                  className="choice"
                  type="button"
                  aria-pressed={renew === r.value}
                  onClick={() => setRenew(r.value)}
                >
                  <b>{r.title}</b>
                  <small>{r.note}</small>
                </button>
              ))}
            </div>
          </section>

          {/* 4. 완료 */}
          <section className={`card${showCard === 'done' ? ' on' : ''}`}>
            <div className="done">
              <div className="ring">
                <svg viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1>
                {data ? (
                  <>
                    {data.trainerName} 님께
                    <br />
                    그대로 전해드릴게요
                  </>
                ) : (
                  '고맙습니다'
                )}
              </h1>
              <p className="sub">남겨주신 이야기 잘 전달하겠습니다.</p>
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
            ) : step === '3' ? (
              '보내기'
            ) : (
              '다음'
            )}
          </button>
          {/* 바라는 점은 **비워도 된다** — 할 말이 없는 사람을 붙잡지 않는다 */}
          <button
            className={`skip${step === '2' ? ' show' : ''}`}
            onClick={() => {
              setRequest('');
              next();
            }}
          >
            건너뛰기
          </button>
        </footer>
      </div>

      <div className={`toast${toast ? ' on' : ''}`}>{toast}</div>
    </>
  );
}
