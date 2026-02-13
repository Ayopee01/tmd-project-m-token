"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { FiCalendar, FiChevronDown, FiDownload } from "react-icons/fi";
import type { ClimateMonthlyItem, ClimateMonthlyResponse } from "@/app/types/monthly";

const MONTH_API_ROUTE = `${process.env.NEXT_PUBLIC_API_ROUTE ?? "/test2"}/api/monthly`;

/** ===== minimal helpers ===== */
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

function txt(v: unknown) {
  return String(v ?? "").trim().replace(/\s+/g, " ");
}

function parseApiDate(raw: string): Date | null {
  const s = txt(raw);
  if (!s) return null;

  // "2026-01-31 13:53:00.0000000" -> "2026-01-31T13:53:00"
  const isoLike = s.replace(" ", "T").replace(/\.\d+$/, "");
  const d = new Date(isoLike);
  return Number.isNaN(d.getTime()) ? null : d;
}

function beYear(d: Date) {
  return d.getFullYear() + 543;
}

function thaiDate(d: Date) {
  const day = d.getDate();
  const month = THAI_MONTHS[d.getMonth()] ?? "";
  const year = beYear(d);
  return `${day} ${month} ${year}`;
}

type Norm = {
  item: ClimateMonthlyItem;
  date: Date;
  yearBE: number;
  monthIndex: number; // 0-11
};

