"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth";
import { useEmployeeNames } from "@/hooks/use-employee-names";
import { CenterContribution } from "@/components/tasks/center-contribution";
import {
  listEnvLogs,
  listKindnessSurveys,
  listPeerReviews,
  listSessionSigns,
  type EnvLogDTO,
  type KindnessSurveyDTO,
  type PeerReviewDTO,
  type SessionSignDTO,
} from "@/lib/api/hifis";

/**
 * 업무 5탭 (어드민/대표) — 수행 UI가 아니라 **감독/열람 뷰**.
 * 환경정비 감사로그 · 동료평가 집계 · 회원 친절도 응답 · 수업(세션) 집계 · 센터 기여도(부여+전체).
 * admin scope 라 각 도메인 전체 조회가 열림. 센터 기여도는 admin-aware CenterContribution 재사용.
 * 전부 읽기 전용(±스테퍼·제출 없음). setState 는 .then 안 → set-state-in-effect 아님.
 */

const CATEGORIES = ["환경정비", "동료평가", "회원 친절도", "수업 개수", "센터 기여도"];
const SCORE_PER_SIGN = 2;
const SCORE_PER_PRAISE = 10;

const AV = ["#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#9d3bfc", "#f43f5e"];
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h += c.charCodeAt(0);
  return AV[h % AV.length];
}
const pad = (n: number) => String(n).padStart(2, "0");
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${d.getMonth() + 1}.${d.getDate()} ${h < 12 ? "오전" : "오후"} ${h12}:${pad(d.getMinutes())}`;
}

function Avatar({ name, size = "h-8 w-8 text-xs" }: { name: string; size?: string }) {
  return (
    <span className={`grid ${size} shrink-0 place-items-center rounded-full font-bold text-white`} style={{ backgroundColor: avatarColor(name) }}>
      {name[0]}
    </span>
  );
}
function RankRow({ name, sub, right }: { name: string; sub: string; right: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Avatar name={name} size="h-9 w-9 text-sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{name}</span>
        <span className="block text-[11px] text-fg-muted">{sub}</span>
      </span>
      <span className="shrink-0 text-sm font-bold text-primary-bright tabular-nums">{right}</span>
    </div>
  );
}
function Summary({ items }: { items: { label: string; value: string; tint?: string }[] }) {
  return (
    <div className={`grid gap-2 ${items.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
      {items.map((it) => (
        <div key={it.label} className="rounded-2xl border border-white/10 bg-surface p-3.5">
          <p className="text-[11px] text-fg-muted">{it.label}</p>
          <p className={`mt-0.5 text-lg font-bold tabular-nums ${it.tint ?? ""}`}>{it.value}</p>
        </div>
      ))}
    </div>
  );
}

