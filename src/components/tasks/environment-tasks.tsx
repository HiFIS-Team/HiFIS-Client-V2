"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/providers/auth";
import { useEmployeeNames } from "@/hooks/use-employee-names";
import { createEnvLog, deleteEnvLog, listEnvItems, listEnvLogs, type EnvItemDTO, type EnvLogDTO } from "@/lib/api/hifis";

/**
 * 환경정비 — **백엔드 연동(Phase 3)**.
 *
 * 항목·배점은 **지점별 설정**(GET /env-items). 수행마다 로그 적재 + ENV 점수 배점만큼 자동 적립.
 * +(수행)=POST /env-logs · −(취소)=DELETE 내 최근 로그. 점수는 누적.
 * ⚠️ 트레이너(MEMBER)는 직원 명단 권한이 없어 남의 로그 이름은 "동료"로만 표기(내 것은 "나").
 */

const pad = (n: number) => String(n).padStart(2, "0");
function fmtTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${d.getMonth() + 1}.${d.getDate()} ${h < 12 ? "오전" : "오후"} ${h12}:${pad(d.getMinutes())}`;
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6v12M6 12h12" />
    </svg>
  );
}
function MinusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 12h12" />
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

function LogRow({ log, who }: { log: EnvLogDTO; who: string }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5">
      <span className="text-sm font-medium">
        {log.itemName}
        <span className="ml-1.5 text-[11px] font-normal text-primary-bright">+{log.points}</span>
      </span>
      <span className="text-xs text-fg-muted tabular-nums">
        {who} · {fmtTime(log.createdAt)}
      </span>
    </div>
  );
}

// 병렬 로드
const fetchAll = (branchId: string) => Promise.all([listEnvItems(branchId), listEnvLogs({ branchId })]);

export function EnvironmentTasks() {
  const { show } = useToast();
  const { user } = useAuth();
  const meId = user?.id;
  const branchId = user?.branchId;
  const nameOf = useEmployeeNames();
  const whoOf = (id: string) => (id === meId ? "나" : nameOf(id, "동료"));

  const [items, setItems] = useState<EnvItemDTO[]>([]);
  const [logs, setLogs] = useState<EnvLogDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const [allOpen, setAllOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    if (!branchId) return;
    let alive = true;
    fetchAll(branchId)
      .then(([its, lgs]) => {
        if (!alive) return;
        setItems(its);
        setLogs(lgs);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [branchId]);

  const reload = async () => {
    if (!branchId) return;
    try {
      const [its, lgs] = await fetchAll(branchId);
      setItems(its);
      setLogs(lgs);
    } catch {
      /* 무시 */
    }
  };

  // 최신순 정렬 + 내 것
  const sorted = [...logs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const myLogs = sorted.filter((l) => l.employeeId === meId);
  const myScore = myLogs.reduce((a, l) => a + l.points, 0);
  const myCountByItem = (itemId: string) => myLogs.filter((l) => l.envItemId === itemId).length;

  const perform = async (item: EnvItemDTO) => {
    try {
      const log = await createEnvLog({ envItemId: item.id });
      show(`${item.name} 완료 (+${log.points}점, 누적 ${myScore + log.points}점)`);
      await reload();
    } catch {
      show(`${item.name} 기록에 실패했어요`, "cancel");
    }
  };

  const cancel = async (item: EnvItemDTO) => {
    const last = myLogs.find((l) => l.envItemId === item.id); // 최신순이라 첫 번째가 최근
    if (!last) return;
    try {
      await deleteEnvLog(last.id);
      show(`${item.name} 취소했습니다`, "cancel");
    } catch {
      /* 이미 지워졌을 수 있음 — 무시하고 새로고침 */
    }
    await reload();
  };

  const q = query.trim();
  const filtered = sorted.filter((l) => (!onlyMine || l.employeeId === meId) && (q === "" || l.itemName.includes(q)));

  return (
    <div className="space-y-4 px-4 py-4">
      <p className="text-xs text-fg-muted">
        환경정비 · 내가 <span className="font-semibold text-primary-bright">{myLogs.length}건</span> 수행 · 누적{" "}
        <span className="font-semibold text-primary-bright">{myScore}점</span>
      </p>

      {loading ? (
        <p className="text-sm text-fg-muted">불러오는 중…</p>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-surface px-4 py-8 text-center text-sm text-fg-muted">
          이 지점에 등록된 환경정비 항목이 없어요. 관리자가 항목을 추가해야 해요.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {items.map((item) => {
            const n = myCountByItem(item.id);
            return (
              <div
                key={item.id}
                className={`flex items-center gap-1 rounded-2xl border px-1.5 py-2 transition-colors ${
                  n > 0 ? "border-primary/40 bg-primary/5" : "border-white/10 bg-surface"
                }`}
              >
                <button
                  type="button"
                  onClick={() => cancel(item)}
                  disabled={n === 0}
                  aria-label={`${item.name} 취소`}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-500/12 text-red-400 transition-colors disabled:opacity-25"
                >
                  <MinusIcon className="h-4 w-4" />
                </button>
                <span className="min-w-0 flex-1 text-center">
                  <span className="block truncate text-sm font-medium">{item.name}</span>
                  <span className="block text-[10px] text-fg-muted">+{item.points}점</span>
                </span>
                <button
                  type="button"
                  onClick={() => perform(item)}
                  aria-label={`${item.name} 수행`}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary-bright transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 최근 기록 */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <p className="px-3.5 pb-1.5 pt-3 text-xs font-semibold text-fg-muted">최근 기록</p>
        {sorted.length === 0 ? (
          <p className="px-3.5 pb-3 text-xs text-fg-muted">아직 수행 기록이 없어요.</p>
        ) : (
          <>
            <div className="divide-y divide-white/5">
              {sorted.slice(0, 5).map((log) => (
                <LogRow key={log.id} log={log} who={whoOf(log.employeeId)} />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setAllOpen(true)}
              className="flex w-full items-center justify-center gap-1 border-t border-white/10 py-2.5 text-xs font-semibold text-primary-bright"
            >
              전체 보기
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* 전체 기록 — 오른쪽 → 왼쪽 슬라이드 */}
      <div
        role="dialog"
        aria-label="전체 기록"
        inert={!allOpen}
        className={`fixed inset-0 z-[70] flex flex-col bg-bg transition-transform duration-300 ease-out ${
          allOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <header className="relative flex h-14 shrink-0 items-center border-b border-white/10 bg-surface/70 px-1.5 backdrop-blur-xl">
          <button type="button" onClick={() => setAllOpen(false)} aria-label="뒤로" className="grid h-10 w-10 place-items-center text-fg-muted transition hover:text-fg">
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold">전체 기록</h1>
        </header>

        <div className="shrink-0 border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-surface px-3 py-2">
              <SearchIcon className="h-4 w-4 shrink-0 text-fg-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="업무 검색"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-muted"
              />
            </div>
            {/* 전체 / 나 필터 (직원 명단 권한 없어 개인 필터는 나만) */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setFilterOpen((o) => !o)}
                aria-label="필터"
                className={`grid h-9 w-9 place-items-center rounded-lg border transition-colors ${
                  onlyMine ? "border-primary/50 bg-primary/10 text-primary-bright" : "border-white/10 bg-surface text-fg-muted"
                }`}
              >
                <FilterIcon className="h-4 w-4" />
              </button>
              {filterOpen && (
                <>
                  <button type="button" aria-label="닫기" onClick={() => setFilterOpen(false)} className="fixed inset-0 z-10" />
                  <div className="absolute right-0 top-full z-20 mt-1.5 w-28 overflow-hidden rounded-lg border border-white/10 bg-surface-2 shadow-xl">
                    {[
                      { key: false, label: "전체" },
                      { key: true, label: "나" },
                    ].map((o) => (
                      <button
                        key={String(o.key)}
                        type="button"
                        onClick={() => {
                          setOnlyMine(o.key);
                          setFilterOpen(false);
                        }}
                        className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors ${
                          onlyMine === o.key ? "font-semibold text-primary-bright" : "text-fg"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-fg-muted">해당하는 기록이 없어요.</p>
          ) : (
            <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-surface">
              {filtered.map((log) => (
                <LogRow key={log.id} log={log} who={whoOf(log.employeeId)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
