'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  deleteNothing,
  fileUrl,
  getJson,
  patchJson,
  postJson,
  uploadFile,
  type CardioRow,
  type MediaGroup,
  type MediaItem,
  type PersonalLogIn,
  type TrainingData,
  type TrainingLog,
  type TrainingSupplement,
  type WeightRow,
} from '@/lib/api';

type Tab = 'pt' | 'personal' | 'supplement';

/** 고를 수 있는 운동 부위 — 앱(`workout_log.dart`)과 같은 목록이다 */
const PARTS = ['가슴', '등', '어깨', '하체', '팔', '복근', '전신'];

const EMPTY_WEIGHT: WeightRow = { part: '', name: '', load: '', sets: '' };
const EMPTY_CARDIO: CardioRow = { name: '', duration: '' };

function todayIso(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

function dateLabel(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

/** 목록에 쓰는 짧은 날짜 — 줄이 길어지면 제목이 밀린다 */
function shortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${Number(m)}.${Number(d)}`;
}

/**
 * 피드백을 **줄마다 한 항목**으로 끊는다
 *
 * 서버는 글 한 덩어리로 들고 있는데(`trainer_feedback`), 화면은 노션처럼
 * 글머리표로 선다. 칸을 나누면 쓰는 사람이 번호를 맞춰야 해서,
 * **그냥 줄바꿈으로 가른다** — 빈 줄은 버린다.
 */
function feedbackLines(text: string | null): string[] {
  if (!text) return [];
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

/** 줄을 열기 전에 안을 짐작하게 해 준다 */
function summaryOf(log: TrainingLog): string {
  const parts: string[] = [];
  if (log.weights.length) parts.push(`웨이트 ${log.weights.length}`);
  if (log.cardio.length) parts.push(`유산소 ${log.cardio.length}`);
  const shots = log.media.reduce((n, g) => n + g.items.length, 0);
  if (shots) parts.push(`사진 ${shots}`);
  if (log.trainerFeedback) parts.push('피드백');
  return parts.join(' · ');
}

/** 서버가 주는 한국어 사유를 그대로 쓴다 — 없으면 기본 문장 */
async function reasonOf(e: unknown, fallback: string): Promise<string> {
  if (e instanceof Response) {
    try {
      const body = await e.json();
      return body?.detail?.message ?? fallback;
    } catch {
      /* 본문이 JSON 이 아니면 기본 문장 */
    }
  }
  return fallback;
}

/* ── 폼이 들고 있는 값 ───────────────────────────────────────── */

type Draft = {
  /** 고치는 중이면 그 일지 id — 새로 적는 중이면 `null` */
  id: string | null;
  title: string;
  performedOn: string;
  weights: WeightRow[];
  cardio: CardioRow[];
  media: MediaGroup[];
};

function blankDraft(): Draft {
  return {
    id: null,
    title: '',
    performedOn: todayIso(),
    weights: [{ ...EMPTY_WEIGHT }],
    cardio: [{ ...EMPTY_CARDIO }],
    media: [],
  };
}

function draftOf(log: TrainingLog): Draft {
  return {
    id: log.id,
    title: log.title,
    performedOn: log.performedOn,
    weights: log.weights.length ? log.weights.map((r) => ({ ...r })) : [{ ...EMPTY_WEIGHT }],
    cardio: log.cardio.length ? log.cardio.map((r) => ({ ...r })) : [{ ...EMPTY_CARDIO }],
    media: log.media.map((g) => ({ items: [...g.items], feedback: g.feedback })),
  };
}

/** 빈 줄은 안 보낸다 — 표에 `-` 만 남는 줄이 쌓인다 */
function toPayload(draft: Draft): PersonalLogIn {
  return {
    title: draft.title.trim(),
    performedOn: draft.performedOn,
    weights: draft.weights
      .map((r) => ({ ...r, part: r.part.trim(), name: r.name.trim(), load: r.load.trim(), sets: r.sets.trim() }))
      .filter((r) => r.part || r.name || r.load || r.sets),
    cardio: draft.cardio
      .map((r) => ({ name: r.name.trim(), duration: r.duration.trim() }))
      .filter((r) => r.name || r.duration),
    media: draft.media.filter((g) => g.items.length > 0),
  };
}

/* ── 화면 ────────────────────────────────────────────────────── */

/**
 * 회원이 보는 수업 화면.
 *
 * **목록에는 제목과 날짜만 둔다.** 표·사진·피드백까지 한 화면에 펼치면
 * 스무 장쯤부터는 스크롤로 찾는 게 일이 된다 — 자세한 건 눌러서 본다.
 */
export default function TrainingBoard({ token }: { token: string }) {
  const [tab, setTab] = useState<Tab>('pt');
  const [data, setData] = useState<TrainingData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  /** 열어 놓은 일지 id — `null` 이면 목록이다 */
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const page = await getJson<TrainingData>(`/training/${token}`);
      // 서버가 웹보다 늦게 올라가면 이 칸이 아예 안 온다 — 없으면 빈 목록으로 본다
      setData({ ...page, supplements: page.supplements ?? [] });
    } catch (e) {
      setError(await reasonOf(e, '수업 기록을 불러오지 못했어요.'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!draft || busy) return;
    const payload = toPayload(draft);
    if (!payload.title) {
      setNotice('무슨 운동을 했는지 적어 주세요.');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      if (draft.id === null) {
        const made = await postJson<TrainingLog>(`/training/${token}/personal`, payload);
        setOpenId(made.id);
      } else {
        await patchJson(`/training/${token}/personal/${draft.id}`, payload);
      }
      setDraft(null);
      await load();
    } catch (e) {
      setNotice(await reasonOf(e, '저장하지 못했어요. 잠시 뒤 다시 눌러 주세요.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (log: TrainingLog) => {
    if (busy) return;
    if (!window.confirm('이 기록을 지울까요? 올린 사진도 함께 사라져요.')) return;
    setBusy(true);
    setNotice('');
    try {
      await deleteNothing(`/training/${token}/personal/${log.id}`);
      setOpenId(null);
      await load();
    } catch (e) {
      setNotice(await reasonOf(e, '지우지 못했어요.'));
    } finally {
      setBusy(false);
    }
  };

  /** 고른 파일을 한 묶음으로 붙인다 — 한 번에 올린 것끼리 묶인다 */
  const addMedia = async (files: FileList | null) => {
    if (!draft || !files || files.length === 0 || busy) return;
    setBusy(true);
    setNotice('');
    try {
      const items: MediaItem[] = [];
      for (const file of Array.from(files)) {
        items.push(await uploadFile<MediaItem>(`/training/${token}/media`, file));
      }
      setDraft({ ...draft, media: [...draft.media, { items, feedback: null }] });
    } catch (e) {
      setNotice(await reasonOf(e, '사진을 올리지 못했어요.'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="shell">
        <p className="msg">불러오는 중…</p>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="shell">
        <p className="msg error">{error}</p>
        <div style={{ textAlign: 'center' }}>
          <button className="retry" onClick={() => void load()}>
            다시 시도
          </button>
        </div>
      </main>
    );
  }

  const logs = tab === 'pt' ? data.pt : tab === 'personal' ? data.personal : [];
  const open = openId === null ? null : (logs.find((log) => log.id === openId) ?? null);

  /* ── 적는 중 ── */
  if (draft) {
    return (
      <main className="shell">
        <header className="bar">
          <button className="back" onClick={() => setDraft(null)} aria-label="뒤로">
            ‹
          </button>
          <span>{draft.id === null ? '운동 적기' : '운동 고치기'}</span>
        </header>
        <div className="body">
          {notice && <p className="msg error">{notice}</p>}
          <DraftForm
            draft={draft}
            busy={busy}
            onChange={setDraft}
            onPickFiles={addMedia}
            onSave={() => void save()}
            onCancel={() => {
              setDraft(null);
              setNotice('');
            }}
          />
        </div>
      </main>
    );
  }

  /* ── 한 장 자세히 보기 ── */
  if (open) {
    return (
      <main className="shell">
        <header className="bar">
          <button className="back" onClick={() => setOpenId(null)} aria-label="목록으로">
            ‹
          </button>
          <span>{open.kind === 'PT' ? '운동일지' : '개인 운동'}</span>
        </header>
        <div className="body">
          {/* 노션 쪽처럼 **제목 아래에 속성 줄**을 둔다 (2026-09-05 요청) —
              `1회차` 가 제목이고, 수업 날짜·수업 내용이 그 아래 붙는다 */}
          <div className="lede">
            <h1>
              {open.kind === 'PT' && open.sessionNo !== null
                ? `${open.sessionNo}회차`
                : open.title || '제목 없음'}
            </h1>
            <dl className="props">
              <div>
                <dt>
                  <span aria-hidden="true">📅</span> 수업 날짜
                </dt>
                <dd>
                  <time dateTime={open.performedOn}>{dateLabel(open.performedOn)}</time>
                </dd>
              </div>
              {open.kind === 'PT' && (
                <div>
                  <dt>
                    <span aria-hidden="true">📝</span> 수업 내용
                  </dt>
                  <dd>{open.title || <em className="none">비어 있음</em>}</dd>
                </div>
              )}
            </dl>
          </div>
          {notice && <p className="msg error">{notice}</p>}
          <LogDetail
            log={open}
            busy={busy}
            onEdit={() => {
              setDraft(draftOf(open));
              setNotice('');
            }}
            onDelete={() => void remove(open)}
          />
        </div>
      </main>
    );
  }

  /* ── 목록 ── */
  return (
    // 영양제는 넓은 화면에서 표로 서므로 그 탭에서만 칸을 넓힌다 (`.shell.wide`)
    <main className={tab === 'supplement' ? 'shell wide' : 'shell'}>
      <header className="top">
        <div className="hero">
          <p className="hello">오늘도 수고 했어요</p>
          <h1>{data.memberName} 회원님</h1>
          {data.trainerName && <span className="trainer">담당 {data.trainerName}</span>}
        </div>
        <nav className="tabs" role="tablist">
          <button
            role="tab"
            aria-selected={tab === 'pt'}
            className={tab === 'pt' ? 'on' : ''}
            onClick={() => {
              setTab('pt');
              setNotice('');
            }}
          >
            운동일지 <em>{data.pt.length}</em>
          </button>
          <button
            role="tab"
            aria-selected={tab === 'personal'}
            className={tab === 'personal' ? 'on' : ''}
            onClick={() => {
              setTab('personal');
              setNotice('');
            }}
          >
            개인 운동 <em>{data.personal.length}</em>
          </button>
          <button
            role="tab"
            aria-selected={tab === 'supplement'}
            className={tab === 'supplement' ? 'on' : ''}
            onClick={() => {
              setTab('supplement');
              setNotice('');
            }}
          >
            영양제 <em>{data.supplements.length}</em>
          </button>
        </nav>
      </header>

      <div className={tab === 'personal' ? 'body has-cta' : 'body'}>
        {tab === 'pt' && data.goals.length > 0 && (
          <section className="goals block">
            <h4>
              <span aria-hidden="true">👆</span> 운동을 하는 이유
            </h4>
            <p className="sub">나의 운동 목적</p>
            <ol>
              {data.goals.map((goal, i) => (
                <li key={i}>{goal}</li>
              ))}
            </ol>
          </section>
        )}

        {notice && <p className="msg error">{notice}</p>}

        {tab === 'supplement' ? (
          <SupplementList rows={data.supplements} />
        ) : logs.length === 0 ? (
          <p className="empty">
            {tab === 'pt'
              ? '아직 남은 수업 기록이 없어요.'
              : '혼자 한 운동을 적어 두면 트레이너가 보고 피드백을 남겨요.'}
          </p>
        ) : (
          /* 노션 데이터베이스 표와 같은 모양 (2026-09-05 요청) —
             회차 옆의 `열기` 를 눌러 들어간다 */
          <section className="block">
            <h4>
              <span aria-hidden="true">{tab === 'pt' ? '💪' : '🏃'}</span>{' '}
              {tab === 'pt' ? '운동 일지' : '개인 운동'}
            </h4>
            <p className="lead">
              회차 옆에 <b>[열기]</b> 를 누르면
              <br />
              자세히 보실 수 있어요.
            </p>
            <div className="tw">
              <table className="grid db">
                <colgroup>
                  <col className="c1" />
                  <col className="c2" />
                  <col className="c3" />
                </colgroup>
                <thead>
                  <tr>
                    <th>{tab === 'pt' ? '회차' : '수업 내용'}</th>
                    <th>
                      <span aria-hidden="true">📅</span> 수업 날짜
                    </th>
                    <th>내용</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const sum = summaryOf(log);
                    const no = log.kind === 'PT' ? log.sessionNo : null;
                    return (
                      <tr key={log.id}>
                        <td className="strong">
                          <span className="dbname">
                            {no === null ? log.title || '제목 없음' : `${no}회차`}
                          </span>
                          <button className="openbtn" onClick={() => setOpenId(log.id)}>
                            열기
                          </button>
                        </td>
                        <td className="num">
                          <time dateTime={log.performedOn}>{shortDate(log.performedOn)}</time>
                        </td>
                        <td>{(no === null ? sum : log.title) || <em className="none">비어 있음</em>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {tab === 'personal' && (
        <div className="cta">
          <button disabled={busy} onClick={() => setDraft(blankDraft())}>
            오늘 한 운동 적기
          </button>
        </div>
      )}
    </main>
  );
}

/* ── 영양제 (읽기 전용) ──────────────────────────────────────── */

/**
 * 트레이너가 담아 둔 영양제.
 *
 * **넓으면 표, 좁으면 카드다.** 원본이 다섯 칸짜리 표라 PC·태블릿에서는 그대로
 * 세워야 `언제` 끼리 세로로 맞아 훑어 셀 수 있다. 폰은 그 폭이 안 나온다 —
 * 360px 에서 다섯 칸을 밀어 넣으면 `1000~3000mg` 이 세로로 쪼개진다.
 *
 * 둘 다 그려 두고 CSS 가 하나만 세운다 (`.pill-table` / `.pills`). 자바스크립트로
 * 폭을 재서 가르면 첫 그림이 폰 모양으로 한 번 떴다가 바뀐다.
 */
function SupplementList({ rows }: { rows: TrainingSupplement[] }) {
  if (rows.length === 0) {
    return <p className="empty">아직 담아 둔 영양제가 없어요.</p>;
  }

  return (
    <>
      <table className="pill-table">
        <thead>
          <tr>
            <th>영양제</th>
            <th>얼마나?</th>
            <th>언제?</th>
            <th>왜?</th>
            <th>기억하기</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th scope="row">{row.name}</th>
              <td className="num">{row.dose || '—'}</td>
              <td>{row.timing || '—'}</td>
              <td>{row.reason || '—'}</td>
              <td>{row.note || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="pills">
        {rows.map((row) => (
          <li key={row.id} className="pill">
            <div className="pill-top">
              <b>{row.name}</b>
              {row.dose && <em className="tag">{row.dose}</em>}
            </div>
            {(row.timing || row.reason || row.note) && (
              <dl className="pill-rows">
                {row.timing && (
                  <div>
                    <dt>언제</dt>
                    <dd>{row.timing}</dd>
                  </div>
                )}
                {row.reason && (
                  <div>
                    <dt>왜</dt>
                    <dd>{row.reason}</dd>
                  </div>
                )}
                {row.note && (
                  <div>
                    <dt>기억하기</dt>
                    <dd>{row.note}</dd>
                  </div>
                )}
              </dl>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

/* ── 일지 한 장 (읽기) ───────────────────────────────────────── */

/**
 * 일지 한 장 (읽기) — **트레이너가 쓰는 노션 서식과 같은 차례**로 그린다
 * (2026-09-05 요청). 🏋️ 웨이트 → 🏃 유산소 → 💬 피드백 → 📷 사진 or 영상.
 *
 * 표를 쓴다. 예전에는 카드로 폈는데(폰에서 네 칸이 쪼개져서), 지금은
 * **표를 가로로 굴린다** — 좁은 화면에서는 밀어서 본다(`.tw` 가 스크롤).
 * 열 이름이 있어야 `무게·횟수` 와 `세트수` 가 무엇인지 헷갈리지 않는다.
 */
function LogDetail({
  log,
  busy,
  onEdit,
  onDelete,
}: {
  log: TrainingLog;
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const feedback = feedbackLines(log.trainerFeedback);
  const bare =
    log.weights.length === 0 &&
    log.cardio.length === 0 &&
    log.media.length === 0 &&
    feedback.length === 0;

  return (
    <>
      {bare && <p className="empty">적어 둔 운동이 없어요.</p>}

      {log.weights.length > 0 && (
        <section className="block">
          <h4>
            <span aria-hidden="true">🏋️</span> 웨이트 운동
          </h4>
          <div className="tw">
            <table className="grid w4">
              <colgroup>
                <col className="c1" />
                <col className="c2" />
                <col className="c3" />
                <col className="c4" />
              </colgroup>
              <thead>
                <tr>
                  <th>운동 부위</th>
                  <th>운동명</th>
                  <th>무게/횟수</th>
                  <th>세트수</th>
                </tr>
              </thead>
              <tbody>
                {log.weights.map((row, i) => (
                  <tr key={i}>
                    <td>{row.part || '-'}</td>
                    <td className="strong">{row.name || '-'}</td>
                    <td className="num">{row.load || '-'}</td>
                    <td className="num">{row.sets ? `${row.sets}세트` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {log.cardio.length > 0 && (
        <section className="block">
          <h4>
            <span aria-hidden="true">🏃</span> 유산소 운동
          </h4>
          <div className="tw">
            <table className="grid narrow">
              <colgroup>
                <col className="c1" />
                <col className="c2" />
              </colgroup>
              <thead>
                <tr>
                  <th>운동명</th>
                  <th>시간</th>
                </tr>
              </thead>
              <tbody>
                {log.cardio.map((row, i) => (
                  <tr key={i}>
                    <td className="strong">{row.name || '-'}</td>
                    <td className="num">{row.duration || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {feedback.length > 0 && (
        <section className="block">
          <h4>
            <span aria-hidden="true">💬</span> 피드백
          </h4>
          <ul className="notes">
            {feedback.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>
      )}

      {log.media.length > 0 && (
        <section className="block">
          <h4>
            <span aria-hidden="true">📷</span> 사진 or 영상
          </h4>
          <div className="media">
            {log.media.map((group, i) => (
              <div className="group" key={i}>
                <div className="shots">
                  {group.items.map((item, j) => (
                    <Shot item={item} key={j} />
                  ))}
                </div>
                {/* 묶음마다 따로 적어 둔 것 — 위 피드백과 다른 값이다 */}
                {group.feedback && <p>{group.feedback}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* PT 회차는 트레이너가 쓴 기록이라 여기서 고치지 못한다 */}
      {log.mine && (
        <div className="card-acts">
          <button disabled={busy} onClick={onEdit}>
            고치기
          </button>
          <button className="danger" disabled={busy} onClick={onDelete}>
            지우기
          </button>
        </div>
      )}
    </>
  );
}

function Shot({ item }: { item: MediaItem }) {
  const src = fileUrl(item.url);
  if (item.kind === 'VIDEO') {
    return (
      <figure>
        {/* 소리 없이 눌러야 재생된다 — 목록에서 여러 개가 한꺼번에 울리면 안 된다 */}
        <video src={src} controls preload="metadata" playsInline />
      </figure>
    );
  }
  return (
    <a href={src} target="_blank" rel="noreferrer">
      {/* 서명이 붙은 주소라 Next 이미지 최적화를 안 태운다 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="운동 사진" loading="lazy" />
    </a>
  );
}

/* ── 적는 폼 ─────────────────────────────────────────────────── */

function DraftForm({
  draft,
  busy,
  onChange,
  onPickFiles,
  onSave,
  onCancel,
}: {
  draft: Draft;
  busy: boolean;
  onChange: (next: Draft) => void;
  onPickFiles: (files: FileList | null) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const setWeight = (i: number, patch: Partial<WeightRow>) =>
    onChange({
      ...draft,
      weights: draft.weights.map((row, j) => (i === j ? { ...row, ...patch } : row)),
    });

  const setCardio = (i: number, patch: Partial<CardioRow>) =>
    onChange({
      ...draft,
      cardio: draft.cardio.map((row, j) => (i === j ? { ...row, ...patch } : row)),
    });

  /** 마지막 한 줄은 지우는 대신 비운다 — 표가 통째로 사라지면 다시 만들 곳이 없다 */
  const dropWeight = (i: number) =>
    onChange({
      ...draft,
      weights:
        draft.weights.length === 1
          ? [{ ...EMPTY_WEIGHT }]
          : draft.weights.filter((_, j) => j !== i),
    });

  const dropCardio = (i: number) =>
    onChange({
      ...draft,
      cardio:
        draft.cardio.length === 1 ? [{ ...EMPTY_CARDIO }] : draft.cardio.filter((_, j) => j !== i),
    });

  return (
    <section className="form">
      <div className="field">
        <label htmlFor="t-title">무슨 운동을 했나요</label>
        <input
          id="t-title"
          type="text"
          maxLength={100}
          placeholder="예) 하체, 유산소"
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
        />
      </div>

      <div className="field">
        <label htmlFor="t-date">운동한 날</label>
        <input
          id="t-date"
          type="date"
          value={draft.performedOn}
          onChange={(e) => onChange({ ...draft, performedOn: e.target.value })}
        />
      </div>

      <section className="block">
        <h4>
          <span aria-hidden="true">🏋️</span> 웨이트 운동
        </h4>
        <div className="tw">
          <table className="grid w4 edit">
            <colgroup>
              <col className="c1" />
              <col className="c2" />
              <col className="c3" />
              <col className="c4" />
              <col className="cx" />
            </colgroup>
            <thead>
              <tr>
                <th>운동 부위</th>
                <th>운동명</th>
                <th>무게/횟수</th>
                <th>세트수</th>
                <th aria-label="지우기" />
              </tr>
            </thead>
            <tbody>
              {draft.weights.map((row, i) => (
                <tr key={i}>
                  <td>
                    <select
                      className="cell part"
                      value={PARTS.includes(row.part) ? row.part : ''}
                      onChange={(e) => setWeight(i, { part: e.target.value })}
                    >
                      <option value="">부위</option>
                      {PARTS.map((part) => (
                        <option key={part} value={part}>
                          {part}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="cell"
                      type="text"
                      maxLength={60}
                      placeholder={i === 0 ? '벤치프레스' : '운동명'}
                      value={row.name}
                      onChange={(e) => setWeight(i, { name: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="cell"
                      type="text"
                      maxLength={40}
                      placeholder={i === 0 ? '60kg 12회' : '무게 · 횟수'}
                      value={row.load}
                      onChange={(e) => setWeight(i, { load: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="cell num"
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      placeholder="4"
                      value={row.sets}
                      onChange={(e) =>
                        setWeight(i, { sets: e.target.value.replace(/\D/g, '') })
                      }
                    />
                  </td>
                  <td>
                    <button
                      className="drop"
                      type="button"
                      onClick={() => dropWeight(i)}
                      aria-label="줄 지우기"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          className="sub-add"
          type="button"
          onClick={() => onChange({ ...draft, weights: [...draft.weights, { ...EMPTY_WEIGHT }] })}
        >
          + 운동 추가
        </button>
      </section>

      <section className="block">
        <h4>
          <span aria-hidden="true">🏃</span> 유산소 운동
        </h4>
        <div className="tw">
          <table className="grid narrow edit">
            <colgroup>
              <col className="c1" />
              <col className="c2" />
              <col className="cx" />
            </colgroup>
            <thead>
              <tr>
                <th>운동명</th>
                <th>시간</th>
                <th aria-label="지우기" />
              </tr>
            </thead>
            <tbody>
              {draft.cardio.map((row, i) => (
                <tr key={i}>
                  <td>
                    <input
                      className="cell"
                      type="text"
                      maxLength={60}
                      placeholder={i === 0 ? '트레드밀' : '운동명'}
                      value={row.name}
                      onChange={(e) => setCardio(i, { name: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="cell"
                      type="text"
                      maxLength={20}
                      placeholder={i === 0 ? '20분' : '시간'}
                      value={row.duration}
                      onChange={(e) => setCardio(i, { duration: e.target.value })}
                    />
                  </td>
                  <td>
                    <button
                      className="drop"
                      type="button"
                      onClick={() => dropCardio(i)}
                      aria-label="줄 지우기"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          className="sub-add"
          type="button"
          onClick={() => onChange({ ...draft, cardio: [...draft.cardio, { ...EMPTY_CARDIO }] })}
        >
          + 유산소 추가
        </button>
      </section>

      <section className="block">
        <h4>
          <span aria-hidden="true">📷</span> 사진 or 영상
        </h4>
        {draft.media.length > 0 && (
          <div className="media">
            {draft.media.map((group, i) => (
              <div className="group" key={i}>
                <div className="shots">
                  {group.items.map((item, j) => (
                    <Shot item={item} key={j} />
                  ))}
                </div>
                <button
                  className="drop"
                  type="button"
                  onClick={() => onChange({ ...draft, media: draft.media.filter((_, j) => j !== i) })}
                  aria-label="묶음 지우기"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <label className="file-add">
          {busy ? '올리는 중…' : '+ 사진 · 영상 올리기'}
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            disabled={busy}
            onChange={(e) => {
              onPickFiles(e.target.files);
              // 같은 파일을 다시 골라도 `change` 가 뜨게 비운다
              e.target.value = '';
            }}
          />
        </label>
        <p className="hint">자세를 찍어 두면 트레이너가 보고 피드백을 남겨요.</p>
      </section>

      <div className="form-acts">
        <button className="cancel" type="button" onClick={onCancel} disabled={busy}>
          취소
        </button>
        <button className="save" type="button" onClick={onSave} disabled={busy}>
          {busy ? '저장 중…' : '저장'}
        </button>
      </div>
    </section>
  );
}
