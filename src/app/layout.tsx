import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";

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
        <div className="relative mx-auto flex h-dvh max-w-md flex-col overflow-hidden bg-bg">
          {/* 상단 은은한 퍼플 글로우 */}
          <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-[80px]" />
          <AppHeader />
          <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {children}
          </main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
