"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/app/hooks/auth-hook";

type Props = { open: boolean; onClose: () => void };

function isActivePath(pathname: string, href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
}

type MenuItem = { href: string; label: string };

const MENUS: MenuItem[] = [
    { href: "/", label: "Dashboard" },
    { href: "/landing/daily", label: "พยากรณ์อากาศประจำวัน" },
    { href: "/landing/map", label: "แผนที่อากาศพื้นผิว" },
    { href: "/landing/week", label: "สรุปลักษณะอากาศรายสัปดาห์" },
    { href: "/landing/monthly", label: "สรุปลักษณะอากาศรายเดือน" },
    { href: "/landing/agroforecast", label: "พยากรณ์อากาศเพื่อการเกษตรราย 7 วัน" },
    // { href: "/", label: "Mock1" },
    // { href: "/", label: "Mock2" },
    // { href: "/", label: "Mock3" },
    // { href: "/", label: "Mock4" },
    // { href: "/", label: "Mock5" },
    // { href: "/", label: "Mock6" },
    // { href: "/", label: "Mock7" },
    // { href: "/", label: "Mock8" },
    // { href: "/", label: "Mock9" },
    // { href: "/", label: "Mock10" },
    // { href: "/", label: "Mock11" },
    // { href: "/", label: "Mock12" },
];

// ตำแหน่งของ Topbar
const TOP_OFFSET = "top-18 md:top-22";

function DrawerMenu({ open, onClose }: Props) {
    const pathname = usePathname();
    const { user, loading } = useAuth();

    const fullName = useMemo(
        () => [user?.firstName].filter(Boolean).join(" ").trim(),
        [user?.firstName]
        // , user?.lastName
    );

    useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };

        window.addEventListener("keydown", onKeyDown);

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = prevOverflow;
        };
    }, [open, onClose]);

    return (
        <section className="w-full xl:hidden">
            {/* Overlay: fade in/out + คลิกปิด */}
            <button
                type="button"
                aria-label="Close menu overlay"
                onClick={onClose}
                className={`fixed inset-x-0 bottom-0 ${TOP_OFFSET} z-40 bg-black/40
                transition-opacity duration-300 ease-out
                ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
            />

            {/* Body User */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Navigation menu"
                className={`fixed inset-x-0 ${TOP_OFFSET} z-50 w-full border-t border-gray-100 bg-white shadow-lg overflow-hidden transition-[max-height,transform,opacity] duration-300 ease-out ${open
                    ? "opacity-100 translate-y-0 max-h-220"
                    : "opacity-0 -translate-y-2 max-h-0 pointer-events-none"
                    }`}
            >
                {/* User */}
                <div className="h-16 flex items-center justify-center text-sm font-medium text-emerald-600">
                    {loading ? "..." : fullName ? `คุณ ${fullName}` : "ไม่พบข้อมูลผู้ใช้"}
                </div>

                <div className="h-2 w-full bg-linear-to-b from-gray-200 to-gray-100"></div>

                {/* Main Menu */}
                <nav className="bg-white max-h-96 overflow-y-auto"> 
                    {MENUS.map((m) => {
                        const active = isActivePath(pathname, m.href);

                        return (
                            <Link
                                key={m.href}
                                href={m.href}
                                onClick={onClose}
                                className={`w-full px-4 h-14 flex items-center justify-center text-sm transition-colors border-b border-gray-100 ${active
                                    ? "bg-emerald-50 text-emerald-700 font-medium"
                                    : "text-gray-900 hover:bg-gray-50"
                                    }`}
                            >
                                {m.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </section>
    );
}

export default DrawerMenu;
