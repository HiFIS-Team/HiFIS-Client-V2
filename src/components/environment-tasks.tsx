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

const ME = "은후"; // 목: 현재 사용자

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

const pad = (n: number) => String(n).padStart(2, "0");
const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

type Log = { name: string; who: string; time: string };

export function EnvironmentTasks() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [customs, setCustoms] = useState<string[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [etcOpen, setEtcOpen] = useState(false);
  const [etcText, setEtcText] = useState("");

  const perform = (name: string) => {
    setCounts((c) => ({ ...c, [name]: (c[name] ?? 0) + 1 }));
    setLogs((l) => [{ name, who: ME, time: nowTime() }, ...l]);
  };

  const submitEtc = () => {
    const name = etcText.trim();
    if (!name) return;
    if (!TASKS.includes(name) && !customs.includes(name)) setCustoms((t) => [...t, name]);
    perform(name);
    setEtcText("");
    setEtcOpen(false);
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

        {customs.map(renderCard)}
      </div>

      {/* 최근 기록 */}
      <div>
        <p className="mb-2 text-xs font-semibold text-fg-muted">최근 기록</p>
        {logs.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-surface px-3.5 py-3 text-xs text-fg-muted">
            아직 수행 기록이 없어요.
          </p>
        ) : (
          <div className="space-y-1.5">
            {logs.slice(0, 3).map((log, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-surface px-3.5 py-2.5"
              >
                <span className="text-sm font-medium">{log.name}</span>
                <span className="text-xs text-fg-muted tabular-nums">
                  {log.who} · {log.time}
                </span>
              </div>
            ))}
          </div>
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
                className="rounded-lg px-3 py-1.5 text-sm text-fg-muted"
              >
                취소
              </button>
              <button
                type="button"
                onClick={submitEtc}
                className="rounded-lg bg-primary px-3.5 py-1.5 text-sm font-semibold text-white"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
