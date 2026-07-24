"use client";

import { useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { useAuth } from "@/providers/auth";
import { useToast } from "@/components/ui/toast";
import { useEmployeeNames } from "@/hooks/use-employee-names";
import { assetUrl } from "@/lib/api/client";
import { CenterContribution } from "@/components/tasks/center-contribution";
import {
  createEnvItem,
  listEnvItems,
  listEnvLogs,
  listKindnessSurveys,
  listMembers,
  listPeerReviews,
  listSessionSigns,
  type EnvItemDTO,
  type EnvLogDTO,
  type KindnessSurveyDTO,
  type MemberDTO,
  type PeerReviewDTO,
  type SessionSignDTO,
} from "@/lib/api/hifis";

/**
 * 업무 5탭 (어드민/대표) — 수행 UI가 아니라 **감독/열람 뷰**.
 * 환경정비 감사로그 · 동료평가 집계 · 회원 친절도 응답 · 수업(세션) 집계 · 센터 기여도(부여+전체).
 * admin scope 라 각 도메인 전체 조회가 열림. 센터 기여도는 admin-aware CenterContribution 재사용.
 * 전부 읽기 전용(±스테퍼·제출 없음). setState 는 .then 안 → set-state-in-effect 아님.
 * 디자인: 랭킹(순위 뱃지·그라데이션 바) + 근태 카드(컬러 아이콘 타일) 톤 계승.
 */

const CATEGORIES = ["환경정비", "동료평가", "회원 친절도", "수업 개수", "센터 기여도"];
const SCORE_PER_SIGN = 2;
const SCORE_PER_PRAISE = 10;
const BAR = "bg-[linear-gradient(90deg,#c471ff,#7d1ff0)]"; // 앱 표준 퍼플 그라데이션
const PEER_ITEMS = [
  ["competency", "업무 역량"],
  ["collaboration", "협업 소통"],
  ["contribution", "성과 기여도"],
  ["attitude", "태도 (성실성·규정 준수)"],
  ["leadership", "리더십 역량"],
] as const;

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
// 날짜 키("YYYY-MM-DD") 유틸 — 전부 고정 인자라 렌더에서 impure 아님(argless new Date()만 금지)
const WD = ["일", "월", "화", "수", "목", "금", "토"];
const dayKeyOf = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
function shiftDayKey(key: string, delta: number) {
  const [y, m, d] = key.split("-").map(Number);
  const nd = new Date(y, m - 1, d + delta);
  return `${nd.getFullYear()}-${pad(nd.getMonth() + 1)}-${pad(nd.getDate())}`;
}
function fmtDayLabel(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return `${m}월 ${d}일 (${WD[new Date(y, m - 1, d).getDay()]})`;
}

/* ── 공용 조각 ── */
// 요약 타일 (아이콘 없이 — 라벨 + 큰 숫자)
function PlainTile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-3.5">
      <p className="text-[11px] text-fg-muted">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${accent ? "text-primary-bright" : ""}`}>{value}</p>
    </div>
  );
}
// 이름 타일 (라벨 + 직원 이름 + 점수) — 최고/최저 등
function NameTile({ label, name, score, tone }: { label: string; name?: string; score?: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface p-3.5">
      <p className="text-[11px] text-fg-muted">{label}</p>
      <p className={`mt-1 truncate text-base font-bold ${name ? tone : "text-fg-muted"}`}>{name ?? "—"}</p>
      <p className="text-[11px] text-fg-muted tabular-nums">{score != null ? `${score}점` : "—"}</p>
    </div>
  );
}
function RankBadge({ n }: { n: number }) {
  const cls =
    n === 1 ? "bg-amber-400/20 text-amber-300" : n === 2 ? "bg-slate-300/15 text-slate-200" : n === 3 ? "bg-amber-700/25 text-amber-500" : "bg-white/5 text-fg-muted";
  return <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums ${cls}`}>{n}</span>;
}
function Avatar({ name }: { name: string }) {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: avatarColor(name) }}>
      {name[0]}
    </span>
  );
}
function Chevron({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.4-3.4" />
    </svg>
  );
}
function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5h16l-6 7v5l-4 2v-7l-6-7Z" />
    </svg>
  );
}
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6v12M6 12h12" />
    </svg>
  );
}
// 별점 (멤버 동료평가 화면과 동일 — 채운 별 앰버 / 빈 별 흐림, h-6)
function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );
}
function StarRow({ n }: { n: number }) {
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < n ? "text-amber-400" : "text-fg-muted/30"}>
          <StarIcon filled={i < n} className="h-6 w-6" />
        </span>
      ))}
    </span>
  );
}

