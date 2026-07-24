"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useNavTargetFor } from "@/hooks/nav-target";
import { useAuth } from "@/providers/auth";
import {
  createInviteKey,
  deleteEmployee,
  deleteInviteKey,
  listEmployees,
  listInviteKeys,
  updateEmployee,
  type EmployeeLite,
  type EmployeeStatus,
  type InviteKeyDTO,
  type InviteStatus,
  type Rank,
  type Role,
} from "@/lib/api/hifis";

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
type Perm = Role;
const PERMS: Perm[] = ["ADMIN", "MANAGER", "MEMBER"];
const PERM_STYLE: Record<Perm, string> = {
  ADMIN: "bg-primary/15 text-primary-bright",
  MANAGER: "bg-sky-400/12 text-sky-300",
  MEMBER: "bg-white/8 text-fg-muted",
};

const RANKS: Rank[] = ["TRAINER", "FC", "TEAM_LEAD", "STORE_MANAGER", "DEVELOPER", "CEO"];
const RANK_KO: Record<Rank, string> = {
  TRAINER: "트레이너",
  FC: "FC",
  TEAM_LEAD: "팀장",
  STORE_MANAGER: "점장",
  DEVELOPER: "개발자",
  CEO: "대표",
};
const rankKo = (r: Rank) => RANK_KO[r] ?? r;

type MStatus = "재직" | "비활성" | "퇴사";
const MSTATUS: MStatus[] = ["재직", "비활성", "퇴사"];
const STATUS_TO_KO: Record<EmployeeStatus, MStatus> = { ACTIVE: "재직", INACTIVE: "비활성", RESIGNED: "퇴사" };
const KO_TO_STATUS: Record<MStatus, EmployeeStatus> = { 재직: "ACTIVE", 비활성: "INACTIVE", 퇴사: "RESIGNED" };

type Member = {
  id: string;
  name: string;
  email: string;
  rank: Rank;
  team: string;
  perm: Perm;
  status: MStatus;
  joinedAt?: string;
  phone: string;
  lastActiveAt?: string | null;
};
type InviteKey = { id: string; code: string; team: string; perm: Perm; rank: Rank; status: InviteStatus; issuedById: string; expiresAt: string };

const AV = ["#9d3bfc", "#22c55e", "#0ea5e9", "#f59e0b", "#ec4899", "#14b8a6", "#8b5cf6"];
const avColor = (name: string) => {
  let h = 0;
  for (const c of name) h += c.charCodeAt(0);
  return AV[h % AV.length];
};

function toMember(e: EmployeeLite): Member {
  return {
    id: e.id,
    name: e.name,
    email: e.email,
    rank: (e.rank as Rank) ?? "TRAINER",
    team: e.team ?? "",
    perm: e.role,
    status: STATUS_TO_KO[e.status as EmployeeStatus] ?? "재직",
    joinedAt: e.joinedAt,
    phone: e.phone ?? "",
    lastActiveAt: e.lastActiveAt ?? null,
  };
}
function toKey(k: InviteKeyDTO): InviteKey {
  return { id: k.id, code: k.code, team: k.team ?? "", perm: k.role, rank: k.rank, status: k.status, issuedById: k.issuedById, expiresAt: k.expiresAt };
}

/* ── 유틸 ───────────────────────────────────────── */
const fmtDate = (iso?: string | null) => {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
};

const labelCls = "pb-1.5 text-[13px] font-bold";
const fieldCls =
  "w-full rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 text-[13px] outline-none focus:border-primary/50 placeholder:text-fg-muted";

