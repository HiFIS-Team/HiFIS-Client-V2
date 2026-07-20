"use client";

import { useRouter } from "next/navigation";
import type { ReactElement } from "react";
import { useChat } from "@/components/chat";
import { useNotifications } from "@/components/notifications";

const ME = { name: "김은후", email: "eunhoo@hifis.co.kr", color: "#9d3bfc" };

type IconP = { className?: string };
const svg = (children: ReactElement) => ({ className }: IconP) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const HomeIcon = svg(<><path d="M3 10.75 12 4l9 6.75" /><path d="M5.5 9.5V20h13V9.5" /></>);
const ChecklistIcon = svg(<><path d="m3 7 1.5 1.5L7 6" /><path d="m3 16 1.5 1.5L7 15" /><path d="M11 7.5h9" /><path d="M11 16.5h9" /></>);
const FolderIcon = svg(<path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h3.6l2 2.4h6.9A1.5 1.5 0 0 1 19 9.9v7.6a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 17.5Z" />);
const NoteIcon = svg(<><path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20Z" /><path d="M14 3.5V8h4" /><path d="M9.5 12.5h5" /><path d="M9.5 16h5" /></>);
const ClockIcon = svg(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>);
const ScheduleIcon = svg(<><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" /></>);
const ArchiveIcon = svg(<><path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h3.8l1.8 2.2H19a1.5 1.5 0 0 1 1.5 1.5v8.8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5Z" /></>);
const ApprovalIcon = svg(<><path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A.5.5 0 0 1 7 20Z" /><path d="M14 3.5V8h4" /><path d="m9.5 14 1.8 1.8L15 12" /></>);
const MegaphoneIcon = svg(<><path d="M3 11v2a1 1 0 0 0 1 1h2.5l6 3.5v-11L6.5 10H4a1 1 0 0 0-1 1Z" /><path d="M16.5 9.5a3.5 3.5 0 0 1 0 5" /></>);
const ChatIcon = svg(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />);
const BellIcon = svg(<><path d="M18 8.5a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5" /><path d="M10.5 20a2 2 0 0 0 3 0" /></>);
const UsersIcon = svg(<><circle cx="9" cy="8" r="3" /><path d="M4 19a5 5 0 0 1 10 0" /><path d="M16 6.5a2.8 2.8 0 0 1 0 5.5" /><path d="M17 14.2a5 5 0 0 1 3 4.8" /></>);
const BillIcon = svg(<><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h8M8 17h5" /></>);
const TrophyIcon = svg(<><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M6 4h12v5a6 6 0 0 1-12 0Z" /><path d="M12 15v3" /><path d="M8.5 20.5h7" /><path d="M9.5 20.5c0-1.5 1-2.5 2.5-2.5s2.5 1 2.5 2.5" /></>);
const UserIcon = svg(<><circle cx="12" cy="8.5" r="3.5" /><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" /></>);
const LogoutIcon = svg(<><path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" /><path d="M10 8 6 12l4 4" /><path d="M6 12h11" /></>);
const ChevronRightIcon = ({ className }: IconP) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 6 6 6-6 6" />
  </svg>
);

type Item = {
  key: string;
  label: string;
  Icon: (p: IconP) => ReactElement;
  href?: string;
  action?: "chat" | "noti";
  danger?: boolean;
};

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: "업무",
    items: [
      { key: "home", label: "홈", Icon: HomeIcon, href: "/" },
      { key: "schedule", label: "일정", Icon: ScheduleIcon, href: "/schedule" },
      { key: "tasks", label: "업무", Icon: ChecklistIcon, href: "/tasks" },
      { key: "projects", label: "프로젝트", Icon: FolderIcon, href: "/projects" },
      { key: "approvals", label: "전자결재", Icon: ApprovalIcon, href: "/approvals" },
      { key: "notes", label: "회의록", Icon: NoteIcon, href: "/notes" },
      { key: "attendance", label: "근태·월차", Icon: ClockIcon, href: "/attendance" },
    ],
  },
  {
    title: "자료",
    items: [{ key: "docs", label: "문서함", Icon: ArchiveIcon, href: "/docs" }],
  },
  {
    title: "커뮤니케이션",
    items: [
      { key: "notices", label: "공지", Icon: MegaphoneIcon, href: "/notices" },
      { key: "chat", label: "사내톡", Icon: ChatIcon, action: "chat" },
      { key: "noti", label: "알림", Icon: BellIcon, action: "noti" },
      { key: "staff", label: "직원", Icon: UsersIcon }, // 자리표시자
    ],
  },
  {
    title: "인사·급여",
    items: [
      { key: "payroll", label: "급여명세서", Icon: BillIcon }, // 자리표시자
      { key: "ranking", label: "랭킹", Icon: TrophyIcon }, // 자리표시자
    ],
  },
  {
    title: "내 계정",
    items: [
      { key: "profile", label: "프로필", Icon: UserIcon, href: "/profile" },
      { key: "logout", label: "로그아웃", Icon: LogoutIcon, danger: true }, // 자리표시자
    ],
  },
];

export function AllMenu() {
  const router = useRouter();
  const { openChat } = useChat();
  const { openPanel, hasUnseen } = useNotifications();

  const go = (it: Item) => {
    if (it.href) router.push(it.href);
    else if (it.action === "chat") openChat();
    else if (it.action === "noti") openPanel();
    // 나머지는 자리표시자
  };

  return (
    <div className="px-4 pb-8 pt-5">
      {/* 프로필 카드 */}
      <button
        type="button"
        onClick={() => router.push("/profile")}
        className="flex w-full items-center gap-3.5 rounded-2xl border border-white/10 bg-surface p-4 text-left"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-lg font-bold text-white" style={{ backgroundColor: ME.color }}>
          {ME.name.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold">{ME.name}</p>
          <p className="truncate text-sm text-fg-muted">{ME.email}</p>
        </div>
        <ChevronRightIcon className="h-5 w-5 shrink-0 text-fg-muted" />
      </button>

      {/* 섹션 메뉴 */}
      <nav className="mt-3">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <p className="px-2 pb-1 pt-4 text-xs font-semibold text-fg-muted">{s.title}</p>
            {s.items.map((it) => (
              <button
                key={it.key}
                type="button"
                onClick={() => go(it)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left"
              >
                <it.Icon className={`h-5 w-5 shrink-0 ${it.danger ? "text-red-400" : "text-fg-muted"}`} />
                <span className={`flex-1 text-[15px] font-semibold ${it.danger ? "text-red-400" : "text-fg"}`}>{it.label}</span>
                {it.action === "noti" && hasUnseen && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
              </button>
            ))}
          </div>
        ))}
      </nav>
    </div>
  );
}
