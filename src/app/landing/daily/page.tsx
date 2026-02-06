"use client";

import ZoomableImage from "@/app/components/ZoomableImage";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiDownload, FiPlus, FiCalendar, FiChevronDown } from "react-icons/fi";

const DAILY_API_ROUTE = "/test2/api/daily";

type DailyForecastItem = {
  title: string;
  description: string;
  pdf_url: string;
  contentdate: string;
  infographic_url: string;

  general_climate: string;
  north: string;
  northeast: string;
  central: string;
  east: string;
  south_east_coast: string;
  south_west_coast: string;
  bangkok_vicinity: string;
};

type DailyForecastResponse = {
  success: boolean;
  data: DailyForecastItem[];
  message?: string;
};

function parseContentDate(raw: string): Date | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(" ", "T").replace(/\.\d+$/, "");
  const d = new Date(cleaned);
  return Number.isNaN(d.getTime()) ? null : d;
}

function thaiDate(d: Date): string {
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function thaiTime(d: Date): string {
  return d.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function shortText(s: string, max = 140): string {
  const t = (s ?? "").trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return t.slice(0, max).trimEnd() + "…";
}

const SECTIONS: Array<{ key: keyof DailyForecastItem; label: string }> = [
  { key: "north", label: "ภาคเหนือ" },
  { key: "northeast", label: "ภาคตะวันออกเฉียงเหนือ" },
  { key: "central", label: "ภาคกลาง" },
  { key: "east", label: "ภาคตะวันออก" },
  { key: "south_east_coast", label: "ภาคใต้ฝั่งตะวันออก" },
  { key: "south_west_coast", label: "ภาคใต้ฝั่งตะวันตก" },
  { key: "bangkok_vicinity", label: "กรุงเทพมหานครและปริมณฑล" },
];

export default function DailyForecastPage() {
  const [items, setItems] = useState<DailyForecastItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ อ่านเพิ่มเติม (เฟด/สไลด์)
  const [showGeneral, setShowGeneral] = useState(false);

  // dropdown รอบประกาศ
  const [dateOpen, setDateOpen] = useState(false);
  const dateWrapRef = useRef<HTMLDivElement | null>(null);

  // accordion เปิดได้ทีละใบ
  const [openSectionKey, setOpenSectionKey] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(DAILY_API_ROUTE);
      const json = (await res.json()) as DailyForecastResponse;

      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      if (!json?.success || !Array.isArray(json.data)) {
        throw new Error(json?.message || "Bad response shape");
      }

      // เรียงจากใหม่สุด -> เก่าสุด
      const sorted = [...json.data].sort((a, b) => {
        const da = parseContentDate(a.contentdate)?.getTime() ?? 0;
        const db = parseContentDate(b.contentdate)?.getTime() ?? 0;
        return db - da;
      });

      setItems(sorted);
      setSelectedKey(sorted[0]?.contentdate ?? "");
    } catch (e: any) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ปิด dropdown เมื่อคลิกนอก/กด ESC
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!dateWrapRef.current) return;
      if (!dateWrapRef.current.contains(e.target as Node)) setDateOpen(false);
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

  const selected = useMemo(() => {
    return items.find((x) => x.contentdate === selectedKey) ?? items[0] ?? null;
  }, [items, selectedKey]);

  const selectedLabel = useMemo(() => {
    const it = items.find((x) => x.contentdate === selectedKey);
    if (!it) return "";
    const d = parseContentDate(it.contentdate);
    return d ? `${thaiDate(d)} ${thaiTime(d)} น.` : it.contentdate;
  }, [items, selectedKey]);

  // เปลี่ยนรอบประกาศ: reset state
  useEffect(() => {
    setShowGeneral(false);
    setOpenSectionKey(null);
  }, [selectedKey]);

  const issueDate = selected ? parseContentDate(selected.contentdate) : null;
  const hasGeneral = Boolean((selected?.general_climate ?? "").trim());

  const previewText = (selected?.description ?? "").trim();
  const detailText = ((selected?.general_climate ?? "").trim() || previewText).trim();

  // ✅ render การ์ด (คลิกทั้งใบเพื่อเปิด/ปิด)
  const renderCard = (section: { key: keyof DailyForecastItem; label: string }) => {
    if (!selected) return null;

    const { key, label } = section;
    const value = String(selected[key] ?? "").trim();
    if (!value) return null;

    const id = String(key);
    const isOpen = openSectionKey === id;

    const toggle = () => setOpenSectionKey((prev) => (prev === id ? null : id));

    return (
      <div
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
          // แถบเขียวบนสุด
          "before:content-[''] before:absolute before:left-0 before:top-0 before:h-[4px] before:w-full",
          "before:bg-emerald-600 before:transition-opacity before:duration-300 before:ease-in-out",
          isOpen ? "before:opacity-100" : "before:opacity-0",
        ].join(" ")}
      >
        {/* Header area */}
        <div className="flex w-full min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              className={[
                "text-base font-semibold transition-colors duration-300 ease-in-out",
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
                "h-5 w-5 origin-center text-gray-700",
                "transition-transform transition-colors duration-300 ease-in-out",
                isOpen ? "rotate-45 text-emerald-600" : "",
              ].join(" ")}
              aria-hidden="true"
            />
          </span>
        </div>

        {/* Detail: เปิด/ปิดเฟด + ยืด/หด
            ✅ stopPropagation เพื่อไม่ให้คลิกอ่านข้อความแล้วปิดทันที (ยังปิดได้โดยคลิกส่วนหัว/ขอบการ์ด) */}
        <div
          id={`detail-${id}`}
          className={[
            "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
            isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          ].join(" ")}
        >
          <div className="overflow-hidden min-w-0 select-text">
            <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-500">
              {value}
            </div>
          </div>
        </div>
      </div>
    );
  };

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

  if (error || !selected) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h1 className="text-xl font-semibold text-gray-900">
            ข่าวพยากรณ์อากาศประจำวัน
          </h1>
          <p className="mt-2 text-sm text-red-600">{error || "ไม่พบข้อมูล"}</p>
          <button
            onClick={load}
            className="mt-4 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            ลองใหม่
          </button>
        </div>
      </main>
    );
  }

  return (
    <main>
      {/* Header */}
      <section className="sm:bg-[url('/test2/bg_top.png')] bg-no-repeat bg-right-top bg-contain min-h-60 border-b border-solid border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-medium text-gray-900 sm:text-3xl">
              ข่าวพยากรณ์อากาศประจำวัน
            </h1>

            <div className="mt-1 lg:pr-20">
              {/* description (โชว์เฉพาะตอนยังไม่กดอ่านเพิ่มเติม) */}
              <div
                className={[
                  "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
                  showGeneral ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
                ].join(" ")}
              >
                <div className="overflow-hidden">
                  <p className="text-sm text-gray-800 whitespace-pre-line line-clamp-2 sm:text-base">
                    {(selected?.description ?? "").trim()}
                  </p>
                </div>
              </div>

              {/* general_climate (โชว์เฉพาะตอนกดอ่านเพิ่มเติม) */}
              <div
                className={[
                  "grid transition-[grid-template-rows,opacity,margin-top] duration-300 ease-in-out",
                  showGeneral ? "grid-rows-[1fr] opacity-100 mt-0" : "grid-rows-[0fr] opacity-0 mt-0",
                ].join(" ")}
              >
                <div className="overflow-hidden">
                  <p className="text-sm text-gray-800 whitespace-pre-line sm:text-base">
                    {(selected?.general_climate ?? "").trim()}
                  </p>
                </div>
              </div>

              {hasGeneral ? (
                <button
                  type="button"
                  onClick={() => setShowGeneral((v) => !v)}
                  className="cursor-pointer mt-2 text-sm font-semibold text-emerald-700 hover:underline"
                >
                  {showGeneral ? "ซ่อนรายละเอียด" : "อ่านเพิ่มเติม"}
                </button>
              ) : null}
            </div>
          </div>

          {/* DateTime & Download PDF */}
          <div className="flex flex-col gap-2 mt-5 sm:flex-row sm:items-center sm:justify-between">
            <div ref={dateWrapRef} className="relative w-full max-w-sm">
              <FiCalendar className="pointer-events-none absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-900" />

              <button
                type="button"
                onClick={() => setDateOpen((v) => !v)}
                aria-expanded={dateOpen}
                className="flex py-3 w-full items-center justify-between
                cursor-pointer rounded-lg border border-gray-300 bg-white
                px-5 text-left text-sm font-medium text-gray-900 outline-none
                focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              >
                <span className="flex items-center justify-start gap-4 min-w-0">
                  <FiCalendar className="h-6 w-6 shrink-0 text-gray-900" />
                  <span className="block truncate">{selectedLabel}</span>
                </span>

                <FiChevronDown
                  className={`h-6 w-6 shrink-0 text-gray-500 transition-transform ${dateOpen ? "rotate-180" : ""
                    }`}
                  aria-hidden="true"
                />
              </button>

              {dateOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 w-full">
                  <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg">
                    <div className="max-h-[420px] overflow-auto py-2">
                      {items.map((it) => {
                        const d = parseContentDate(it.contentdate);
                        const label = d
                          ? `${thaiDate(d)} ${thaiTime(d)} น.`
                          : it.contentdate;
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
                                : "text-gray-900 hover:bg-gray-50",
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

            <div>
              {selected.pdf_url ? (
                <button
                  type="button"
                  onClick={() =>
                    window.open(selected.pdf_url, "_blank", "noopener,noreferrer")
                  }
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
                  width={900}
                  height={1200}
                  className="h-auto w-full"
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

      {/* Detail */}
      <section className="mx-auto max-w-7xl px-4 py-6">
        <h2 className="flex flex-wrap items-baseline gap-2 text-xl font-medium text-gray-900 sm:text-2xl">
          <span>พยากรณ์อากาศรายภาค</span>
          <span className="whitespace-nowrap text-sm font-medium text-gray-600 sm:text-base">
            - 00:00 น. วันนี้ ถึง 00:00 น. วันพรุ่งนี้
          </span>
        </h2>

        {/* Mobile: 1 คอลัมน์ */}
        <div className="mt-8 flex min-w-0 flex-col gap-3 md:hidden">
          {SECTIONS.map(renderCard)}
        </div>

        {/* Desktop: 2 คอลัมน์แยกสแต็ค (ไม่ดันกัน) */}
        <div className="mt-8 hidden md:grid md:grid-cols-2 md:gap-3">
          <div className="min-w-0 flex flex-col gap-3">
            {SECTIONS.filter((_, i) => i % 2 === 0).map(renderCard)}
          </div>

          <div className="min-w-0 flex flex-col gap-3">
            {SECTIONS.filter((_, i) => i % 2 === 1).map(renderCard)}
          </div>
        </div>
      </section>
    </main>
  );
}
