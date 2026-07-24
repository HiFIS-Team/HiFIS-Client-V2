"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api/client";
import { useToast } from "@/components/ui/toast";
import { authInput, authBtn, BrandMark } from "@/components/screens/auth/auth-ui";

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
  const [submitting, setSubmitting] = useState(false);
  // 제출 결과: 초대키로 즉시 가입 / 승인 대기 신청
  const [done, setDone] = useState<null | "joined" | "requested">(null);

  const hasKey = key.trim() !== "";

  const submit = async (e: React.FormEvent) => {
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
    setSubmitting(true);
    setErr("");
    try {
      // 초대키 유효성은 서버가 판단(있으면 즉시 가입 JOINED / 없거나 무효면 승인 대기 PENDING)
      const res = await api.post<{ result: "JOINED" | "PENDING" }>("/auth/signup", {
        name: name.trim(),
        email: email.trim(),
        password: pw,
        inviteKey: hasKey ? key.trim() : undefined,
      });
      if (res.result === "JOINED") {
        setDone("joined");
        show("가입이 완료되었습니다");
      } else {
        setDone("requested");
        show("가입 신청이 접수되었습니다");
      }
    } catch (e) {
      if (e instanceof ApiError && e.code === "EMAIL_TAKEN") setErr("이미 가입된 이메일이에요.");
      else if (e instanceof ApiError && e.code === "INVALID_INVITE_KEY") setErr("유효하지 않은 초대키예요. 관리자에게 확인해주세요.");
      else if (e instanceof ApiError && e.code === "VALIDATION_ERROR") setErr(e.message);
      else setErr("가입에 실패했어요. 네트워크를 확인해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  // 제출 후 결과 화면
  if (done) {
    const joined = done === "joined";
    return (
      <div className="flex min-h-full flex-col px-6 pb-8 pt-9">
        <BrandMark />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center pb-[8vh] text-center">
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
                <b className="text-fg">{name}</b>님, 이제 로그인해서 피트니스스타를 시작하세요.
              </>
            ) : (
              <>
                <b className="text-fg">관리자 승인</b> 후 이용할 수 있어요. 승인되면 알림으로 안내드립니다.
              </>
            )}
          </p>
          <button type="button" onClick={() => router.push("/login")} className={`${authBtn} mt-6`}>
            로그인 화면으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col px-6 pb-8 pt-9">
      <BrandMark />

      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center pb-[3vh]">
        <h1 className="text-xl font-bold">함께 시작해요</h1>
        <p className="mt-1.5 text-sm text-fg-muted">관리자에게 받은 초대키로 워크스페이스에 합류하세요.</p>

        <form onSubmit={submit} className="mt-6 space-y-2.5">
          <div>
            <input
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setErr("");
              }}
              placeholder="초대키 (예: HIFIS-2026)"
              className={`${authInput} font-mono uppercase tracking-wide placeholder:font-sans placeholder:normal-case placeholder:tracking-normal`}
            />
            <p className="mt-1.5 pl-1 text-[11px] leading-relaxed text-fg-muted">
              초대키가 있으면 <b className="text-fg">바로 가입</b>, 없으면 <b className="text-fg">관리자 승인</b> 후 이용할 수 있어요.
            </p>
          </div>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErr("");
            }}
            placeholder="이름"
            className={authInput}
          />
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
          <input
            type="password"
            value={pw}
            onChange={(e) => {
              setPw(e.target.value);
              setErr("");
            }}
            placeholder="비밀번호 (8자 이상)"
            autoComplete="new-password"
            className={authInput}
          />
          <input
            type="password"
            value={pw2}
            onChange={(e) => {
              setPw2(e.target.value);
              setErr("");
            }}
            placeholder="비밀번호 확인"
            autoComplete="new-password"
            className={authInput}
          />

          {err && <p className="pl-1 text-[13px] text-red-400">{err}</p>}

          <button type="submit" disabled={submitting} className={`${authBtn} mt-1`}>
            {submitting ? "처리 중…" : hasKey ? "가입하기" : "가입 신청"}
          </button>
        </form>

        <p className="mt-5 text-center text-[13px] text-fg-muted">
          이미 계정이 있나요?{" "}
          <button type="button" onClick={() => router.push("/login")} className="font-semibold text-primary-bright">
            로그인
          </button>
        </p>
      </div>
    </div>
  );
}
