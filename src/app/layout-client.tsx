"use client";

import { useEffect, useState, Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import Navbar from "@/app/components/Navbar";
import DrawerMenu from "./components/DrawerMenu_Sticky";
import Footer from "./components/Footer";
import QueryString from "@/app/components/QueryString";
import { AuthProvider } from "@/app/hooks/auth-hook";
import ScrollTopButton from "@/app/components/ScrollTop";
import SwipeBack from "@/app/components/SwipeBack";
import RouteSnapshot from "@/app/components/RouteSnapshot";

type LayoutChromeProps = {
  children: ReactNode;
  open: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
};

function LayoutChrome({
  children,
  open,
  onToggleMenu,
  onCloseMenu,
}: LayoutChromeProps) {
  return (
    <>
      <Navbar onOpenMenu={onToggleMenu} />
      <DrawerMenu open={open} onClose={onCloseMenu} />
      {children}
      <Footer />
    </>
  );
}

function isSwipeBlocked(pathname: string) {
  return pathname === "/";
  // เพิ่ม route ที่ไม่อยากให้ swipe back ได้ตรงนี้ เช่น
  // return pathname === "/" || pathname.startsWith("/map");
}

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

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <QueryString />
      </Suspense>

      <RouteSnapshot pathname={pathname} current={children}>
        {(snapshotChildren) => {
          const currentShell = (
            <LayoutChrome
              open={open}
              onToggleMenu={() => setOpen((v) => !v)}
              onCloseMenu={() => setOpen(false)}
            >
              {children}
            </LayoutChrome>
          );

          const underlayShell = snapshotChildren ? (
            <LayoutChrome
              open={false}
              onToggleMenu={() => {}}
              onCloseMenu={() => {}}
            >
              {snapshotChildren}
            </LayoutChrome>
          ) : (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50" />
          );

          return (
            <SwipeBack
              enabled={!open && !isSwipeBlocked(pathname)}
              fallbackHref="/"
              mobileOnly
              mobileMaxWidth={1024}
              edge={20}
              threshold={92}
              velocityThreshold={620}
              underlay={underlayShell}
            >
              {currentShell}
            </SwipeBack>
          );
        }}
      </RouteSnapshot>

      <ScrollTopButton />
    </AuthProvider>
  );
}