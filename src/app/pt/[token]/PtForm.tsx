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

const STEPS = ['intro', '1', '2', '3'] as const;
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
function Secret() {
  return (
    <div className="secret">
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
            <p className="sub">짧아도 괜찮아요. 적극 반영할게요!</p>
            <textarea
              maxLength={500}
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="예) 스트레칭을 조금만 더 봐주시면 좋겠어요."
            />
            <div className="count">{request.length} / 500</div>
            <Secret />
          </section>

          {/* 3. 재등록 여부 — **왜 묻는지를 먼저 말한다** (2026-09-09 요청).
              그냥 "이어서 하실 계획인가요" 로 물으면 영업으로 읽히는데,
              실제 용건은 **그 요일 수업 자리를 잡아 두는 것**이다. */}
          <section className={`card${showCard === '3' ? ' on' : ''}`}>
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
