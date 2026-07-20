"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/toast";

const ME = "김은후";
const ME_ROLE = "트레이너 · 강남점";

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
const kindOf = (k: Kind) => KINDS.find((x) => x.key === k) ?? KINDS[5];

type Status = "진행 중" | "승인 완료" | "반려";
const STATUS_STYLE: Record<Status, string> = {
  "진행 중": "bg-amber-400/12 text-amber-300",
  "승인 완료": "bg-emerald-400/12 text-emerald-300",
  반려: "bg-red-500/12 text-red-400",
};

type StepStatus = "승인" | "반려" | "대기";
const STEP_STYLE: Record<StepStatus, string> = {
  승인: "bg-emerald-400/12 text-emerald-300",
  반려: "bg-red-500/12 text-red-400",
  대기: "bg-white/8 text-fg-muted",
};

type Step = {
  name: string;
  role: string;
  color: string;
  status: StepStatus;
  comment?: string;
  offset?: number; // 처리 시각 (오늘 기준 일수)
  time?: string;
};
type Comment = { id: string; author: string; text: string; offset: number; time: string };

type Doc = {
  id: string;
  kind: Kind;
  title: string;
  amount?: number;
  requester: string;
  role: string;
  offset: number; // 신청일 (오늘 기준 일수)
  time: string; // 신청 시각
  status: Status;
  content: string;
  steps: Step[];
  comments: Comment[];
  startDate?: string;
  endDate?: string;
  place?: string;
};

/* 결재선 후보 */
const APPROVERS: { name: string; role: string; color: string }[] = [
  { name: "민준", role: "점장 · 강남점", color: "#22c55e" },
  { name: "서연", role: "데스크 매니저 · 프론트", color: "#8b5cf6" },
  { name: "하늘", role: "팀장 · 트레이닝팀", color: "#f59e0b" },
  { name: "재현", role: "매니저 · 본사", color: "#ec4899" },
  { name: "유진", role: "과장 · 본사 인사팀", color: "#0ea5e9" },
];

/* ── 목 데이터 ──────────────────────────────────── */
const SEED_MINE: Doc[] = [
  {
    id: "m1",
    kind: "구매 요청",
    title: "런닝머신 벨트 교체 부품",
    amount: 320000,
    requester: ME,
    role: ME_ROLE,
    offset: -2,
    time: "09:00",
    status: "진행 중",
    content:
      "[필요 사유]\n3번 런닝머신 벨트 마모가 심해 안전 문제가 있어 교체가 필요합니다.\n\n[품목]\n- 런닝머신 구동 벨트 (정품): 1\n- 벨트 왁스 500ml: 2\n\n[금액] 320,000원 (공식 대리점 견적가)\n[구매처] 헬스케어코리아 (견적서 첨부)",
    steps: [
      { name: "민준", role: "점장 · 강남점", color: "#22c55e", status: "승인", comment: "안전 관련이라 우선 처리합니다.", offset: -2, time: "11:20" },
      { name: "유진", role: "과장 · 본사 인사팀", color: "#0ea5e9", status: "대기" },
    ],
    comments: [],
  },
  {
    id: "m2",
    kind: "비품 신청",
    title: "수건 200장 · 세제 추가 발주",
    amount: 180000,
    requester: ME,
    role: ME_ROLE,
    offset: -4,
    time: "09:00",
    status: "승인 완료",
    content:
      "[필요 사유]\n회원 증가로 수건 회전이 빨라져 추가 발주가 필요합니다.\n\n[품목]\n- 대형 수건 (40수): 200\n- 업소용 세탁 세제 10L: 3\n\n[금액] 180,000원\n[구매처] 위생나라 (영수증 첨부)",
    steps: [
      { name: "민준", role: "점장 · 강남점", color: "#22c55e", status: "승인", comment: "회전율 데이터 확인했습니다.", offset: -4, time: "10:00" },
      { name: "유진", role: "과장 · 본사 인사팀", color: "#0ea5e9", status: "승인", comment: "승인합니다.", offset: -3, time: "13:00" },
    ],
    comments: [{ id: "c1", author: "서연", text: "수건 도착하면 데스크로 알려주세요!", offset: -3, time: "14:20" }],
  },
  {
    id: "m3",
    kind: "지출결의",
    title: "외부 PT 세미나 참가비",
    amount: 150000,
    requester: ME,
    role: ME_ROLE,
    offset: -6,
    time: "10:30",
    status: "반려",
    content: "[필요 사유]\n하반기 PT 프로그램 개편을 위한 외부 세미나 참가 건입니다.\n\n[금액] 150,000원 (1인 참가비)\n[일시] 8월 3일 ~ 8월 4일",
    steps: [
      { name: "민준", role: "점장 · 강남점", color: "#22c55e", status: "승인", comment: "교육 취지는 좋습니다.", offset: -6, time: "14:00" },
      { name: "유진", role: "과장 · 본사 인사팀", color: "#0ea5e9", status: "반려", comment: "상반기 교육 예산 소진. 하반기 재신청 바랍니다.", offset: -5, time: "09:40" },
    ],
    comments: [],
  },
];