function MonthlyPage() {
  const [rows, setRows] = useState<Norm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // month dropdown (mobile)
  const [monthOpen, setMonthOpen] = useState(false);
  const monthWrapRef = useRef<HTMLDivElement | null>(null);

  // selections
  const [yearBE, setYearBE] = useState<number>(0);
  const [selectedKey, setSelectedKey] = useState<string>(""); // ใช้ contentdate เป็น key

  // header year dropdown
  const [yearOpen, setYearOpen] = useState(false);
  const yearWrapRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(MONTH_API_ROUTE, { cache: "no-store" });
      const json = (await res.json()) as ClimateMonthlyResponse;

      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      if (!json?.success || !Array.isArray(json.data)) throw new Error(json?.message || "Bad response");

      const normalized: Norm[] = json.data
        .map((it) => {
          const d = parseApiDate(it.contentdate);
          if (!d) return null;
          return { item: it, date: d, yearBE: beYear(d), monthIndex: d.getMonth() };
        })
        .filter(Boolean) as Norm[];

      if (!normalized.length) throw new Error("ไม่พบข้อมูล");

      // ใหม่สุด -> เก่าสุด
      normalized.sort((a, b) => b.date.getTime() - a.date.getTime());

      const latest = normalized[0];
      setRows(normalized);
      setYearBE(latest.yearBE);
      setSelectedKey(latest.item.contentdate);
      setYearOpen(false);
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
      const t = e.target as Node;

      if (yearWrapRef.current && !yearWrapRef.current.contains(t)) setYearOpen(false);
      if (monthWrapRef.current && !monthWrapRef.current.contains(t)) setMonthOpen(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setYearOpen(false);
        setMonthOpen(false);
      }
    }

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const r of rows) set.add(r.yearBE);
    return Array.from(set).sort((a, b) => b - a);
  }, [rows]);

  const selected = useMemo(() => {
    return rows.find((r) => r.item.contentdate === selectedKey) ?? null;
  }, [rows, selectedKey]);

  // เดือนที่มีจริงในปีที่เลือก (เอา 1 รายการต่อเดือน)
  const monthsInYear = useMemo(() => {
    const inYear = rows.filter((r) => r.yearBE === yearBE).sort((a, b) => b.date.getTime() - a.date.getTime());
    const byMonth = new Map<number, Norm>(); // monthIndex -> latest item
    for (const r of inYear) if (!byMonth.has(r.monthIndex)) byMonth.set(r.monthIndex, r);

    // เรียง ธ.ค. -> ม.ค.
    return Array.from(byMonth.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([monthIndex, r]) => ({
        monthIndex,
        label: THAI_MONTHS[monthIndex] ?? "-",
        key: r.item.contentdate,
      }));
  }, [rows, yearBE]);

  // ถ้าเปลี่ยนปี แล้ว selected ไม่อยู่ในปีนั้น -> เด้งไปเดือนล่าสุดของปีนั้น
  useEffect(() => {
    if (!rows.length || !yearBE) return;
    const stillInYear = selected && selected.yearBE === yearBE;
    if (stillInYear) return;

    const first = monthsInYear[0];
    if (first?.key) setSelectedKey(first.key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearBE]);

  const monthLabel = selected ? THAI_MONTHS[selected.monthIndex] ?? "-" : "-";
  const pageSubTitle = yearBE ? `ข้อมูลของปี ${yearBE}` : "—";

  /** ===== Loading ===== */
  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <section className="sm:bg-[url('/bg_top.png')] bg-no-repeat bg-top-right bg-contain min-h-60 border-b border-solid border-gray-200">
          <div className="mx-auto max-w-7xl px-4 py-6">
            <div className="animate-pulse space-y-3">
              <div className="h-8 w-80 rounded bg-gray-200" />
              <div className="h-5 w-60 rounded bg-gray-200" />
              <div className="mt-5 h-11 w-full max-w-sm rounded bg-gray-200" />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="h-80 rounded-2xl bg-gray-100 ring-1 ring-black/5" />
        </section>
      </main>
    );
  }

  /** ===== Error ===== */
  if (error || !selected) {
    return (
      <main className="min-h-screen bg-white">
        <section className="sm:bg-[url('/bg_top.png')] bg-no-repeat bg-top-right bg-contain min-h-60 border-b border-solid border-gray-200">
          <div className="mx-auto max-w-7xl px-4 py-6">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-medium text-gray-900 sm:text-3xl">สรุปลักษณะอากาศรายเดือน</h1>
              <p className="mt-1 text-sm text-gray-700 sm:text-base">ไม่สามารถโหลดข้อมูลได้ในขณะนี้</p>
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
      <section className="sm:bg-[url('/bg_top.png')] bg-no-repeat bg-top-right bg-contain min-h-60 border-b border-solid border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-medium text-gray-900 sm:text-3xl">สรุปลักษณะอากาศรายเดือน</h1>
            <p className="mt-1 text-sm text-gray-700 sm:text-base">{pageSubTitle}</p>
          </div>

          <div className="flex flex-col gap-2 mt-5 sm:flex-row sm:items-center sm:justify-between sm:mt-10">
            {/* Year dropdown */}
            <div ref={yearWrapRef} className="relative w-full sm:max-w-sm">
              <button
                type="button"
                onClick={() => setYearOpen((v) => !v)}
                aria-expanded={yearOpen}
                className="flex py-3 w-full items-center justify-between
                  cursor-pointer rounded-lg border border-gray-300 bg-white
                  px-5 text-left text-sm font-medium text-gray-800 outline-none
                  focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              >
                <span className="flex items-center justify-start gap-4 min-w-0">
                  <FiCalendar className="h-6 w-6 shrink-0 text-gray-800" />
                  <span className="block truncate">{yearBE || "—"}</span>
                </span>

                <FiChevronDown
                  className={[
                    "h-6 w-6 shrink-0 text-gray-500 transition-transform duration-300 ease-in-out",
                    yearOpen ? "rotate-180" : "",
                  ].join(" ")}
                  aria-hidden="true"
                />
              </button>

              {yearOpen && (
                <div className="absolute left-0 top-full z-50 mt-2 w-full">
                  <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg">
                    <div className="max-h-105 overflow-auto py-2">
                      {years.map((y) => {
                        const active = y === yearBE;
                        return (
                          <button
                            key={y}
                            type="button"
                            onClick={() => {
                              setYearBE(y);
                              setYearOpen(false);
                            }}
                            className={[
                              "w-full text-left px-5 py-3 text-sm font-medium cursor-pointer",
                              active ? "bg-emerald-600 text-white" : "text-gray-700 hover:bg-gray-50",
                            ].join(" ")}
                          >
                            {y}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Download */}
            {txt(selected.item.url) ? (
              <div>
                <button
                  type="button"
                  onClick={() => window.open(selected.item.url, "_blank", "noopener,noreferrer")}
                  className="group flex items-center gap-2 mt-2 sm:mt-0
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
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        {/* Mobile month dropdown */}
        <div className="md:hidden">
          <div ref={monthWrapRef} className="relative w-full">
            <button
              type="button"
              onClick={() => setMonthOpen((v) => !v)}
              aria-expanded={monthOpen}
              className="flex py-3 w-full items-center justify-between
        cursor-pointer rounded-lg border border-gray-300 bg-white
        px-5 text-left text-sm font-medium text-gray-800 outline-none
        focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            >
              <span className="flex items-center justify-start gap-4 min-w-0">
                <FiCalendar className="h-6 w-6 shrink-0 text-gray-800" />
                <span className="block truncate">{monthLabel || "—"}</span>
              </span>

              <FiChevronDown
                className={[
                  "h-6 w-6 shrink-0 text-gray-500 transition-transform duration-300 ease-in-out",
                  monthOpen ? "rotate-180" : "",
                ].join(" ")}
                aria-hidden="true"
              />
            </button>

            {monthOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-full">
                <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg">
                  <div className="max-h-105 overflow-auto py-2">
                    {monthsInYear.map((m) => {
                      const active = m.key === selectedKey;
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => {
                            setSelectedKey(m.key);
                            setMonthOpen(false);
                          }}
                          className={[
                            "w-full text-left px-5 py-3 text-sm font-medium cursor-pointer",
                            active ? "bg-emerald-600 text-white" : "text-gray-700 hover:bg-gray-50",
                          ].join(" ")}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_260px] md:items-start">
          {/* Main content card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h2 className="flex flex-wrap items-baseline gap-2 text-xl font-medium text-gray-900 sm:text-2xl">
              <span>ลักษณะอากาศ</span>
              <span className="whitespace-nowrap text-sm font-medium text-gray-600 sm:text-base">
                - {monthLabel} {yearBE}
              </span>
            </h2>

            <div className="mt-4">
              <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-line">
                {txt(selected.item.content) || "ไม่พบข้อมูล"}
              </p>
            </div>

            <div className="mt-6 border-t border-gray-100 pt-3 text-xs text-gray-500">
              อัปเดต: {thaiDate(selected.date)}
            </div>
          </div>

          {/* Desktop month sidebar */}
          <aside className="hidden md:block rounded-xl border border-gray-200 bg-white p-4 shadow-sm ring-1 ring-black/5">
            <div className="text-base font-medium text-gray-900">เลือกเดือน</div>

            <div className="mt-3 grid gap-2">
              {monthsInYear.map((m) => {
                const active = m.key === selectedKey;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setSelectedKey(m.key)}
                    className={[
                      "cursor-pointer w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition",
                      active ? "bg-emerald-600 text-white" : "bg-gray-50 text-gray-900 hover:bg-gray-100",
                    ].join(" ")}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default MonthlyPage;