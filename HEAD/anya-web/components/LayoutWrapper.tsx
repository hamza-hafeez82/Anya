"use client";

import { NavDock } from "./NavDock";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main
        className="flex-1 overflow-y-auto relative z-10 flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] transition-all duration-300 mt-0 mb-0"
      >
        {children}
      </main>
      <NavDock />
    </>
  );
}
