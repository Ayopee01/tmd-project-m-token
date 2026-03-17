"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// Components
import ZoomableImage from "@/app/components/ZoomableImage";
// icons
import { FiDownload, FiPlus, FiCalendar, FiChevronDown } from "react-icons/fi";
// types
import type { DailyForecastItem, DailyForecastResponse } from "@/app/types/daily";
import { DAILY_SECTIONS } from "@/app/types/daily";

/* -------------------- Config API routes -------------------- */

const basePath = process.env.NEXT_PUBLIC_API_ROUTE ?? "";
const DAILY_API_ROUTE = `${basePath}/api/daily`;

/* -------------------- Functions -------------------- */

// Function แปลงวันที่จาก API ให้เป็น Date ที่ใช้งานได้
function parseContentDate(raw: string): Date | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(" ", "T").replace(/\.\d+$/, "");
  const d = new Date(cleaned);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Function แปลง Date เป็นข้อความวันที่ภาษาไทย
function thaiDate(d: Date): string {
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Function ตัดข้อความให้สั้นลงเพื่อใช้เป็น preview บน card
function shortText(s: string, max = 140): string {
  const t = (s ?? "").trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return t.slice(0, max).trimEnd() + "…";
}

// Function เรียงข้อมูลพยากรณ์จากใหม่สุด -> เก่าสุด
function sortItems(items: DailyForecastItem[]) {
  return [...items].sort((a, b) => {
    const da = parseContentDate(a.contentdate)?.getTime() ?? 0;
    const db = parseContentDate(b.contentdate)?.getTime() ?? 0;
    return db - da;
  });
}

/* -------------------- component -------------------- */

function DailyPage() {
  const [items, setItems] = useState<DailyForecastItem[]>([]); // เก็บรายการข่าวพยากรณ์ทั้งหมด
  const [selectedKey, setSelectedKey] = useState(""); // เก็บ contentdate ของรายการที่กำลังเลือก
  const [loading, setLoading] = useState(true); // ใช้ตอนหน้าโหลดครั้งแรก
  const [loadingMore, setLoadingMore] = useState(false); // ใช้ตอนโหลดข้อมูลเต็มต่อจาก initial
  const [error, setError] = useState<string | null>(null); // เก็บข้อความ error ถ้าโหลดไม่สำเร็จ
  const [showGeneral, setShowGeneral] = useState(false); // คุมการแสดงข้อความทั่วไปแบบเต็ม
  const [dateOpen, setDateOpen] = useState(false); // เปิด/ปิด dropdown วันที่
  const dateWrapRef = useRef<HTMLDivElement | null>(null); // ใช้เช็กว่าคลิกนอก dropdown หรือไม่
  const [openSectionKey, setOpenSectionKey] = useState<string | null>(null); // เก็บ key ของ card รายภาคที่กำลังเปิด

  /* -------------------- API fetchers -------------------- */

  const load = useCallback(async () => {
    setLoading(true);
    setLoadingMore(false);
    setError(null);

    try {
      const initialRes = await fetch(`${DAILY_API_ROUTE}?mode=initial`, {
        cache: "no-store",
      });
      const initialJson = (await initialRes.json()) as DailyForecastResponse;

      if (!initialRes.ok) throw new Error(`Request failed (${initialRes.status})`);
      if (!initialJson?.success || !Array.isArray(initialJson.data)) {
        throw new Error(initialJson?.message || "Bad response shape");
      }

      const initialItems = sortItems(initialJson.data);

      setItems(initialItems);
      setSelectedKey((prev) =>
        prev && initialItems.some((item) => item.contentdate === prev)
          ? prev
          : (initialItems[0]?.contentdate ?? "")
      );
      setLoading(false);
    } catch (initialError) {
      try {
        const fullRes = await fetch(DAILY_API_ROUTE, { cache: "no-store" });
        const fullJson = (await fullRes.json()) as DailyForecastResponse;

        if (!fullRes.ok) throw new Error(`Request failed (${fullRes.status})`);
        if (!fullJson?.success || !Array.isArray(fullJson.data)) {
          throw new Error(fullJson?.message || "Bad response shape");
        }

        const fullItems = sortItems(fullJson.data);

        setItems(fullItems);
        setSelectedKey((prev) =>
          prev && fullItems.some((item) => item.contentdate === prev)
            ? prev
            : (fullItems[0]?.contentdate ?? "")
        );
      } catch (fullError) {
        const msg = fullError instanceof Error ? fullError.message : "Failed to load";
        setError(msg);
      } finally {
        setLoading(false);
      }

      return;
    }

    try {
      setLoadingMore(true);

      const fullRes = await fetch(DAILY_API_ROUTE, { cache: "no-store" });
      const fullJson = (await fullRes.json()) as DailyForecastResponse;

      if (!fullRes.ok) throw new Error(`Request failed (${fullRes.status})`);
      if (!fullJson?.success || !Array.isArray(fullJson.data)) {
        throw new Error(fullJson?.message || "Bad response shape");
      }

      const fullItems = sortItems(fullJson.data);

      setItems(fullItems);
      setSelectedKey((prev) =>
        prev && fullItems.some((item) => item.contentdate === prev)
          ? prev
          : (fullItems[0]?.contentdate ?? "")
      );
    } catch (fullError) {
      console.error("Failed to load full daily data:", fullError);
    } finally {
      setLoadingMore(false);
    }
  }, []);

  /* -------------------- useEffect -------------------- */

  useEffect(() => {
    load();
  }, [load]);

  // ปิด dropdown เมื่อคลิกนอกกรอบ / กด Escape
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!dateWrapRef.current) return;
      if (!dateWrapRef.current.contains(e.target as Node)) {
        setDateOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDateOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // รีเซ็ต UI เมื่อเปลี่ยนรายการที่เลือก
  useEffect(() => {
    setShowGeneral(false);
    setOpenSectionKey(null);
  }, [selectedKey]);

  /* -------------------- useMemo -------------------- */

  // หา item ที่ตรงกับ selectedKey
  const selected = useMemo(() => {
    return items.find((item) => item.contentdate === selectedKey) ?? items[0] ?? null;
  }, [items, selectedKey]);

  const selectedLabel = selected?.title ?? ""; // ใช้ title ของรายการที่เลือกเอาไปแสดงบนปุ่ม dropdown
  const issueDate = selected ? parseContentDate(selected.contentdate) : null; // แปลง contentdate ของตัวที่เลือกเป็น Date ใช้แสดงวันที่ในหัวข้อ infographic
  const hasGeneral = Boolean((selected?.general_climate ?? "").trim()); // เช็กว่ามีข้อความ general climate หรือไม่ เช็กว่ามีข้อความ general climate หรือไม่

  const renderCard = (section: { key: keyof DailyForecastItem; label: string }) => {
    if (!selected) return null;

    const { key, label } = section;
    const value = String(selected[key] ?? "").trim();

    if (!value) return null;

    const id = String(key);
    const isOpen = openSectionKey === id;

    const toggle = () => {
      setOpenSectionKey((prev) => (prev === id ? null : id));
    };

    return (
      <section
        key={id}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-controls={`detail-${id}`}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
        className={[
          "w-full min-w-0 cursor-pointer select-none",
          "group relative overflow-hidden rounded-xl bg-white p-4 shadow-sm",
          "border border-gray-200 transition-[border-color,box-shadow,background-color] duration-300 ease-in-out",
          "hover:bg-gray-50",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100",
          isOpen ? "shadow-md" : "",
          "before:content-[''] before:absolute before:left-0 before:top-0 before:h-1 before:w-full",
          "before:bg-emerald-600 before:transition-opacity before:duration-300 before:ease-in-out",
          isOpen ? "before:opacity-100" : "before:opacity-0",
        ].join(" ")}
      >
        <div className="flex w-full min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              className={[
                "text-base font-semibold transition-all duration-300 ease-in-out",
                isOpen ? "text-emerald-600" : "text-gray-900",
              ].join(" ")}
            >
              {label}
            </div>

            {!isOpen ? (
              <div className="mt-2 truncate text-sm text-gray-500">
                {shortText(value, 140)}
              </div>
            ) : null}
          </div>

          <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center">
            <FiPlus
              className={[
                "h-5 w-5 origin-center transition-all duration-300 ease-in-out",
                isOpen ? "rotate-45 text-emerald-600" : "text-gray-700",
              ].join(" ")}
              aria-hidden="true"
            />
          </span>
        </div>

        <div
          id={`detail-${id}`}
          className={[
            "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
            isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          ].join(" ")}
        >
          <div className="min-w-0 overflow-hidden select-text">
            <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-500">
              {value}
            </div>
          </div>
        </div>
      </section>
    );
  };

  /* -------------------- UI Loading -------------------- */

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="animate-pulse space-y-3">
            <div className="h-6 w-64 rounded bg-gray-200" />
            <div className="h-4 w-full rounded bg-gray-200" />
            <div className="h-4 w-5/6 rounded bg-gray-200" />
            <div className="h-10 w-56 rounded bg-gray-200" />
          </div>
        </div>
      </main>
    );
  }

  /* -------------------- UI Error -------------------- */

  if (error || !selected) {
    return (
      <main className="min-h-screen bg-white">
        <section className="relative min-h-60 border-b border-gray-200">
          <div
            className="absolute inset-0 hidden bg-contain bg-no-repeat bg-top-right sm:block"
            style={{ backgroundImage: `url(${basePath}/bg_top.png)` }}
          />

          <div className="relative z-10 mx-auto max-w-7xl px-4 py-6">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-medium text-gray-900 sm:text-3xl">
                ข่าวพยากรณ์อากาศประจำวัน
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

  /* -------------------- UI -------------------- */

  return (
    <main>
      {/* Header */}
      <section className="relative min-h-60 border-b border-gray-200">
        <div
          className="absolute inset-0 hidden bg-contain bg-no-repeat bg-top-right sm:block"
          style={{ backgroundImage: `url(${basePath}/bg_top.png)` }}
        />

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-medium text-gray-900 sm:text-3xl">
              ข่าวพยากรณ์อากาศประจำวัน
            </h1>

            <div className="mt-1 lg:pr-20">
              <div
                className={[
                  "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
                  showGeneral ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
                ].join(" ")}
              >
                <div className="overflow-hidden">
                  <p className="line-clamp-2 whitespace-pre-line text-sm text-gray-800 sm:text-base">
                    {(selected.description ?? "").trim()}
                  </p>
                </div>
              </div>

              <div
                className={[
                  "grid transition-[grid-template-rows,opacity,margin-top] duration-300 ease-in-out",
                  showGeneral ? "mt-0 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0",
                ].join(" ")}
              >
                <div className="overflow-hidden">
                  <p className="whitespace-pre-line text-sm text-gray-800 sm:text-base">
                    {(selected.general_climate ?? "").trim()}
                  </p>
                </div>
              </div>

              {hasGeneral ? (
                <button
                  type="button"
                  onClick={() => setShowGeneral((prev) => !prev)}
                  className="mt-2 cursor-pointer text-sm font-semibold text-emerald-700 hover:underline"
                >
                  {showGeneral ? "ซ่อนรายละเอียด" : "อ่านเพิ่มเติม"}
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div ref={dateWrapRef} className="relative w-full max-w-sm">
              <button
                type="button"
                onClick={() => setDateOpen((prev) => !prev)}
                aria-expanded={dateOpen}
                className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-gray-300 bg-white px-5 py-3 text-left text-sm font-medium text-gray-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              >
                <span className="flex min-w-0 items-center justify-start gap-4">
                  <FiCalendar className="h-6 w-6 shrink-0 text-gray-800" />
                  <span className="block truncate">{selectedLabel}</span>
                </span>

                <FiChevronDown
                  className={[
                    "h-6 w-6 shrink-0 text-gray-500 transition-transform",
                    dateOpen ? "rotate-180" : "",
                  ].join(" ")}
                  aria-hidden="true"
                />
              </button>

              {dateOpen ? (
                <div className="absolute left-0 top-full z-50 mt-2 w-full">
                  <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg">
                    <div className="max-h-105 overflow-auto py-2">
                      {items.map((item) => {
                        const active = item.contentdate === selectedKey;

                        return (
                          <button
                            key={item.contentdate}
                            type="button"
                            onClick={() => {
                              setSelectedKey(item.contentdate);
                              setDateOpen(false);
                            }}
                            className={[
                              "w-full cursor-pointer px-5 py-3 text-left text-sm font-medium",
                              active
                                ? "bg-emerald-600 text-white"
                                : "text-gray-800 hover:bg-gray-50",
                            ].join(" ")}
                          >
                            {item.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col items-start gap-2 sm:items-end">
              {selected.pdf_url ? (
                <button
                  type="button"
                  onClick={() =>
                    window.open(selected.pdf_url, "_blank", "noopener,noreferrer")
                  }
                  className="group flex cursor-pointer items-center gap-2 rounded-lg border border-emerald-600 bg-white px-3 py-3 transition duration-150 hover:bg-emerald-700 active:bg-emerald-800"
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

              {loadingMore ? (
                <p className="text-xs font-medium text-gray-500">
                  กำลังโหลดข้อมูลเพิ่มเติม...
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Infographic */}
      <section className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex flex-wrap items-baseline gap-2 text-xl font-medium text-gray-900 sm:text-2xl">
            <span>พยากรณ์อากาศประจำวันแบบอินโฟกราฟิก</span>
            {issueDate ? (
              <span className="whitespace-nowrap text-sm font-medium text-gray-600 sm:text-base">
                - {thaiDate(issueDate)}
              </span>
            ) : null}
          </h2>
        </div>

        {selected.infographic_url ? (
          <div className="mt-4 flex justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="shadow-xl">
                <ZoomableImage
                  src={selected.infographic_url}
                  alt="Daily forecast infographic"
                  width={600}
                  height={1200}
                  className="h-auto w-full"
                  clickAnywhereOnDesktop={false}
                />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-900">
                  รูปภาพ:พยากรณ์อากาศประจำวัน
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-600">ไม่พบรูปอินโฟกราฟิก</p>
        )}
      </section>

      {/* Regional forecast */}
      <section className="mx-auto max-w-7xl px-4 py-6">
        <h2 className="flex flex-wrap items-baseline gap-2 text-xl font-medium text-gray-900 sm:text-2xl">
          <span>พยากรณ์อากาศรายภาค</span>
          <span className="whitespace-nowrap text-sm font-medium text-gray-600 sm:text-base">
            - 00:00 น. วันนี้ ถึง 00:00 น. วันพรุ่งนี้
          </span>
        </h2>

        <div className="mt-8 flex min-w-0 flex-col gap-3 md:hidden">
          {DAILY_SECTIONS.map(renderCard)}
        </div>

        <div className="mt-8 hidden md:grid md:grid-cols-2 md:gap-3">
          <div className="min-w-0 flex flex-col gap-3">
            {DAILY_SECTIONS.filter((_, i) => i % 2 === 0).map(renderCard)}
          </div>

          <div className="min-w-0 flex flex-col gap-3">
            {DAILY_SECTIONS.filter((_, i) => i % 2 === 1).map(renderCard)}
          </div>
        </div>
      </section>
    </main>
  );
}

export default DailyPage;