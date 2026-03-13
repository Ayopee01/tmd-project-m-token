"use client";

import {
  useEffect,
  useRef,
  useState,
  Suspense,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

import Navbar from "@/app/components/Navbar";
import DrawerMenu from "./components/DrawerMenu_Sticky";
import Footer from "./components/Footer";
import QueryString from "@/app/components/QueryString";
import { AuthProvider } from "@/app/hooks/auth-hook";
import ScrollTopButton from "@/app/components/ScrollTop";
import SwipeBack from "@/app/components/SwipeBack";
import PageSnapshotRecorder from "@/app/components/PageSnapshotRecorder";
import usePreviousPathInStack from "@/app/hooks/usePreviousPathInStack";
import { usePageSnapshot } from "@/app/lib/page-snapshot-store";

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
}

export default function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const shellRef = useRef<HTMLDivElement | null>(null);

  const previousPath = usePreviousPathInStack(pathname);
  const previousSnapshot = usePageSnapshot(previousPath);

  useEffect(() => {
    window.czpSdk?.setBackButtonVisible?.(true);
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const currentShell = (
    <div ref={shellRef} className="min-h-screen bg-white">
      <LayoutChrome
        open={open}
        onToggleMenu={() => setOpen((v) => !v)}
        onCloseMenu={() => setOpen(false)}
      >
        {children}
      </LayoutChrome>
    </div>
  );

  const underlay = previousSnapshot ? (
    <img
      src={previousSnapshot}
      alt=""
      aria-hidden="true"
      className="h-full w-full select-none object-cover object-top"
      draggable={false}
    />
  ) : (
    <div className="min-h-screen bg-white" />
  );

  return (
    <AuthProvider>
      <Suspense fallback={null}>
        <QueryString />
      </Suspense>

      <PageSnapshotRecorder
        pathname={pathname}
        targetRef={shellRef}
        enabled={!open}
        delay={180}
      />

      <SwipeBack
        enabled={!open && !isSwipeBlocked(pathname)}
        fallbackHref="/"
        mobileOnly
        mobileMaxWidth={1024}
        edge={20}
        threshold={92}
        velocityThreshold={620}
        underlay={underlay}
      >
        {currentShell}
      </SwipeBack>

      <div data-snapshot-ignore>
        <ScrollTopButton />
      </div>
    </AuthProvider>
  );
}