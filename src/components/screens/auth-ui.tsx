import Image from "next/image";

/**
 * 인증 화면(로그인·회원가입·비밀번호 찾기) 공용 스타일.
 * 앱 본문은 각진 톤이지만, 진입 화면은 레퍼런스대로 **둥근 필드 + 퍼플 pill 버튼**으로.
 */

// 둥근 필드(16px), 채움 배경, 포커스 시 퍼플 링
export const authInput =
  "w-full rounded-[16px] bg-surface-2 px-4 py-4 text-[15px] outline-none transition placeholder:text-fg-muted focus:ring-2 focus:ring-primary/40";

// 꽉 찬 퍼플 pill CTA
export const authBtn =
  "w-full rounded-full bg-primary py-4 text-[15px] font-bold text-white shadow-[0_12px_30px_-10px_rgba(157,59,252,0.5)] transition active:scale-[0.99] disabled:opacity-55";

// 상단 좌측 로고 + 태그라인
export function BrandMark() {
  return (
    <div className="shrink-0">
      <Image src="/hifis-logo.png" alt="HiFIS" width={1600} height={332} priority className="h-6 w-auto" />
      <p className="mt-1.5 text-[11px] font-semibold tracking-wide text-fg-muted">피트니스스타 직원 관리</p>
    </div>
  );
}
