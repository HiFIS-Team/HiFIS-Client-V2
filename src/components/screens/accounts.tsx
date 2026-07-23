"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useEmployeeNames } from "@/hooks/use-employee-names";
import {
  createAccount,
  deleteAccount,
  getAccountSecret,
  listAccounts,
  updateAccount,
  type AccountDTO,
} from "@/lib/api/hifis";

/**
 * 계정 관리 (사내 공용 계정 보관함) — 실 API(`/accounts`).
 * 비밀번호는 응답에 없고, 열람/복사 시 `GET /accounts/{id}/secret`(작성자·ADMIN)로 온디맨드 조회.
 * owner 는 서버가 생성자로 설정(폼에서 지정 X) → 로스터로 이름 표시.
 */

/* ── 아이콘 ─────────────────────────────────────── */
type IconP = { className?: string };
function SearchIcon({ className }: IconP) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.4-3.4" />
    </svg>
  );
}
function PlusIcon({ className }: IconP) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6v12M6 12h12" />
    </svg>
  );
}
function XIcon({ className }: IconP) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
function CopyIcon({ className }: IconP) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </svg>
  );
}
function EyeIcon({ className }: IconP) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}
function EyeOffIcon({ className }: IconP) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4l16 16" />
      <path d="M9.9 5.2A9.6 9.6 0 0 1 12 5c6 0 9.5 6.5 9.5 6.5a15 15 0 0 1-3 3.6" />
      <path d="M6.3 7.3A15 15 0 0 0 2.5 12S6 18.5 12 18.5c1 0 2-.2 2.9-.5" />
    </svg>
  );
}
function PencilIcon({ className }: IconP) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17Z" />
    </svg>
  );
}
function TrashIcon({ className }: IconP) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 7h14M10 7V5h4v2" />
      <path d="M6.5 7 7.5 20h9L17.5 7" />
    </svg>
  );
}
function ChevronDownIcon({ className }: IconP) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function RefreshIcon({ className }: IconP) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 11A8 8 0 0 0 6 6l-2 2" />
      <path d="M4 6v4h4" />
      <path d="M4 13a8 8 0 0 0 14 5l2-2" />
      <path d="M20 18v-4h-4" />
    </svg>
  );
}
function LockIcon({ className }: IconP) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </svg>
  );
}

/* ── 모델 ───────────────────────────────────────── */
type Scope = "전사" | "팀" | "프로젝트";
const SCOPES: Scope[] = ["전사", "팀", "프로젝트"];
const SCOPE_STYLE: Record<Scope, string> = {
  전사: "bg-emerald-400/12 text-emerald-300",
  팀: "bg-sky-400/12 text-sky-300",
  프로젝트: "bg-violet-400/12 text-violet-300",
};
const scopeStyle = (s: string) => SCOPE_STYLE[s as Scope] ?? "bg-white/8 text-fg-muted";

type Cat = { key: string; label: string; emoji: string; tint: string };
const CATS: Cat[] = [
  { key: "sns", label: "SNS·마케팅", emoji: "📣", tint: "bg-pink-400/12 text-pink-300" },
  { key: "booking", label: "예약·POS", emoji: "🗓️", tint: "bg-sky-400/12 text-sky-300" },
  { key: "sms", label: "문자·알림", emoji: "✉️", tint: "bg-violet-400/12 text-violet-300" },
  { key: "web", label: "홈페이지·관리자", emoji: "🖥️", tint: "bg-emerald-400/12 text-emerald-300" },
  { key: "cctv", label: "CCTV·시설", emoji: "📹", tint: "bg-amber-400/12 text-amber-300" },
  { key: "pay", label: "결제·정산", emoji: "💳", tint: "bg-rose-400/12 text-rose-300" },
  { key: "etc", label: "기타", emoji: "🔗", tint: "bg-slate-400/12 text-slate-300" },
];
// 백엔드 cat 이 자유 문자열(대문자 "SNS" 등)이라 대소문자 무시 정규화 → 모르면 etc
const catKey = (raw: string) => {
  const k = (raw || "").toLowerCase();
  return CATS.some((c) => c.key === k) ? k : "etc";
};
const catOf = (raw: string) => CATS.find((c) => c.key === catKey(raw)) ?? CATS[CATS.length - 1];

