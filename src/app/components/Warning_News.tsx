"use client";

import { useEffect, useState } from "react";
import { FiXCircle } from "react-icons/fi";

type WarningData = {
  key: string;
  title: string;
  description: string;
  publishedAt: string | null;
  raw: unknown;
} | null;

export default function AnnouncementPopup() {
  const [warning, setWarning] = useState<WarningData>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadWarning() {
      try {
        const res = await fetch("/api/warning_news", {
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);
        if (cancelled) return;

        const item = json?.warning ?? null;

        // ถ้า API ไม่มีข้อมูล => ไม่แสดง popup
        if (!item) {
          setMounted(true);
          return;
        }

        setWarning(item);

        // แสดงครั้งเดียวต่อประกาศ 1 ชิ้น
        const seenKey = `seen-warning-popup-${item.key}`;
        const seen = localStorage.getItem(seenKey);

        if (!seen) {
          setOpen(true);
          localStorage.setItem(seenKey, "true");
        }

        setMounted(true);
      } catch {
        if (!cancelled) {
          setMounted(true);
        }
      }
    }

    loadWarning();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!mounted || !open || !warning) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/55 px-4">
      <div className="relative w-full max-w-md rounded-[2rem] bg-white px-6 py-7 shadow-2xl">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-5 top-5 text-red-500 hover:text-red-600"
          aria-label="ปิดประกาศ"
        >
          <FiXCircle className="h-7 w-7" />
        </button>

        <h2 className="pr-10 text-2xl font-bold text-zinc-900">
          : {warning.title}
        </h2>

        <div className="mt-3 h-px w-full bg-red-400" />

        {warning.publishedAt ? (
          <p className="mt-4 text-sm text-zinc-500">{warning.publishedAt}</p>
        ) : null}

        <div className="mt-6 min-h-[220px] whitespace-pre-line text-base leading-7 text-zinc-700">
          {warning.description || "มีประกาศล่าสุดจากระบบ"}
        </div>
      </div>
    </div>
  );
}