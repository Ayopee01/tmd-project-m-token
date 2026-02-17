// app/RootLayoutClient.tsx
"use client";

import { useState, Suspense } from "react";
import Navbar from "@/app/components/Navbar";
import DrawerMenu from "./components/DrawerMenu_Sticky";
import Footer from "./components/Footer";
import QueryString from "@/app/components/QueryString";
import { AuthProvider } from "@/app/hooks/auth-hook";
import SwipeBack from "@/app/components/SwipeBack";

export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <AuthProvider>
      <SwipeBack disabled={open} />

      <Suspense fallback={null}>
        <QueryString />
      </Suspense>

      {/* ✅ stage: มี back layer + front layer */}
      <div id="swipeback-stage" className="relative min-h-dvh overflow-x-hidden overscroll-x-none bg-white">
        {/* ✅ ต้องมีตัวนี้ เพื่อให้ SwipeBack ผูก gesture + แสดงหน้าเก่าตอนปัด */}
        <div
          id="swipeback-back"
          className="fixed inset-0 z-0 pointer-events-none opacity-0"
        />

        {/* front layer */}
        <div id="swipeback-root" className="relative z-10 min-h-dvh touch-pan-y">
          <Navbar onOpenMenu={() => setOpen((i) => !i)} />
          <DrawerMenu open={open} onClose={() => setOpen(false)} />

          {children}
          <Footer />
        </div>
      </div>
    </AuthProvider>
  );
}