type Account = {
  id: string;
  name: string;
  cat: string;
  scope: string;
  loginId: string;
  url?: string;
  ownerId: string;
  memo?: string;
  active: boolean;
};
function toAccount(a: AccountDTO): Account {
  return {
    id: a.id,
    name: a.name,
    cat: a.cat,
    scope: a.scope,
    loginId: a.loginId,
    url: a.url ?? undefined,
    ownerId: a.ownerId,
    memo: a.memo ?? undefined,
    active: a.active,
  };
}

const AV = ["#0ea5e9", "#22c55e", "#f59e0b", "#ec4899", "#8b5cf6", "#14b8a6", "#9d3bfc", "#f43f5e"];
const ownerColor = (name: string) => {
  let h = 0;
  for (const c of name) h += c.charCodeAt(0);
  return AV[h % AV.length];
};

/* ── 공통 클래스 ────────────────────────────────── */
const labelCls = "pb-1.5 text-[13px] font-bold";
const fieldCls =
  "w-full rounded-lg border border-white/10 bg-surface-2 px-3 py-2.5 text-[13px] outline-none focus:border-primary/50 placeholder:text-fg-muted";

type Draft = { id: string | null; name: string; cat: string; scope: Scope; loginId: string; password: string; url: string; memo: string; active: boolean };
const blankDraft = (): Draft => ({ id: null, name: "", cat: "sns", scope: "전사", loginId: "", password: "", url: "", memo: "", active: true });

