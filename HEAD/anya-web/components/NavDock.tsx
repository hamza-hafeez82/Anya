"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

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
  const [isOpen, setIsOpen] = useState(false);

  // Auto-collapse on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Floating Hamburger / Close Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed z-[60] p-3 rounded-full border border-[var(--border)] bg-[var(--bg-panel)] text-[var(--text-primary)] hover:text-[var(--accent-pink)] transition-all duration-300 shadow-[var(--glow-pink)] active:scale-95 cursor-pointer ${
          isOpen ? "bottom-[72px] right-4" : "bottom-4 right-4"
        }`}
        aria-label="Toggle Navigation"
      >
        {isOpen ? (
          // Close "X" Icon
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          // Hamburger Icon
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        )}
      </button>

      {/* Slide-up Navigation Dock */}
      <nav
        className={`fixed bottom-0 left-0 right-0 h-[60px] bg-[var(--bg-secondary)] border-t border-[var(--border)] z-50 flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] w-full transition-all duration-300 ${
          isOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
        }`}
      >
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
    </>
  );
}
