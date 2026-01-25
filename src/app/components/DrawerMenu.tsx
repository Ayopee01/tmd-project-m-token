"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { FaUserCircle } from "react-icons/fa";
import { useCzpAuth } from "@/app/hooks/auth-hook";

type Props = { open: boolean; onClose: () => void };

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

type MenuItem = { href: string; label: string };

const MENUS: MenuItem[] = [
  { href: "/page/daily", label: "พยากรณ์อากาศประจำวัน" },
  { href: "/page/map", label: "แผนที่อากาศพื้นผิว" },
  { href: "/page/week", label: "สรุปลักษณะอากาศรายสัปดาห์" },
  { href: "/page/monthly", label: "สรุปลักษณะอากาศรายเดือน" },
  { href: "/page/agroforecast", label: "พยากรณ์อากาศเพื่อการเกษตรราย 7 วัน" },
];

export default function DrawerMenu({ open, onClose }: Props) {
  const pathname = usePathname();
  const { user } = useCzpAuth();
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();

  // ESC to close + lock body scroll
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
    <>
      {/* Overlay */}
      <div
        className={[
          "fixed inset-0 z-40 transition-all duration-300",
          "bg-black/35 backdrop-blur-[2px]",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={[
          "fixed right-0 top-0 z-50 h-full w-[82%] max-w-[360px]",
          "bg-white/95 backdrop-blur",
          "shadow-[0_20px_60px_-20px_rgba(0,0,0,0.35)]",
          "transition-transform duration-300 ease-out will-change-transform",
          "rounded-l-3xl","flex flex-col",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex flex-col">
            <div className="text-xs font-medium text-gray-500">Navigation</div>
            <div className="text-base font-semibold text-gray-900">Menu</div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className={[
              "inline-flex h-10 w-10 items-center justify-center rounded-full",
              "text-gray-600 transition",
              "hover:bg-gray-100 hover:text-gray-900",
              "active:scale-[0.98]",
            ].join(" ")}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <nav className="px-3 py-3">
          <div className="space-y-1">
            {MENUS.map((m) => {
              const active = isActivePath(pathname, m.href);

              const linkClass = [
                "group relative block rounded-2xl px-4 py-3",
                "text-sm font-medium transition",
                "outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40",
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-800 hover:bg-gray-50 hover:text-indigo-600",
                "active:scale-[0.99]",
              ].join(" ");

              // const underlineClass = [
              //   "absolute left-4 right-4 -bottom-0.5 h-[3px] rounded-full bg-indigo-600",
              //   "origin-left scale-x-0 transition-transform duration-500 ease-out",
              //   "group-hover:scale-x-100",
              // ].join(" ");

              return (
                <Link key={m.href} href={m.href} onClick={onClose} className={linkClass}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate">{m.label}</span>

                  </div>

                  {/* <span className={underlineClass} /> */}
                </Link>
              );
            })}
          </div>
        </nav>
        {/* Footer: User */}
        <div className="mt-auto border-t border-gray-100 px-5 py-4">
          <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-800">
            <FaUserCircle className="h-6 w-6 text-gray-700" />
            <div className="min-w-0">
              <div className="text-xs text-gray-500">ผู้ใช้งาน</div>
              <div className="truncate font-medium">
                {fullName || "ไม่พบข้อมูลผู้ใช้"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