type Row = { id: string; name: string; sub: string; value: number; valueLabel: string };
function Leaderboard({ rows, onRowClick }: { rows: Row[]; onRowClick?: (id: string) => void }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="divide-y divide-white/5">
      {rows.map((r, i) => {
        const body = (
          <>
            <RankBadge n={i + 1} />
            <Avatar name={r.name} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-bold">{r.name}</span>
                <span className="shrink-0 text-sm font-bold text-primary-bright tabular-nums">{r.valueLabel}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div className={`h-full rounded-full ${BAR}`} style={{ width: `${Math.round((r.value / max) * 100)}%` }} />
                </div>
                <span className="shrink-0 text-[11px] text-fg-muted">{r.sub}</span>
              </div>
            </div>
          </>
        );
        return onRowClick ? (
          <button key={r.id} type="button" onClick={() => onRowClick(r.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:opacity-60">
            {body}
            <Chevron className="h-4 w-4 shrink-0 text-fg-muted" />
          </button>
        ) : (
          <div key={r.id} className="flex items-center gap-3 px-4 py-2.5">
            {body}
          </div>
        );
      })}
    </div>
  );
}
function SectionCard({ title, note, loaded, empty, children }: { title: string; note?: string; loaded: boolean; empty: boolean; children: ReactElement }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
      <div className="px-4 pb-2 pt-3.5">
        <p className="text-sm font-bold">{title}</p>
        {note && <p className="mt-0.5 text-[11px] text-fg-muted">{note}</p>}
      </div>
      {!loaded ? <p className="px-4 pb-4 text-sm text-fg-muted">불러오는 중…</p> : empty ? <p className="px-4 pb-6 pt-1 text-center text-sm text-fg-muted">{note ? "아직 데이터가 없어요." : ""}</p> : children}
    </section>
  );
}
// 오른쪽 슬라이드 상세 패널 (멤버 동료평가 화면과 동일 방식) — 세 감독 탭 공용
function SlidePanel({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <div
      role="dialog"
      aria-label={title}
      inert={!open}
      className={`fixed inset-0 z-[70] flex flex-col bg-bg transition-transform duration-300 ease-out ${open ? "translate-x-0" : "pointer-events-none translate-x-full"}`}
    >
      <header className="relative flex h-14 shrink-0 items-center border-b border-white/10 bg-surface/70 px-1.5 backdrop-blur-xl">
        <button type="button" onClick={onClose} aria-label="뒤로" className="grid h-10 w-10 place-items-center text-fg-muted transition hover:text-fg">
          <ChevronLeftIcon className="h-6 w-6" />
        </button>
        <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold">{title}</h1>
      </header>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">{children}</div>
    </div>
  );
}

/* ── 환경정비 감사로그 ── */
// 로그 한 줄 (기타는 note를 제목으로 + 태그)
function EnvRow({ log, who }: { log: EnvLogDTO; who: string }) {
  const note = log.note?.trim();
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className={`h-8 w-1 shrink-0 rounded-full ${BAR}`} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">
          {note || log.itemName}
          {note ? <span className="ml-1.5 align-middle rounded bg-white/8 px-1 py-0.5 text-[9px] font-semibold text-fg-muted">기타</span> : null}
        </span>
        <span className="block text-[11px] text-fg-muted">
          {who} · {fmtDateTime(log.createdAt)}
        </span>
      </span>
    </div>
  );
}

