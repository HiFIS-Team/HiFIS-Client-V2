"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useRefresh } from "@/hooks/use-refresh";
import { useNavTargetFor } from "@/hooks/nav-target";
import { useAuth } from "@/providers/auth";
import {
  approveApproval,
  createApproval,
  createApprovalComment,
  listApprovals,
  listEmployees,
  rejectApproval,
  type ApprovalDTO,
  type EmployeeLite,
} from "@/lib/api/hifis";

/* ── 아이콘 ─────────────────────────────────────── */
function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 11a8 8 0 0 0-13.7-5.7L4 7.5" />
      <path d="M4 4v3.5h3.5" />
      <path d="M4 13a8 8 0 0 0 13.7 5.7L20 16.5" />
      <path d="M20 20v-3.5h-3.5" />
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
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
    </svg>
  );
}

/* ── 종류 · 상태 ────────────────────────────────── */
type Kind = "지출결의" | "구매 요청" | "비품 신청" | "외근·출장" | "근무 변경" | "기타 품의";
const KINDS: { key: Kind; emoji: string; tile: string; money: boolean; place?: boolean }[] = [
  { key: "지출결의", emoji: "💳", tile: "bg-amber-400/12 text-amber-300", money: true },
  { key: "구매 요청", emoji: "🛒", tile: "bg-rose-400/12 text-rose-300", money: true },
  { key: "비품 신청", emoji: "📦", tile: "bg-sky-400/12 text-sky-300", money: true },
  { key: "외근·출장", emoji: "✈️", tile: "bg-cyan-400/12 text-cyan-300", money: false, place: true },
  { key: "근무 변경", emoji: "🕐", tile: "bg-violet-400/12 text-violet-300", money: false },
  { key: "기타 품의", emoji: "📄", tile: "bg-slate-400/12 text-slate-300", money: false },
];
const kindOf = (k: string) => KINDS.find((x) => x.key === k) ?? KINDS[5];

type StatusKo = "진행 중" | "승인 완료" | "반려";
const STATUS_STYLE: Record<StatusKo, string> = {
  "진행 중": "bg-amber-400/12 text-amber-300",
  "승인 완료": "bg-emerald-400/12 text-emerald-300",
  반려: "bg-red-500/12 text-red-400",
};
const STATUS_TO_KO: Record<ApprovalDTO["status"], StatusKo> = { IN_PROGRESS: "진행 중", APPROVED: "승인 완료", REJECTED: "반려" };

type StepStatusKo = "승인" | "반려" | "대기";
const STEP_STYLE: Record<StepStatusKo, string> = {
  승인: "bg-emerald-400/12 text-emerald-300",
  반려: "bg-red-500/12 text-red-400",
  대기: "bg-white/8 text-fg-muted",
};
const STEP_TO_KO: Record<"PENDING" | "APPROVED" | "REJECTED", StepStatusKo> = { PENDING: "대기", APPROVED: "승인", REJECTED: "반려" };

// 직급 enum → 한글 (모르면 원문)
const RANK_KO: Record<string, string> = {
  JUNIOR_TRAINER: "주니어 트레이너",
  PRO_TRAINER: "프로 트레이너",
  PRO1_TRAINER: "프로1 트레이너",
  TEAM_LEAD: "팀장",
  STORE_MANAGER: "점장",
  FC: "FC",
  ADMIN: "관리자",
};
const rankKo = (r?: string | null) => (r ? RANK_KO[r] ?? r : "");

type Step = { approverId: string; status: StepStatusKo; comment?: string; actedAt?: string };
type Comment = { authorId: string; body: string; createdAt: string };
type Doc = {
  id: string;
  kind: string;
  title: string;
  amount?: number;
  requesterId: string;
  createdAt: string; // ISO
  status: StatusKo;
  content: string;
  steps: Step[];
  comments: Comment[];
  startDate?: string;
  endDate?: string;
  place?: string;
};

