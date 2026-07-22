import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NotificationsProvider } from "@/components/overlays/notifications";
import { ToastProvider } from "@/components/ui/toast";
import { SearchProvider } from "@/components/overlays/search";
import { ChatProvider } from "@/components/overlays/chat";
import { GuideProvider } from "@/components/overlays/guide";
import { AttendanceProvider } from "@/providers/attendance";
import { AuthProvider } from "@/providers/auth";
import { ViewportFix } from "@/components/layout/viewport-fix";
import { ProjectsProvider } from "@/providers/projects-store";
import { Chrome } from "@/components/layout/chrome";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HiFIS · 직원 관리 플랫폼",
  description: "피트니스스타 직원 관리 플랫폼",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HiFIS",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // iOS 입력창 포커스 시 자동 줌 방지
  userScalable: false,
  viewportFit: "cover", // 노치·홈 인디케이터 세이프 에어리어 대응
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-bg text-fg">
        <ViewportFix />
        <div className="app-frame relative mx-auto flex max-w-md flex-col overflow-hidden bg-bg">
          {/* 상단 은은한 퍼플 글로우 */}
          <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-[80px]" />
          <ToastProvider>
            <AuthProvider>
              <ProjectsProvider>
                <NotificationsProvider>
                  <SearchProvider>
                    <ChatProvider>
                      <AttendanceProvider>
                        <GuideProvider>
                          <Chrome>{children}</Chrome>
                        </GuideProvider>
                      </AttendanceProvider>
                    </ChatProvider>
                  </SearchProvider>
                </NotificationsProvider>
              </ProjectsProvider>
            </AuthProvider>
          </ToastProvider>
        </div>
      </body>
    </html>
  );
}
