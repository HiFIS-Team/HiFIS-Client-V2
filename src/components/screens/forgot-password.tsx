"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authInput, authBtn, BrandMark } from "@/components/screens/auth-ui";

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

/**
 * 비밀번호 찾기 — 가입 이메일로 재설정 링크 발송.
 * ⚠️ 백엔드 재설정 엔드포인트가 아직 없어 **UI 자리표시자**(제출 시 안내 화면).
 * 실제 발송은 `POST /auth/forgot-password` + 메일 발송이 붙어야 동작.
 */
export function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    if (!v || !v.includes("@")) {
      setErr("가입하신 이메일을 정확히 입력해주세요.");
      return;
    }
    setSending(true);
    setErr("");
    // 백엔드 엔드포인트가 붙으면 여기서 POST. 지금은 안내 화면만.
    setSent(true);
    setSending(false);
  };

  if (sent) {
    return (
      <div className="flex min-h-full flex-col px-6 pb-8 pt-9">
        <BrandMark />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center pb-[8vh] text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/12 text-primary-bright">
            <MailIcon className="h-8 w-8" />
          </span>
          <h1 className="mt-5 text-[26px] font-extrabold tracking-tight">메일을 확인해주세요</h1>
          <p className="mt-2.5 text-[15px] leading-relaxed text-fg-muted">
            <b className="text-fg">{email.trim()}</b> 로 재설정 링크를 보냈어요. 메일함(스팸함 포함)을 확인해주세요.
          </p>
          <button type="button" onClick={() => router.push("/login")} className={`${authBtn} mt-8`}>
            로그인으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col px-6 pb-8 pt-9">
      <BrandMark />

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center pb-[6vh]">
        <h1 className="text-[30px] font-extrabold leading-tight tracking-tight">비밀번호를 잊으셨나요?</h1>
        <p className="mt-2.5 text-[15px] leading-relaxed text-fg-muted">
          가입하신 업무 이메일로 재설정 링크를 보내드릴게요. 계정이 잠겨있어도 이 메일로 풀 수 있어요.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErr("");
            }}
            placeholder="업무 이메일"
            autoComplete="email"
            className={authInput}
          />

          {err && <p className="pl-1 text-[13px] text-red-400">{err}</p>}

          <button type="submit" disabled={sending} className={`${authBtn} mt-1`}>
            {sending ? "보내는 중…" : "재설정 링크 받기"}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button type="button" onClick={() => router.push("/login")} className="text-[13px] text-fg-muted transition hover:text-fg">
            ← 로그인으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
