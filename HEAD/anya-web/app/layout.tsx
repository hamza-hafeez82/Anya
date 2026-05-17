import type { Metadata, Viewport } from "next";
import "./globals.css";
import { WSProvider } from "@/lib/ws-context";
import { LayoutWrapper } from "@/components/LayoutWrapper";

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
            <LayoutWrapper>{children}</LayoutWrapper>
          </WSProvider>
        </div>
      </body>
    </html>
  );
}
