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
      <div
        id="swipeback-root"
        className="min-h-dvh overflow-x-hidden touch-pan-y"
      >
        <Navbar onOpenMenu={() => setOpen((i) => !i)} />
        <DrawerMenu open={open} onClose={() => setOpen(false)} />

        {children}
        <Footer />
      </div>
    </AuthProvider>
  );
}
