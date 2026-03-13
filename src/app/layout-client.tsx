"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname } from "next/navigation";

import Navbar from "@/app/components/Navbar";
import DrawerMenu from "./components/DrawerMenu_Sticky";
import Footer from "./components/Footer";
import QueryString from "@/app/components/QueryString";
import { AuthProvider } from "@/app/hooks/auth-hook";
import ScrollTopButton from "@/app/components/ScrollTop";
import SwipeBack from "@/app/components/SwipeBack";
import usePreviousPathInStack from "@/app/hooks/usePreviousPathInStack";

function isSwipeBlocked(pathname: string) {
  return pathname === "/";
}

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const previousPath = usePreviousPathInStack(pathname);

  useEffect(() => {
    window.czpSdk?.setBackButtonVisible?.(true);
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <QueryString />
      </Suspense>

      {/* Navbar ไม่ปัดไปด้วย */}
      <Navbar onOpenMenu={() => setOpen((v) => !v)} />
      <DrawerMenu open={open} onClose={() => setOpen(false)} />

      {/* ปัดเฉพาะเนื้อหา */}
      <SwipeBack
        enabled={!open && !isSwipeBlocked(pathname)}
        fallbackHref="/"
        mobileOnly
        mobileMaxWidth={1024}
        edge={20}
        threshold={92}
        velocityThreshold={620}
        previousHref={previousPath}
      >
        <main className="min-h-screen bg-white">
          {children}
          <Footer />
        </main>
      </SwipeBack>

      <ScrollTopButton />
    </AuthProvider>
  );
}