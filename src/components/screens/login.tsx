"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/components/ui/toast";

const labelCls = "mb-1.5 block text-[13px] font-semibold";
const inputCls =
  "w-full rounded-lg border border-white/10 bg-surface px-3.5 py-3 text-sm outline-none focus:border-primary/50 placeholder:text-fg-muted";

function EyeIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M4 4l16 16" />}
    </svg>
  );
}

export function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const { show } = useToast();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [keep, setKeep] = useState(true);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pw) {
      setErr("이메일과 비밀번호를 입력해주세요.");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      await login(email.trim(), pw, keep);
      show("로그인되었습니다");
      router.push("/");
    } catch (e) {
      if (e instanceof ApiError && e.code === "INVALID_CREDENTIALS") {
        setErr("이메일 또는 비밀번호가 올바르지 않아요.");
      } else if (e instanceof ApiError && e.status === 0) {
        setErr("서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요.");
      } else {
        setErr("로그인에 실패했어요. 네트워크를 확인해주세요.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm">
        {/* 로고 */}
        <div className="mb-9 flex flex-col items-center">
          <Image src="/hifis-logo.png" alt="HiFIS" width={1600} height={332} priority className="h-6 w-auto" />
          <p className="mt-3 text-sm text-fg-muted">피트니스스타 직원 관리</p>
        </div>

        <form onSubmit={submit} className="space-y-3.5">
          <div>
            <label className={labelCls}>이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErr("");
              }}
              placeholder="이메일 주소"
              autoComplete="email"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>비밀번호</label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value);
                  setErr("");
                }}
                placeholder="비밀번호"
                autoComplete="current-password"
                className={`${inputCls} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-fg-muted"
              >
                <EyeIcon open={showPw} className="h-5 w-5" />
              </button>
            </div>
          </div>

          <label className="flex w-fit cursor-pointer select-none items-center gap-2 text-[13px] text-fg-muted">
            <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} className="sr-only" />
            <span
              className={`grid h-[18px] w-[18px] place-items-center rounded border transition-colors ${
                keep ? "border-primary bg-primary/20 text-primary-bright" : "border-white/20 bg-surface text-transparent"
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5L20 6" />
              </svg>
            </span>
            로그인 유지
          </label>

          {err && <p className="text-xs text-red-400">{err}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm">
            {loading ? "로그인 중…" : "로그인"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-xs">
          <button type="button" className="text-fg-muted transition hover:text-fg">
            비밀번호 찾기
          </button>
          <button
            type="button"
            onClick={() => router.push("/signup")}
            className="font-semibold text-primary-bright"
          >
            회원가입
          </button>
        </div>
      </div>
    </div>
  );
}
