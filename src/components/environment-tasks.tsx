"use client";

import { useState } from "react";

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
  "쓰레기통 비우기",
  "비품 관리",
];

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8.5v7M8.5 12h7" />
    </svg>
  );
}

export function EnvironmentTasks() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [customs, setCustoms] = useState<string[]>([]);
  const [etc, setEtc] = useState("");

  const perform = (name: string) => setCounts((c) => ({ ...c, [name]: (c[name] ?? 0) + 1 }));

  const addEtc = () => {
    const name = etc.trim();
    if (!name) return;
    if (!TASKS.includes(name) && !customs.includes(name)) setCustoms((t) => [...t, name]);
    perform(name);
    setEtc("");
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const all = [...TASKS, ...customs];

  return (
    <div className="px-4 py-4">
      <p className="mb-3 text-xs text-fg-muted">
        탭하면 수행이 기록돼요 · 오늘 총{" "}
        <span className="font-semibold text-primary-bright">{total}회</span>
      </p>

      <div className="space-y-2">
        {all.map((name) => {
          const n = counts[name] ?? 0;
          return (
            <button
              key={name}
              type="button"
              onClick={() => perform(name)}
              className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-surface px-4 py-3.5 text-left"
            >
              <span className="font-medium">{name}</span>
              <span className="flex items-center gap-2.5">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
                    n > 0 ? "bg-primary/15 text-primary-bright" : "bg-white/10 text-fg-muted"
                  }`}
                >
                  {n > 0 ? `오늘 ${n}회` : "미수행"}
                </span>
                <PlusIcon className="h-5 w-5 text-fg-muted" />
              </span>
            </button>
          );
        })}

        {/* 기타 — 직접 입력 후 수행 */}
        <div className="flex items-center gap-2 rounded-2xl border border-dashed border-white/15 bg-surface/50 px-4 py-3">
          <span className="shrink-0 text-sm font-medium text-fg-muted">기타</span>
          <input
            value={etc}
            onChange={(e) => setEtc(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addEtc()}
            placeholder="직접 입력"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-muted"
          />
          <button
            type="button"
            onClick={addEtc}
            className="shrink-0 rounded-lg bg-primary/15 px-3 py-1.5 text-xs font-semibold text-primary-bright"
          >
            수행
          </button>
        </div>
      </div>
    </div>
  );
}
