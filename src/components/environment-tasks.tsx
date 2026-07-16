"use client";

import { useEffect, useState } from "react";

const TASKS = [
  "세탁",
  "건조기",
  "빨래 정리",
  "빨래수거",
  "구역 청소",
  "복도 청소",
  "베란다 청소",
  "남탈 청소",
  "여탈 청소",
  "쓰레기통",
  "비품 관리",
];

const ME = "은후"; // 목: 현재 사용자
const STAFF = ["은후", "지민", "현우", "서연", "민준"]; // 목: 이 지점 직원

type Log = { name: string; who: string; time: string };

// 목 기록 (필터/검색 시연용 시드)
const SEED_LOGS: Log[] = [
  { name: "세탁", who: "은후", time: "14:32" },
  { name: "건조기", who: "지민", time: "14:20" },
  { name: "쓰레기통", who: "현우", time: "13:55" },
  { name: "복도 청소", who: "은후", time: "13:40" },
  { name: "비품 관리", who: "서연", time: "12:10" },
  { name: "여탈 청소", who: "지민", time: "11:30" },
  { name: "구역 청소", who: "현우", time: "10:15" },
  { name: "빨래 정리", who: "민준", time: "09:50" },
];

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}
function MinusMiniIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 12h12" />
    </svg>
  );
}
function PlusMiniIcon({ className }: { className?: string }) {
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
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12.5 4 4 10-10" />
    </svg>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function LogRow({ log }: { log: Log }) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5">
      <span className="text-sm font-medium">{log.name}</span>
      <span className="text-xs text-fg-muted tabular-nums">
        {log.who} · {log.time}
      </span>
    </div>
  );
}

