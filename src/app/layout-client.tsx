// app/RootLayoutClient.tsx
"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { usePathname } from "next/navigation";

import Navbar from "@/app/components/Navbar";
import DrawerMenu from "./components/DrawerMenu_Sticky";
import Footer from "./components/Footer";
import QueryString from "@/app/components/QueryString";
import { AuthProvider } from "@/app/hooks/auth-hook";

export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const pathname = usePathname();
  const lockRef = useRef<string>(""); // กันยิงซ้ำ
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (lockRef.current === pathname) return;
    lockRef.current = pathname;

    const apply = () => {
      if (window.czpSdk?.setBackButtonVisible) {
        window.czpSdk.setBackButtonVisible(true); // ✅ True เสมอ
        return true;
      }
      return false;
    };

    // เคลียร์ interval เก่าก่อน
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (apply()) return;

    // รอ SDK โหลด
    timerRef.current = window.setInterval(() => {
      if (apply() && timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, 200);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [pathname]);

  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <QueryString />
      </Suspense>

      <Navbar onOpenMenu={() => setOpen((i) => !i)} />
      <DrawerMenu open={open} onClose={() => setOpen(false)} />

      {children}

      <Footer />
    </AuthProvider>
  );
}
