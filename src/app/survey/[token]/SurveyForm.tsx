'use client';

import { useEffect, useRef, useState } from 'react';

import {
  RANK_LABEL,
  getJson,
  postJson,
  type SurveyBranch,
  type SurveyStaff,
} from '@/lib/api';

/**
 * 운동을 시작하게 된 계기 — **여기만 고치면 화면이 따라간다.**
 * 서버에는 `label` 이 그대로 저장된다 (`motivation`).
 * 짝수로 두는 게 좋다 — 2열이라 홀수면 마지막 줄 오른쪽이 빈다.
 */
const MOTIVES = [
  {
    label: '체중 감량',
    icon: '<polyline points="3 7 9 13 13 9 21 17"/><polyline points="21 11 21 17 15 17"/>',
  },
  { label: '근육 증가', icon: '<path d="M6.5 8v8M4 10.5v3M17.5 8v8M20 10.5v3M6.5 12h11"/>' },
  {
    label: '건강 개선',
    icon: '<path d="M12 20s-7-4.3-9-8.4A5 5 0 0 1 12 6.2 5 5 0 0 1 21 11.6c-2 4.1-9 8.4-9 8.4z"/>',
  },
  {
    label: '스트레스 해소',
    icon: '<circle cx="12" cy="12" r="9"/><path d="M8.4 14.4c.9 1.2 2.1 1.9 3.6 1.9s2.7-.7 3.6-1.9"/><path d="M9 9.6h.01M15 9.6h.01"/>',
  },
  {
    label: '외모 변화',
    icon: '<path d="M12 3.5l1.8 4.7 4.7 1.8-4.7 1.8L12 16.5l-1.8-4.7L5.5 10l4.7-1.8L12 3.5z"/><path d="M18.4 15.6l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6.6-1.6z"/>',
  },
  {
    label: '주변 권유',
    icon: '<path d="M15.5 19.5V18a3.5 3.5 0 0 0-3.5-3.5H7A3.5 3.5 0 0 0 3.5 18v1.5"/><circle cx="9.5" cy="7.5" r="3"/><path d="M20.5 19.5V18a3.5 3.5 0 0 0-2.6-3.4"/><path d="M15.5 4.7a3 3 0 0 1 0 5.6"/>',
  },
];

const STEPS = ['intro', '1', '2', '3', '4', '5'] as const;
const LAST = STEPS.length - 1; // 인트로를 뺀 칸 수

type Fatal = { title: string; body: React.ReactNode };

