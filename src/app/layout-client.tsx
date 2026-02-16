// app/RootLayoutClient.tsx
"use client";

import { useState, Suspense } from "react";
import Navbar from "@/app/components/Navbar";
import DrawerMenu from "./components/DrawerMenu_Sticky";
import Footer from "./components/Footer";
import QueryString from "@/app/components/QueryString";
import { AuthProvider } from "@/app/hooks/auth-hook";
import CzpBackButtonVisible from "@/app/components/CzpBackButtonVisible";
import SwipeBack from "@/app/components/SwipeBack";

export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);

    return (
        <AuthProvider>
            {/* ปุ่ม Back ของ CZP */}
            <CzpBackButtonVisible visible={true} />

            {/* ปัดขวาเพื่อย้อนกลับ */}
            <SwipeBack disabled={open} />

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
