import Image from "next/image";

/**
 * 인증 화면(로그인·회원가입·비밀번호 찾기) 공용 스타일.
 * 레퍼런스는 **배치(상단 로고→헤딩→필드→버튼→링크)만 참고**하고,
 * 필드·버튼·글자·간격은 전부 **앱 표준(각진 톤)** 그대로.
 */

// 앱 표준 인풋 (각진 rounded-lg=6px, 우리 크기)
export const authInput =
  "w-full rounded-lg border border-white/10 bg-surface px-3.5 py-3 text-sm outline-none transition focus:border-primary/50 placeholder:text-fg-muted";

// 앱 표준 CTA
export const authBtn = "btn-primary w-full py-3 text-sm";

// 상단 좌측 로고 + 태그라인
export function BrandMark() {
  return (
    <div className="shrink-0">
      <Image src="/hifis-logo.png" alt="HiFIS" width={1600} height={332} priority className="h-5 w-auto" />
      <p className="mt-1.5 text-[11px] font-semibold tracking-wide text-fg-muted">피트니스스타 직원 관리</p>
    </div>
  );
}