const SEED_PENDING: Doc[] = [
  {
    id: "p1",
    kind: "근무 변경",
    title: "주말 오픈 근무 교대 요청 — 7/25",
    requester: "지민",
    role: "트레이너 · 강남점",
    offset: -1,
    time: "18:10",
    status: "진행 중",
    content: "[사유]\n개인 사정으로 7/25(토) 오픈 근무를 현우 트레이너와 맞교대하고자 합니다.\n\n[변경 내용]\n- 기존: 지민 오픈 / 현우 마감\n- 변경: 현우 오픈 / 지민 마감\n\n※ 현우 트레이너 사전 동의 완료",
    steps: [{ name: ME, role: ME_ROLE, color: "#9d3bfc", status: "대기" }],
    comments: [],
  },
  {
    id: "p2",
    kind: "지출결의",
    title: "회원 이벤트 경품 구입",
    amount: 240000,
    requester: "서연",
    role: "데스크 매니저 · 프론트",
    offset: -1,
    time: "15:40",
    status: "진행 중",
    content: "[필요 사유]\n여름 회원 유치 이벤트 경품 구입 건입니다.\n\n[품목]\n- 보온 텀블러 (로고 각인): 50\n\n[금액] 240,000원 (개당 4,800원)\n[구매처] 판촉물마켓 (견적서 첨부)",
    steps: [{ name: ME, role: ME_ROLE, color: "#9d3bfc", status: "대기" }],
    comments: [{ id: "c2", author: "민준", text: "각인 시안은 본사 확인 받으셨나요?", offset: -1, time: "16:05" }],
  },
];

/* ── 유틸 ───────────────────────────────────────── */
const pad = (n: number) => String(n).padStart(2, "0");
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const fmtDate = (d: Date) => `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
const fmtTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${h < 12 ? "오전" : "오후"} ${h % 12 === 0 ? 12 : h % 12}:${pad(m)}`;
};
const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const nowHM = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const labelCls = "pb-1.5 text-[13px] font-bold";
const fieldCls =
  "w-full rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 text-[13px] outline-none focus:border-primary/50 placeholder:text-fg-muted";
const metaLabel = "text-[11px] text-fg-muted";
const metaValue = "text-[13px] font-semibold";