/* ── 환경정비 감사로그 ── */
function AdminEnvPanel() {
  const { user } = useAuth();
  const nameOf = useEmployeeNames();
  const [logs, setLogs] = useState<EnvLogDTO[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user?.branchId) return;
    let alive = true;
    listEnvLogs({ branchId: user.branchId })
      .then((r) => {
        if (alive) {
          setLogs(r);
          setLoaded(true);
        }
      })
      .catch(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [user?.branchId]);

  const byItem = new Map<string, { count: number; points: number }>();
  for (const l of logs) {
    const e = byItem.get(l.itemName) ?? { count: 0, points: 0 };
    e.count += 1;
    e.points += l.points;
    byItem.set(l.itemName, e);
  }
  const items = [...byItem.entries()].sort((a, b) => b[1].count - a[1].count);
  const totalPoints = logs.reduce((s, l) => s + l.points, 0);
  const recent = [...logs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 15);

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-4">
      <Summary items={[
        { label: "총 수행", value: `${logs.length}건` },
        { label: "누적 점수", value: `${totalPoints}점`, tint: "text-primary-bright" },
        { label: "수행 항목", value: `${items.length}종` },
      ]} />

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <p className="px-4 pb-2 pt-3.5 text-sm font-bold">항목별 집계</p>
        {!loaded ? (
          <p className="px-4 pb-4 text-sm text-fg-muted">불러오는 중…</p>
        ) : items.length === 0 ? (
          <p className="px-4 pb-6 pt-2 text-center text-sm text-fg-muted">아직 환경정비 기록이 없어요.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {items.map(([name, v]) => (
              <div key={name} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate font-semibold">{name}</span>
                <span className="shrink-0 text-xs text-fg-muted tabular-nums">{v.count}회</span>
                <span className="w-12 shrink-0 text-right font-bold text-primary-bright tabular-nums">{v.points}점</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
          <p className="px-4 pb-2 pt-3.5 text-sm font-bold">최근 기록</p>
          <div className="divide-y divide-white/5">
            {recent.map((l) => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {l.itemName}
                    {l.note ? <span className="text-fg-muted"> · {l.note}</span> : null}
                  </span>
                  <span className="block text-[11px] text-fg-muted">
                    {nameOf(l.employeeId)} · {fmtDateTime(l.createdAt)}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-bold text-primary-bright tabular-nums">+{l.points}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ── 동료평가 집계 ── */
function AdminPeerPanel() {
  const nameOf = useEmployeeNames();
  const [reviews, setReviews] = useState<PeerReviewDTO[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    listPeerReviews({})
      .then((r) => {
        if (alive) {
          setReviews(r);
          setLoaded(true);
        }
      })
      .catch(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  // 동료로부터 받은 평가(자기평가 제외) 집계
  const peer = reviews.filter((r) => !r.isSelf);
  const byReviewee = new Map<string, { count: number; total: number }>();
  for (const r of peer) {
    const e = byReviewee.get(r.revieweeId) ?? { count: 0, total: 0 };
    e.count += 1;
    e.total += r.total;
    byReviewee.set(r.revieweeId, e);
  }
  const rows = [...byReviewee.entries()].sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-4">
      <Summary items={[
        { label: "제출된 평가", value: `${reviews.length}건` },
        { label: "동료 평가", value: `${peer.length}건` },
      ]} />

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <p className="px-4 pb-2 pt-3.5 text-sm font-bold">직원별 받은 평가</p>
        <p className="px-4 pb-2 text-[11px] text-fg-muted">동료 평가 합계 순 (자기평가 제외)</p>
        {!loaded ? (
          <p className="px-4 pb-4 text-sm text-fg-muted">불러오는 중…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 pb-6 pt-2 text-center text-sm text-fg-muted">아직 제출된 동료평가가 없어요.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {rows.map(([id, v]) => (
              <RankRow key={id} name={nameOf(id)} sub={`${v.count}명이 평가 · 평균 ${Math.round(v.total / v.count)}점`} right={`${v.total}점`} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ── 회원 친절도 응답 ── */
function AdminKindnessPanel() {
  const nameOf = useEmployeeNames();
  const [surveys, setSurveys] = useState<KindnessSurveyDTO[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    listKindnessSurveys({})
      .then((r) => {
        if (alive) {
          setSurveys(r);
          setLoaded(true);
        }
      })
      .catch(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  const byEmp = new Map<string, number>();
  for (const s of surveys) byEmp.set(s.praisedEmployeeId, (byEmp.get(s.praisedEmployeeId) ?? 0) + 1);
  const rows = [...byEmp.entries()].sort((a, b) => b[1] - a[1]);
  const recent = [...surveys].sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1)).slice(0, 12);

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-4">
      <Summary items={[
        { label: "총 응답", value: `${surveys.length}건` },
        { label: "칭찬받은 직원", value: `${rows.length}명` },
      ]} />

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <p className="px-4 pb-2 pt-3.5 text-sm font-bold">친절왕 (칭찬 수)</p>
        {!loaded ? (
          <p className="px-4 pb-4 text-sm text-fg-muted">불러오는 중…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 pb-6 pt-2 text-center text-sm text-fg-muted">아직 접수된 설문 응답이 없어요.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {rows.map(([id, cnt]) => (
              <RankRow key={id} name={nameOf(id)} sub={`칭찬 ${cnt}회`} right={`+${cnt * SCORE_PER_PRAISE}점`} />
            ))}
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
          <p className="px-4 pb-2 pt-3.5 text-sm font-bold">최근 응답</p>
          <div className="divide-y divide-white/5">
            {recent.map((s) => (
              <div key={s.id} className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold">{s.memberName}</span>
                  <span className="text-[11px] text-fg-muted">→</span>
                  <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[11px] font-semibold text-primary-bright">{nameOf(s.praisedEmployeeId)} 칭찬</span>
                  <span className="ml-auto text-[11px] text-fg-muted">{fmtDateTime(s.submittedAt)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-fg-muted">{s.praiseComment}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ── 수업(세션 싸인) 집계 ── */
function AdminClassPanel() {
  const nameOf = useEmployeeNames();
  const [signs, setSigns] = useState<SessionSignDTO[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    listSessionSigns({})
      .then((r) => {
        if (alive) {
          setSigns(r);
          setLoaded(true);
        }
      })
      .catch(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  const byTrainer = new Map<string, number>();
  for (const s of signs) byTrainer.set(s.performedByTrainerId, (byTrainer.get(s.performedByTrainerId) ?? 0) + 1);
  const rows = [...byTrainer.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-4">
      <Summary items={[
        { label: "총 세션", value: `${signs.length}건` },
        { label: "수행 트레이너", value: `${rows.length}명` },
      ]} />

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <p className="px-4 pb-2 pt-3.5 text-sm font-bold">트레이너별 수업 개수</p>
        <p className="px-4 pb-2 text-[11px] text-fg-muted">세션 싸인 1건당 +{SCORE_PER_SIGN}점</p>
        {!loaded ? (
          <p className="px-4 pb-4 text-sm text-fg-muted">불러오는 중…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 pb-6 pt-2 text-center text-sm text-fg-muted">아직 세션 싸인 기록이 없어요.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {rows.map(([id, cnt]) => (
              <RankRow key={id} name={nameOf(id)} sub={`${cnt}회 수행`} right={`${cnt * SCORE_PER_SIGN}점`} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function AdminTasks() {
  const [active, setActive] = useState(0);

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-white/10 bg-bg/90 backdrop-blur">
        <div className="flex">
          {CATEGORIES.map((c, i) => {
            const on = i === active;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setActive(i)}
                className={`relative flex-1 whitespace-nowrap py-3 text-xs transition-colors ${on ? "font-bold text-fg" : "font-medium text-fg-muted"}`}
              >
                {c}
                {on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div key={active} className="animate-page-in">
          {active === 0 ? (
            <AdminEnvPanel />
          ) : active === 1 ? (
            <AdminPeerPanel />
          ) : active === 2 ? (
            <AdminKindnessPanel />
          ) : active === 3 ? (
            <AdminClassPanel />
          ) : (
            <CenterContribution />
          )}
        </div>
      </div>
    </div>
  );
}
