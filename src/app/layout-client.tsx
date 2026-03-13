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

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    window.czpSdk?.setBackButtonVisible?.(true);
  }, [pathname]);

  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <QueryString />
      </Suspense>

      <SwipeBack
        disabled={open}
        fallbackHref="/"
        underlay={
          <div className="h-full w-full bg-gradient-to-br from-slate-100 via-white to-emerald-50" />
        }
      >
        <Navbar onOpenMenu={() => setOpen((i) => !i)} />
        <DrawerMenu open={open} onClose={() => setOpen(false)} />
        {children}
        <Footer />
      </SwipeBack>

      <ScrollTopButton />
    </AuthProvider>
  );
}