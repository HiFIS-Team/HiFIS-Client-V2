'use client';

import { useCallback, useEffect, useState } from 'react';

import { getJson, type HistoryData, type HistoryMember } from '@/lib/api';

/** 몇 달 전까지 거슬러 볼 수 있게 할지 — 브로제이에 남아 있는 만큼 */
const MONTHS_BACK = 11;

type Tab = 'high' | 'low';

function monthOptions(): string[] {
  const now = new Date();
  const out: string[] = [];
  for (let i = 0; i <= MONTHS_BACK; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return `${y}년 ${Number(m)}월`;
}

function dayLabel(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${Number(m)}.${Number(d)}`;
}

/** 회원 상태 → 알약 색. 만료 계열만 눈에 띄면 된다 */
function statusTone(status: string): string {
  if (status === '만료' || status === '미등록') return 'off';
  if (status === '만료임박') return 'warn';
  return 'on';
}

export default function HistoryBoard({ token }: { token: string }) {
  const months = monthOptions();
  const [month, setMonth] = useState(months[0]);
  const [tab, setTab] = useState<Tab>('high');
  const [data, setData] = useState<HistoryData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getJson<HistoryData>(`/history/${token}?month=${month}`));
    } catch (e) {
      // 서버가 사유를 한국어로 준다 — 자격증명 만료가 제일 흔해서 그대로 보여준다
      let message = '출석 이력을 불러오지 못했어요.';
      if (e instanceof Response) {
        try {
          const body = await e.json();
          message = body?.detail?.message ?? message;
        } catch {
          /* 본문이 JSON 이 아니면 기본 문장 */
        }
      }
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token, month]);

  useEffect(() => {
    void load();
  }, [load]);

  const rows: HistoryMember[] = data ? (tab === 'high' ? data.high : data.low) : [];

  return (
    <main className="shell">
      <header className="top">
        <div className="title-row">
          <h1>출석 이력</h1>
          {data && <span className="branch">{data.branchName}점</span>}
        </div>

        <select
          className="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          aria-label="달 고르기"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>

        {data && (
          <nav className="tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'high'}
              className={tab === 'high' ? 'on' : ''}
              onClick={() => setTab('high')}
            >
              {data.highThreshold}일 이상
              <em>{data.high.length}</em>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'low'}
              className={tab === 'low' ? 'on' : ''}
              onClick={() => setTab('low')}
            >
              {data.lowThreshold}일 이하
              <em>{data.low.length}</em>
            </button>
          </nav>
        )}
      </header>

      <section className="body">
        {loading && <p className="msg">불러오는 중이에요…</p>}

        {!loading && error && (
          <div className="msg error">
            <p>{error}</p>
            <button type="button" className="retry" onClick={() => void load()}>
              다시 시도
            </button>
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <p className="msg">
            {tab === 'high' ? '기준을 넘은 회원이 없어요.' : '해당하는 회원이 없어요.'}
          </p>
        )}

        {!loading && !error && rows.length > 0 && (
          <ol className="list">
            {rows.map((m) => (
              <li key={`${m.rank}-${m.phone}-${m.name}`} className="row">
                <span className="rank">{m.rank}</span>
                <span className="who">
                  <b>{m.name}</b>
                  <small>{m.phone}</small>
                </span>
                <span className="meta">
                  <b className="days">{m.days}일</b>
                  <small>
                    최근 {dayLabel(m.lastVisit)}
                    <i className={`pill ${statusTone(m.status)}`}>{m.status}</i>
                  </small>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
