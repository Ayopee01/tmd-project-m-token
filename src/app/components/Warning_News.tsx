"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
// icons
import { FiDownload, FiXCircle } from "react-icons/fi";
// types
import type { WarningData } from "@/app/types/warning";

/* -------------------- Config -------------------- */
const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

/* -------------------- Functions -------------------- */

function formatThaiDate(value?: string | null) {
  if (!value) return null;

  const datePart = value.split(" ")[0];
  const [year, month, day] = datePart.split("-").map(Number);

  if (!year || !month || !day) return null;

  const monthName = THAI_MONTHS[month - 1];
  if (!monthName) return null;

  return `วันที่ ${day} ${monthName} ${year + 543}`;
}

/* -------------------- component -------------------- */

function WarningNewsPopup() {
  const [warning, setWarning] = useState<WarningData>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  /* -------------------- useEffect -------------------- */
  useEffect(() => {
    let cancelled = false;

    /* -------------------- API fetchers -------------------- */
    async function loadWarning() {
      try {
        const res = await fetch("/api/warning_news", {
          cache: "no-store",
        });

        const json = await res.json().catch(() => null);
        if (cancelled) return;

        const item = json?.warning ?? null;

        if (!item) {
          setMounted(true);
          return;
        }

        setWarning(item);
        setOpen(true);
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

  const displayDate = formatThaiDate(warning.contentdate);

  /* -------------------- UI section -------------------- */

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md rounded-xl bg-white px-6 py-7 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Button Close */}
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute right-5 top-5 text-red-500 transition hover:text-red-600"
          aria-label="ปิดประกาศ"
        >
          <FiXCircle className="h-7 w-7 cursor-pointer" />
        </button>

        {/* Title */}
        <h2 className="pr-10 text-2xl font-bold text-zinc-900">
          {warning.title}
        </h2>

        <div className="mt-3 h-px w-full bg-red-400" />

        {/* Description */}
        <div className="mt-6 min-h-50 whitespace-pre-line text-base leading-7 text-zinc-700">
          {warning.description || "มีประกาศล่าสุดจากระบบ"}
        </div>

        {/* Button Download & Datetime */}
        <div className="mt-6 flex items-center justify-between gap-4">
          {warning.url ? (
            <button
              type="button"
              onClick={() => {
                if (!warning.url) return;
                window.open(warning.url, "_blank", "noopener,noreferrer");
              }}
              className="group inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-emerald-600 bg-white px-4 py-3 transition duration-150 hover:bg-emerald-700 active:bg-emerald-800"
            >
              <FiDownload
                className="h-5 w-5 text-emerald-600 transition-colors group-hover:text-gray-100 group-active:text-gray-100"
                aria-hidden="true"
              />
              <span className="text-sm leading-none font-semibold text-emerald-600 transition-colors group-hover:text-gray-100 group-active:text-gray-100">
                อ่านเพิ่มเติม
              </span>
            </button>
          ) : (
            <div />
          )}

          {displayDate ? (
            <p className="text-right text-sm font-medium text-zinc-500">
              {displayDate}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default WarningNewsPopup;