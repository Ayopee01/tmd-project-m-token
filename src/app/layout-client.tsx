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
import usePreviousPathInStack from "@/app/hooks/usePreviousPathInStack";

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
  // เพิ่ม route ได้ เช่น:
  // return pathname === "/" || pathname.startsWith("/map");
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
        <LayoutChrome
          open={open}
          onToggleMenu={() => setOpen((v) => !v)}
          onCloseMenu={() => setOpen(false)}
        >
          {children}
        </LayoutChrome>
      </SwipeBack>

      <ScrollTopButton />
    </AuthProvider>
  );
}