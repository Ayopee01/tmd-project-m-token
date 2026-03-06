// app/RootLayoutClient.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname } from "next/navigation";

import Navbar from "@/app/components/Navbar";
import DrawerMenu from "./components/DrawerMenu_Sticky";
import Footer from "./components/Footer";
import QueryString from "@/app/components/QueryString";
import { AuthProvider } from "@/app/hooks/auth-hook";
<<<<<<< HEAD
// import SwipeBack from "@/app/components/SwipeBack";
=======
>>>>>>> main

export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

<<<<<<< HEAD
  return (
    <AuthProvider>
      {/* ปัดขวาเพื่อย้อนกลับ */}
      {/* <SwipeBack disabled={open} /> */}
=======
    useEffect(() => {
        window.czpSdk?.setBackButtonVisible?.(true);
    }, [pathname]);
>>>>>>> main

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
