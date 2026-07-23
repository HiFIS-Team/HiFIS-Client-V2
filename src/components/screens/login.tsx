"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth";
import { ApiError } from "@/lib/api/client";
import { useToast } from "@/components/ui/toast";
import { authInput, authBtn, BrandMark } from "@/components/screens/auth-ui";

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
      if (e instanceof ApiError && e.code === "INVALID_CREDENTIALS") setErr("이메일 또는 비밀번호가 올바르지 않아요.");
      else if (e instanceof ApiError && e.status === 0) setErr("서버에 연결할 수 없어요. 잠시 후 다시 시도해주세요.");
      else setErr("로그인에 실패했어요. 네트워크를 확인해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col px-6 pb-8 pt-9">
      <BrandMark />

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center pb-[6vh]">
        <h1 className="text-xl font-bold">어서 오세요</h1>
        <p className="mt-1.5 text-sm text-fg-muted">가입하신 이메일과 비밀번호로 로그인하세요.</p>

        <form onSubmit={submit} className="mt-6 space-y-2.5">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErr("");
            }}
            placeholder="이메일"
            autoComplete="email"
            className={authInput}
          />

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
              className={`${authInput} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
              className="absolute inset-y-0 right-0 grid w-12 place-items-center text-fg-muted"
            >
              <EyeIcon open={showPw} className="h-5 w-5" />
            </button>
          </div>

          <label className="flex w-fit cursor-pointer select-none items-center gap-2 pl-1 pt-0.5 text-[13px] text-fg-muted">
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

          {err && <p className="pl-1 text-[13px] text-red-400">{err}</p>}

          <button type="submit" disabled={loading} className={`${authBtn} mt-1.5`}>
            {loading ? "로그인 중…" : "로그인"}
          </button>
        </form>

        {/* 링크 */}
        <div className="mt-5 flex items-center justify-center gap-3 text-[13px]">
          <button type="button" onClick={() => router.push("/signup")} className="font-semibold text-fg transition hover:text-primary-bright">
            회원가입
          </button>
          <span className="text-fg-muted/40">·</span>
          <button type="button" onClick={() => router.push("/forgot")} className="text-fg-muted transition hover:text-fg">
            비밀번호 찾기
          </button>
        </div>

        {/* 약관 */}
        <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-fg-muted/70">
          <span>개인정보처리방침</span>
          <span className="text-fg-muted/30">·</span>
          <span>이용약관</span>
        </div>
      </div>
    </div>
  );
}
