"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/toast";
import { useNavTargetFor } from "@/components/nav-target";

/* ── 아이콘 ─────────────────────────────────────── */
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.4-3.4" />
    </svg>
  );
}
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M4 19a5 5 0 0 1 10 0" />
      <path d="M16 6.5a2.8 2.8 0 0 1 0 5.5" />
      <path d="M17 14.2a5 5 0 0 1 3 4.8" />
    </svg>
  );
}
function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="15" r="3.5" />
      <path d="m10.6 12.5 7.4-7.4M15.5 7.6l2 2M13.5 9.6l2 2" />
    </svg>
  );
}
function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 10h16M10 10v10" />
    </svg>
  );
}
function RankIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v16" />
      <path d="m8 8 4-4 4 4M8 16l4 4 4-4" />
    </svg>
  );
}
function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17Z" />
    </svg>
  );
}
function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" />
      <path d="m9 8 4 4-4 4" />
      <path d="M13 12H4" />
    </svg>
  );
}
function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 7h14M10 7V5h4v2" />
      <path d="M6.5 7 7.5 20h9L17.5 7" />
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
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6v12M6 12h12" />
    </svg>
  );
}
function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

/* ── 모델 ───────────────────────────────────────── */
type Perm = "ADMIN" | "MANAGER" | "MEMBER";
const PERMS: Perm[] = ["ADMIN", "MANAGER", "MEMBER"];
const PERM_STYLE: Record<Perm, string> = {
  ADMIN: "bg-primary/15 text-primary-bright",
  MANAGER: "bg-sky-400/12 text-sky-300",
  MEMBER: "bg-white/8 text-fg-muted",
};

type MStatus = "재직" | "비활성" | "퇴사";
const MSTATUS: MStatus[] = ["재직", "비활성", "퇴사"];

type Member = {
  id: string;
  name: string;
  email: string;
  rank: string;
  team: string;
  perm: Perm;
  status: MStatus;
  joinOffset: number; // 입사일 (오늘 기준 일수, 음수)
  phone: string;
  lastOffset: number; // 최근 접속
};

const AV = ["#9d3bfc", "#22c55e", "#0ea5e9", "#f59e0b", "#ec4899", "#14b8a6", "#8b5cf6"];
const avColor = (name: string) => {
  let h = 0;
  for (const c of name) h += c.charCodeAt(0);
  return AV[h % AV.length];
};

const SEED: Member[] = [
  { id: "u1", name: "김은후", email: "eunhoo@hifis.co.kr", rank: "트레이너", team: "트레이닝팀", perm: "ADMIN", status: "재직", joinOffset: -420, phone: "010-1234-5678", lastOffset: 0 },
  { id: "u2", name: "민준", email: "minjun@hifis.co.kr", rank: "점장", team: "강남점", perm: "ADMIN", status: "재직", joinOffset: -900, phone: "010-2345-6789", lastOffset: 0 },
  { id: "u3", name: "서연", email: "seoyeon@hifis.co.kr", rank: "매니저", team: "프론트데스크", perm: "MANAGER", status: "재직", joinOffset: -540, phone: "010-3456-7890", lastOffset: -1 },
  { id: "u4", name: "지민", email: "jimin@hifis.co.kr", rank: "트레이너", team: "트레이닝팀", perm: "MEMBER", status: "재직", joinOffset: -300, phone: "010-4567-8901", lastOffset: 0 },
  { id: "u5", name: "현우", email: "hyunwoo@hifis.co.kr", rank: "트레이너", team: "트레이닝팀", perm: "MEMBER", status: "재직", joinOffset: -210, phone: "010-5678-9012", lastOffset: -2 },
  { id: "u6", name: "하늘", email: "haneul@hifis.co.kr", rank: "팀장", team: "트레이닝팀", perm: "MANAGER", status: "재직", joinOffset: -730, phone: "010-6789-0123", lastOffset: -1 },
  { id: "u7", name: "도윤", email: "doyun@hifis.co.kr", rank: "강사", team: "GX팀", perm: "MEMBER", status: "재직", joinOffset: -150, phone: "010-7890-1234", lastOffset: -3 },
  { id: "u8", name: "예린", email: "yerin@hifis.co.kr", rank: "강사", team: "GX팀", perm: "MEMBER", status: "비활성", joinOffset: -180, phone: "010-8901-2345", lastOffset: -30 },
  { id: "u9", name: "재현", email: "jaehyun@hifis.co.kr", rank: "매니저", team: "본사", perm: "MANAGER", status: "재직", joinOffset: -1100, phone: "010-9012-3456", lastOffset: -1 },
  { id: "u10", name: "서아", email: "seoa@hifis.co.kr", rank: "리셉션", team: "프론트데스크", perm: "MEMBER", status: "재직", joinOffset: -95, phone: "010-0123-4567", lastOffset: 0 },
  { id: "u11", name: "유진", email: "yujin@hifis.co.kr", rank: "과장", team: "본사", perm: "MANAGER", status: "재직", joinOffset: -1400, phone: "010-1122-3344", lastOffset: -4 },
  { id: "u12", name: "태호", email: "taeho@hifis.co.kr", rank: "인턴", team: "강남점", perm: "MEMBER", status: "퇴사", joinOffset: -260, phone: "010-2233-4455", lastOffset: -60 },
];

