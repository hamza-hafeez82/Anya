"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { icon: "👾", label: "FACE", path: "/" },
  { icon: "👁", label: "VIEW", path: "/view" },
  { icon: "👂", label: "HEAR", path: "/hear" },
  { icon: "🕹", label: "CTRL", path: "/control" },
  { icon: "🧠", label: "MIND", path: "/mind" },
  { icon: "📍", label: "LOCATE", path: "/locate" },
];

export function NavDock() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[60px] bg-[var(--bg-secondary)] border-t border-[var(--border)] z-50 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] w-full">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link
            key={item.path}
            href={item.path}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all ${
              isActive 
                ? "text-[var(--accent-pink)] scale-110 drop-shadow-[var(--glow-pink)]" 
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span className="text-[9px] font-mono tracking-wider">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
