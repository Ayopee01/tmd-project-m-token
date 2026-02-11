// app/RootLayoutClient.tsx
"use client";

import { useState, Suspense } from "react";
import Navbar from "@/app/components/Navbar";
import DrawerMenu from "@/app/components/DrawerMenu";
import Footer from "./components/Footer";
import QueryString from "@/app/components/QueryString";
import { AuthProvider } from "@/app/hooks/auth-hook";

export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);

    return (
        <AuthProvider>
            <Suspense fallback={null}>
                <QueryString />
            </Suspense>
            {/* <Navbar onOpenMenu={() => setOpen(true)} /> */}

            {/* ✅ toggle เปิด/ปิด */}
            <Navbar onOpenMenu={() => setOpen((i) => !i)} />
            <DrawerMenu open={open} onClose={() => setOpen(false)} />
            {children}
            <Footer />
        </AuthProvider>
    );
}