export default function SurveyForm({ token }: { token: string }) {
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState<Fatal | null>(null);
  const [doneName, setDoneName] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [branchName, setBranchName] = useState('');
  const [staff, setStaff] = useState<SurveyStaff[]>([]);

  const [i, setI] = useState(0);
  const [motive, setMotive] = useState('');
  const [staffId, setStaffId] = useState('');
  const [consent, setConsent] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const [praise, setPraise] = useState('');
  const [improve, setImprove] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 명단 받기 ──────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    getJson<SurveyBranch>(`/survey/${encodeURIComponent(token)}/staff`)
      .then((d) => {
        if (!alive) return;
        setBranchName(d.branchName);
        document.title = `${d.branchName} — 오늘 어떠셨나요?`;
        const list = d.staff ?? [];
        if (!list.length) {
          // 고를 사람이 없으면 설문 자체가 성립하지 않는다 (칭찬 대상이 필수다).
          // 지점에 재직 중인 트레이너·점장이 아직 없다는 뜻이다
          setFatal({ title: '아직 준비 중이에요', body: '잠시 후 다시 시도해주세요.' });
          return;
        }
        setStaff(list);
        setReady(true);
      })
      .catch(() => {
        if (!alive) return;
        setFatal({
          title: '설문을 열 수 없어요',
          body: (
            <>
              QR 이 오래되었거나 주소가 잘못되었습니다.
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

  // 칸을 옮기면 위로 올린다 (원래 `show()` 가 하던 일)
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

  // ── 단계 ──────────────────────────────────────────────────
  const step = STEPS[i];
  const digits = phone.replace(/[^0-9]/g, '');
  const picked = staff.find((s) => s.id === staffId);

  const canGo =
    step === '1'
      ? !!motive
      : step === '2'
        ? !!staffId
        : step === '3'
          ? praise.trim().length > 0
          : step === '5'
            ? !!name.trim() && digits.length === 11 && consent
            : true;

  const showCard = fatal ? 'fatal' : done ? 'done' : step;
  const hideChrome = !ready || !!fatal || done;

  function next() {
    if (step === '5') {
      void submit();
      return;
    }
    setI((n) => n + 1);
  }

  function onPhone(v: string) {
    const d = v.replace(/[^0-9]/g, '').slice(0, 11);
    setPhone(
      d.length > 7
        ? `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
        : d.length > 3
          ? `${d.slice(0, 3)}-${d.slice(3)}`
          : d,
    );
  }

  async function submit() {
    if (sending) return;
    setSending(true);
    try {
      const d = await postJson<{ praisedName?: string }>(
        `/survey/${encodeURIComponent(token)}`,
        {
          motivation: motive,
          praisedEmployeeId: staffId,
          praiseComment: praise.trim(),
          improvement: improve.trim() || null,
          memberName: name.trim(),
          memberPhone: digits,
          consent: true,
        },
      );
      setDoneName(d.praisedName ?? null);
      setDone(true);
    } catch {
      setSending(false);
      showToast('보내지 못했어요. 잠시 후 다시 눌러주세요.');
    }
  }

  return (
    <>
      <div className="shell">
        <header className="top" id="top" hidden={hideChrome || i === 0}>
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
              <div className="mark">
                <svg viewBox="0 0 24 24">
                  <path d="M12 21s-7.5-4.6-9.6-9A5.4 5.4 0 0 1 12 6.6 5.4 5.4 0 0 1 21.6 12c-2.1 4.4-9.6 9-9.6 9z" />
                </svg>
              </div>
              <div className="branch-pill">{branchName || '불러오는 중'}</div>
              <h1>오늘 어떠셨나요?</h1>
              <p className="sub">
                좋았던 점과 아쉬운 점을 들려주시면
                <br />
                더 나은 곳으로 만들겠습니다.
              </p>
              <div className="hero-note">
                <b>1분이면 끝나요.</b>
                <br />
                남겨주신 칭찬은 그 직원에게 그대로 전해지고,
                <br />
                아쉬운 점은 매장에서 바로 확인합니다.
              </div>
            </div>
          </section>

          {/* 1. 운동을 시작하게 된 계기 */}
          <section className={`card${showCard === '1' ? ' on' : ''}`}>
            <h1>
              운동을 시작하게 된
              <br />
              <em>계기가 무엇인가요?</em>
            </h1>
            <p className="sub">가장 가까운 것 하나만 골라주세요.</p>
            <div className="motives">
              {MOTIVES.map((m) => (
                <button
                  key={m.label}
                  className="motive"
                  type="button"
                  aria-pressed={motive === m.label}
                  onClick={() => setMotive(m.label)}
                >
                  <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: m.icon }} />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 2. 직원 고르기 */}
          <section className={`card${showCard === '2' ? ' on' : ''}`}>
            <h1>
              기억에 남는
              <br />
              <em>직원이 있으신가요?</em>
            </h1>
            <p className="sub">칭찬해주고 싶은 분을 골라주세요.</p>
            <div className="people">
              {staff.map((s) => (
                <button
                  key={s.id}
                  className="person"
                  type="button"
                  aria-pressed={staffId === s.id}
                  onClick={() => setStaffId(s.id)}
                >
                  <span className="ava" style={{ background: s.avatarColor }}>
                    {Array.from(s.name)[0] ?? '?'}
                  </span>
                  <span className="nm">{s.name}</span>
                  <span className="rk">{RANK_LABEL[s.rank] ?? ''}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 3. 칭찬 */}
          <section className={`card${showCard === '3' ? ' on' : ''}`}>
            <h1>
              {picked ? (
                <>
                  <em>{picked.name}</em> 님의
                  <br />
                  어떤 점이 좋으셨나요?
                </>
              ) : (
                '어떤 점이 좋으셨나요?'
              )}
            </h1>
            <p className="sub">짧아도 괜찮아요. 그대로 전해드릴게요.</p>
            <textarea
              maxLength={500}
              value={praise}
              onChange={(e) => setPraise(e.target.value)}
              placeholder="예) 처음이라 어색했는데 하나하나 편하게 알려주셨어요."
            />
            <div className="count">{praise.length} / 500</div>
          </section>

          {/* 4. 개선 의견 */}
          <section className={`card${showCard === '4' ? ' on' : ''}`}>
            <h1>
              아쉬웠던 점도
              <br />
              <em>있으셨나요?</em>
            </h1>
            <p className="sub">불편하셨던 점을 적어주시면 바로 확인하겠습니다.</p>
            <textarea
              maxLength={500}
              value={improve}
              onChange={(e) => setImprove(e.target.value)}
              placeholder="없으시면 건너뛰셔도 괜찮아요."
            />
            <div className="count">{improve.length} / 500</div>
          </section>

          {/* 5. 연락처 */}
          <section className={`card${showCard === '5' ? ' on' : ''}`}>
            <h1>
              마지막으로
              <br />
              <em>연락처를 남겨주세요</em>
            </h1>
            <p className="sub">남겨주신 의견을 확인하고 답을 드리기 위해서만 씁니다.</p>
            <div className="field">
              <p className="label">이름</p>
              <input
                type="text"
                maxLength={20}
                autoComplete="name"
                placeholder="성함을 적어주세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field">
              <p className="label">연락처</p>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={13}
                autoComplete="tel"
                placeholder="010-0000-0000"
                value={phone}
                onChange={(e) => onPhone(e.target.value)}
              />
            </div>

            <div className="consent">
              <button
                className="consent-head"
                aria-pressed={consent}
                onClick={(e) => {
                  // 펼침 화살표를 누른 것이면 체크가 아니라 본문을 연다
                  if ((e.target as HTMLElement).closest('.more')) {
                    setTermsOpen((v) => !v);
                    return;
                  }
                  setConsent((v) => !v);
                }}
              >
                <span className="check">
                  <svg viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <span className="txt">
                  개인정보 수집·이용 동의<span className="req">필수</span>
                </span>
                <span
                  className={`more${termsOpen ? ' open' : ''}`}
                  role="button"
                  aria-label="자세히 보기"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>
              <div className={`terms${termsOpen ? ' open' : ''}`}>
                <dl>
                  <dt>수집 항목</dt>
                  <dd>이름, 연락처</dd>
                  <dt>이용 목적</dt>
                  <dd>설문 내용 확인 및 응대</dd>
                  <dt>보유 기간</dt>
                  <dd>수집일로부터 1년</dd>
                </dl>
                <p style={{ margin: '14px 0 0' }}>
                  동의를 거부하실 수 있으며, 이 경우 설문 제출이 어렵습니다.
                </p>
              </div>
            </div>
          </section>

          {/* 6. 완료 */}
          <section className={`card${showCard === 'done' ? ' on' : ''}`}>
            <div className="done">
              <div className="ring">
                <svg viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1>
                {doneName ? (
                  <>
                    {doneName} 님께
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

          {/* 주소가 틀렸을 때 */}
          <section className={`card${showCard === 'fatal' ? ' on' : ''}`}>
            <div className="fatal">
              <h1>{fatal?.title ?? '설문을 열 수 없어요'}</h1>
              <p className="sub" style={{ marginTop: 10 }}>
                {fatal?.body ?? (
                  <>
                    QR 이 오래되었거나 주소가 잘못되었습니다.
                    <br />
                    매장에 문의해주세요.
                  </>
                )}
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
            ) : step === '5' ? (
              '보내기'
            ) : (
              '다음'
            )}
          </button>
          <button
            className={`skip${step === '4' ? ' show' : ''}`}
            onClick={() => {
              setImprove('');
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
