"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { scanAttendance } from "@/lib/api/hifis";
import { useAuth } from "@/providers/auth";
import { useEmployeeNames } from "@/hooks/use-employee-names";

const pad = (n: number) => String(n).padStart(2, "0");
function hhmm(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Result =
  | { kind: "in" | "out"; name: string; time: string; minutes?: number }
  | { kind: "error"; message: string };

// 백엔드 에러 코드 → 단말 문구
function errMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === "EMP_NO_NOT_FOUND") return "등록되지 않은 사번이에요";
    if (e.code === "OTHER_BRANCH") return "다른 지점 직원이에요";
    return e.message || "스캔에 실패했어요";
  }
  return "스캔에 실패했어요";
}

export function Kiosk() {
  const router = useRouter();
  const { user } = useAuth();
  const nameOf = useEmployeeNames();

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const focusInput = () => inputRef.current?.focus();

  // 마운트 시 입력창 포커스 (스캐너 = 키보드 웨지 → 포커스된 입력에 타이핑됨)
  useEffect(() => {
    focusInput();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const showResult = (r: Result) => {
    setResult(r);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setResult(null);
      focusInput();
    }, 4500);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const bc = code.trim();
    if (!bc || busy) return;
    setBusy(true);
    setCode("");
    try {
      const a = await scanAttendance(bc);
      const isOut = !!a.checkOut;
      showResult({
        kind: isOut ? "out" : "in",
        name: nameOf(a.employeeId),
        time: hhmm(isOut ? a.checkOut : a.checkIn),
        minutes: isOut ? a.workMinutes ?? undefined : undefined,
      });
    } catch (err) {
      showResult({ kind: "error", message: errMessage(err) });
    } finally {
      setBusy(false);
      focusInput();
    }
  };

  return (
    <div className="flex min-h-full flex-col px-6 pb-6 pt-6" onClick={focusInput}>
      {/* 상단: 단말 정보 + 앱으로 나가기 */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-fg-muted">출퇴근 스캐너</p>
          <h1 className="text-lg font-bold">지점 단말</h1>
          {user && (
            <p className="mt-0.5 text-xs text-fg-muted">
              {user.name} 계정 · 같은 지점 직원만 스캔돼요
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-fg-muted"
        >
          앱으로
        </button>
      </div>

      {/* 중앙: 결과 / 대기 */}
      <div className="flex flex-1 items-center justify-center py-6">
        {!result ? (
          <div className="animate-page-in flex flex-col items-center text-center">
            <span className="grid h-20 w-20 place-items-center rounded-2xl bg-primary/12 text-primary-bright">
              <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5v14M7 5v14M11 5v14M15 5v14M19 5v14M22 5v14" />
              </svg>
            </span>
            <p className="mt-5 text-xl font-bold">사번 바코드를 스캔하세요</p>
            <p className="mt-1.5 text-sm text-fg-muted">스캐너로 읽거나 아래에 사번을 직접 입력할 수 있어요.</p>
          </div>
        ) : result.kind === "error" ? (
          <div key="err" className="animate-page-in flex flex-col items-center text-center">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-red-500/15 text-red-400">
              <svg viewBox="0 0 24 24" className="h-11 w-11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 7l10 10M17 7L7 17" />
              </svg>
            </span>
            <p className="mt-5 text-2xl font-bold text-red-400">{result.message}</p>
            <p className="mt-1.5 text-sm text-fg-muted">다시 스캔해주세요.</p>
          </div>
        ) : (
          <div key={`${result.kind}-${result.name}-${result.time}`} className="animate-page-in flex flex-col items-center text-center">
            <span
              className={`grid h-20 w-20 place-items-center rounded-full ${
                result.kind === "in" ? "bg-emerald-500/15 text-emerald-400" : "bg-sky-500/15 text-sky-400"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-11 w-11" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7" />
              </svg>
            </span>
            <p className="mt-5 text-3xl font-extrabold">{result.name}</p>
            <p className={`mt-2 text-xl font-bold ${result.kind === "in" ? "text-emerald-400" : "text-sky-400"}`}>
              {result.kind === "in" ? "출근" : "퇴근"} · {result.time}
            </p>
            {result.kind === "out" && result.minutes != null && (
              <p className="mt-1.5 text-sm text-fg-muted">
                근무 {Math.floor(result.minutes / 60)}시간 {result.minutes % 60}분
              </p>
            )}
          </div>
        )}
      </div>

      {/* 하단: 스캔 입력 (스캐너 = 이 입력에 타이핑 후 Enter) */}
      <form onSubmit={submit} className="flex gap-2">
        <input
          ref={inputRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoFocus
          autoComplete="off"
          placeholder="사번 (예: 2026-0001)"
          aria-label="사번"
          className="w-full rounded-lg border border-white/10 bg-surface px-3.5 py-3 text-center font-mono text-lg tracking-widest outline-none focus:border-primary/50 placeholder:text-fg-muted placeholder:tracking-normal placeholder:font-sans"
        />
        <button type="submit" disabled={busy || !code.trim()} className="btn-primary shrink-0 px-5 text-sm">
          확인
        </button>
      </form>
    </div>
  );
}
