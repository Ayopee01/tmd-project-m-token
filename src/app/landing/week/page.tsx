"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiArrowDown,
  FiArrowUp,
  FiCalendar,
  FiChevronDown,
  FiCloudRain,
  FiDownload,
} from "react-icons/fi";
import type { ClimateWeeklyItem, ClimateWeeklyResponse, WeekRegionKey } from "@/app/types/week";

const WEEK_API_ROUTE = `${process.env.NEXT_PUBLIC_API_ROUTE ?? "/test2"}/api/week`;

/** ===== helpers ===== */
function cleanText(v: unknown): string {
  return String(v ?? "").trim().replace(/\s+/g, " ");
}

/** ===== region config ===== */
const REGION_LIST: Array<{ key: WeekRegionKey; label: string }> = [
  { key: "north", label: "ภาคเหนือ" },
  { key: "northeast", label: "ภาคตะวันออกเฉียงเหนือ" },
  { key: "central", label: "ภาคกลาง" },
  { key: "east", label: "ภาคตะวันออก" },
  { key: "south_east_coast", label: "ภาคใต้ฝั่งตะวันออก" },
  { key: "south_west_coast", label: "ภาคใต้ฝั่งตะวันตก" },
  { key: "bangkok_vicinity", label: "กรุงเทพมหานครและปริมณฑล" },
];

