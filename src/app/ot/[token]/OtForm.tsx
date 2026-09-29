'use client';

import { useEffect, useRef, useState } from 'react';

import { getJson, postJson } from '@/lib/api';
import { MOTIVES } from '@/lib/motives';

/** 칸 차례 — 인트로 · 내 정보 · 운동 목적 · 방문 · 확인 */
const STEPS = ['intro', 'me', 'purpose', 'visit', 'check'] as const;
const LAST = STEPS.length - 1;

/** 고를 수 있는 시각 — 06:00 ~ 23:00, 30분 단위 */
const TIMES = Array.from({ length: (23 - 6) * 2 + 1 }, (_, n) => {
  const m = 6 * 60 + n * 30;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
});

const DAYS = '일월화수목금토';

/**
 * OT 운동 목적 — 회원 설문 보기에 **둘을 더한다** (2026-09-29 대표 요청).
 *
 * - `기구 사용법` — OT 는 기구 쓰는 법만 배우러 오는 사람이 많다
 * - `기타` — 고르면 아래에 적는 칸이 열린다. 서버에는 `기타 · 적은 내용` 으로 간다
 *
 * 회원 설문(`/survey`)은 안 바꾼다 — 거기는 '운동을 시작한 계기'라 뜻이 다르다.
 */
const OTHER = '기타';
const PURPOSES = [
  ...MOTIVES,
  {
    label: '기구 사용법',
    icon: '<path d="M5 9v6M2.5 11v2M19 9v6M21.5 11v2M8 8v8M16 8v8M8 12h8"/>',
  },
  {
    label: OTHER,
    icon: '<path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  },
];

/** 오늘 (브라우저 시계) — `YYYY-MM-DD` */
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** `2026-10-02` → `10월 2일 (금)` */
function dateLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return `${m}월 ${d}일 (${DAYS[new Date(y, m - 1, d).getDay()]})`;
}