export function Staff() {
  const { show } = useToast();
  const { user } = useAuth();
  const canManage = user?.role === "ADMIN" || user?.role === "MANAGER";

  const [members, setMembers] = useState<Member[]>([]);
  const [keys, setKeys] = useState<InviteKey[]>([]);
  const [loaded, setLoaded] = useState(false);

  const nav = useNavTargetFor("/staff");
  const [tab, setTab] = useState<"구성원" | "초대키" | "팀" | "직급">("구성원");
  const [view, setView] = useState<"기본" | "상세">("기본");
  const [query, setQuery] = useState(nav?.q ?? "");
  const [permFilter, setPermFilter] = useState<Perm | "모든 권한">("모든 권한");
  const [permOpen, setPermOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MStatus>("재직");
  const [permMenuFor, setPermMenuFor] = useState<string | null>(null);

  // 편집 모달
  const [editing, setEditing] = useState<Member | null>(null);

  // 초대키 발급 모달
  const [issueOpen, setIssueOpen] = useState(false);
  const [iRole, setIRole] = useState<Perm>("MEMBER");
  const [iRank, setIRank] = useState<Rank>("TRAINER");
  const [iTeam, setITeam] = useState("");
  const [iDays, setIDays] = useState("14");

  const load = useCallback(() => {
    listEmployees()
      .then((es) => {
        setMembers(es.map(toMember));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    if (canManage) listInviteKeys().then((ks) => setKeys(ks.map(toKey))).catch(() => {});
  }, [canManage]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!editing && !issueOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (issueOpen) setIssueOpen(false);
      else setEditing(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, issueOpen]);

  const teams = [...new Set(members.map((m) => m.team || "미지정"))];
  const ranks = [...new Set(members.map((m) => m.rank))];
  const active = members.filter((m) => m.status === "재직").length;
  const unusedKeys = keys.filter((k) => k.status === "UNUSED").length;
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "관리자";

  const q = query.trim();
  const shown = members.filter(
    (m) =>
      m.status === statusFilter &&
      (permFilter === "모든 권한" || m.perm === permFilter) &&
      (q === "" || m.name.includes(q) || m.email.includes(q) || m.team.includes(q)),
  );

  const countBy = (s: MStatus) => members.filter((m) => m.status === s).length;

  /* 액션 (전부 canManage 게이트 뒤에서만 호출됨) */
  const changePerm = async (m: Member, perm: Perm) => {
    setPermMenuFor(null);
    try {
      await updateEmployee(m.id, { role: perm });
      setMembers((l) => l.map((x) => (x.id === m.id ? { ...x, perm } : x)));
      show(`${m.name} 권한을 ${perm}로 변경했습니다`);
    } catch {
      show("권한 변경에 실패했어요", "cancel");
    }
  };
  const retire = async (m: Member) => {
    try {
      await updateEmployee(m.id, { status: "RESIGNED" });
      setMembers((l) => l.map((x) => (x.id === m.id ? { ...x, status: "퇴사" } : x)));
      show(`${m.name} 퇴사 처리했습니다`, "cancel");
    } catch {
      show("퇴사 처리에 실패했어요", "cancel");
    }
  };
  const removeMember = async (m: Member) => {
    try {
      await deleteEmployee(m.id);
      setMembers((l) => l.filter((x) => x.id !== m.id));
      show(`${m.name} 계정을 삭제했습니다`, "cancel");
    } catch {
      show("삭제에 실패했어요", "cancel");
    }
  };
  const submitEdit = async () => {
    if (!editing) return;
    const e = editing;
    try {
      await updateEmployee(e.id, {
        rank: e.rank,
        role: e.perm,
        status: KO_TO_STATUS[e.status],
        team: e.team.trim() || undefined,
        phone: e.phone.trim() || undefined,
      });
      setMembers((l) => l.map((x) => (x.id === e.id ? e : x)));
      setEditing(null);
      show("구성원 정보를 저장했습니다");
    } catch {
      show("저장에 실패했어요", "cancel");
    }
  };

  const openIssue = () => {
    setIRole("MEMBER");
    setIRank("TRAINER");
    setITeam("");
    setIDays("14");
    setIssueOpen(true);
  };
  const submitIssue = async () => {
    if (!user) return;
    const days = Math.max(1, Number(iDays) || 14);
    const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
    try {
      const created = await createInviteKey({ branchId: user.branchId, role: iRole, rank: iRank, team: iTeam.trim() || undefined, expiresAt });
      setKeys((l) => [toKey(created), ...l]);
      setIssueOpen(false);
      show("초대키를 발급했습니다");
    } catch {
      show("초대키 발급에 실패했어요", "cancel");
    }
  };
  const revokeKey = async (k: InviteKey) => {
    try {
      await deleteInviteKey(k.id);
      setKeys((l) => l.filter((x) => x.id !== k.id));
      show("초대키를 삭제했습니다", "cancel");
    } catch {
      show("삭제에 실패했어요", "cancel");
    }
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
        <h1 className="text-xl font-bold">직원</h1>
        <p className="mt-1.5 text-[13px] text-fg-muted">
          <b className="text-fg">구성원 {members.length}</b> · 활성 {active} · 팀 {teams.length} · 직급 {ranks.length}
          {canManage && <> · 미사용 초대키 {unusedKeys}</>}
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

          {/* 보기 전환 */}
          <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
            <div className="flex overflow-hidden rounded-lg border border-white/10">
              {(["기본", "상세"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${view === v ? "bg-primary/15 text-primary-bright" : "text-fg-muted"}`}
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
                    permFilter !== "모든 권한" ? "border-primary/50 bg-primary/10 font-semibold text-primary-bright" : "border-white/10 text-fg-muted"
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
                          className={`block w-full px-3 py-2 text-left text-xs transition-colors ${permFilter === p ? "font-bold text-primary-bright" : "text-fg"}`}
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
          {!loaded ? (
            <p className="border-t border-white/8 px-4 py-10 text-center text-sm text-fg-muted">불러오는 중…</p>
          ) : shown.length === 0 ? (
            <p className="border-t border-white/8 px-4 py-10 text-center text-sm text-fg-muted">해당하는 구성원이 없어요.</p>
          ) : (
            <div className="divide-y divide-white/8 border-t border-white/8">
              {shown.map((m) => (
                <div key={m.id} className="px-4 py-3.5">
                  {/* 아바타 + 이름 + 상태 */}
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-base font-bold text-white" style={{ backgroundColor: avColor(m.name) }}>
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
                      <span className={`h-1.5 w-1.5 rounded-full ${m.status === "재직" ? "bg-emerald-400" : m.status === "비활성" ? "bg-amber-400" : "bg-slate-500"}`} />
                      {m.status === "재직" ? "Active" : m.status}
                    </span>
                  </div>

                  {/* 정보 그리드: 직급·팀 / (상세)최근 접속·연락처 / 입사일·권한 */}
                  <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-2.5 border-t border-white/8 pt-3">
                    <div>
                      <p className="text-[11px] text-fg-muted">직급</p>
                      <p className="text-[13px] font-bold">{rankKo(m.rank)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-fg-muted">팀</p>
                      <p className="text-[13px] font-bold">{m.team || "미지정"}</p>
                    </div>

                    {view === "상세" && (
                      <>
                        <div>
                          <p className="text-[11px] text-fg-muted">최근 접속</p>
                          <p className="text-[13px] font-bold">{m.lastActiveAt ? fmtDate(m.lastActiveAt) : "기록 없음"}</p>
                        </div>
                        <div>
                          <p className="text-[11px] text-fg-muted">연락처</p>
                          <p className="text-[13px] font-bold tabular-nums">{m.phone || "-"}</p>
                        </div>
                      </>
                    )}

                    <div>
                      <p className="text-[11px] text-fg-muted">입사일</p>
                      <p className="text-[13px] font-bold tabular-nums">{fmtDate(m.joinedAt)}</p>
                    </div>
                    <div className="relative">
                      <p className="pb-1 text-[11px] text-fg-muted">권한</p>
                      {canManage ? (
                        <button
                          type="button"
                          onClick={() => setPermMenuFor((cur) => (cur === m.id ? null : m.id))}
                          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold ${PERM_STYLE[m.perm]}`}
                        >
                          {m.perm}
                          <ChevronDownIcon className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-bold ${PERM_STYLE[m.perm]}`}>{m.perm}</span>
                      )}
                      {canManage && permMenuFor === m.id && (
                        <>
                          <button type="button" aria-label="닫기" onClick={() => setPermMenuFor(null)} className="fixed inset-0 z-10" />
                          <div className="absolute left-0 top-full z-20 mt-1 w-28 overflow-hidden rounded-lg border border-white/10 bg-surface-2 shadow-xl">
                            {PERMS.map((p) => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => changePerm(m, p)}
                                className={`block w-full px-3 py-2 text-left text-xs transition-colors ${m.perm === p ? "font-bold text-primary-bright" : "text-fg"}`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 액션 (관리자) — 그리드 밑 우측 정렬 */}
                  {canManage && (
                    <div className="mt-3 flex justify-end">
                      <div className="flex items-center rounded-lg border border-white/10">
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
                  )}
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
            {canManage && (
              <button type="button" onClick={openIssue} className="btn-primary flex items-center gap-1 px-2.5 py-1.5 text-xs">
                <PlusIcon className="h-3.5 w-3.5" />
                발급
              </button>
            )}
          </div>

          {!canManage ? (
            <p className="border-t border-white/8 px-4 py-10 text-center text-sm text-fg-muted">초대키는 관리자만 볼 수 있어요.</p>
          ) : keys.length === 0 ? (
            <p className="border-t border-white/8 px-4 py-10 text-center text-sm text-fg-muted">발급된 초대키가 없어요.</p>
          ) : (
            <div className="divide-y divide-white/8 border-t border-white/8">
              {keys.map((k) => (
                <div key={k.id} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate font-mono text-[13px] font-bold tracking-wide">{k.code}</span>
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        k.status === "USED" ? "bg-white/8 text-fg-muted" : k.status === "EXPIRED" ? "bg-red-500/12 text-red-400" : "bg-emerald-400/12 text-emerald-300"
                      }`}
                    >
                      {k.status === "USED" ? "사용됨" : k.status === "EXPIRED" ? "만료" : "미사용"}
                    </span>
                    <button type="button" aria-label="복사" onClick={() => copyKey(k.code)} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 text-fg-muted">
                      <CopyIcon className="h-3.5 w-3.5" />
                    </button>
                    {k.status !== "USED" && (
                      <button type="button" aria-label="삭제" onClick={() => revokeKey(k)} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 text-red-400">
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-fg-muted">
                    {(k.team || "미지정")} · {k.perm} · {rankKo(k.rank)} · {nameOf(k.issuedById)} 발급 · 만료 {fmtDate(k.expiresAt)}
                  </p>
                </div>
              ))}
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
              const list = members.filter((m) => (m.team || "미지정") === t);
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
                    <p className="truncate text-[13px] font-bold">{rankKo(r)}</p>
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
          <div className="animate-page-in relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3.5">
              <p className="text-lg font-bold">구성원 편집</p>
              <button type="button" onClick={() => setEditing(null)} aria-label="닫기" className="text-fg-muted">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4">
              <div>
                <p className={labelCls}>이름</p>
                <input value={editing.name} readOnly className={`${fieldCls} text-fg-muted`} />
              </div>
              <div>
                <p className={labelCls}>이메일</p>
                <input value={editing.email} readOnly className={`${fieldCls} text-fg-muted`} />
              </div>
              <div>
                <p className={labelCls}>직급</p>
                <div className="flex flex-wrap gap-1.5">
                  {RANKS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setEditing({ ...editing, rank: r })}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                        editing.rank === r ? "border-primary/60 bg-primary/12 font-semibold text-primary-bright" : "border-white/10 text-fg-muted"
                      }`}
                    >
                      {rankKo(r)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className={labelCls}>팀</p>
                <input value={editing.team} onChange={(e) => setEditing({ ...editing, team: e.target.value })} placeholder="예) PT팀" className={fieldCls} />
              </div>
              <div>
                <p className={labelCls}>연락처</p>
                <input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} placeholder="010-0000-0000" className={fieldCls} />
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
              <button type="button" onClick={submitEdit} className="btn-primary flex-[2] py-2.5 text-sm">
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 초대키 발급 모달 ───────────────────────── */}
      {issueOpen && (
        <div className="overlay-frame fixed inset-x-0 top-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" aria-label="닫기" onClick={() => setIssueOpen(false)} className="animate-fade-in absolute inset-0 bg-black/70" />
          <div className="animate-page-in relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3.5">
              <p className="text-lg font-bold">초대키 발급</p>
              <button type="button" onClick={() => setIssueOpen(false)} aria-label="닫기" className="text-fg-muted">
                <XIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-4 py-4">
              <div>
                <p className={labelCls}>권한</p>
                <div className="grid grid-cols-3 gap-2">
                  {PERMS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setIRole(p)}
                      className={`rounded-lg border py-2 text-xs font-bold transition-colors ${
                        iRole === p ? "border-primary/60 bg-primary/12 text-primary-bright" : "border-white/10 text-fg-muted"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className={labelCls}>직급</p>
                <div className="flex flex-wrap gap-1.5">
                  {RANKS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setIRank(r)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                        iRank === r ? "border-primary/60 bg-primary/12 font-semibold text-primary-bright" : "border-white/10 text-fg-muted"
                      }`}
                    >
                      {rankKo(r)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className={labelCls}>팀 <span className="font-normal text-fg-muted">(선택)</span></p>
                <input value={iTeam} onChange={(e) => setITeam(e.target.value)} placeholder="예) PT팀" className={fieldCls} />
              </div>
              <div>
                <p className={labelCls}>만료 <span className="font-normal text-fg-muted">(일)</span></p>
                <input inputMode="numeric" value={iDays} onChange={(e) => setIDays(e.target.value.replace(/[^0-9]/g, ""))} placeholder="14" className={fieldCls} />
              </div>
            </div>
            <div className="flex shrink-0 gap-2 border-t border-white/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <button type="button" onClick={() => setIssueOpen(false)} className="btn-secondary flex-1 py-2.5 text-sm">
                취소
              </button>
              <button type="button" onClick={submitIssue} className="btn-primary flex-[2] py-2.5 text-sm">
                발급
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