function WeekPage() {
  const [items, setItems] = useState<ClimateWeeklyItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dropdown
  const [dateOpen, setDateOpen] = useState(false);
  const dateWrapRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(WEEK_API_ROUTE, { cache: "no-store" });
      const json = (await res.json()) as ClimateWeeklyResponse;

      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      if (!json?.success || !Array.isArray(json.data)) {
        throw new Error(json?.message || "Bad response");
      }

      const arr = json.data.filter((x) => !!cleanText(x?.title));
      if (!arr.length) throw new Error("ไม่พบข้อมูล");

      // เรียงใหม่สุด -> เก่าสุด
      const sorted = [...arr].sort((a, b) => {
        const da = cleanText(a.contentdate);
        const db = cleanText(b.contentdate);
        // เปรียบเทียบ string แบบ ISO-ish: "2026-02-09 10:57:00.0000000"
        return db.localeCompare(da);
      });

      setItems(sorted);
      setSelectedKey(sorted[0]?.contentdate ?? "");
      setDateOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ปิด dropdown เมื่อคลิกนอกกรอบ + Esc
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!dateWrapRef.current) return;
      if (!dateWrapRef.current.contains(e.target as Node)) setDateOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDateOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const selected = useMemo(() => {
    return items.find((x) => x.contentdate === selectedKey) ?? items[0] ?? null;
  }, [items, selectedKey]);

  const selectedLabel = useMemo(() => {
    return cleanText(selected?.title) || "—";
  }, [selected]);

  const thailandSummary = useMemo(() => {
    const t = cleanText(selected?.thailand);
    return t || "";
  }, [selected]);

  const regionCards = useMemo(() => {
    const map = selected?.regions ?? {};
    return REGION_LIST.map((r) => {
      const it = map[r.key];
      const desc = cleanText(it?.description);
      const maxRain = cleanText(it?.max_rain);
      const maxTemp = cleanText(it?.max_temp);
      const minTemp = cleanText(it?.min_temp);

      return {
        key: r.key,
        label: r.label,
        description: desc || "",
        max_rain: maxRain || "",
        max_temp: maxTemp || "",
        min_temp: minTemp || "",
      };
    });
  }, [selected]);

  /** ===== Loading ===== */
  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <section className="sm:bg-[url('/test2/bg_top.png')] bg-no-repeat bg-top-right bg-contain min-h-60 border-b border-solid border-gray-200">
          <div className="mx-auto max-w-7xl px-4 py-6">
            <div className="animate-pulse space-y-3">
              <div className="h-8 w-96 rounded bg-gray-200" />
              <div className="h-5 w-130 max-w-full rounded bg-gray-200" />
              <div className="mt-5 h-11 w-full max-w-sm rounded bg-gray-200" />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="h-28 rounded-2xl bg-gray-100" />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="h-72 rounded-2xl bg-gray-100" />
            <div className="h-72 rounded-2xl bg-gray-100" />
          </div>
        </section>
      </main>
    );
  }

  /** ===== Error ===== */
  if (error || !selected) {
    return (
      <main className="min-h-screen bg-white">
        <section className="sm:bg-[url('/test2/bg_top.png')] bg-no-repeat bg-top-right bg-contain min-h-60 border-b border-solid border-gray-200">
          <div className="mx-auto max-w-7xl px-4 py-6">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-medium text-gray-900 sm:text-3xl">
                สรุปลักษณะอากาศรายสัปดาห์
              </h1>
              <p className="mt-1 text-sm text-gray-700 sm:text-base">
                ไม่สามารถโหลดข้อมูลได้ในขณะนี้
              </p>
            </div>

            <div className="mt-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <p className="text-sm font-semibold text-red-600">{error || "ไม่พบข้อมูล"}</p>
              <button
                type="button"
                onClick={load}
                className="mt-4 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                ลองใหม่
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  /** ===== UI ===== */
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <section className="sm:bg-[url('/test2/bg_top.png')] bg-no-repeat bg-top-right bg-contain min-h-60 border-b border-solid border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-medium text-gray-900 sm:text-3xl">
              สรุปลักษณะอากาศรายสัปดาห์
            </h1>
            <p className="mt-1 text-sm text-gray-700 sm:text-base">{selectedLabel}</p>
          </div>

          <div className="flex flex-col gap-2 mt-5 sm:flex-row sm:items-center sm:justify-between sm:mt-10">
            {/* Dropdown */}
            <div ref={dateWrapRef} className="relative w-full max-w-sm">
              <button
                type="button"
                onClick={() => setDateOpen((v) => !v)}
                aria-expanded={dateOpen}
                className="flex py-3 w-full items-center justify-between
                  cursor-pointer rounded-lg border border-gray-300 bg-white
                  px-5 text-left text-sm font-medium text-gray-800 outline-none
                  focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              >
                <span className="flex items-center justify-start gap-4 min-w-0">
                  <FiCalendar className="h-6 w-6 shrink-0 text-gray-800" />
                  <span className="block truncate">{selectedLabel}</span>
                </span>

                <FiChevronDown
                  className={[
                    "h-6 w-6 shrink-0 text-gray-500 transition-transform duration-300 ease-in-out",
                    dateOpen ? "rotate-180" : "",
                  ].join(" ")}
                  aria-hidden="true"
                />
              </button>

              {dateOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 w-full">
                  <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg">
                    <div className="max-h-105 overflow-auto py-2">
                      {items.map((it) => {
                        const label = cleanText(it.title) || it.contentdate;
                        const active = it.contentdate === selectedKey;

                        return (
                          <button
                            key={it.contentdate}
                            type="button"
                            onClick={() => {
                              setSelectedKey(it.contentdate);
                              setDateOpen(false);
                            }}
                            className={[
                              "w-full text-left px-5 py-3 text-sm font-medium",
                              active
                                ? "bg-emerald-600 text-white"
                                : "text-gray-700 hover:bg-gray-50",
                            ].join(" ")}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Button Download */}
            <div>
              {selected.url ? (
                <button
                  type="button"
                  onClick={() => window.open(selected.url, "_blank", "noopener,noreferrer")}
                  className="group flex items-center gap-2
                    rounded-lg border border-emerald-600 bg-white px-3 py-3
                    cursor-pointer transition duration-150
                    hover:bg-emerald-700 active:bg-emerald-800"
                >
                  <FiDownload
                    className="h-6 w-6 text-emerald-600 transition-colors group-hover:text-gray-100 group-active:text-gray-100"
                    aria-hidden="true"
                  />
                  <span className="text-sm leading-none font-semibold text-emerald-600 transition-colors group-hover:text-gray-100 group-active:text-gray-100">
                    ดาวน์โหลดเอกสาร
                  </span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Summary bar */}
      <section className="bg-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h2 className="flex flex-wrap items-baseline gap-2 text-xl font-medium text-gray-900 sm:text-2xl">
            <span>สรุปลักษณะอากาศประเทศไทย</span>
            {selectedLabel ? (
              <span className="whitespace-nowrap text-sm font-medium text-gray-600 sm:text-base">
                - {selectedLabel}
              </span>
            ) : null}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-700 pt-4 sm:pt-2">
            {thailandSummary || "ไม่พบข้อมูล"}
          </p>

        </div>
      </section>

      {/* Region cards */}
      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="mt-6">
          <h2 className="flex flex-wrap items-baseline gap-2 text-xl font-medium text-gray-900 sm:text-2xl">
            <span>ลักษณะอากาศรายภาค</span>
            {selectedLabel ? (
              <span className="whitespace-nowrap text-sm font-medium text-gray-600 sm:text-base">
                - {selectedLabel}
              </span>
            ) : null}
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {regionCards.map((r) => (
              <div key={r.key} className="rounded-sm border border-gray-200 bg-white shadow-sm">
                <div className="h-1 w-full rounded-t-2xl bg-emerald-600" />

                <div className="p-5">
                  <div className="text-sm font-semibold text-gray-900">{r.label}</div>

                  <p className="mt-2 text-sm leading-relaxed text-gray-700">
                    {r.description || "-"}
                  </p>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                        <FiCloudRain className="h-4 w-4 text-sky-600" />
                        ปริมาณฝนสูงสุด
                      </div>
                      <div className="mt-1 text-sm text-gray-800">{r.max_rain || "-"}</div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                        <FiArrowUp className="h-4 w-4 text-red-500" />
                        อุณหภูมิสูงสุด
                      </div>
                      <div className="mt-1 text-sm text-gray-800">{r.max_temp || "-"}</div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                        <FiArrowDown className="h-4 w-4 text-blue-600" />
                        อุณหภูมิต่ำสุด
                      </div>
                      <div className="mt-1 text-sm text-gray-800">{r.min_temp || "-"}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main >
  );
}

export default WeekPage;
