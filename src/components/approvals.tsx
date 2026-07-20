"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/toast";

const ME = "김은후";

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
function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 6-6 6 6 6" />
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
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
function DocIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20Z" />
      <path d="M14 3.5V8h4" />
      <path d="m9.5 14 1.8 1.8L15 12" />
    </svg>
  );
}

/* ── 종류 · 상태 ────────────────────────────────── */
type Kind = "지출결의" | "구매 요청" | "비품 신청" | "외근·출장" | "근무 변경" | "기타 품의";
const KINDS: { key: Kind; emoji: string; tile: string; money: boolean }[] = [
  { key: "지출결의", emoji: "💳", tile: "bg-amber-400/12 text-amber-300", money: true },
  { key: "구매 요청", emoji: "🛒", tile: "bg-rose-400/12 text-rose-300", money: true },
  { key: "비품 신청", emoji: "📦", tile: "bg-sky-400/12 text-sky-300", money: true },
  { key: "외근·출장", emoji: "✈️", tile: "bg-cyan-400/12 text-cyan-300", money: false },
  { key: "근무 변경", emoji: "🕐", tile: "bg-violet-400/12 text-violet-300", money: false },
  { key: "기타 품의", emoji: "📄", tile: "bg-slate-400/12 text-slate-300", money: false },
];
const kindOf = (k: Kind) => KINDS.find((x) => x.key === k) ?? KINDS[5];

type Status = "진행 중" | "승인 완료" | "반려";
const STATUS_STYLE: Record<Status, string> = {
  "진행 중": "bg-amber-400/12 text-amber-300",
  "승인 완료": "bg-emerald-400/12 text-emerald-300",
  반려: "bg-red-500/12 text-red-400",
};

type Doc = {
  id: string;
  kind: Kind;
  title: string;
  amount?: number;
  requester: string;
  role?: string;
  offset: number; // 오늘 기준 일수
  status: Status;
  content: string;
  approver: string;
};

/* ── 목 데이터 ──────────────────────────────────── */
const SEED_MINE: Doc[] = [
  {
    id: "m1",
    kind: "구매 요청",
    title: "런닝머신 벨트 교체 부품",
    amount: 320000,
    requester: ME,
    offset: -2,
    status: "진행 중",
    content: "3번 런닝머신 벨트 마모가 심해 교체가 필요합니다. 공식 대리점 견적 첨부.",
    approver: "민준 점장",
  },
  {
    id: "m2",
    kind: "비품 신청",
    title: "수건 200장 · 세제 추가 발주",
    amount: 180000,
    requester: ME,
    offset: -4,
    status: "승인 완료",
    content: "회원 증가로 수건 회전이 빨라져 추가 발주 요청드립니다.",
    approver: "민준 점장",
  },
  {
    id: "m3",
    kind: "지출결의",
    title: "외부 PT 세미나 참가비",
    amount: 150000,
    requester: ME,
    offset: -6,
    status: "반려",
    content: "상반기 교육 예산 소진으로 하반기 재신청 예정입니다.",
    approver: "본사 인사팀",
  },
];

const SEED_PENDING: Doc[] = [
  {
    id: "p1",
    kind: "근무 변경",
    title: "주말 오픈 근무 교대 요청 — 7/25",
    requester: "지민",
    role: "트레이너",
    offset: -1,
    status: "진행 중",
    content: "개인 사정으로 현우 트레이너와 오픈 근무를 맞교대하고자 합니다.",
    approver: ME,
  },
  {
    id: "p2",
    kind: "지출결의",
    title: "회원 이벤트 경품 구입",
    amount: 240000,
    requester: "서연",
    role: "데스크 매니저",
    offset: -1,
    status: "진행 중",
    content: "여름 회원 유치 이벤트 경품(텀블러 50개) 구입 건입니다.",
    approver: ME,
  },
];

