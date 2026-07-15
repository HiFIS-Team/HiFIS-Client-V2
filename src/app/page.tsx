export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 px-6 text-center dark:bg-black">
      <span className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium tracking-wide text-zinc-500 dark:border-white/15 dark:text-zinc-400">
        HiFIS · V2
      </span>
      <h1 className="text-4xl font-semibold tracking-tight text-black dark:text-zinc-50">
        피트니스스타 직원 관리 플랫폼
      </h1>
      <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        프론트엔드 초기 세팅이 완료되었습니다. 이제 화면을 만들어 나갈 수 있어요.
      </p>
    </div>
  );
}