export function EnvironmentTasks() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<Log[]>(SEED_LOGS);
  const [etcOpen, setEtcOpen] = useState(false);
  const [etcText, setEtcText] = useState("");
  const [allOpen, setAllOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [person, setPerson] = useState("전체");
  const [filterOpen, setFilterOpen] = useState(false);

  // 전체 기록 열렸을 때 ESC 닫기
  useEffect(() => {
    if (!allOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAllOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [allOpen]);

  const perform = (name: string) => {
    setCounts((c) => ({ ...c, [name]: (c[name] ?? 0) + 1 }));
    setLogs((l) => [{ name, who: ME, time: nowTime() }, ...l]);
  };

  // 잘못 눌렀을 때 취소: 카운트 감소 + 방금 남긴 내 기록 1건 제거
  const cancel = (name: string) => {
    setCounts((c) => {
      const cur = c[name] ?? 0;
      if (cur <= 0) return c;
      return { ...c, [name]: cur - 1 };
    });
    setLogs((l) => {
      const idx = l.findIndex((log) => log.name === name && log.who === ME);
      return idx === -1 ? l : l.filter((_, i) => i !== idx);
    });
  };

  const submitEtc = () => {
    const name = etcText.trim();
    if (!name) return;
    // 기타는 카드로 추가하지 않고 기록에만 남긴다
    setLogs((l) => [{ name, who: ME, time: nowTime() }, ...l]);
    setEtcText("");
    setEtcOpen(false);
  };

  const q = query.trim();
  const filtered = logs.filter(
    (l) =>
      (person === "전체" || l.who === person) &&
      (q === "" || l.name.includes(q) || l.who.includes(q)),
  );

  const renderCard = (name: string) => {
    const n = counts[name] ?? 0;
    return (
      <div
        key={name}
        className={`flex items-center gap-1 rounded-2xl border px-1.5 py-2 transition-colors ${
          n > 0 ? "border-primary/40 bg-primary/5" : "border-white/10 bg-surface"
        }`}
      >
        <button
          type="button"
          onClick={() => cancel(name)}
          disabled={n === 0}
          aria-label={`${name} 취소`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-fg-muted transition-colors disabled:opacity-25"
        >
          <MinusMiniIcon className="h-4 w-4" />
        </button>
        <span className="min-w-0 flex-1 truncate text-center text-sm font-medium">{name}</span>
        <button
          type="button"
          onClick={() => perform(name)}
          aria-label={`${name} 수행`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary-bright transition-colors"
        >
          <PlusMiniIcon className="h-4 w-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4 px-4 py-4">
      <div className="grid grid-cols-2 gap-2">
        {TASKS.map(renderCard)}

        {/* 기타 — 탭하면 입력 모달 */}
        <button
          type="button"
          onClick={() => {
            setEtcText("");
            setEtcOpen(true);
          }}
          className="flex items-center justify-between gap-2 rounded-2xl border border-dashed border-white/15 bg-surface px-3.5 py-3 text-left"
        >
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg-muted">기타</span>
          <PlusIcon className="h-4 w-4 shrink-0 text-fg-muted" />
        </button>
      </div>

      {/* 최근 기록 (한 칸 안, 최대 5개) */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-surface">
        <p className="px-3.5 pb-1.5 pt-3 text-xs font-semibold text-fg-muted">최근 기록</p>
        {logs.length === 0 ? (
          <p className="px-3.5 pb-3 text-xs text-fg-muted">아직 수행 기록이 없어요.</p>
        ) : (
          <>
            <div className="divide-y divide-white/5">
              {logs.slice(0, 5).map((log, i) => (
                <LogRow key={i} log={log} />
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

      {/* 기타 입력 모달 */}
      {etcOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setEtcOpen(false)}
            className="absolute inset-0 bg-black/70"
          />
          <div className="relative w-full max-w-xs rounded-2xl border border-white/10 bg-surface p-4 shadow-2xl">
            <p className="text-sm font-semibold">기타 업무</p>
            <input
              autoFocus
              value={etcText}
              onChange={(e) => setEtcText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitEtc();
                if (e.key === "Escape") setEtcOpen(false);
              }}
              placeholder="업무 이름 입력"
              className="mt-3 w-full rounded-lg border border-white/10 bg-bg px-3 py-2 text-sm outline-none focus:border-primary/50"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEtcOpen(false)}
                className="btn-secondary px-3 py-1.5 text-sm"
              >
                취소
              </button>
              <button
                type="button"
                onClick={submitEtc}
                className="btn-primary px-3.5 py-1.5 text-sm"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 전체 기록 — 오른쪽 → 왼쪽 슬라이드 */}
      <div
        role="dialog"
        aria-label="전체 기록"
        aria-hidden={!allOpen}
        className={`fixed inset-0 z-[70] flex flex-col bg-bg transition-transform duration-300 ease-out ${
          allOpen ? "translate-x-0" : "pointer-events-none translate-x-full"
        }`}
      >
        <header className="relative flex h-14 shrink-0 items-center border-b border-white/10 bg-surface/70 px-1.5 backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setAllOpen(false)}
            aria-label="뒤로"
            className="grid h-10 w-10 place-items-center text-fg-muted transition hover:text-fg"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold">
            전체 기록
          </h1>
        </header>

        {/* 검색 + 필터(지점 직원) */}
        <div className="shrink-0 border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-white/10 bg-surface px-3 py-2">
              <SearchIcon className="h-4 w-4 shrink-0 text-fg-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="업무·이름 검색"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-muted"
              />
            </div>

            {/* 필터 아이콘 + 드롭다운 */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setFilterOpen((o) => !o)}
                aria-label="필터"
                className={`grid h-9 w-9 place-items-center rounded-lg border transition-colors ${
                  person !== "전체"
                    ? "border-primary/50 bg-primary/10 text-primary-bright"
                    : "border-white/10 bg-surface text-fg-muted"
                }`}
              >
                <FilterIcon className="h-4 w-4" />
              </button>
              {filterOpen && (
                <>
                  <button
                    type="button"
                    aria-label="닫기"
                    onClick={() => setFilterOpen(false)}
                    className="fixed inset-0 z-10"
                  />
                  <div className="absolute right-0 top-full z-20 mt-1.5 w-32 overflow-hidden rounded-lg border border-white/10 bg-surface-2 shadow-xl">
                    {["전체", ...STAFF].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setPerson(p);
                          setFilterOpen(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                          person === p ? "font-semibold text-primary-bright" : "text-fg"
                        }`}
                      >
                        {p}
                        {person === p && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 목록 */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <p className="text-sm text-fg-muted">해당하는 기록이 없어요.</p>
          ) : (
            <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-surface">
              {filtered.map((log, i) => (
                <LogRow key={i} log={log} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