type InviteKey = { id: string; code: string; team: string; perm: Perm; issuer: string; expOffset: number; used: boolean };
const SEED_KEYS: InviteKey[] = [
  { id: "k1", code: "HIFIS-8KQ2-4M7X", team: "트레이닝팀", perm: "MEMBER", issuer: "민준", expOffset: 5, used: false },
  { id: "k2", code: "HIFIS-3PL9-7ZC1", team: "프론트데스크", perm: "MEMBER", issuer: "민준", expOffset: 12, used: false },
  { id: "k3", code: "HIFIS-QW51-2NB8", team: "GX팀", perm: "MEMBER", issuer: "재현", expOffset: -2, used: true },
];

/* ── 유틸 ───────────────────────────────────────── */
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const fmtDate = (d: Date) => `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
const rel = (n: number) => (n === 0 ? "오늘" : n === -1 ? "어제" : `${-n}일 전`);

const labelCls = "pb-1.5 text-[13px] font-bold";
const fieldCls =
  "w-full rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 text-[13px] outline-none focus:border-primary/50 placeholder:text-fg-muted";

export function Staff() {
  const { show } = useToast();
  const [today, setToday] = useState<Date | null>(null);
  const [members, setMembers] = useState<Member[]>(SEED);
  const [keys, setKeys] = useState<InviteKey[]>(SEED_KEYS);

  // 헤더 검색에서 넘어온 직원 — 초기 state로만 사용
  const nav = useNavTargetFor("/staff");
  const navMember = nav?.q ? SEED.find((m) => m.name === nav.q) : undefined;

  const [tab, setTab] = useState<"구성원" | "초대키" | "팀" | "직급">("구성원");
  const [view, setView] = useState<"기본" | "상세">("기본");
  const [query, setQuery] = useState(nav?.q ?? "");
  const [permFilter, setPermFilter] = useState<Perm | "모든 권한">("모든 권한");
  const [permOpen, setPermOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MStatus>(navMember?.status ?? "재직");
  const [permMenuFor, setPermMenuFor] = useState<string | null>(null);

  // 편집 모달
  const [editing, setEditing] = useState<Member | null>(null);
  const idRef = useRef(0);

  useEffect(() => setToday(new Date()), []);

  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setEditing(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing]);

  const teams = [...new Set(members.map((m) => m.team))];
  const ranks = [...new Set(members.map((m) => m.rank))];
  const active = members.filter((m) => m.status === "재직").length;
  const unusedKeys = keys.filter((k) => !k.used).length;

  const q = query.trim();
  const shown = members.filter(
    (m) =>
      m.status === statusFilter &&
      (permFilter === "모든 권한" || m.perm === permFilter) &&
      (q === "" || m.name.includes(q) || m.email.includes(q) || m.team.includes(q)),
  );

  const countBy = (s: MStatus) => members.filter((m) => m.status === s).length;

  /* 액션 */
  const changePerm = (id: string, perm: Perm) => {
    const m = members.find((x) => x.id === id);
    setMembers((l) => l.map((x) => (x.id === id ? { ...x, perm } : x)));
    setPermMenuFor(null);
    if (m) show(`${m.name} 권한을 ${perm}로 변경했습니다`);
  };
  const retire = (m: Member) => {
    setMembers((l) => l.map((x) => (x.id === m.id ? { ...x, status: "퇴사" } : x)));
    show(`${m.name} 퇴사 처리했습니다`, "cancel");
  };
  const removeMember = (m: Member) => {
    setMembers((l) => l.filter((x) => x.id !== m.id));
    show(`${m.name} 계정을 삭제했습니다`, "cancel");
  };
  const submitEdit = () => {
    if (!editing) return;
    const n = editing.name.trim();
    if (!n) return;
    setMembers((l) => l.map((x) => (x.id === editing.id ? editing : x)));
    setEditing(null);
    show("구성원 정보를 저장했습니다");
  };
  const issueKey = () => {
    idRef.current += 1;
    const rand = (n: number) =>
      Array.from({ length: n }, (_, i) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[(idRef.current * 7 + i * 13) % 32]).join("");
    setKeys((l) => [
      { id: `nk-${idRef.current}`, code: `HIFIS-${rand(4)}-${rand(4)}`, team: "트레이닝팀", perm: "MEMBER", issuer: "김은후", expOffset: 14, used: false },
      ...l,
    ]);
    show("초대키를 발급했습니다");
  };
  const copyKey = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    show("초대키를 복사했습니다");
  };

  const TABS = [
    { key: "구성원" as const, Icon: UsersIcon, n: members.length },
    { key: "초대키" as const, Icon: KeyIcon, n: unusedKeys },
    { key: "팀" as const, Icon: GridIcon, n: teams.length },
    { key: "직급" as const, Icon: RankIcon, n: ranks.length },
  ];

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      {/* 제목 + 요약 */}
      <div>
        <p className="text-xs font-semibold text-fg-muted">관리</p>
        <h1 className="text-xl font-bold">직원</h1>
        <p className="mt-1.5 text-[13px] text-fg-muted">
          <b className="text-fg">구성원 {members.length}</b> · 활성 {active} · 팀 {teams.length} · 직급 {ranks.length} · 미사용 초대키{" "}
          {unusedKeys}
        </p>
      </div>

      {/* 탭 */}
      <div className="flex gap-4 border-b border-white/10">
        {TABS.map(({ key, Icon, n }) => {
          const on = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 pb-2 text-[13px] transition-colors ${
                on ? "border-primary font-bold text-fg" : "border-transparent text-fg-muted"
              }`}
            >
              <Icon className={`h-4 w-4 ${on ? "text-primary-bright" : ""}`} />
              {key}
              <span className="text-fg-muted">{n}</span>
            </button>
          );
        })}
      </div>

      {/* ── 구성원 ─────────────────────────────────── */}
      {tab === "구성원" && (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
          <div className="flex items-baseline gap-2 px-4 pb-2.5 pt-3.5">
            <h2 className="text-sm font-bold">구성원 목록</h2>
            <span className="text-xs text-fg-muted">{shown.length}</span>
          </div>

          {/* 보기 전환 + 내보내기 */}
          <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
            <div className="flex overflow-hidden rounded-lg border border-white/10">
              {(["기본", "상세"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                    view === v ? "bg-primary/15 text-primary-bright" : "text-fg-muted"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* 검색 + 필터 */}
          <div className="space-y-2 border-t border-white/8 px-4 py-3">
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface-2 px-3">
              <SearchIcon className="h-4 w-4 shrink-0 text-fg-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="이름·이메일·팀 검색"
                className="min-w-0 flex-1 bg-transparent py-2 text-[13px] outline-none placeholder:text-fg-muted"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* 권한 필터 */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPermOpen((o) => !o)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                    permFilter !== "모든 권한"
                      ? "border-primary/50 bg-primary/10 font-semibold text-primary-bright"
                      : "border-white/10 text-fg-muted"
                  }`}
                >
                  {permFilter}
                  <ChevronDownIcon className="h-3.5 w-3.5" />
                </button>
                {permOpen && (
                  <>
                    <button type="button" aria-label="닫기" onClick={() => setPermOpen(false)} className="fixed inset-0 z-10" />
                    <div className="absolute left-0 top-full z-20 mt-1.5 w-32 overflow-hidden rounded-lg border border-white/10 bg-surface-2 shadow-xl">
                      {(["모든 권한", ...PERMS] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setPermFilter(p);
                            setPermOpen(false);
                          }}
                          className={`block w-full px-3 py-2 text-left text-xs transition-colors ${
                            permFilter === p ? "font-bold text-primary-bright" : "text-fg"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* 재직 상태 */}
              <div className="flex overflow-hidden rounded-lg border border-white/10">
                {MSTATUS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      statusFilter === s ? "bg-primary/15 text-primary-bright" : "text-fg-muted"
                    }`}
                  >
                    {s}
                    <span className="text-fg-muted">{countBy(s)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 목록 */}
          {!today ? null : shown.length === 0 ? (
            <p className="border-t border-white/8 px-4 py-10 text-center text-sm text-fg-muted">해당하는 구성원이 없어요.</p>
          ) : (
            <div className="divide-y divide-white/8 border-t border-white/8">
              {shown.map((m) => (
                <div key={m.id} className="px-4 py-3.5">
                  {/* 아바타 + 이름 + 상태 */}
                  <div className="flex items-center gap-3">
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-base font-bold text-white"
                      style={{ backgroundColor: avColor(m.name) }}
                    >
                      {m.name.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{m.name}</p>
                      <p className="truncate text-xs text-fg-muted">{m.email}</p>
                    </div>
                    <span
                      className={`flex shrink-0 items-center gap-1 text-[11px] font-semibold ${
                        m.status === "재직" ? "text-emerald-300" : m.status === "비활성" ? "text-amber-300" : "text-fg-muted"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          m.status === "재직" ? "bg-emerald-400" : m.status === "비활성" ? "bg-amber-400" : "bg-slate-500"
                        }`}
                      />
                      {m.status === "재직" ? "Active" : m.status}
                    </span>
                  </div>

                  {/* 직급 · 팀 */}
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/8 pt-3">
                    <div>
                      <p className="text-[11px] text-fg-muted">직급</p>
                      <p className="text-[13px] font-bold">{m.rank}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-fg-muted">팀</p>
                      <p className="text-[13px] font-bold">{m.team}</p>
                    </div>
                  </div>

                  {/* 상세 보기 추가 정보 */}
                  {view === "상세" && (
                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[11px] text-fg-muted">입사일</p>
                        <p className="text-[13px] font-bold tabular-nums">{fmtDate(addDays(today, m.joinOffset))}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-fg-muted">연락처</p>
                        <p className="text-[13px] font-bold tabular-nums">{m.phone}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-fg-muted">최근 접속</p>
                        <p className="text-[13px] font-bold">{rel(m.lastOffset)}</p>
                      </div>
                    </div>
                  )}

                  {/* 권한 + 액션 */}
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <div className="relative">
                      <p className="pb-1 text-[11px] text-fg-muted">권한</p>
                      <button
                        type="button"
                        onClick={() => setPermMenuFor((cur) => (cur === m.id ? null : m.id))}
                        className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${PERM_STYLE[m.perm]}`}
                      >
                        {m.perm}
                        <ChevronDownIcon className="h-3.5 w-3.5" />
                      </button>
                      {permMenuFor === m.id && (
                        <>
                          <button type="button" aria-label="닫기" onClick={() => setPermMenuFor(null)} className="fixed inset-0 z-10" />
                          <div className="absolute left-0 top-full z-20 mt-1 w-28 overflow-hidden rounded-lg border border-white/10 bg-surface-2 shadow-xl">
                            {PERMS.map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => changePerm(m.id, p)}
                                className={`block w-full px-3 py-2 text-left text-xs transition-colors ${
                                  m.perm === p ? "font-bold text-primary-bright" : "text-fg"
                                }`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center rounded-lg border border-white/10">
                      <button type="button" aria-label="편집" onClick={() => setEditing(m)} className="grid h-8 w-8 place-items-center text-fg-muted">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button type="button" aria-label="퇴사 처리" onClick={() => retire(m)} className="grid h-8 w-8 place-items-center text-amber-300">
                        <LogoutIcon className="h-4 w-4" />
                      </button>
                      <button type="button" aria-label="삭제" onClick={() => removeMember(m)} className="grid h-8 w-8 place-items-center text-red-400">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── 초대키 ─────────────────────────────────── */}
      {tab === "초대키" && (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
          <div className="flex items-center justify-between px-4 pb-2.5 pt-3.5">
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-bold">초대키</h2>
              <span className="text-xs text-fg-muted">미사용 {unusedKeys}</span>
            </div>
            <button type="button" onClick={issueKey} className="btn-primary flex items-center gap-1 px-2.5 py-1.5 text-xs">
              <PlusIcon className="h-3.5 w-3.5" />
              발급
            </button>
          </div>

          {today && (
            <div className="divide-y divide-white/8 border-t border-white/8">
              {keys.map((k) => {
                const expired = k.expOffset < 0;
                return (
                  <div key={k.id} className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate font-mono text-[13px] font-bold tracking-wide">{k.code}</span>
                      <span
                        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                          k.used ? "bg-white/8 text-fg-muted" : expired ? "bg-red-500/12 text-red-400" : "bg-emerald-400/12 text-emerald-300"
                        }`}
                      >
                        {k.used ? "사용됨" : expired ? "만료" : "미사용"}
                      </span>
                      <button
                        type="button"
                        aria-label="복사"
                        onClick={() => copyKey(k.code)}
                        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 text-fg-muted"
                      >
                        <CopyIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-fg-muted">
                      {k.team} · {k.perm} · {k.issuer} 발급 · 만료 {fmtDate(addDays(today, k.expOffset))}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── 팀 ─────────────────────────────────────── */}
      {tab === "팀" && (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
          <div className="flex items-baseline gap-2 px-4 pb-2.5 pt-3.5">
            <h2 className="text-sm font-bold">팀</h2>
            <span className="text-xs text-fg-muted">{teams.length}</span>
          </div>
          <div className="divide-y divide-white/8 border-t border-white/8">
            {teams.map((t) => {
              const list = members.filter((m) => m.team === t);
              return (
                <div key={t} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary-bright">
                    <GridIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold">{t}</p>
                    <p className="truncate text-[11px] text-fg-muted">{list.map((m) => m.name).join(", ")}</p>
                  </div>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-fg-muted">{list.length}명</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 직급 ───────────────────────────────────── */}
      {tab === "직급" && (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
          <div className="flex items-baseline gap-2 px-4 pb-2.5 pt-3.5">
            <h2 className="text-sm font-bold">직급</h2>
            <span className="text-xs text-fg-muted">{ranks.length}</span>
          </div>
          <div className="divide-y divide-white/8 border-t border-white/8">
            {ranks.map((r) => {
              const list = members.filter((m) => m.rank === r);
              return (
                <div key={r} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-400/12 text-sky-300">
                    <RankIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold">{r}</p>
                    <p className="truncate text-[11px] text-fg-muted">{list.map((m) => m.name).join(", ")}</p>
                  </div>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-fg-muted">{list.length}명</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 구성원 편집 모달 ───────────────────────── */}
      {editing && (
        <div className="overlay-frame fixed inset-x-0 top-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" aria-label="닫기" onClick={() => setEditing(null)} className="animate-fade-in absolute inset-0 bg-black/70" />
          <div className="animate-page-in relative flex max-h-[88svh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3.5">
              <p className="text-lg font-bold">구성원 편집</p>
              <button type="button" onClick={() => setEditing(null)} aria-label="닫기" className="text-fg-muted">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4">
              <div>
                <p className={labelCls}>이름</p>
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={fieldCls} />
              </div>
              <div>
                <p className={labelCls}>이메일</p>
                <input value={editing.email} readOnly className={`${fieldCls} text-fg-muted`} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="min-w-0">
                  <p className={labelCls}>직급</p>
                  <input value={editing.rank} onChange={(e) => setEditing({ ...editing, rank: e.target.value })} className={fieldCls} />
                </div>
                <div className="min-w-0">
                  <p className={labelCls}>팀</p>
                  <input value={editing.team} onChange={(e) => setEditing({ ...editing, team: e.target.value })} className={fieldCls} />
                </div>
              </div>
              <div>
                <p className={labelCls}>연락처</p>
                <input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} className={fieldCls} />
              </div>
              <div>
                <p className={labelCls}>권한</p>
                <div className="grid grid-cols-3 gap-2">
                  {PERMS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEditing({ ...editing, perm: p })}
                      className={`rounded-lg border py-2 text-xs font-bold transition-colors ${
                        editing.perm === p ? "border-primary/60 bg-primary/12 text-primary-bright" : "border-white/10 text-fg-muted"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className={labelCls}>재직 상태</p>
                <div className="grid grid-cols-3 gap-2">
                  {MSTATUS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setEditing({ ...editing, status: s })}
                      className={`rounded-lg border py-2 text-xs font-bold transition-colors ${
                        editing.status === s ? "border-primary/60 bg-primary/12 text-primary-bright" : "border-white/10 text-fg-muted"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 gap-2 border-t border-white/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <button type="button" onClick={() => setEditing(null)} className="btn-secondary flex-1 py-2.5 text-sm">
                취소
              </button>
              <button type="button" onClick={submitEdit} disabled={!editing.name.trim()} className="btn-primary flex-[2] py-2.5 text-sm">
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