function AdminEnvPanel() {
  const { user } = useAuth();
  const { show } = useToast();
  const nameOf = useEmployeeNames();
  const branchId = user?.branchId;

  const [logs, setLogs] = useState<EnvLogDTO[]>([]);
  const [items, setItems] = useState<EnvItemDTO[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selDate, setSelDate] = useState(""); // "YYYY-MM-DD" · 로드 시 오늘로 초기화
  const [todayKey, setTodayKey] = useState(""); // 오늘 — 미래 이동 상한

  const [allOpen, setAllOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [empFilter, setEmpFilter] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPoints, setNewPoints] = useState("");

  useEffect(() => {
    if (!branchId) return;
    let alive = true;
    Promise.all([listEnvLogs({ branchId }), listEnvItems(branchId)])
      .then(([lg, its]) => {
        if (!alive) return;
        const now = new Date(); // 콜백 안 → 렌더 impure 아님
        const key = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        setLogs(lg);
        setItems(its);
        setSelDate(key);
        setTodayKey(key);
        setLoaded(true);
      })
      .catch(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [branchId]);

  const sorted = [...logs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const dayLogs = selDate ? sorted.filter((l) => dayKeyOf(l.createdAt) === selDate) : [];
  const preview = dayLogs.slice(0, 10);

  const q = query.trim();
  const empOptions = [...new Set(sorted.map((l) => l.employeeId))];
  const full = sorted.filter(
    (l) =>
      (!empFilter || l.employeeId === empFilter) &&
      (q === "" || l.itemName.includes(q) || (l.note ?? "").includes(q) || nameOf(l.employeeId).includes(q)),
  );

  const submitAdd = async () => {
    const name = newName.trim();
    const points = parseInt(newPoints, 10);
    if (!name || !Number.isFinite(points) || points <= 0 || !branchId) return;
    try {
      const created = await createEnvItem({ branchId, name, points, editable: true });
      setItems((p) => [...p, created]);
      show(`${name} 항목을 추가했어요 (+${points}점)`);
      setNewName("");
      setNewPoints("");
      setAddOpen(false);
    } catch {
      show("항목 추가에 실패했어요", "cancel");
    }
  };

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-4">
      {/* 날짜 이동 · 항목 추가 (일정 페이지 툴바와 동일 스타일 — 통일감) */}
      <div className="relative flex h-8 items-center">
        <div className="absolute left-1/2 flex max-w-[calc(100%-5rem)] -translate-x-1/2 items-center gap-1">
          <button
            type="button"
            onClick={() => setSelDate((k) => (k ? shiftDayKey(k, -1) : k))}
            aria-label="이전 날"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-fg-muted"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <div className="relative min-w-0">
            <span className="block truncate px-1.5 text-sm font-semibold tabular-nums">{selDate ? fmtDayLabel(selDate) : "…"}</span>
            <input
              type="date"
              value={selDate}
              max={todayKey || undefined}
              onChange={(e) => e.target.value && e.target.value <= todayKey && setSelDate(e.target.value)}
              aria-label="날짜 선택"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>
          <button
            type="button"
            onClick={() => setSelDate((k) => (k && k < todayKey ? shiftDayKey(k, 1) : k))}
            disabled={!selDate || selDate >= todayKey}
            aria-label="다음 날"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-fg-muted disabled:opacity-30"
          >
            <Chevron className="h-4 w-4" />
          </button>
          {/* + 항목 — 화살표 옆. 흐름에서 빼서 가운데 정렬 기준은 날짜 이동 유지 */}
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            aria-label="항목 추가"
            className="btn-primary absolute left-full ml-1 grid h-8 w-8 place-items-center"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 선택한 날 기록 (최근순 10개) */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
          <p className="text-sm font-bold">{selDate ? fmtDayLabel(selDate) : ""} 기록</p>
          {loaded && <span className="text-[11px] text-fg-muted tabular-nums">{dayLogs.length}건</span>}
        </div>
        {!loaded ? (
          <p className="px-4 pb-4 text-sm text-fg-muted">불러오는 중…</p>
        ) : dayLogs.length === 0 ? (
          <p className="px-4 pb-6 pt-1 text-center text-sm text-fg-muted">이 날 수행 기록이 없어요.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {preview.map((l) => (
              <EnvRow key={l.id} log={l} who={nameOf(l.employeeId)} />
            ))}
          </div>
        )}
        {loaded && logs.length > 0 && (
          <button
            type="button"
            onClick={() => setAllOpen(true)}
            className="flex w-full items-center justify-center gap-1 border-t border-white/10 py-2.5 text-xs font-semibold text-primary-bright"
          >
            자세히 보기
            <Chevron className="h-3.5 w-3.5" />
          </button>
        )}
      </section>

      {/* 자세히 보기 — 전체 기록 (검색 + 직원 필터) */}
      <SlidePanel open={allOpen} title="전체 기록" onClose={() => setAllOpen(false)}>
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-surface px-3 py-2">
            <SearchIcon className="h-4 w-4 shrink-0 text-fg-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="업무·이름·메모 검색"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-muted"
            />
          </div>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setFilterOpen((o) => !o)}
              aria-label="직원 필터"
              className={`grid h-9 w-9 place-items-center rounded-lg border transition-colors ${
                empFilter ? "border-primary/50 bg-primary/10 text-primary-bright" : "border-white/10 bg-surface text-fg-muted"
              }`}
            >
              <FilterIcon className="h-4 w-4" />
            </button>
            {filterOpen && (
              <>
                <button type="button" aria-label="닫기" onClick={() => setFilterOpen(false)} className="fixed inset-0 z-10" />
                <div className="absolute right-0 top-full z-20 mt-1.5 max-h-64 w-40 overflow-y-auto rounded-lg border border-white/10 bg-surface-2 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setEmpFilter(null);
                      setFilterOpen(false);
                    }}
                    className={`flex w-full px-3 py-2 text-left text-sm transition-colors ${empFilter === null ? "font-semibold text-primary-bright" : "text-fg"}`}
                  >
                    전체
                  </button>
                  {empOptions.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setEmpFilter(id);
                        setFilterOpen(false);
                      }}
                      className={`flex w-full px-3 py-2 text-left text-sm transition-colors ${empFilter === id ? "font-semibold text-primary-bright" : "text-fg"}`}
                    >
                      {nameOf(id)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {full.length === 0 ? (
          <p className="pt-8 text-center text-sm text-fg-muted">해당하는 기록이 없어요.</p>
        ) : (
          <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-surface">
            {full.map((l) => (
              <EnvRow key={l.id} log={l} who={nameOf(l.employeeId)} />
            ))}
          </div>
        )}
      </SlidePanel>

      {/* 항목 추가 모달 */}
      {addOpen && (
        <div className="fixed inset-0 z-[80] mx-auto flex max-w-md items-center justify-center p-6" role="dialog" aria-modal="true">
          <button type="button" aria-label="닫기" onClick={() => setAddOpen(false)} className="absolute inset-0 bg-black/70" />
          <div className="animate-page-in relative w-full max-w-xs rounded-2xl border border-white/10 bg-surface p-4 shadow-2xl">
            <p className="text-sm font-semibold">환경정비 항목 추가</p>
            <p className="mt-0.5 text-[11px] text-fg-muted">지점 직원이 수행할 수 있는 항목이 돼요.</p>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="항목 이름 (예: 유리창 청소)"
              className="mt-3 w-full rounded-lg border border-white/10 bg-bg px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
            <input
              value={newPoints}
              onChange={(e) => setNewPoints(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              placeholder="배점 (예: 3)"
              className="mt-2 w-full rounded-lg border border-white/10 bg-bg px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
            {items.length > 0 && (
              <div className="mt-3 max-h-36 overflow-y-auto rounded-lg border border-white/10 bg-bg p-2">
                <p className="px-1 pb-1 text-[10px] font-semibold text-fg-muted">현재 항목 {items.length}개</p>
                <div className="flex flex-wrap gap-1">
                  {items.map((it) => (
                    <span key={it.id} className="rounded bg-white/5 px-1.5 py-0.5 text-[11px] text-fg-muted">
                      {it.name} <span className="text-primary-bright">{it.points}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setAddOpen(false)} className="btn-secondary px-3 py-1.5 text-sm">
                취소
              </button>
              <button type="button" onClick={submitAdd} disabled={!newName.trim() || !newPoints} className="btn-primary px-3.5 py-1.5 text-sm">
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 동료평가 집계 ── */
function AdminPeerPanel() {
  const nameOf = useEmployeeNames();
  const [reviews, setReviews] = useState<PeerReviewDTO[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detailReviewId, setDetailReviewId] = useState<string | null>(null); // 선택된 평가자(리뷰)
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    listPeerReviews({})
      .then((r) => alive && (setReviews(r), setLoaded(true)))
      .catch(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  // 개인평가(자기평가) 포함 — 직원별 받은 평가 지점 통합
  const byReviewee = new Map<string, { count: number; total: number }>();
  for (const r of reviews) {
    const e = byReviewee.get(r.revieweeId) ?? { count: 0, total: 0 };
    e.count += 1;
    e.total += r.total;
    byReviewee.set(r.revieweeId, e);
  }
  const rows: Row[] = [...byReviewee.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([id, v]) => ({ id, name: nameOf(id), sub: `평가 ${v.count}건 · 평균 ${Math.round(v.total / v.count)}점`, value: v.total, valueLabel: `${v.total}점` }));
  const top = rows[0];
  const bottom = rows.length > 1 ? rows[rows.length - 1] : undefined;

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-4">
      <div className="grid grid-cols-3 gap-2">
        <PlainTile label="제출된 평가" value={`${reviews.length}`} />
        <NameTile label="점수 높은 직원" name={top?.name} score={top?.value} tone="text-emerald-300" />
        <NameTile label="점수 낮은 직원" name={bottom?.name} score={bottom?.value} tone="text-rose-300" />
      </div>
      <SectionCard title="직원별 받은 평가" note="직원을 누르면 상세 · 개인평가 포함 (지점 통합)" loaded={loaded} empty={rows.length === 0}>
        <Leaderboard rows={rows} onRowClick={(id) => { setDetailId(id); setDetailReviewId(null); setPanelOpen(true); }} />
      </SectionCard>

      {/* 직원 상세 — 받은 평가 (오른쪽 슬라이드) */}
      <SlidePanel open={panelOpen} title={detailId ? `${nameOf(detailId)} 평가` : ""} onClose={() => setPanelOpen(false)}>
        {(() => {
          const received = detailId ? reviews.filter((r) => r.revieweeId === detailId) : [];
          const sel = received.find((r) => r.id === detailReviewId) ?? received[0];
          if (!sel) return <p className="py-8 text-center text-sm text-fg-muted">아직 받은 평가가 없어요.</p>;
          return (
            <>
              {/* 평가자 필터 — 나를 평가한 사람 중 선택 */}
              <div className="flex flex-wrap gap-1.5">
                {received.map((r) => {
                  const on = sel.id === r.id;
                  const label = r.isSelf ? "본인" : nameOf(r.reviewerId);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setDetailReviewId(r.id)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${on ? "border-primary/50 bg-primary/15 text-primary-bright" : "border-white/10 text-fg-muted"}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* 총점 카드 (멤버 동료평가 화면 디자인) */}
              <div className="rounded-2xl border border-white/10 bg-surface p-4 text-center">
                <p className="text-sm text-fg-muted">
                  총점 <span className="font-bold text-primary-bright">{sel.total}점</span>
                  <span className="text-xs"> / {sel.isSelf ? 25 : 100}점</span>
                </p>
                <p className="mt-0.5 text-[11px] text-fg-muted">{sel.isSelf ? "자기평가 · 별 1개 1점 환산" : "동료평가 · 별 1개 4점 환산"}</p>
              </div>

              {/* 항목별 별점 + 사유(글) */}
              {PEER_ITEMS.map(([k, label]) => {
                const reason = sel.reasons[k];
                return (
                  <div key={k} className="rounded-2xl border border-white/10 bg-surface p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{label}</span>
                      <StarRow n={sel.scores[k]} />
                    </div>
                    <div className="mt-2 min-h-[5rem] w-full whitespace-pre-wrap rounded-lg border border-white/5 bg-surface-2/40 px-3 py-2 text-[13px] leading-relaxed text-fg-muted">
                      {reason?.trim() ? reason : "사유 없음"}
                    </div>
                  </div>
                );
              })}
            </>
          );
        })()}
      </SlidePanel>
    </div>
  );
}

/* ── 회원 친절도 감독 (친절왕 + 개선 피드백) ── */
function AdminKindnessPanel() {
  const nameOf = useEmployeeNames();
  const [surveys, setSurveys] = useState<KindnessSurveyDTO[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [allRankOpen, setAllRankOpen] = useState(false);
  const [respQuery, setRespQuery] = useState("");
  const [respEmp, setRespEmp] = useState<string | null>(null); // 칭찬 대상 직원 필터
  const [respFilterOpen, setRespFilterOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    listKindnessSurveys({})
      .then((r) => alive && (setSurveys(r), setLoaded(true)))
      .catch(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  const byEmp = new Map<string, number>();
  for (const s of surveys) byEmp.set(s.praisedEmployeeId, (byEmp.get(s.praisedEmployeeId) ?? 0) + 1);
  const rows: Row[] = [...byEmp.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, cnt]) => ({ id, name: nameOf(id), sub: `칭찬 ${cnt}회`, value: cnt, valueLabel: `+${cnt * SCORE_PER_PRAISE}점` }));
  const top = rows[0];
  const bottom = rows.length > 1 ? rows[rows.length - 1] : undefined;
  const openDetail = (id: string) => {
    setDetailId(id);
    setPanelOpen(true);
  };
  // 전체보기 — 환경정비 내역 전체보기처럼 검색 + 직원(칭찬 대상) 필터
  const praisedOptions = [...new Set(surveys.map((s) => s.praisedEmployeeId))];
  const rq = respQuery.trim();
  const respFiltered = [...surveys]
    .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1))
    .filter(
      (s) =>
        (!respEmp || s.praisedEmployeeId === respEmp) &&
        (rq === "" || s.memberName.includes(rq) || nameOf(s.praisedEmployeeId).includes(rq) || (s.praiseComment ?? "").includes(rq)),
    );
  const improvements = [...surveys]
    .filter((s) => {
      const t = s.improvement?.trim();
      return t && t !== "없음" && t !== "-";
    })
    .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  const detailSurveys = detailId ? surveys.filter((s) => s.praisedEmployeeId === detailId) : [];

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-4">
      <div className="grid grid-cols-3 gap-2">
        <PlainTile label="총 응답" value={`${surveys.length}`} />
        <NameTile label="친절 많은 직원" name={top?.name} score={top ? top.value * SCORE_PER_PRAISE : undefined} tone="text-emerald-300" />
        <NameTile label="친절 적은 직원" name={bottom?.name} score={bottom ? bottom.value * SCORE_PER_PRAISE : undefined} tone="text-rose-300" />
      </div>

      {/* 친절왕 — 상위 5명만, 나머지는 전체 보기 */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <div className="px-4 pb-2 pt-3.5">
          <p className="text-sm font-bold">친절왕</p>
          <p className="mt-0.5 text-[11px] text-fg-muted">회원 칭찬 수 순 (1건당 +10점) · 직원을 누르면 상세</p>
        </div>
        {!loaded ? (
          <p className="px-4 pb-4 text-sm text-fg-muted">불러오는 중…</p>
        ) : rows.length === 0 ? (
          <p className="px-4 pb-6 pt-1 text-center text-sm text-fg-muted">아직 응답이 없어요.</p>
        ) : (
          <>
            <Leaderboard rows={rows.slice(0, 5)} onRowClick={openDetail} />
            {rows.length > 5 && (
              <button
                type="button"
                onClick={() => setAllRankOpen(true)}
                className="flex w-full items-center justify-center gap-1 border-t border-white/10 py-2.5 text-xs font-semibold text-primary-bright"
              >
                전체 보기
                <Chevron className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}
      </section>

      {/* 회원 개선 피드백 (대표 전용 — 설문 ③ 보완점 모음) */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <div className="px-4 pb-2 pt-3.5">
          <p className="text-sm font-bold">회원 개선 피드백</p>
          <p className="mt-0.5 text-[11px] text-fg-muted">회원이 남긴 센터 보완점 {improvements.length}건</p>
        </div>
        {!loaded ? (
          <p className="px-4 pb-4 text-sm text-fg-muted">불러오는 중…</p>
        ) : improvements.length === 0 ? (
          <p className="px-4 pb-6 pt-1 text-center text-sm text-fg-muted">아직 개선 의견이 없어요.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {improvements.map((s) => (
              <div key={s.id} className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold">{s.memberName}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-fg-muted">{fmtDateTime(s.submittedAt)}</span>
                </div>
                <p className="mt-1 text-[13px] leading-snug">{s.improvement}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 친절 응답 전체 — 환경정비 내역 전체보기처럼 (검색 + 직원 필터) */}
      <SlidePanel open={allRankOpen} title="친절 응답 전체" onClose={() => setAllRankOpen(false)}>
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-surface px-3 py-2">
            <SearchIcon className="h-4 w-4 shrink-0 text-fg-muted" />
            <input
              value={respQuery}
              onChange={(e) => setRespQuery(e.target.value)}
              placeholder="회원·직원·코멘트 검색"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-muted"
            />
          </div>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setRespFilterOpen((o) => !o)}
              aria-label="직원 필터"
              className={`grid h-9 w-9 place-items-center rounded-lg border transition-colors ${
                respEmp ? "border-primary/50 bg-primary/10 text-primary-bright" : "border-white/10 bg-surface text-fg-muted"
              }`}
            >
              <FilterIcon className="h-4 w-4" />
            </button>
            {respFilterOpen && (
              <>
                <button type="button" aria-label="닫기" onClick={() => setRespFilterOpen(false)} className="fixed inset-0 z-10" />
                <div className="absolute right-0 top-full z-20 mt-1.5 max-h-64 w-40 overflow-y-auto rounded-lg border border-white/10 bg-surface-2 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setRespEmp(null);
                      setRespFilterOpen(false);
                    }}
                    className={`flex w-full px-3 py-2 text-left text-sm transition-colors ${respEmp === null ? "font-semibold text-primary-bright" : "text-fg"}`}
                  >
                    전체
                  </button>
                  {praisedOptions.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setRespEmp(id);
                        setRespFilterOpen(false);
                      }}
                      className={`flex w-full px-3 py-2 text-left text-sm transition-colors ${respEmp === id ? "font-semibold text-primary-bright" : "text-fg"}`}
                    >
                      {nameOf(id)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {respFiltered.length === 0 ? (
          <p className="pt-8 text-center text-sm text-fg-muted">해당하는 응답이 없어요.</p>
        ) : (
          <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-surface">
            {respFiltered.map((s) => (
              <div key={s.id} className="px-4 py-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">{s.memberName}</span>
                  <span className="shrink-0 text-fg-muted">→</span>
                  <span className="truncate text-sm font-bold text-primary-bright">{nameOf(s.praisedEmployeeId)}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-fg-muted">{fmtDateTime(s.submittedAt)}</span>
                </div>
                <p className="mt-0.5 truncate text-[13px] text-fg-muted">{s.praiseComment}</p>
              </div>
            ))}
          </div>
        )}
      </SlidePanel>

      {/* 직원 상세 — 받은 칭찬 (전체 랭킹 위로 겹쳐 열림) */}
      <SlidePanel open={panelOpen} title={detailId ? `${nameOf(detailId)} 칭찬` : ""} onClose={() => setPanelOpen(false)}>
        {detailSurveys.length === 0 ? (
          <p className="py-8 text-center text-sm text-fg-muted">받은 칭찬이 없어요.</p>
        ) : (
          detailSurveys.map((s) => (
            <div key={s.id} className="rounded-2xl border border-white/10 bg-surface p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar name={s.memberName} />
                  <span className="truncate text-sm font-bold">{s.memberName}</span>
                </span>
                <span className="shrink-0 text-[11px] text-fg-muted">{fmtDateTime(s.submittedAt)}</span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed">{s.praiseComment}</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-fg-muted">
                <span className="rounded bg-white/5 px-1.5 py-0.5">운동 계기 · {s.motivation}</span>
                {s.improvement?.trim() && <span className="rounded bg-white/5 px-1.5 py-0.5">개선점 · {s.improvement}</span>}
              </div>
            </div>
          ))
        )}
      </SlidePanel>
    </div>
  );
}

/* ── 수업 개수 감독 (수업왕 + 세션 기록) ── */
function AdminClassPanel() {
  const nameOf = useEmployeeNames();
  const [signs, setSigns] = useState<SessionSignDTO[]>([]);
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([listSessionSigns({}), listMembers()])
      .then(([sg, ms]) => alive && (setSigns(sg), setMembers(ms), setLoaded(true)))
      .catch(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? "회원";
  const byTrainer = new Map<string, number>();
  for (const s of signs) byTrainer.set(s.performedByTrainerId, (byTrainer.get(s.performedByTrainerId) ?? 0) + 1);
  const rows: Row[] = [...byTrainer.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id, cnt]) => ({ id, name: nameOf(id), sub: `${cnt}회 수행`, value: cnt, valueLabel: `${cnt * SCORE_PER_SIGN}점` }));
  const top = rows[0];
  const detailSigns = detailId
    ? [...signs].filter((s) => s.performedByTrainerId === detailId).sort((a, b) => (a.signedAt < b.signedAt ? 1 : -1))
    : [];

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-4">
      <div className="grid grid-cols-2 gap-2">
        <PlainTile label="총 세션" value={`${signs.length}`} />
        <NameTile label="수업왕" name={top?.name} score={top ? top.value * SCORE_PER_SIGN : undefined} tone="text-emerald-300" />
      </div>

      <SectionCard title="트레이너별 수업 개수" note={`세션 싸인 1건당 +${SCORE_PER_SIGN}점 · 직원을 누르면 상세`} loaded={loaded} empty={rows.length === 0}>
        <Leaderboard rows={rows} onRowClick={(id) => { setDetailId(id); setPanelOpen(true); }} />
      </SectionCard>

      {/* 직원 상세 — 세션 기록 */}
      <SlidePanel open={panelOpen} title={detailId ? `${nameOf(detailId)} 세션 기록` : ""} onClose={() => setPanelOpen(false)}>
        {detailSigns.length === 0 ? (
          <p className="py-8 text-center text-sm text-fg-muted">세션 기록이 없어요.</p>
        ) : (
          detailSigns.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-surface p-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={assetUrl(s.signatureUrl)} alt="서명" className="h-full w-full object-contain" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold">{memberName(s.memberId)}</span>
                <span className="block text-[11px] text-fg-muted">{s.sessionNo}회차 · {fmtDateTime(s.signedAt)}</span>
              </span>
              <span className="shrink-0 text-xs font-bold text-primary-bright tabular-nums">+{SCORE_PER_SIGN}</span>
            </div>
          ))
        )}
      </SlidePanel>
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
