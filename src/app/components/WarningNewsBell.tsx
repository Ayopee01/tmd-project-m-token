"use client";

import { useEffect, useMemo, useState } from "react";
// Components
import WarningNewsPopup from "@/app/components/Warning_News";
// Icons
import { FiBell } from "react-icons/fi";
// Types
import type { WarningData } from "@/app/types/warning";

const WARNING_NEWS_AUTO_OPEN_KEY = "warning_news_auto_opened";

function WarningNewsBell() {
    const [warnings, setWarnings] = useState<WarningData>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function loadWarnings() {
            try {
                setLoading(true);

                const res = await fetch("/api/warning_news", {
                    cache: "no-store",
                });

                const json = await res.json().catch(() => null);

                if (cancelled) return;

                const list: WarningData = Array.isArray(json?.warnings)
                    ? json.warnings
                    : json?.warning
                        ? [json.warning]
                        : [];

                setWarnings(list);

                const alreadyAutoOpened = sessionStorage.getItem(
                    WARNING_NEWS_AUTO_OPEN_KEY
                );

                // เปิด Popup อัตโนมัติแค่ครั้งเดียวใน session นี้ ถ้ามีข่าว
                if (list.length > 0 && alreadyAutoOpened !== "true") {
                    setOpen(true);
                    sessionStorage.setItem(WARNING_NEWS_AUTO_OPEN_KEY, "true");
                }
            } catch {
                if (!cancelled) {
                    setWarnings([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadWarnings();

        return () => {
            cancelled = true;
        };
    }, []);

    const count = warnings.length;

    const badgeText = useMemo(() => {
        if (count > 99) return "99+";
        return String(count);
    }, [count]);

    const canOpenPopup = count > 0;

    return (
        <>
            {/* Icon Notification */}
            <button
                type="button"
                onClick={() => {
                    if (!canOpenPopup) return;
                    setOpen(true);
                }}
                disabled={!canOpenPopup}
                className={[
                    "relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition",
                    canOpenPopup
                        ? "cursor-pointer hover:bg-gray-50 hover:text-gray-950 active:scale-95"
                        : "cursor-default opacity-60",
                ].join(" ")}
                aria-label={`ประกาศแจ้งเตือน ${count} รายการ`}
            >
                <FiBell
                    className={[
                        "h-5 w-5 transition",
                        canOpenPopup ? "text-gray-800" : "text-gray-400",
                    ].join(" ")}
                    aria-hidden="true"
                />

                {count > 0 ? (
                    <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white ring-2 ring-white">
                        {badgeText}
                    </span>
                ) : null}

                {loading ? (
                    <span className="absolute right-1 top-1 h-2 w-2 animate-pulse rounded-full bg-gray-300" />
                ) : null}
            </button>

            {/* Popup Notification */}
            <WarningNewsPopup
                open={open}
                warnings={warnings}
                onClose={() => setOpen(false)}
            />
        </>
    );
}

export default WarningNewsBell;