/* ── 유틸 ───────────────────────────────────────── */
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const fmtDate = (d: Date) => `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

const labelCls = "pb-1.5 text-[13px] font-bold";
const fieldCls =
  "w-full rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 text-[13px] outline-none focus:border-primary/50 placeholder:text-fg-muted";

export function Approvals() {
  const { show } = useToast();
  const [today, setToday] = useState<Date | null>(null);
  const [tab, setTab] = useState<"내 신청" | "결재 대기">("내 신청");
  const [mine, setMine] = useState<Doc[]>(SEED_MINE);
  const [pending, setPending] = useState<Doc[]>(SEED_PENDING);
  const [detailId, setDetailId] = useState<string | null>(null);

  // 새 결재 시트
  const [addOpen, setAddOpen] = useState(false);
  const [fKind, setFKind] = useState<Kind>("구매 요청");
  const [fTitle, setFTitle] = useState("");
  const [fAmount, setFAmount] = useState("");
  const [fContent, setFContent] = useState("");
  const [fApprover, setFApprover] = useState("민준 점장");
  const idRef = useRef(0);

  useEffect(() => setToday(new Date()), []);

  useEffect(() => {
    if (!addOpen && !detailId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (addOpen) setAddOpen(false);
      else setDetailId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addOpen, detailId]);

  const detail = [...mine, ...pending].find((d) => d.id === detailId) ?? null;
  const list = tab === "내 신청" ? mine : pending;
  const myOngoing = mine.filter((d) => d.status === "진행 중").length;

  const openAdd = () => {
    setFKind("구매 요청");
    setFTitle("");
    setFAmount("");
    setFContent("");
    setFApprover("민준 점장");
    setAddOpen(true);
  };

  const submitAdd = () => {
    const t = fTitle.trim();
    if (!t) return;
    idRef.current += 1;
    const amt = Number(fAmount.replace(/[^0-9]/g, ""));
    setMine((l) => [
      {
        id: `new-${idRef.current}`,
        kind: fKind,
        title: t,
        amount: kindOf(fKind).money && amt > 0 ? amt : undefined,
        requester: ME,
        offset: 0,
        status: "진행 중",
        content: fContent.trim() || "(내용 없음)",
        approver: fApprover,
      },
      ...l,
    ]);
    setAddOpen(false);
    setTab("내 신청");
    show(`${fKind} 결재를 상신했습니다`);
  };

  const decide = (id: string, ok: boolean) => {
    const doc = pending.find((d) => d.id === id);
    setPending((l) => l.filter((d) => d.id !== id));
    setDetailId(null);
    if (doc) show(`${doc.requester}님의 ${doc.kind} ${ok ? "승인했습니다" : "반려했습니다"}`, ok ? "done" : "cancel");
  };

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      {/* 제목 */}
      <div>
        <p className="text-xs font-semibold text-fg-muted">업무</p>
        <h1 className="text-xl font-bold">전자결재</h1>
      </div>

      {/* 새로고침 · 탭 · 새 결재 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="새로고침"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-fg-muted"
        >
          <RefreshIcon className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 flex-1 overflow-hidden rounded-lg border border-white/10">
          {(["내 신청", "결재 대기"] as const).map((t) => {
            const on = tab === t;
            const n = t === "내 신청" ? myOngoing : pending.length;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
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

        {!today ? null : list.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-fg-muted">
            {tab === "내 신청" ? "신청한 결재가 없어요." : "결재할 문서가 없어요."}
          </p>
        ) : (
          <div className="divide-y divide-white/5">
            {list.map((d) => {
              const k = kindOf(d.kind);
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDetailId(d.id)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left"
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
                      {d.requester === ME ? "내가 요청" : `${d.requester} 요청`} · {fmtDate(addDays(today, d.offset))}
                    </p>
                  </div>
                  <ChevronRightIcon className="mt-3 h-4 w-4 shrink-0 text-fg-muted" />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── 상세 패널 ─────────────────────────────── */}
      <div
        role="dialog"
        aria-label="결재 상세"
        aria-hidden={!detail}
        className={`fixed inset-0 z-[70] flex flex-col bg-bg transition-transform duration-300 ease-out ${
          detail ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <header className="relative flex h-14 shrink-0 items-center border-b border-white/10 bg-surface/70 px-1.5 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setDetailId(null)}
            aria-label="뒤로"
            className="grid h-10 w-10 place-items-center text-fg-muted transition hover:text-fg"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold">결재 상세</h1>
        </header>

        {detail && today && (
          <>
            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
              {/* 헤더 카드 */}
              <div className="rounded-2xl border border-white/10 bg-surface p-4">
                <div className="flex items-start gap-3">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg text-xl ${kindOf(detail.kind).tile}`}>
                    {kindOf(detail.kind).emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-bold">{detail.kind}</span>
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${STATUS_STYLE[detail.status]}`}>
                        {detail.status}
                      </span>
                    </div>
                    <p className="mt-1 text-base font-bold leading-snug">{detail.title}</p>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 border-t border-white/8 pt-3 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-fg-muted">신청자</span>
                    <span className="font-semibold">
                      {detail.requester}
                      {detail.role ? ` · ${detail.role}` : ""}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fg-muted">신청일</span>
                    <span className="font-semibold tabular-nums">{fmtDate(addDays(today, detail.offset))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-fg-muted">결재자</span>
                    <span className="font-semibold">{detail.approver}</span>
                  </div>
                  {detail.amount !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-fg-muted">금액</span>
                      <span className="font-bold text-primary-bright tabular-nums">{won(detail.amount)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 내용 */}
              <div className="rounded-2xl border border-white/10 bg-surface p-4">
                <p className="pb-1.5 text-[13px] font-bold">내용</p>
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-fg-muted">{detail.content}</p>
              </div>
            </div>

            {/* 결재 대기 문서면 승인/반려 */}
            {pending.some((d) => d.id === detail.id) && (
              <div className="flex shrink-0 gap-2 border-t border-white/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                <button type="button" onClick={() => decide(detail.id, false)} className="btn-danger flex-1 py-2.5 text-sm">
                  반려
                </button>
                <button type="button" onClick={() => decide(detail.id, true)} className="btn-primary flex-[2] py-2.5 text-sm">
                  승인
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── 새 결재 바텀시트 ──────────────────────── */}
      {addOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setAddOpen(false)}
            className="animate-fade-in absolute inset-0 bg-black/65"
          />

          <div className="animate-sheet-up relative flex max-h-[88svh] w-full max-w-md flex-col rounded-t-2xl border-t border-white/10 bg-surface">
            <div className="flex shrink-0 justify-center pt-2.5">
              <span className="h-1 w-10 rounded-full bg-white/20" />
            </div>

            <div className="flex shrink-0 items-center gap-3 px-4 pb-3 pt-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary-bright">
                <DocIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold">새 결재</p>
                <p className="text-xs text-fg-muted">결재 문서를 작성해 상신하세요</p>
              </div>
              <button type="button" onClick={() => setAddOpen(false)} aria-label="닫기" className="shrink-0 text-fg-muted">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
              {/* 종류 */}
              <div>
                <p className={labelCls}>종류</p>
                <div className="flex flex-wrap gap-1.5">
                  {KINDS.map((k) => (
                    <button
                      key={k.key}
                      type="button"
                      onClick={() => setFKind(k.key)}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                        fKind === k.key
                          ? "border-primary/60 bg-primary/12 font-semibold text-primary-bright"
                          : "border-white/10 text-fg-muted"
                      }`}
                    >
                      <span className="text-[13px] leading-none">{k.emoji}</span>
                      {k.key}
                    </button>
                  ))}
                </div>
              </div>

              {/* 제목 */}
              <div>
                <p className={labelCls}>제목</p>
                <input
                  autoFocus
                  value={fTitle}
                  onChange={(e) => setFTitle(e.target.value)}
                  placeholder="무엇에 대한 결재인가요?"
                  className={fieldCls}
                />
              </div>

              {/* 금액 (해당 종류만) */}
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

              {/* 결재자 */}
              <div>
                <p className={labelCls}>결재자</p>
                <div className="flex flex-wrap gap-1.5">
                  {["민준 점장", "본사 인사팀", "본사 재무팀"].map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setFApprover(a)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                        fApprover === a
                          ? "border-primary/60 bg-primary/12 font-semibold text-primary-bright"
                          : "border-white/10 text-fg-muted"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

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
            </div>

            <div className="flex shrink-0 gap-2 border-t border-white/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <button type="button" onClick={() => setAddOpen(false)} className="btn-secondary flex-1 py-2.5 text-sm">
                취소
              </button>
              <button type="button" onClick={submitAdd} disabled={!fTitle.trim()} className="btn-primary flex-[2] py-2.5 text-sm">
                상신하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
