"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
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
];

function DrawerMenu({ open, onClose }: Props) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const panelRef = useRef<HTMLDivElement | null>(null);

  const fullName = useMemo(
    () => [user?.firstName].filter(Boolean).join(" ").trim(),
    [user?.firstName, user?.lastName]
  );

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;

      if (target?.closest('button[aria-label="Open Menu"]')) return;

      const el = panelRef.current;
      if (!el) return;

      if (e.target instanceof Node && !el.contains(e.target)) onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, onClose]);

  return (
    <section className="w-full">
      {/* กำหนดการดัน Content ไปด้านล่างตอนเปิด Menu */}
      <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${open
        ? "grid-rows-[1fr]"
        : "grid-rows-[0fr]"}`}>
        <div className="overflow-hidden">
          {/* Body User */}
          <div ref={panelRef} className={`relative z-35 w-full bg-white transition-all duration-200 ease-out origin-top ${open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-2 pointer-events-none"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* User */}
            <div className="h-16 flex items-center justify-center text-sm font-medium text-emerald-600">
              {loading ? "..." : fullName ? `คุณ ${fullName}` : "ไม่พบข้อมูลผู้ใช้"}
            </div>

            <div className="h-2 w-full bg-linear-to-b from-gray-200 to-gray-100"></div>

            {/* Main Menu */}
            <nav className="bg-white">
              {MENUS.map((m) => {
                const active = isActivePath(pathname, m.href);

                return (
                  <Link
                    key={m.href}
                    href={m.href}
                    onClick={onClose}
                    className={`w-full px-4 h-14 flex items-center justify-center text-sm transition-colors border-b border-gray-100 ${active
                      ? "bg-emerald-50 text-emerald-700 font-medium"
                      : "text-gray-900 hover:bg-gray-50"}`}
                  >
                    {m.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </section >
  );
}

export default DrawerMenu;