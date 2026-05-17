import type { Metadata, Viewport } from "next";
import "./globals.css";
import { WSProvider } from "@/lib/ws-context";
import { StatusBar } from "@/components/StatusBar";
import { NavDock } from "@/components/NavDock";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "ANYA OS",
  description: "Anya Operating System",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ANYA OS",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#080810",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col relative bg-[var(--bg-primary)] overflow-hidden overscroll-none">
        <div className="flex flex-col flex-1 w-full h-full relative bg-[var(--bg-primary)]">
          <WSProvider>
            <StatusBar />
            <main className="flex-1 overflow-y-auto mt-[40px] mb-[60px] relative z-10 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
              {children}
            </main>
            <NavDock />
          </WSProvider>
        </div>
      </body>
    </html>
  );
}