export default function OtForm({ token }: { token: string }) {
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState(false);
  const [done, setDone] = useState(false);
  const [branchName, setBranchName] = useState('');

  const [i, setI] = useState(0);
  const [name, setName] = useState('');
  const [male, setMale] = useState<boolean | null>(null);
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  /** `기타` 를 골랐을 때 적은 내용 */
  const [purposeNote, setPurposeNote] = useState('');
  /** `기타` 적는 칸 — 고르면 여기로 내려 준다 */
  const noteRef = useRef<HTMLDivElement | null>(null);
  const noteInput = useRef<HTMLTextAreaElement | null>(null);
  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [consent, setConsent] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  /** 열려 있는 시간 시트 — 시작·끝 중 어느 쪽인가 */
  const [sheet, setSheet] = useState<'start' | 'end' | null>(null);
  /** 방문 날짜 판이 열려 있나 */
  const [dateOpen, setDateOpen] = useState(false);

  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    getJson<{ branchName: string }>(`/ot/${encodeURIComponent(token)}/info`)
      .then((d) => {
        if (!alive) return;
        setBranchName(d.branchName);
        document.title = `${d.branchName} — OT 신청`;
        setReady(true);
      })
      .catch(() => alive && setFatal(true));
    return () => {
      alive = false;
    };
  }, [token]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [i, done, fatal]);

  // `기타` 를 고르면 적는 칸이 보기 아래에 열린다 — 화면 밖일 수 있어서
  // 그 칸까지 부드럽게 내려 준다 (2026-09-29 대표 요청)
  //
  // 칸이 펴지는 동안(0.3초) 기다렸다가 내린다 — 펴지기 전에 재면 도착 자리가
  // 모자라서 한 번 더 움찔한다. 커서는 스크롤을 건드리지 않게 준다
  useEffect(() => {
    if (purpose !== OTHER) return;
    const t = setTimeout(() => {
      noteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      noteInput.current?.focus({ preventScroll: true });
    }, 300);
    return () => clearTimeout(t);
  }, [purpose]);

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
  const digits = phone.replace(/[^0-9]/g, '');
  const ageNo = Number(age);
  const timeOk = !!start && !!end && end > start;

  const canGo =
    step === 'me'
      ? !!name.trim() && male !== null && ageNo >= 1 && ageNo <= 120 && digits.length === 11
      : step === 'purpose'
        ? !!purpose && (purpose !== OTHER || !!purposeNote.trim())
        : step === 'visit'
          ? !!date && date >= todayKey() && timeOk
          : step === 'check'
            ? consent
            : true;

  /** 서버·확인 칸에 들어갈 목적 — `기타` 면 적은 내용을 붙인다 */
  const purposeText = purpose === OTHER ? `${OTHER} · ${purposeNote.trim()}` : purpose;

  const showCard = fatal ? 'fatal' : done ? 'done' : step;
  const hideChrome = !ready || fatal || done;

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

  function next() {
    if (step === 'check') {
      void submit();
      return;
    }
    setI((n) => n + 1);
  }

  async function submit() {
    if (sending) return;
    setSending(true);
    try {
      await postJson(`/ot/${encodeURIComponent(token)}`, {
        name: name.trim(),
        gender: male ? 'MALE' : 'FEMALE',
        age: ageNo,
        phone: digits,
        purpose: purposeText,
        visitDate: date,
        startTime: start,
        endTime: end,
        consent: true,
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
              onClick={() => setI((n) => Math.max(0, n - 1))}
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

        <main className={`body${showCard === 'done' || showCard === 'fatal' ? ' center' : ''}`}>
          {/* 0. 인트로 */}
          <section className={`card${showCard === 'intro' ? ' on' : ''}`}>
            <div className="hero">
              <div className="mark">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M6.5 8v8M4 10.5v3M17.5 8v8M20 10.5v3M6.5 12h11"
                    stroke="#fff"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </div>
              <div className="branch-pill">{branchName || '불러오는 중'}</div>
              <h1>무료 OT 신청</h1>
              <p className="sub">
                원하시는 날짜와 시간을 남겨주시면
                <br />
                담당 트레이너가 확인하고 연락드릴게요.
              </p>
              <div className="hero-note">
                <b>1분이면 끝나요.</b>
                <br />
                예약이 확정되면 문자로 알려드려요.
              </div>
            </div>
          </section>

          {/* 1. 내 정보 */}
          <section className={`card${showCard === 'me' ? ' on' : ''}`}>
            <h1>
              먼저
              <br />
              <em>정보를 알려주세요</em>
            </h1>
            <p className="sub">상담 준비와 예약 안내에만 씁니다.</p>
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
              <p className="label">성별</p>
              <div className="genders">
                <button
                  type="button"
                  className="gender"
                  aria-pressed={male === true}
                  onClick={() => setMale(true)}
                >
                  남성
                </button>
                <button
                  type="button"
                  className="gender"
                  aria-pressed={male === false}
                  onClick={() => setMale(false)}
                >
                  여성
                </button>
              </div>
            </div>
            <div className="field">
              <p className="label">나이</p>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={3}
                placeholder="예) 32"
                value={age}
                onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ''))}
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
          </section>

          {/* 2. 운동 목적 — 회원 설문 보기 + 기구 사용법 · 기타 */}
          <section className={`card${showCard === 'purpose' ? ' on' : ''}`}>
            <h1>
              운동을 하려는
              <br />
              <em>가장 큰 이유는요?</em>
            </h1>
            <p className="sub">가장 가까운 것 하나만 골라주세요.</p>
            <div className="motives">
              {PURPOSES.map((m) => (
                <button
                  key={m.label}
                  className="motive"
                  type="button"
                  aria-pressed={purpose === m.label}
                  onClick={() => setPurpose(m.label)}
                >
                  <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: m.icon }} />
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
            {/* **늘 그려 두고 접었다 편다** — 없앴다 붙이면 다른 보기를 누르는
                순간 페이지 높이가 한 번에 줄어서 화면이 툭 튀었다 */}
            <div className={`note${purpose === OTHER ? ' open' : ''}`} ref={noteRef}>
              <div>
                <div className="field" style={{ paddingTop: 18 }}>
                  <p className="label">자세히 적어주세요</p>
                  <textarea
                    ref={noteInput}
                    maxLength={150}
                    tabIndex={purpose === OTHER ? 0 : -1}
                    value={purposeNote}
                    onChange={(e) => setPurposeNote(e.target.value)}
                    placeholder="예) 허리 재활 운동을 배우고 싶어요"
                  />
                  <div className="count">{purposeNote.length} / 150</div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. 방문 날짜·시간 */}
          <section className={`card${showCard === 'visit' ? ' on' : ''}`}>
            <h1>
              언제
              <br />
              <em>방문하실 건가요?</em>
            </h1>
            <p className="sub">편하신 날짜와 시간을 골라주세요. 조정이 필요하면 연락드릴게요.</p>
            <div className="field">
              <p className="label">방문 날짜</p>
              <button type="button" className="date-field" onClick={() => setDateOpen(true)}>
                {date ? dateLabel(date) : <span className="ph">날짜를 골라주세요</span>}
              </button>
            </div>
            <div className="field">
              <p className="label">방문 시간</p>
              <div className="times">
                <button type="button" className="pick" onClick={() => setSheet('start')}>
                  {start || <span className="ph">몇 시부터</span>}
                </button>
                <span className="tilde">~</span>
                <button type="button" className="pick" onClick={() => setSheet('end')}>
                  {end || <span className="ph">몇 시까지</span>}
                </button>
              </div>
              {!!start && !!end && !timeOk && (
                <p className="hint">끝나는 시간이 오시는 시간보다 늦어야 해요</p>
              )}
            </div>
          </section>

          {/* 4. 확인 · 동의 */}
          <section className={`card${showCard === 'check' ? ' on' : ''}`}>
            <h1>
              이대로
              <br />
              <em>신청할까요?</em>
            </h1>
            <p className="sub">적어주신 내용을 확인해주세요.</p>
            <dl className="review">
              <dt>이름</dt>
              <dd>
                {name.trim()} · {male ? '남성' : '여성'} · {age}세
              </dd>
              <dt>연락처</dt>
              <dd>{phone}</dd>
              <dt>목적</dt>
              <dd>{purposeText}</dd>
              <dt>방문</dt>
              <dd>
                {date ? dateLabel(date) : ''} {start}~{end}
              </dd>
            </dl>

            <div className="consent">
              <button
                className="consent-head"
                aria-pressed={consent}
                onClick={(e) => {
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
                  <dd>이름, 성별, 나이, 연락처, 운동 목적, 방문 희망 일시</dd>
                  <dt>이용 목적</dt>
                  <dd>OT 예약 확인 및 안내 연락</dd>
                  <dt>보유 기간</dt>
                  <dd>수집일로부터 1년</dd>
                </dl>
                <p style={{ margin: '14px 0 0' }}>
                  동의를 거부하실 수 있으며, 이 경우 OT 신청이 어렵습니다.
                </p>
              </div>
            </div>
          </section>

          {/* 완료 */}
          <section className={`card${showCard === 'done' ? ' on' : ''}`}>
            <div className="done">
              <div className="ring">
                <svg viewBox="0 0 24 24">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1>신청이 접수됐어요</h1>
              <p className="sub">
                담당 트레이너가 확인하고
                <br />
                예약이 확정되면 문자로 알려드릴게요.
              </p>
            </div>
          </section>

          {/* 주소가 틀렸을 때 */}
          <section className={`card${showCard === 'fatal' ? ' on' : ''}`}>
            <div className="fatal">
              <h1>신청 페이지를 열 수 없어요</h1>
              <p className="sub" style={{ marginTop: 10 }}>
                QR 이 오래되었거나 주소가 잘못되었습니다.
                <br />
                매장에 문의해주세요.
              </p>
            </div>
          </section>
        </main>

        <footer className="foot" hidden={hideChrome}>
          <button className="cta" disabled={!canGo || sending} onClick={next}>
            {sending ? (
              <span className="spin" />
            ) : step === 'intro' ? (
              '신청하기'
            ) : step === 'check' ? (
              '신청 보내기'
            ) : (
              '다음'
            )}
          </button>
        </footer>
      </div>

      {dateOpen && (
        <div className="sheet-back" onClick={() => setDateOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grip" />
            <p className="sheet-title">방문 날짜</p>
            <Calendar
              value={date}
              onPick={(k) => {
                setDate(k);
                setDateOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {sheet && (
        <TimeSheet
          title={sheet === 'start' ? '몇 시부터 오실까요?' : '몇 시까지 계실까요?'}
          value={sheet === 'start' ? start : end}
          // 끝은 시작보다 늦은 것만 고를 수 있다
          after={sheet === 'end' ? start : ''}
          onPick={(t) => {
            if (sheet === 'start') {
              setStart(t);
              // 끝이 비었거나 시작보다 이르면 한 시간 뒤로 맞춰 준다
              if (!end || end <= t) setEnd(plusHour(t));
            } else {
              setEnd(t);
            }
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}

      <div className={`toast${toast ? ' on' : ''}`}>{toast}</div>
    </>
  );
}

/** `14:00` → `15:00` (고를 수 있는 끝을 넘으면 마지막 칸) */
function plusHour(t: string): string {
  const i = TIMES.indexOf(t);
  return TIMES[Math.min(i + 2, TIMES.length - 1)];
}

/**
 * 방문 날짜 달력 — **이번 달에서 시작한다.** 지난 날은 못 고른다.
 * 브라우저 기본 날짜 창은 기기마다 모양이 달라서 우리 모양으로 그린다.
 */
function Calendar({ value, onPick }: { value: string; onPick: (key: string) => void }) {
  const now = new Date();
  const [view, setView] = useState(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number);
      return { y, m: m - 1 };
    }
    return { y: now.getFullYear(), m: now.getMonth() };
  });
  const today = todayKey();
  const atStart = view.y === now.getFullYear() && view.m === now.getMonth();
  const firstDay = new Date(view.y, view.m, 1).getDay();
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const key = (d: number) =>
    `${view.y}-${String(view.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const move = (delta: number) =>
    setView(({ y, m }) => {
      const next = new Date(y, m + delta, 1);
      return { y: next.getFullYear(), m: next.getMonth() };
    });

  return (
    <div className="cal">
      <div className="cal-head">
        <button type="button" aria-label="이전 달" disabled={atStart} onClick={() => move(-1)}>
          <svg viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <b>
          {view.y}년 {view.m + 1}월
        </b>
        <button type="button" aria-label="다음 달" onClick={() => move(1)}>
          <svg viewBox="0 0 24 24">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
      <div className="cal-grid">
        {DAYS.split('').map((d, i) => (
          <span key={d} className={`cal-dow${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}`}>
            {d}
          </span>
        ))}
        {Array.from({ length: firstDay }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const k = key(i + 1);
          const past = k < today;
          return (
            <button
              key={k}
              type="button"
              className={`cal-day${k === value ? ' on' : ''}${k === today ? ' today' : ''}`}
              disabled={past}
              onClick={() => onPick(k)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** 시간 고르기 — 아래에서 올라오는 판 (30분 단위) */
function TimeSheet({
  title,
  value,
  after,
  onPick,
  onClose,
}: {
  title: string;
  value: string;
  after: string;
  onPick: (t: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <p className="sheet-title">{title}</p>
        <div className="sheet-grid">
          {TIMES.map((t) => (
            <button
              key={t}
              type="button"
              className={`chip${t === value ? ' on' : ''}`}
              disabled={!!after && t <= after}
              onClick={() => onPick(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
