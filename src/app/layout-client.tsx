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
      {/* ปัดขวาเพื่อย้อนกลับ */}
      <SwipeBack disabled={open} targetId="swipeback-root" backId="swipeback-back" />

      <Suspense fallback={null}>
        <QueryString />
      </Suspense>

      {/* stage */}
      <div
        id="swipeback-stage"
        className="relative isolate min-h-dvh overflow-x-hidden overscroll-x-none bg-white"
      >
        {/* back preview layer (อยู่หลังสุด) */}
        <div
          id="swipeback-back"
          className="fixed inset-0 z-0 pointer-events-none opacity-0"
        />

        {/* UI คงที่ (กดได้เสมอ) */}
        <div className="relative z-20">
          <Navbar onOpenMenu={() => setOpen((i) => !i)} />
          <DrawerMenu open={open} onClose={() => setOpen(false)} />
        </div>

        {/* ✅ front content (เฉพาะเนื้อหน้า) */}
        <main id="swipeback-root" className="relative z-10 min-h-[calc(100dvh)] touch-pan-y">
          {children}
        </main>

        {/* UI คงที่ด้านล่าง (กดได้เสมอ) */}
        <div className="relative z-20">
          <Footer />
        </div>
      </div>
    </AuthProvider>
  );
}