export function Approvals() {
  const { show } = useToast();
  const [today, setToday] = useState<Date | null>(null);
  const [tab, setTab] = useState<"내 신청" | "결재 대기">("내 신청");
  const [mine, setMine] = useState<Doc[]>(SEED_MINE);
  const [pending, setPending] = useState<Doc[]>(SEED_PENDING);
  const [detailId, setDetailId] = useState<string | null>(null);
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
  const [fApprovers, setFApprovers] = useState<string[]>([]);
  const startRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => setToday(new Date()), []);

  useEffect(() => {
    if (!addOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAddOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addOpen]);

  const detail = [...mine, ...pending].find((d) => d.id === detailId) ?? null;
  const list = tab === "내 신청" ? mine : pending;
  const myOngoing = mine.filter((d) => d.status === "진행 중").length;
  const isPending = detail ? pending.some((d) => d.id === detail.id) : false;

  const openDetail = (id: string) => {
    setDetailId((cur) => (cur === id ? null : id));
    setDraft("");
  };

  const toggleApprover = (name: string) =>
    setFApprovers((l) => (l.includes(name) ? l.filter((x) => x !== name) : [...l, name]));

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

  const submitAdd = () => {
    const t = fTitle.trim();
    if (!t || fApprovers.length === 0) return;
    idRef.current += 1;
    const amt = Number(fAmount.replace(/[^0-9]/g, ""));
    setMine((l) => [
      {
        id: `new-${idRef.current}`,
        kind: fKind,
        title: t,
        amount: kindOf(fKind).money && amt > 0 ? amt : undefined,
        requester: ME,
        role: ME_ROLE,
        offset: 0,
        time: nowHM(),
        status: "진행 중",
        content: fContent.trim() || "(내용 없음)",
        steps: fApprovers.map((n) => {
          const a = APPROVERS.find((x) => x.name === n)!;
          return { name: a.name, role: a.role, color: a.color, status: "대기" as StepStatus };
        }),
        comments: [],
        startDate: fStart || undefined,
        endDate: fEnd && fEnd >= fStart ? fEnd : undefined,
        place: kindOf(fKind).place && fPlace.trim() ? fPlace.trim() : undefined,
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

  const addComment = () => {
    const text = draft.trim();
    if (!text || !detail) return;
    idRef.current += 1;
    const c: Comment = { id: `cm-${idRef.current}`, author: ME, text, offset: 0, time: nowHM() };
    const put = (l: Doc[]) => l.map((d) => (d.id === detail.id ? { ...d, comments: [...d.comments, c] } : d));
    if (isPending) setPending(put);
    else setMine(put);
    setDraft("");
    show("댓글을 등록했습니다");
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

        {!today ? null : list.length === 0 ? (
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
                      {d.requester === ME ? "내가 요청" : `${d.requester} 요청`} · {fmtDate(addDays(today, d.offset))}
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
      {detail && today && (
        <section ref={detailRef} className="animate-page-in overflow-hidden rounded-2xl border border-white/10 bg-surface">
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
              <p className={metaValue}>
                {detail.requester} · {detail.role}
              </p>
            </div>

            {/* 신청일 */}
            <div>
              <p className={metaLabel}>신청일</p>
              <p className={`${metaValue} tabular-nums`}>
                {fmtDate(addDays(today, detail.offset))} {fmtTime(detail.time)}
              </p>
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
                {detail.steps.map((s, i) => (
                  <div key={`${s.name}-${i}`} className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5">
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
                      style={{ backgroundColor: s.color }}
                    >
                      {s.name.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold">
                        {s.name} · {s.role}
                      </p>
                      {s.comment && <p className="truncate text-[11px] italic text-fg-muted">&ldquo;{s.comment}&rdquo;</p>}
                      {s.offset !== undefined && s.time && (
                        <p className="text-[11px] text-fg-muted tabular-nums">
                          {fmtDate(addDays(today, s.offset))} {fmtTime(s.time)}
                        </p>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${STEP_STYLE[s.status]}`}>
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 댓글 */}
            <div>
              <p className={metaLabel}>댓글</p>
              {detail.comments.length === 0 ? (
                <p className="mt-1 text-[13px] text-fg-muted">아직 댓글이 없어요.</p>
              ) : (
                <div className="mt-1 space-y-1.5">
                  {detail.comments.map((c) => (
                    <div key={c.id} className="rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5">
                      <p className="text-[12px] font-bold">
                        {c.author}
                        <span className="ml-1.5 font-normal text-fg-muted tabular-nums">
                          {fmtDate(addDays(today, c.offset))} {fmtTime(c.time)}
                        </span>
                      </p>
                      <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed">{c.text}</p>
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
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) addComment();
                    }}
                    rows={3}
                    placeholder="맥락이나 추가 질문을 남겨보세요 (⌘/Ctrl+Enter 로 등록)"
                    className={`${fieldCls} resize-none pb-5`}
                  />
                  <span className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-fg-muted tabular-nums">
                    {draft.length}/2000
                  </span>
                </div>
                <button
                  type="button"
                  onClick={addComment}
                  disabled={!draft.trim()}
                  className="btn-primary shrink-0 px-3 py-2 text-xs"
                >
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
        </section>
      )}

      {/* ── 새 결재 올리기 모달 ────────────────────── */}
      {addOpen && (
        <div className="overlay-frame fixed inset-x-0 top-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setAddOpen(false)}
            className="animate-fade-in absolute inset-0 bg-black/70"
          />

          <div className="animate-page-in relative flex max-h-[88svh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3.5">
              <p className="text-lg font-bold">새 결재 올리기</p>
              <button type="button" onClick={() => setAddOpen(false)} aria-label="닫기" className="text-fg-muted">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
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
                <input
                  autoFocus
                  value={fTitle}
                  onChange={(e) => setFTitle(e.target.value)}
                  placeholder="무엇에 대한 결재인가요?"
                  className={fieldCls}
                />
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
                  <input
                    value={fPlace}
                    onChange={(e) => setFPlace(e.target.value)}
                    placeholder="예: 본사 / 잠실점"
                    className={fieldCls}
                  />
                </div>
              )}

              {/* 결재선 */}
              <div>
                <p className={labelCls}>
                  결재선 <span className="font-normal text-fg-muted">(순서대로 결재됨 · {fApprovers.length}명)</span>
                </p>
                <div className="max-h-52 divide-y divide-white/5 overflow-y-auto rounded-lg border border-white/10">
                  {APPROVERS.map((a) => {
                    const idx = fApprovers.indexOf(a.name);
                    const on = idx >= 0;
                    return (
                      <button
                        key={a.name}
                        type="button"
                        onClick={() => toggleApprover(a.name)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                      >
                        <span
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded border text-[10px] font-bold transition-colors ${
                            on ? "border-primary bg-primary text-white" : "border-white/25"
                          }`}
                        >
                          {on ? idx + 1 : ""}
                        </span>
                        <span
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: a.color }}
                        >
                          {a.name.charAt(0)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-bold">{a.name}</p>
                          <p className="truncate text-[11px] text-fg-muted">{a.role}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
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
                <button
                  type="button"
                  onClick={submitAdd}
                  disabled={!fTitle.trim() || fApprovers.length === 0}
                  className="btn-primary flex-1 py-2.5 text-sm"
                >
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