export function Accounts() {
  const { show } = useToast();
  const nameOf = useEmployeeNames();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [secrets, setSecrets] = useState<Record<string, string>>({}); // 온디맨드 비번 캐시

  const [tab, setTab] = useState<"전체" | Scope>("전체");
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [catOpen, setCatOpen] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const [draft, setDraft] = useState<Draft | null>(null);

  const load = useCallback(() => {
    listAccounts()
      .then((rows) => {
        setAccounts(rows.map(toAccount));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!draft) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDraft(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [draft]);

  const q = query.trim().toLowerCase();
  const shown = accounts.filter(
    (a) =>
      (tab === "전체" || a.scope === tab) &&
      (catFilter === "all" || catKey(a.cat) === catFilter) &&
      (q === "" || `${a.name} ${a.loginId} ${nameOf(a.ownerId, "")} ${a.memo ?? ""}`.toLowerCase().includes(q)),
  );

  // 카테고리 순서대로 그룹핑 (정규화 키 기준 — 모르는 cat 은 etc 로)
  const groups = CATS.map((c) => ({ cat: c, items: shown.filter((a) => catKey(a.cat) === c.key) })).filter((g) => g.items.length > 0);

  /* 비번 온디맨드 조회 (작성자·ADMIN만 성공) */
  const fetchSecret = async (id: string): Promise<string | null> => {
    if (secrets[id] != null) return secrets[id];
    try {
      const r = await getAccountSecret(id);
      setSecrets((s) => ({ ...s, [id]: r.password }));
      return r.password;
    } catch {
      show("비밀번호를 볼 권한이 없어요", "cancel");
      return null;
    }
  };

  /* 액션 */
  const copyLogin = (loginId: string) => {
    navigator.clipboard?.writeText(loginId).catch(() => {});
    show("로그인 ID를 복사했습니다");
  };
  const copyPassword = async (id: string) => {
    const pw = await fetchSecret(id);
    if (pw != null) {
      navigator.clipboard?.writeText(pw).catch(() => {});
      show("비밀번호를 복사했습니다");
    }
  };
  const toggleReveal = async (id: string) => {
    if (revealed.has(id)) {
      setRevealed((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
      return;
    }
    const pw = await fetchSecret(id);
    if (pw != null) setRevealed((s) => new Set(s).add(id));
  };
  const toggleActive = async (a: Account) => {
    try {
      await updateAccount(a.id, { active: !a.active });
      setAccounts((l) => l.map((x) => (x.id === a.id ? { ...x, active: !a.active } : x)));
    } catch {
      show("변경에 실패했어요", "cancel");
    }
  };
  const removeAccount = async (a: Account) => {
    try {
      await deleteAccount(a.id);
      setAccounts((l) => l.filter((x) => x.id !== a.id));
      show(`${a.name} 계정을 삭제했습니다`, "cancel");
    } catch {
      show("삭제에 실패했어요", "cancel");
    }
  };

  const openAdd = () => setDraft(blankDraft());
  const openEdit = (a: Account) =>
    setDraft({ id: a.id, name: a.name, cat: catKey(a.cat), scope: (a.scope as Scope) ?? "전사", loginId: a.loginId, password: "", url: a.url ?? "", memo: a.memo ?? "", active: a.active });

  const submitDraft = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    const loginId = draft.loginId.trim();
    if (!name || !loginId) return;
    const url = draft.url.trim() || undefined;
    const memo = draft.memo.trim() || undefined;
    try {
      if (draft.id) {
        const updated = await updateAccount(draft.id, {
          name,
          cat: draft.cat,
          scope: draft.scope,
          loginId,
          url,
          memo,
          ...(draft.password ? { password: draft.password } : {}),
        });
        setAccounts((l) => l.map((a) => (a.id === draft.id ? toAccount(updated) : a)));
        if (draft.password) setSecrets((s) => ({ ...s, [draft.id as string]: draft.password }));
        show(`${name} 계정을 수정했습니다`);
      } else {
        if (!draft.password) return;
        const created = await createAccount({ name, cat: draft.cat, scope: draft.scope, loginId, password: draft.password, url, memo, active: true });
        setAccounts((l) => [toAccount(created), ...l]);
        setSecrets((s) => ({ ...s, [created.id]: draft.password }));
        show(`${name} 계정을 추가했습니다`);
      }
      setDraft(null);
    } catch {
      show("저장에 실패했어요", "cancel");
    }
  };

  const catFilterLabel = catFilter === "all" ? "전체 카테고리" : `${catOf(catFilter).emoji} ${catOf(catFilter).label}`;

  return (
    <div className="space-y-2.5 px-4 pb-8 pt-5">
      {/* 제목 */}
      <div>
        <h1 className="text-xl font-bold">계정 관리</h1>
      </div>

      {/* 액션 */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={load} aria-label="새로고침" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 text-fg-muted">
          <RefreshIcon className="h-4 w-4" />
        </button>
        <button type="button" onClick={openAdd} className="btn-primary flex items-center gap-1 px-3 py-1.5 text-[13px]">
          <PlusIcon className="h-3.5 w-3.5" />
          계정 추가
        </button>
      </div>

      {/* 보안 안내 */}
      <div className="flex gap-2.5 rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] px-3.5 py-3">
        <LockIcon className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        <p className="text-[12px] leading-relaxed text-amber-200/90">
          비밀번호는 <b className="font-bold text-amber-100">암호화해서 저장</b>돼요 (AES-256-GCM). 여럿이 함께 쓰는 <b className="font-bold text-amber-100">공용 계정</b>만 기록하고, 개인 비번·2차 인증 백업 코드는 넣지 마세요. 열람·수정은 작성자와 관리자만 가능해요.
        </p>
      </div>

      {/* 공개 범위 탭 (flex-1 균등 분배) */}
      <div className="flex border-b border-white/10">
        {(["전체", ...SCOPES] as const).map((t) => {
          const on = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`relative flex-1 pb-2 text-center text-[13px] transition-colors ${on ? "font-bold text-fg" : "font-medium text-fg-muted"}`}
            >
              {t}
              {on && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>

      {/* 검색 */}
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface px-3">
        <SearchIcon className="h-4 w-4 shrink-0 text-fg-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="서비스 이름·로그인 ID·담당자·메모 검색"
          className="min-w-0 flex-1 bg-transparent py-2 text-[13px] outline-none placeholder:text-fg-muted"
        />
        {q !== "" && (
          <button type="button" onClick={() => setQuery("")} aria-label="지우기" className="shrink-0 text-fg-muted">
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 카테고리 필터 (드롭다운) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setCatOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-[13px]"
        >
          <span className={catFilter === "all" ? "text-fg-muted" : "font-semibold text-fg"}>{catFilterLabel}</span>
          <ChevronDownIcon className={`h-4 w-4 text-fg-muted transition-transform ${catOpen ? "rotate-180" : ""}`} />
        </button>
        {catOpen && (
          <>
            <button type="button" aria-label="닫기" onClick={() => setCatOpen(false)} className="fixed inset-0 z-10 cursor-default" />
            <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-white/10 bg-surface-2 shadow-2xl">
              {[{ key: "all", label: "전체 카테고리", emoji: "🗂️" }, ...CATS].map((c) => {
                const on = catFilter === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      setCatFilter(c.key);
                      setCatOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-[13px] ${on ? "bg-primary/12 font-semibold text-primary-bright" : "text-fg"}`}
                  >
                    <span>{c.emoji}</span>
                    {c.label}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* 목록 (카테고리별 그룹) */}
      {!loaded ? (
        <p className="rounded-2xl border border-white/10 bg-surface px-4 py-10 text-center text-sm text-fg-muted">불러오는 중…</p>
      ) : groups.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-surface px-4 py-10 text-center text-sm text-fg-muted">
          {q !== "" ? `'${query.trim()}' 검색 결과가 없어요.` : "등록된 계정이 없어요. 위에서 추가해보세요."}
        </p>
      ) : (
        groups.map((g) => (
          <section key={g.cat.key}>
            <p className="px-1 pb-1.5 text-xs font-semibold text-fg-muted">
              {g.cat.emoji} {g.cat.label} · {g.items.length}
            </p>
            <div className="space-y-1.5">
              {g.items.map((a) => {
                const reveal = revealed.has(a.id);
                const owner = nameOf(a.ownerId, "관리자");
                return (
                  <div key={a.id} className="rounded-2xl border border-white/10 bg-surface p-3.5">
                    {/* 헤더 */}
                    <div className="flex items-center gap-2.5">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-lg ${g.cat.tint}`}>{g.cat.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{a.name}</p>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${scopeStyle(a.scope)}`}>{a.scope}</span>
                          {!a.active && <span className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] text-fg-muted">미사용</span>}
                        </div>
                      </div>
                      {/* 사용 토글 */}
                      <button
                        type="button"
                        onClick={() => toggleActive(a)}
                        aria-label="사용 여부"
                        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${a.active ? "bg-primary" : "bg-white/15"}`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${a.active ? "left-[18px]" : "left-0.5"}`} />
                      </button>
                    </div>

                    {/* 필드 */}
                    <div className="mt-3 space-y-1.5 border-t border-white/8 pt-3 text-[13px]">
                      <FieldRow label="로그인" value={a.loginId} mono onCopy={() => copyLogin(a.loginId)} />
                      <div className="flex items-center gap-2">
                        <span className="w-12 shrink-0 text-fg-muted">비번</span>
                        <span className="min-w-0 flex-1 truncate font-mono">{reveal ? secrets[a.id] ?? "••••••••••" : "••••••••••"}</span>
                        <button type="button" onClick={() => toggleReveal(a.id)} aria-label={reveal ? "숨기기" : "표시"} className="shrink-0 text-fg-muted">
                          {reveal ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                        <button type="button" onClick={() => copyPassword(a.id)} aria-label="비밀번호 복사" className="shrink-0 text-fg-muted">
                          <CopyIcon className="h-4 w-4" />
                        </button>
                      </div>
                      {a.url && (
                        <div className="flex items-center gap-2">
                          <span className="w-12 shrink-0 text-fg-muted">URL</span>
                          <a href={a.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sky-300 underline-offset-2 hover:underline">
                            {a.url}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="w-12 shrink-0 text-fg-muted">담당자</span>
                        <span className="flex min-w-0 flex-1 items-center gap-1.5">
                          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: ownerColor(owner) }}>
                            {owner.charAt(0)}
                          </span>
                          <span className="truncate">{owner}</span>
                        </span>
                      </div>
                    </div>

                    {a.memo && <p className="mt-2.5 rounded-lg bg-surface-2 px-3 py-2 text-[12px] leading-relaxed text-fg-muted">{a.memo}</p>}

                    {/* 편집/삭제 */}
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => openEdit(a)} className="btn-secondary flex flex-1 items-center justify-center gap-1 py-2 text-[13px]">
                        <PencilIcon className="h-3.5 w-3.5" />
                        편집
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAccount(a)}
                        className="flex items-center justify-center gap-1 rounded-lg border border-red-500/25 px-3 py-2 text-[13px] font-semibold text-red-400"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        삭제
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      {/* ── 추가/편집 모달 ─────────────────────────── */}
      {draft && (
        <div className="overlay-frame fixed inset-x-0 top-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" aria-label="닫기" onClick={() => setDraft(null)} className="animate-fade-in absolute inset-0 bg-black/70" />
          <div className="animate-page-in relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3.5">
              <p className="text-lg font-bold">{draft.id ? "계정 편집" : "계정 추가"}</p>
              <button type="button" onClick={() => setDraft(null)} aria-label="닫기" className="text-fg-muted">
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4">
              <div>
                <p className={labelCls}>서비스 이름</p>
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="예) 인스타그램 (@fitnessstar)" className={fieldCls} />
              </div>

              <div>
                <p className={labelCls}>카테고리</p>
                <div className="grid grid-cols-2 gap-2">
                  {CATS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setDraft({ ...draft, cat: c.key })}
                      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[12px] transition-colors ${
                        draft.cat === c.key ? "border-primary/60 bg-primary/12 font-semibold text-primary-bright" : "border-white/10 text-fg-muted"
                      }`}
                    >
                      <span>{c.emoji}</span>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className={labelCls}>공개 범위</p>
                <div className="grid grid-cols-3 gap-2">
                  {SCOPES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setDraft({ ...draft, scope: s })}
                      className={`rounded-lg border py-2.5 text-[13px] transition-colors ${
                        draft.scope === s ? "border-primary/60 bg-primary/12 font-semibold text-primary-bright" : "border-white/10 text-fg-muted"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className={labelCls}>로그인 ID</p>
                <input value={draft.loginId} onChange={(e) => setDraft({ ...draft, loginId: e.target.value })} placeholder="아이디 또는 이메일" className={`${fieldCls} font-mono`} />
              </div>

              <div>
                <p className={labelCls}>
                  비밀번호 {draft.id && <span className="font-normal text-fg-muted">(변경 시에만 입력)</span>}
                </p>
                <input
                  value={draft.password}
                  onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                  placeholder={draft.id ? "비워두면 기존 비번 유지" : "비밀번호"}
                  className={`${fieldCls} font-mono`}
                />
              </div>

              <div>
                <p className={labelCls}>
                  URL <span className="font-normal text-fg-muted">(선택)</span>
                </p>
                <input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="https://" className={fieldCls} />
              </div>

              <div>
                <p className={labelCls}>
                  메모 <span className="font-normal text-fg-muted">(선택)</span>
                </p>
                <textarea
                  value={draft.memo}
                  onChange={(e) => setDraft({ ...draft, memo: e.target.value })}
                  rows={3}
                  placeholder="사용 규칙·주의사항 등"
                  className={`${fieldCls} resize-none`}
                />
              </div>
            </div>

            <div className="flex shrink-0 gap-2 border-t border-white/10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              <button type="button" onClick={() => setDraft(null)} className="btn-secondary flex-1 py-2.5 text-sm">
                취소
              </button>
              <button
                type="button"
                onClick={submitDraft}
                disabled={!draft.name.trim() || !draft.loginId.trim() || (!draft.id && !draft.password)}
                className="btn-primary flex-[2] py-2.5 text-sm"
              >
                {draft.id ? "저장" : "추가"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, value, mono, onCopy }: { label: string; value: string; mono?: boolean; onCopy: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-fg-muted">{label}</span>
      <span className={`min-w-0 flex-1 truncate ${mono ? "font-mono" : ""}`}>{value}</span>
      <button type="button" onClick={onCopy} aria-label={`${label} 복사`} className="shrink-0 text-fg-muted">
        <CopyIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
