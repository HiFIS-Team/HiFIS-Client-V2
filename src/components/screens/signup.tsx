"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

const labelCls = "mb-1.5 block text-[13px] font-semibold";
const inputCls =
  "w-full rounded-lg border border-white/10 bg-surface px-3.5 py-3 text-sm outline-none focus:border-primary/50 placeholder:text-fg-muted";

// 목: 유효한 초대키 (staff.tsx 초대키 발급 개념과 연결 예정)
const VALID_KEYS = ["HIFIS-2026", "GANGNAM-7A9K", "HWASUN-3B2M"];

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 6-6 6 6 6" />
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
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function Signup() {
  const router = useRouter();
  const { show } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [key, setKey] = useState("");
  const [err, setErr] = useState("");
  // 제출 결과: 초대키로 즉시 가입 / 승인 대기 신청
  const [done, setDone] = useState<null | "joined" | "requested">(null);

  const hasKey = key.trim() !== "";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !pw || !pw2) {
      setErr("모든 필수 항목을 입력해주세요.");
      return;
    }
    if (pw.length < 8) {
      setErr("비밀번호는 8자 이상이어야 해요.");
      return;
    }
    if (pw !== pw2) {
      setErr("비밀번호가 일치하지 않아요.");
      return;
    }
    if (hasKey) {
      // 초대키 검증 → 즉시 가입
      if (!VALID_KEYS.includes(key.trim().toUpperCase())) {
        setErr("유효하지 않은 초대키예요. 관리자에게 확인해주세요.");
        return;
      }
      setDone("joined");
      show("가입이 완료되었습니다");
    } else {
      // 초대키 없음 → 관리자 승인 대기
      setDone("requested");
      show("가입 신청이 접수되었습니다");
    }
  };

  // 제출 후 결과 화면
  if (done) {
    const joined = done === "joined";
    return (
      <div className="flex min-h-full flex-col justify-center px-6 py-10">
        <div className="mx-auto w-full max-w-sm text-center">
          <span
            className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${
              joined ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"
            }`}
          >
            {joined ? <CheckIcon className="h-7 w-7" /> : <ClockIcon className="h-7 w-7" />}
          </span>
          <h1 className="mt-4 text-xl font-bold">{joined ? "가입 완료" : "가입 신청 접수"}</h1>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            {joined ? (
              <>
                <b className="text-fg">{name}</b>님, 이제 로그인해서
                <br />
                피트니스스타를 시작하세요.
              </>
            ) : (
              <>
                <b className="text-fg">관리자 승인</b> 후 이용할 수 있어요.
                <br />
                승인되면 알림으로 안내드립니다.
              </>
            )}
          </p>
          <button type="button" onClick={() => router.push("/login")} className="btn-primary mt-7 w-full py-3 text-sm">
            로그인 화면으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full px-6 py-6">
      {/* 뒤로 */}
      <button
        type="button"
        onClick={() => router.push("/login")}
        aria-label="뒤로"
        className="-ml-2 grid h-9 w-9 place-items-center text-fg-muted transition hover:text-fg"
      >
        <BackIcon className="h-6 w-6" />
      </button>

      <div className="mx-auto w-full max-w-sm">
        <div className="mb-6 mt-2 flex flex-col items-center">
          <Image src="/hifis-logo.png" alt="HiFIS" width={1600} height={332} priority className="h-5 w-auto" />
          <h1 className="mt-3 text-lg font-bold">회원가입</h1>
        </div>

        <form onSubmit={submit} className="space-y-3.5">
          <div>
            <label className={labelCls}>이름</label>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErr("");
              }}
              placeholder="이름"
              className={inputCls}
            />
          </div>
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
            <input
              type="password"
              value={pw}
              onChange={(e) => {
                setPw(e.target.value);
                setErr("");
              }}
              placeholder="8자 이상"
              autoComplete="new-password"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>비밀번호 확인</label>
            <input
              type="password"
              value={pw2}
              onChange={(e) => {
                setPw2(e.target.value);
                setErr("");
              }}
              placeholder="비밀번호 재입력"
              autoComplete="new-password"
              className={inputCls}
            />
          </div>

          {/* 초대키 (선택) */}
          <div>
            <label className={labelCls}>
              초대키 <span className="font-normal text-fg-muted">(선택)</span>
            </label>
            <input
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setErr("");
              }}
              placeholder="예) HIFIS-2026"
              className={`${inputCls} font-mono uppercase tracking-wide`}
            />
            <p className="mt-1.5 text-[11px] leading-relaxed text-fg-muted">
              초대키가 있으면 <b className="text-fg">바로 가입</b>돼요. 없으면 <b className="text-fg">관리자 승인</b> 후 이용할 수 있어요.
            </p>
          </div>

          {err && <p className="text-xs text-red-400">{err}</p>}

          <button type="submit" className="btn-primary w-full py-3 text-sm">
            {hasKey ? "가입하기" : "가입 신청"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-fg-muted">
          이미 계정이 있으신가요?{" "}
          <button type="button" onClick={() => router.push("/login")} className="font-semibold text-primary-bright">
            로그인
          </button>
        </p>
      </div>
    </div>
  );
}
