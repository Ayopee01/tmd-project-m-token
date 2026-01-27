// app/RootLayoutClient.tsx
"use client";

import { useState } from "react";
import Navbar from "@/app/components/Navbar";
import DrawerMenu from "@/app/components/DrawerMenu";
import QueryString from "@/app/components/QueryString";
import { AuthProvider } from "@/app/hooks/auth-hook";

export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);

    return (
        <AuthProvider>
            <QueryString />
            <Navbar onOpenMenu={() => setOpen(true)} />
            <DrawerMenu open={open} onClose={() => setOpen(false)} />
            {children}
        </AuthProvider>
    );
}
