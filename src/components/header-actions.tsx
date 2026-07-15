"use client";

import { useNotifications } from "@/components/notifications";

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8.5a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5" />
      <path d="M10.5 20a2 2 0 0 0 3 0" />
    </svg>
  );
}

export function HeaderActions() {
  const { openPanel, hasUnseen } = useNotifications();

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={openPanel}
        aria-label="알림"
        className="relative grid h-9 w-8 place-items-center text-fg-muted transition hover:text-fg"
      >
        <BellIcon className="h-5 w-5" />
        {hasUnseen && (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-surface" />
        )}
      </button>
    </div>
  );
}
