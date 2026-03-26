"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
// icons
import { FiArrowDown, FiArrowUp, FiCalendar, FiChevronDown, FiCloudRain, FiDownload } from "react-icons/fi";
// types
import type { ClimateWeeklyItem, ClimateWeeklyResponse, WeekRegionKey } from "@/app/types/week";

/* -------------------- Config API routes -------------------- */

const basePath = process.env.NEXT_PUBLIC_API_ROUTE ?? "";
const WEEK_API_ROUTE = `${basePath}/api/week`;

/* -------------------- Config pure helpers -------------------- */

const REGION_LIST: Array<{ key: WeekRegionKey; label: string }> = [
  { key: "north", label: "ภาคเหนือ" },
  { key: "northeast", label: "ภาคตะวันออกเฉียงเหนือ" },
  { key: "central", label: "ภาคกลาง" },
  { key: "east", label: "ภาคตะวันออก" },
  { key: "south_east_coast", label: "ภาคใต้ฝั่งตะวันออก" },
  { key: "south_west_coast", label: "ภาคใต้ฝั่งตะวันตก" },
  { key: "bangkok_vicinity", label: "กรุงเทพมหานครและปริมณฑล" },
];

/* -------------------- Functions -------------------- */

// Function แปลง null หรือ unknown เป็น string ตัดช่องว่างออก
function cleanText(v: unknown): string {
  return String(v ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

// Function เรียงข้อมูลจากใหม่สุด -> เก่าสุด
function sortWeeklyItems(items: ClimateWeeklyItem[]): ClimateWeeklyItem[] {
  return [...items].sort((a, b) => {
    const da = cleanText(a.contentdate);
    const db = cleanText(b.contentdate);
    // เปรียบเทียบ string แบบ ISO-ish: "2026-02-09 10:57:00.0000000"
    return db.localeCompare(da);
  });
}

// Function สร้างข้อมูล region cards สำหรับ render
function buildRegionCards(selected: ClimateWeeklyItem | null) {
  const regionMap = selected?.regions ?? {};

  return REGION_LIST.map((region) => {
    const item = regionMap[region.key];

    return {
      key: region.key,
      label: region.label,
      description: cleanText(item?.description),
      max_rain: cleanText(item?.max_rain),
      max_temp: cleanText(item?.max_temp),
      min_temp: cleanText(item?.min_temp),
    };
  });
}

/* -------------------- component -------------------- */

function WeekPage() {
  const [items, setItems] = useState<ClimateWeeklyItem[]>([]); // เก็บข้อมูลทั้งหมดจาก API หลัง sort แล้ว
  const [selectedKey, setSelectedKey] = useState<string>(""); // เก็บค่า contentdate ของรายการที่ถูกเลือกใน dropdown

  const [loading, setLoading] = useState(true); // บอกว่าตอนนี้กำลังโหลดข้อมูลอยู่หรือไม่
  const [error, setError] = useState<string | null>(null); // เก็บข้อความ error ถ้าโหลด API ไม่สำเร็จ

  // Dropdown
  const [dateOpen, setDateOpen] = useState(false); // เปิด/ปิด dropdown
  const dateWrapRef = useRef<HTMLDivElement | null>(null); // ใช้ตรวจว่า user คลิกนอก dropdown หรือไม่

  /* -------------------- API fetchers -------------------- */

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(WEEK_API_ROUTE, { cache: "no-store" });
      const json = (await res.json()) as ClimateWeeklyResponse;

      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }

      if (!json?.success || !Array.isArray(json.data)) {
        throw new Error(json?.message || "Bad response");
      }

      const validItems = json.data.filter((item) => !!cleanText(item?.title));
      if (!validItems.length) {
        throw new Error("ไม่พบข้อมูล");
      }

      // เรียงใหม่สุด -> เก่าสุด
      const sortedItems = sortWeeklyItems(validItems);

      setItems(sortedItems);
      setSelectedKey(sortedItems[0]?.contentdate ?? "");
      setDateOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  /* -------------------- useEffect -------------------- */

  useEffect(() => {
    load();
  }, []);

  // Close dropdown เมื่อ click outside / ESC
  useEffect(() => {
    if (!dateOpen) return;

    const onDown = (e: MouseEvent | TouchEvent): void => {
      const el = dateWrapRef.current;
      if (!el) return;

      const target = e.target;
      if (target instanceof Node && !el.contains(target)) {
        setDateOpen(false);
      }
    };

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setDateOpen(false);
    };

    const touchOpts: AddEventListenerOptions = { passive: true };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, touchOpts);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown, touchOpts);
      document.removeEventListener("keydown", onKey);
    };
  }, [dateOpen]);

  /* -------------------- useMemo -------------------- */

  // หาว่า item ไหนเป็นตัวที่ถูกเลือกอยู่
  const selected = useMemo(() => {
    return items.find((item) => item.contentdate === selectedKey) ?? items[0] ?? null;
  }, [items, selectedKey]);

  // สร้าง label สำหรับแสดงบน header / dropdown / title
  const selectedLabel = useMemo(() => {
    return cleanText(selected?.title) || "—";
  }, [selected]);

  // ดึงข้อความสรุปประเทศไทย
  const thailandSummary = useMemo(() => {
    return cleanText(selected?.thailand);
  }, [selected]);

  // สร้างข้อมูล region cards สำหรับ render
  const regionCards = useMemo(() => {
    return buildRegionCards(selected);
  }, [selected]);

  // Function เปิด/ปิด dropdown
  function toggleDateDropdown() {
    setDateOpen((prev) => !prev);
  }

  // Function เปลี่ยนรายการที่เลือกจาก dropdown
  function handleSelectDate(contentdate: string) {
    setSelectedKey(contentdate);
    setDateOpen(false);
  }

  // Function เปิดลิงก์ดาวน์โหลดเอกสาร
  function handleDownload() {
    if (!selected?.url) return;
    window.open(selected.url, "_blank", "noopener,noreferrer");
  }

  {/* UI Loading */ }
  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        {/* Header */}
        <section className="relative min-h-60 border-b border-gray-200">
          {/* Background layer */}
          <div
            className="absolute inset-0 hidden bg-contain bg-no-repeat bg-top-right sm:block"
            style={{ backgroundImage: `url(${basePath}/bg_top.png)` }}
          ></div>

          <div className="relative z-10 mx-auto max-w-7xl px-4 py-6">
            <div className="animate-pulse space-y-3">
              <div className="h-8 w-96 rounded bg-gray-200" />
              <div className="h-5 max-w-full w-130 rounded bg-gray-200" />
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

  {/* UI Error */ }
  if (error || !selected) {
    return (
      <main className="min-h-screen bg-white">
        {/* Header */}
        <section className="relative min-h-60 border-b border-gray-200">
          {/* Background layer */}
          <div
            className="absolute inset-0 hidden bg-contain bg-no-repeat bg-top-right sm:block"
            style={{ backgroundImage: `url(${basePath}/bg_top.png)` }}
          ></div>

          <div className="relative z-10 mx-auto max-w-7xl px-4 py-6">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-medium text-gray-900 sm:text-3xl">
                สรุปลักษณะอากาศรายสัปดาห์
              </h1>
              <p className="mt-1 text-sm text-gray-700 sm:text-base">
                ไม่สามารถโหลดข้อมูลได้ในขณะนี้
              </p>
            </div>

            <div className="mt-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <p className="text-sm font-semibold text-red-600">
                {error || "ไม่พบข้อมูล"}
              </p>
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

  /* -------------------- UI section -------------------- */

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <section className="relative min-h-60 border-b border-gray-200">
        {/* Background layer */}
        <div
          className="absolute inset-0 hidden bg-contain bg-no-repeat bg-top-right sm:block"
          style={{ backgroundImage: `url(${basePath}/bg_top.png)` }}
        ></div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-medium text-gray-900 sm:text-3xl">
              สรุปลักษณะอากาศรายสัปดาห์
            </h1>
            <p className="mt-1 text-sm text-gray-700 sm:text-base">{selectedLabel}</p>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:mt-10 sm:flex-row sm:items-center sm:justify-between">
            {/* Dropdown */}
            <div ref={dateWrapRef} className="relative w-full max-w-sm">
              <button
                type="button"
                onClick={toggleDateDropdown}
                aria-expanded={dateOpen}
                className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-gray-300 bg-white px-5 py-3 text-left text-sm font-medium text-gray-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              >
                <span className="flex min-w-0 items-center justify-start gap-4">
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
                      {items.map((item) => {
                        const label = cleanText(item.title) || item.contentdate;
                        const active = item.contentdate === selectedKey;

                        return (
                          <button
                            key={item.contentdate}
                            type="button"
                            onClick={() => handleSelectDate(item.contentdate)}
                            className={[
                              "w-full cursor-pointer px-5 py-3 text-left text-sm font-medium",
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
                  onClick={handleDownload}
                  className="group flex cursor-pointer items-center gap-2 rounded-lg border border-emerald-600 bg-white px-3 py-3 transition duration-150 hover:bg-emerald-700 active:bg-emerald-800"
                >
                  <FiDownload
                    className="h-6 w-6 text-emerald-600 transition-colors group-hover:text-gray-100 group-active:text-gray-100"
                    aria-hidden="true"
                  />
                  <span className="text-sm font-semibold leading-none text-emerald-600 transition-colors group-hover:text-gray-100 group-active:text-gray-100">
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

          <p className="mt-2 pt-4 text-sm leading-relaxed text-gray-700 sm:pt-2">
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
            {regionCards.map((region) => (
              <div
                key={region.key}
                className="rounded-sm border border-gray-200 bg-white shadow-sm"
              >
                <div className="h-1 w-full rounded-t-2xl bg-emerald-600" />

                <div className="p-5">
                  <div className="text-sm font-semibold text-gray-900">{region.label}</div>

                  <p className="mt-2 text-sm leading-relaxed text-gray-700">
                    {region.description || "-"}
                  </p>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                        <FiCloudRain className="h-4 w-4 text-sky-600" />
                        ปริมาณฝนสูงสุด
                      </div>
                      <div className="mt-1 text-sm text-gray-800">
                        {region.max_rain || ""}
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                        <FiArrowUp className="h-4 w-4 text-red-500" />
                        อุณหภูมิสูงสุด
                      </div>
                      <div className="mt-1 text-sm text-gray-800">
                        {region.max_temp || ""}
                      </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                        <FiArrowDown className="h-4 w-4 text-blue-600" />
                        อุณหภูมิต่ำสุด
                      </div>
                      <div className="mt-1 text-sm text-gray-800">
                        {region.min_temp || ""}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default WeekPage;