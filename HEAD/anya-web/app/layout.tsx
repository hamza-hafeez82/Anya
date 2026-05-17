import type { Metadata } from "next";
import "./globals.css";
import { WSProvider } from "@/lib/ws-context";
import { StatusBar } from "@/components/StatusBar";
import { NavDock } from "@/components/NavDock";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "ANYA OS",
  description: "Anya Operating System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col relative bg-[var(--bg-primary)]">
        <div className="flex flex-col flex-1 w-full max-w-[430px] mx-auto relative shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-[var(--bg-primary)] h-full">
          <WSProvider>
            <StatusBar />
            <main className="flex-1 overflow-y-auto mt-[40px] mb-[60px] relative z-10 flex flex-col">
              {children}
            </main>
            <NavDock />
          </WSProvider>
        </div>
      </body>
    </html>
  );
}
