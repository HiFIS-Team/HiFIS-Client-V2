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
  "쓰레기통",
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
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12.5 4 4 10-10" />
    </svg>
  );
}

export function EnvironmentTasks() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [customs, setCustoms] = useState<string[]>([]);

  const perform = (name: string) => setCounts((c) => ({ ...c, [name]: (c[name] ?? 0) + 1 }));

  const addEtc = () => {
    const name = window.prompt("기타 업무 이름")?.trim();
    if (!name) return;
    if (!TASKS.includes(name) && !customs.includes(name)) setCustoms((t) => [...t, name]);
    perform(name);
  };

  const renderCard = (name: string) => {
    const done = (counts[name] ?? 0) > 0;
    return (
      <button
        key={name}
        type="button"
        onClick={() => perform(name)}
        className={`flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-3 text-left transition-colors ${
          done ? "border-primary/40 bg-primary/5" : "border-white/10 bg-surface"
        }`}
      >
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
        {done ? (
          <CheckIcon className="h-4 w-4 shrink-0 text-primary-bright" />
        ) : (
          <PlusIcon className="h-4 w-4 shrink-0 text-fg-muted" />
        )}
      </button>
    );
  };

  return (
    <div className="px-4 py-4">
      <div className="grid grid-cols-2 gap-2">
        {TASKS.map(renderCard)}

        {/* 기타 — 비품 관리 옆 칸. 탭하면 이름 입력 후 추가·수행 */}
        <button
          type="button"
          onClick={addEtc}
          className="flex items-center justify-between gap-2 rounded-2xl border border-dashed border-white/15 bg-surface px-3.5 py-3 text-left"
        >
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg-muted">기타</span>
          <PlusIcon className="h-4 w-4 shrink-0 text-fg-muted" />
        </button>

        {customs.map(renderCard)}
      </div>
    </div>
  );
}