function toDoc(a: ApprovalDTO): Doc {
  return {
    id: a.id,
    kind: a.kind,
    title: a.title,
    amount: a.amount ?? undefined,
    requesterId: a.requesterId,
    createdAt: a.createdAt,
    status: STATUS_TO_KO[a.status],
    content: a.content,
    steps: a.steps.map((s) => ({
      approverId: s.approverId,
      status: STEP_TO_KO[s.status],
      comment: s.comment ?? undefined,
      actedAt: s.actedAt ?? undefined,
    })),
    comments: a.comments.map((c) => ({ authorId: c.authorId, body: c.body, createdAt: c.createdAt })),
    startDate: a.startDate ?? undefined,
    endDate: a.endDate ?? undefined,
    place: a.place ?? undefined,
  };
}

/* ── 유틸 ───────────────────────────────────────── */
const pad = (n: number) => String(n).padStart(2, "0");
const fmtDateOnly = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
};
const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  const h = d.getHours();
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}. ${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}:${pad(d.getMinutes())}`;
};
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const AV = ["#9d3bfc", "#22c55e", "#0ea5e9", "#f59e0b", "#ec4899", "#14b8a6", "#8b5cf6"];
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h += c.charCodeAt(0);
  return AV[h % AV.length];
}

const labelCls = "pb-1.5 text-[13px] font-bold";
const fieldCls =
  "w-full rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 text-[13px] outline-none focus:border-primary/50 placeholder:text-fg-muted";
const metaLabel = "text-[11px] text-fg-muted";
const metaValue = "text-[13px] font-semibold";

export function Approvals() {
  const { show } = useToast();
  const { user, status: authStatus } = useAuth();
  const meId = user?.id;
  const [roster, setRoster] = useState<EmployeeLite[]>([]);
  const nameOf = (id: string) => roster.find((r) => r.id === id)?.name ?? (id === meId ? user?.name ?? "나" : "직원");
  const roleOf = (id: string) => {
    const r = roster.find((x) => x.id === id);
    return r ? [rankKo(r.rank), r.team].filter(Boolean).join(" · ") : "";
  };
  const who = (id: string) => {
    const role = roleOf(id);
    return role ? `${nameOf(id)} · ${role}` : nameOf(id);
  };

  const [mine, setMine] = useState<Doc[]>([]);
  const [pending, setPending] = useState<Doc[]>([]);
  const [loaded, setLoaded] = useState(false);
  const nav = useNavTargetFor("/approvals"); // 헤더 검색에서 넘어온 항목
  const [tab, setTab] = useState<"내 신청" | "결재 대기">("내 신청");
  const [detailId, setDetailId] = useState<string | null>(nav?.id ?? null);
  const [draft, setDraft] = useState("");

  // 새 결재 모달
  const [addOpen, setAddOpen] = useState(false);
  const [fKind, setFKind] = useState<Kind>("구매 요청");
  const [fTitle, setFTitle] = useState("");
  const [fAmount, setFAmount] = useState("");
  const [fContent, setFContent] = useState("");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");
  const [fPlace, setFPlace] = useState("");
  const [fApprovers, setFApprovers] = useState<string[]>([]); // employeeId 순서대로
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    Promise.all([listApprovals("mine"), listApprovals("inbox")])
      .then(([m, i]) => {
        setMine(m.map(toDoc));
        setPending(i.map(toDoc));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);
  const { busy, refresh } = useRefresh("결재 문서를 새로고침했습니다", load);

  useEffect(() => {
    if (authStatus === "authed") load();
  }, [authStatus, load]);

  useEffect(() => {
    let alive = true;
    listEmployees()
      .then((e) => {
        if (alive) setRoster(e);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!addOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAddOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addOpen]);

  // 목록에서 선택하면 밑에 펼쳐지는 상세로 자동 스크롤
  useEffect(() => {
    if (!detailId) return;
    const t = setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    return () => clearTimeout(t);
  }, [detailId]);

  const detail = [...mine, ...pending].find((d) => d.id === detailId) ?? null;
  const list = tab === "내 신청" ? mine : pending;
  const myOngoing = mine.filter((d) => d.status === "진행 중").length;
  const isPending = detail ? pending.some((d) => d.id === detail.id) : false;

  const openDetail = (id: string) => {
    setDetailId((cur) => (cur === id ? null : id));
    setDraft("");
  };

  const toggleApprover = (id: string) => setFApprovers((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const openAdd = () => {
    setFKind("구매 요청");
    setFTitle("");
    setFAmount("");
    setFContent("");
    setFStart("");
    setFEnd("");
    setFPlace("");
    setFApprovers([]);
    setAddOpen(true);
  };

  const submitAdd = async () => {
    const t = fTitle.trim();
    if (!t || fApprovers.length === 0) return;
    const amt = Number(fAmount.replace(/[^0-9]/g, ""));
    try {
      await createApproval({
        kind: fKind,
        title: t,
        content: fContent.trim() || "(내용 없음)",
        amount: kindOf(fKind).money && amt > 0 ? amt : undefined,
        startDate: fStart || undefined,
        endDate: fEnd && fEnd >= fStart ? fEnd : undefined,
        place: kindOf(fKind).place && fPlace.trim() ? fPlace.trim() : undefined,
        approverIds: fApprovers,
      });
      setAddOpen(false);
      setTab("내 신청");
      show(`${fKind} 결재를 상신했습니다`);
      load();
    } catch {
      show("결재 상신에 실패했어요", "cancel");
    }
  };

  const decide = async (id: string, ok: boolean) => {
    const doc = pending.find((d) => d.id === id);
    try {
      if (ok) await approveApproval(id);
      else await rejectApproval(id);
      setDetailId(null);
      if (doc) show(`${nameOf(doc.requesterId)}님의 ${doc.kind} ${ok ? "승인했습니다" : "반려했습니다"}`, ok ? "done" : "cancel");
      load();
    } catch {
      show("처리에 실패했어요", "cancel");
    }
  };

  const addComment = async () => {
    const text = draft.trim();
    if (!text || !detail) return;
    try {
      await createApprovalComment(detail.id, text);
      setDraft("");
      show("댓글을 등록했습니다");
      load();
    } catch {
      show("댓글 등록에 실패했어요", "cancel");
    }
  };

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      {/* 제목 */}
      <div>
        <h1 className="text-xl font-bold">전자결재</h1>
      </div>

      {/* 새로고침 · 탭 · 새 결재 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={refresh}
          disabled={busy}
          aria-label="새로고침"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-fg-muted"
        >
          <RefreshIcon className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
        </button>

        <div className="flex min-w-0 flex-1 overflow-hidden rounded-lg border border-white/10">
          {(["내 신청", "결재 대기"] as const).map((t) => {
            const on = tab === t;
            const n = t === "내 신청" ? myOngoing : pending.length;
            return (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setDetailId(null);
                }}
                className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-semibold transition-colors ${
                  on ? "bg-primary/15 text-primary-bright" : "text-fg-muted"
                }`}
              >
                {t}
                {n > 0 && (
                  <span
                    className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold leading-none ${
                      t === "결재 대기" ? "bg-red-500 text-white" : "bg-white/15 text-fg"
                    }`}
                  >
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button type="button" onClick={openAdd} aria-label="새 결재" className="btn-primary grid h-8 w-8 shrink-0 place-items-center">
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>

      {/* 목록 */}
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <div className="flex items-baseline justify-between px-4 pb-1 pt-3.5">
          <h2 className="text-sm font-bold">{tab === "내 신청" ? "내 신청 목록" : "결재 대기 목록"}</h2>
          <span className="text-xs text-fg-muted">{list.length}건</span>
        </div>

        {!loaded ? (
          <p className="px-4 py-10 text-center text-sm text-fg-muted">불러오는 중…</p>
        ) : list.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-fg-muted">
            {tab === "내 신청" ? "신청한 결재가 없어요." : "결재할 문서가 없어요."}
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            {list.map((d) => {
              const k = kindOf(d.kind);
              const on = d.id === detailId;
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => openDetail(d.id)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${on ? "bg-primary/10" : ""}`}
                >
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-lg ${k.tile}`}>{k.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="shrink-0 text-[13px] font-bold">{d.kind}</span>
                      <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${STATUS_STYLE[d.status]}`}>
                        {d.status}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm font-semibold">{d.title}</p>
                    <p className="mt-0.5 text-[11px] text-fg-muted">
                      {d.requesterId === meId ? "내가 요청" : `${nameOf(d.requesterId)} 요청`} · {fmtDateOnly(d.createdAt)}
                    </p>
                  </div>
                  {on ? (
                    <ChevronDownIcon className="mt-3 h-4 w-4 shrink-0 text-primary-bright" />
                  ) : (
                    <ChevronRightIcon className="mt-3 h-4 w-4 shrink-0 text-fg-muted" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 상세 (목록 밑에 펼쳐짐) ────────────────── */}
      <section ref={detailRef} className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        {!detail ? (
          <p className="px-4 py-16 text-center text-sm text-fg-muted">목록에서 결재 문서를 선택해주세요.</p>
        ) : (
          <div className="animate-page-in">
            {/* 헤더 */}
            <div className="flex items-start gap-3 px-4 py-3.5">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-lg ${kindOf(detail.kind).tile}`}>
                {kindOf(detail.kind).emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-fg-muted">{detail.kind}</p>
                <p className="text-base font-bold leading-snug">{detail.title}</p>
              </div>
              <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-bold ${STATUS_STYLE[detail.status]}`}>
                {detail.status}
              </span>
              <button type="button" onClick={() => setDetailId(null)} aria-label="닫기" className="shrink-0 text-fg-muted">
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5 border-t border-white/8 px-4 py-3.5">
              {/* 신청자 */}
              <div>
                <p className={metaLabel}>신청자</p>
                <p className={metaValue}>{who(detail.requesterId)}</p>
              </div>

              {/* 신청일 */}
              <div>
                <p className={metaLabel}>신청일</p>
                <p className={`${metaValue} tabular-nums`}>{fmtDateTime(detail.createdAt)}</p>
              </div>

              {/* 기간 */}
              {detail.startDate && (
                <div>
                  <p className={metaLabel}>기간</p>
                  <p className={`${metaValue} tabular-nums`}>
                    {detail.startDate}
                    {detail.endDate ? ` ~ ${detail.endDate}` : ""}
                  </p>
                </div>
              )}

              {/* 목적지 */}
              {detail.place && (
                <div>
                  <p className={metaLabel}>목적지</p>
                  <p className={metaValue}>{detail.place}</p>
                </div>
              )}

              {/* 금액 */}
              {detail.amount !== undefined && (
                <div>
                  <p className={metaLabel}>금액</p>
                  <p className={`${metaValue} tabular-nums`}>{won(detail.amount)}</p>
                </div>
              )}

              {/* 내용 */}
              <div>
                <p className={metaLabel}>내용</p>
                <div className="mt-1 rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5">
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed">{detail.content}</p>
                </div>
              </div>

              {/* 결재선 */}
              <div>
                <p className={metaLabel}>결재선</p>
                <div className="mt-1 space-y-1.5">
                  {detail.steps.map((s, i) => {
                    const nm = nameOf(s.approverId);
                    return (
                      <div key={`${s.approverId}-${i}`} className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5">
                        <span
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                            s.status === "승인"
                              ? "bg-emerald-500 text-white"
                              : s.status === "반려"
                                ? "bg-red-500 text-white"
                                : "bg-white/15 text-fg-muted"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                          style={{ backgroundColor: avatarColor(nm) }}
                        >
                          {nm.charAt(0)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-bold">{who(s.approverId)}</p>
                          {s.comment && <p className="truncate text-[11px] italic text-fg-muted">&ldquo;{s.comment}&rdquo;</p>}
                          {s.actedAt && <p className="text-[11px] text-fg-muted tabular-nums">{fmtDateTime(s.actedAt)}</p>}
                        </div>
                        <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${STEP_STYLE[s.status]}`}>
                          {s.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 댓글 */}
              <div>
                <p className={metaLabel}>댓글</p>
                {detail.comments.length === 0 ? (
                  <p className="mt-1 text-[13px] text-fg-muted">아직 댓글이 없어요.</p>
                ) : (
                  <div className="mt-1 space-y-1.5">
                    {detail.comments.map((c, i) => (
                      <div key={i} className="rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5">
                        <p className="text-[12px] font-bold">
                          {nameOf(c.authorId)}
                          <span className="ml-1.5 font-normal text-fg-muted tabular-nums">{fmtDateTime(c.createdAt)}</span>
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed">{c.body}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex items-start gap-2">
                  <div className="relative min-w-0 flex-1">
                    <textarea
                      value={draft}
                      maxLength={2000}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        // 한글 조합 중 Enter는 글자 확정이므로 제출로 치지 않는다
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) addComment();
                      }}
                      rows={3}
                      placeholder="맥락이나 추가 질문을 남겨보세요 (⌘/Ctrl+Enter 로 등록)"
                      className={`${fieldCls} resize-none pb-5`}
                    />
                    <span className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-fg-muted tabular-nums">{draft.length}/2000</span>
                  </div>
                  <button type="button" onClick={addComment} disabled={!draft.trim()} className="btn-primary shrink-0 px-3 py-2 text-xs">
                    등록
                  </button>
                </div>
              </div>
            </div>

            {/* 결재 대기 문서면 승인/반려 */}
            {isPending && (
              <div className="flex gap-2 border-t border-white/10 px-4 py-3">
                <button type="button" onClick={() => decide(detail.id, false)} className="btn-danger flex-1 py-2.5 text-sm">
                  반려
                </button>
                <button type="button" onClick={() => decide(detail.id, true)} className="btn-primary flex-[2] py-2.5 text-sm">
                  승인
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── 새 결재 올리기 모달 ────────────────────── */}
      {addOpen && (
        <div className="overlay-frame fixed inset-x-0 top-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" aria-label="닫기" onClick={() => setAddOpen(false)} className="animate-fade-in absolute inset-0 bg-black/70" />

          <div className="animate-page-in relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3.5">
              <p className="text-lg font-bold">새 결재 올리기</p>
              <button type="button" onClick={() => setAddOpen(false)} aria-label="닫기" className="text-fg-muted">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4">
              {/* 결재 종류 */}
              <div>
                <p className={labelCls}>결재 종류</p>
                <div className="grid grid-cols-2 gap-2">
                  {KINDS.map((k) => {
                    const on = fKind === k.key;
                    return (
                      <button
                        key={k.key}
                        type="button"
                        onClick={() => setFKind(k.key)}
                        className={`flex flex-col items-center gap-1.5 rounded-lg border py-3 transition-colors ${
                          on ? "border-primary/60 bg-primary/12" : "border-white/10"
                        }`}
                      >
                        <span className="text-xl leading-none">{k.emoji}</span>
                        <span className={`text-[13px] font-semibold ${on ? "text-primary-bright" : "text-fg"}`}>{k.key}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 제목 */}
              <div>
                <p className={labelCls}>제목</p>
                <input autoFocus value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="무엇에 대한 결재인가요?" className={fieldCls} />
              </div>

              {/* 금액 */}
              {kindOf(fKind).money && (
                <div>
                  <p className={labelCls}>
                    금액 <span className="font-normal text-fg-muted">(선택)</span>
                  </p>
                  <div className="relative">
                    <input
                      inputMode="numeric"
                      value={fAmount}
                      onChange={(e) => {
                        const n = e.target.value.replace(/[^0-9]/g, "");
                        setFAmount(n ? Number(n).toLocaleString("ko-KR") : "");
                      }}
                      placeholder="0"
                      className={`${fieldCls} pr-9 text-right tabular-nums`}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-fg-muted">원</span>
                  </div>
                </div>
              )}

              {/* 내용 */}
              <div>
                <p className={labelCls}>내용</p>
                <textarea
                  value={fContent}
                  onChange={(e) => setFContent(e.target.value)}
                  rows={4}
                  placeholder="사유·근거·견적 등 결재에 필요한 내용을 적어주세요"
                  className={`${fieldCls} resize-none`}
                />
              </div>

              {/* 시작일 */}
              <div>
                <p className={labelCls}>
                  시작일 <span className="font-normal text-fg-muted">(선택)</span>
                </p>
                <div className="relative">
                  <input
                    ref={startRef}
                    type="date"
                    value={fStart}
                    onChange={(e) => setFStart(e.target.value)}
                    className={`${fieldCls} pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0`}
                  />
                  <button
                    type="button"
                    aria-label="시작일 선택"
                    onClick={() => startRef.current?.showPicker()}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted"
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* 종료일 */}
              <div>
                <p className={labelCls}>
                  종료일 <span className="font-normal text-fg-muted">(선택)</span>
                </p>
                <div className="relative">
                  <input
                    ref={endRef}
                    type="date"
                    value={fEnd}
                    min={fStart || undefined}
                    onChange={(e) => setFEnd(e.target.value)}
                    className={`${fieldCls} pr-9 [&::-webkit-calendar-picker-indicator]:opacity-0`}
                  />
                  <button
                    type="button"
                    aria-label="종료일 선택"
                    onClick={() => endRef.current?.showPicker()}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-muted"
                  >
                    <CalendarIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* 목적지 */}
              {kindOf(fKind).place && (
                <div>
                  <p className={labelCls}>목적지</p>
                  <input value={fPlace} onChange={(e) => setFPlace(e.target.value)} placeholder="예: 본사 / 잠실점" className={fieldCls} />
                </div>
              )}

              {/* 결재선 */}
              <div>
                <p className={labelCls}>
                  결재선 <span className="font-normal text-fg-muted">(순서대로 결재됨 · {fApprovers.length}명)</span>
                </p>
                {roster.length === 0 ? (
                  <p className="text-[13px] text-fg-muted">직원 명단을 불러오는 중…</p>
                ) : (
                  <div className="max-h-52 divide-y divide-white/5 overflow-y-auto rounded-lg border border-white/10">
                    {roster.map((a) => {
                      const idx = fApprovers.indexOf(a.id);
                      const on = idx >= 0;
                      return (
                        <button key={a.id} type="button" onClick={() => toggleApprover(a.id)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
                          <span
                            className={`grid h-5 w-5 shrink-0 place-items-center rounded border text-[10px] font-bold transition-colors ${
                              on ? "border-primary bg-primary text-white" : "border-white/25"
                            }`}
                          >
                            {on ? idx + 1 : ""}
                          </span>
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: avatarColor(a.name) }}>
                            {a.name.charAt(0)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-bold">{a.name}</p>
                            <p className="truncate text-[11px] text-fg-muted">{roleOf(a.id) || "—"}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 border-t border-white/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <button type="button" className="btn-secondary px-3 py-2.5 text-xs text-fg-muted">
                템플릿으로 저장
              </button>
              <div className="flex flex-1 gap-2">
                <button type="button" onClick={() => setAddOpen(false)} className="btn-secondary flex-1 py-2.5 text-sm">
                  취소
                </button>
                <button type="button" onClick={submitAdd} disabled={!fTitle.trim() || fApprovers.length === 0} className="btn-primary flex-1 py-2.5 text-sm">
                  상신
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
