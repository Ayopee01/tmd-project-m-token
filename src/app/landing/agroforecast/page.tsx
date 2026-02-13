"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiCalendar,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
} from "react-icons/fi";

import type { Agro7DaysItem, Agro7DaysResponse } from "@/app/types/agroforecast";

const AGRO_API_ROUTE = `${
  process.env.NEXT_PUBLIC_API_ROUTE ?? "/test2"
}/api/agroforecast`;

//กำหนดจำนวน Card ใน Page
const PAGE_SIZE = 6;

type YearFilter = "all" | `${number}`;

function toDate(raw: string): Date | null {
  if (!raw) return null;
  const isoLike = raw.trim().replace(" ", "T").replace(/\.\d+$/, "");
  const d = new Date(isoLike);
  return Number.isNaN(d.getTime()) ? null : d;
}

const TH_DATE = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function thaiDate(d: Date): string {
  return TH_DATE.format(d);
}

function beYear(d: Date): number {
  return d.getFullYear() + 543;
}

function titleOf(it: Agro7DaysItem): string {
  return (it.title || it.alt || "—").trim() || "—";
}

function pageTokens(current: number, total: number): Array<number | "…"> {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

  const last = total;

  if (current <= 2) return [1, 2, 3, "…", last];
  if (current === 3) return [1, 2, 3, 4, "…", last];
  if (current >= last - 1) return [1, "…", last - 2, last - 1, last];
  if (current === last - 2) return [1, "…", last - 3, last - 2, last - 1, last];

  return [1, "…", current - 1, current, current + 1, "…", last];
}

function AgroforecastPage() {
  const [items, setItems] = useState<Agro7DaysItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dropdown filter (ตาม Figma: เอกสารทั้งหมด + ปี)
  const [yearFilter, setYearFilter] = useState<YearFilter>("all");

  // Custom dropdown state
  const [yearOpen, setYearOpen] = useState<boolean>(false);
  const yearDropRef = useRef<HTMLDivElement | null>(null);

  // Pagination
  const [page, setPage] = useState<number>(1);

  async function load(): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(AGRO_API_ROUTE, { cache: "no-store" });
      const json = (await res.json()) as Agro7DaysResponse;

      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      if (!json?.success || !Array.isArray(json.data)) {
        throw new Error(json?.message || "Bad response");
      }

      const sorted = [...json.data].sort((a, b) => {
        const da = toDate(a.contentdate)?.getTime() ?? 0;
        const db = toDate(b.contentdate)?.getTime() ?? 0;
        return db - da;
      });

      setItems(sorted);
      setYearFilter("all");
      setYearOpen(false);
      setPage(1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const yearOptions = useMemo<number[]>(() => {
    const set = new Set<number>();
    for (const it of items) {
      const d = toDate(it.contentdate);
      if (d) set.add(beYear(d));
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [items]);

  const filtered = useMemo<Agro7DaysItem[]>(() => {
    if (yearFilter === "all") return items;
    const y = Number(yearFilter);
    return items.filter((it) => {
      const d = toDate(it.contentdate);
      return d ? beYear(d) === y : false;
    });
  }, [items, yearFilter]);

  useEffect(() => {
    setPage(1);
  }, [yearFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(Math.max(1, page), totalPages);

  const pageItems = useMemo<Agro7DaysItem[]>(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, pageSafe]);

  // Close dropdown when click outside / ESC (ไม่มี any)
  useEffect(() => {
    if (!yearOpen) return;

    const onDown = (e: MouseEvent | TouchEvent): void => {
      const el = yearDropRef.current;
      if (!el) return;
      const target = e.target;
      if (target instanceof Node && !el.contains(target)) setYearOpen(false);
    };

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setYearOpen(false);
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
  }, [yearOpen]);

  const yearLabel = yearFilter === "all" ? "เอกสารทั้งหมด" : `ปี ${yearFilter}`;

  /** ===== Loading ===== */
  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <section className="sm:bg-[url('/test2/bg_top.png')] bg-no-repeat bg-top-right bg-contain min-h-60 border-b border-solid border-gray-200">
          <div className="mx-auto max-w-7xl px-4 py-6">
            <div className="animate-pulse space-y-3">
              <div className="h-9 w-96 max-w-full rounded bg-gray-200" />
              <div className="h-5 w-80 max-w-full rounded bg-gray-200" />
              <div className="mt-6 h-11 w-full max-w-md rounded bg-gray-200" />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-gray-100 ring-1 ring-black/5" />
            ))}
          </div>
        </section>
      </main>
    );
  }

  /** ===== Error ===== */
  if (error) {
    return (
      <main className="min-h-screen bg-white">
        <section className="sm:bg-[url('/test2/bg_top.png')] bg-no-repeat bg-top-right bg-contain min-h-60 border-b border-solid border-gray-200">
          <div className="mx-auto max-w-7xl px-4 py-6">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-medium text-gray-900 sm:text-3xl">
                พยากรณ์อากาศเพื่อการเกษตรราย 7 วัน
              </h1>
              <p className="mt-1 text-sm text-gray-700 sm:text-base">
                ไม่สามารถโหลดข้อมูลได้ในขณะนี้
              </p>
            </div>

            <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
              <p className="text-sm font-semibold text-red-600">{error}</p>
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
              พยากรณ์อากาศเพื่อการเกษตรราย 7 วัน
            </h1>
            <p className="mt-1 text-sm text-gray-700 sm:text-base">
              พยากรณ์อากาศเกษตร 7 วันข้างหน้า
            </p>
          </div>

          {/* Filter + Download */}
          <div className="flex flex-col gap-2 mt-10 sm:flex-row sm:items-center sm:justify-between sm:mt-10">
            {/* Year dropdown */}
            <div ref={yearDropRef} className="relative w-full max-w-sm">
              <button
                type="button"
                onClick={() => setYearOpen((v) => !v)}
                aria-expanded={yearOpen}
                aria-haspopup="listbox"
                className="
                  flex py-3 w-full items-center justify-between
                  cursor-pointer rounded-lg border border-gray-300 bg-white
                  px-5 text-left text-sm font-medium text-gray-800 outline-none
                  focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100
                "
              >
                <span className="flex items-center justify-start gap-4 min-w-0">
                  <FiCalendar className="h-6 w-6 shrink-0 text-gray-800" aria-hidden="true" />
                  <span className="block truncate">{yearLabel || "—"}</span>
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
                    <div className="max-h-105 overflow-auto py-2" role="listbox">
                      <button
                        type="button"
                        onClick={() => {
                          setYearFilter("all");
                          setYearOpen(false);
                        }}
                        className={[
                          "w-full cursor-pointer text-left px-5 py-3 text-sm font-medium",
                          yearFilter === "all"
                            ? "bg-emerald-600 text-white"
                            : "text-gray-700 hover:bg-gray-50",
                        ].join(" ")}
                        role="option"
                        aria-selected={yearFilter === "all"}
                      >
                        เอกสารทั้งหมด
                      </button>

                      {yearOptions.map((y) => {
                        const value = String(y) as `${number}`;
                        const active = yearFilter === value;

                        return (
                          <button
                            key={y}
                            type="button"
                            onClick={() => {
                              setYearFilter(value);
                              setYearOpen(false);
                            }}
                            className={[
                              "w-full cursor-pointer text-left px-5 py-3 text-sm font-medium",
                              active
                                ? "bg-emerald-600 text-white"
                                : "text-gray-700 hover:bg-gray-50",
                            ].join(" ")}
                            role="option"
                            aria-selected={active}
                          >
                            ปี {y}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* List */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        {pageItems.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <p className="text-sm text-gray-700">ไม่พบเอกสาร</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {pageItems.map((it) => {
              const d = toDate(it.contentdate);
              const updated = d ? thaiDate(d) : it.contentdate;

              return (
                <div
                  key={`${it.contentdate}-${it.url}`}
                  className="h-full rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
                >
                  <div className="flex h-full flex-col p-5">
                    {/* ทำให้การ์ด 2 คอลัมน์ “เริ่มต้นเสมอ” (md+) */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <h3
                        className="
                          flex-1 min-w-0
                          font-semibold leading-snug text-gray-900
                          text-base lg:text-lg
                          md:min-h-11 lg:min-h-13
                          wrap-break-word
                        "
                      >
                        {titleOf(it)}
                      </h3>

                      {/* ปุ่มดาวน์โหลด (เหมือน UI ตัวอย่าง + responsive <lg) */}
                      <a
                        href={it.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="
                          group flex w-full items-center justify-center gap-2
                          rounded-lg border border-emerald-600 bg-white
                          px-3 py-2 lg:px-3 lg:py-3
                          cursor-pointer transition duration-150
                          hover:bg-emerald-700 active:bg-emerald-800
                          sm:w-auto sm:min-w-38
                          whitespace-nowrap
                        "
                      >
                        <FiDownload
                          className="
                            h-5 w-5 lg:h-6 lg:w-6
                            text-emerald-600 transition-colors
                            group-hover:text-gray-100 group-active:text-gray-100
                          "
                          aria-hidden="true"
                        />
                        <span
                          className="
                            text-xs lg:text-sm leading-none font-semibold
                            text-emerald-600 transition-colors
                            group-hover:text-gray-100 group-active:text-gray-100
                          "
                        >
                          ดาวน์โหลดเอกสาร
                        </span>
                      </a>
                    </div>

                    <div className="mt-4 border-t border-gray-100 pt-3">
                      <div className="flex flex-col gap-1 text-xs text-gray-500 lg:text-sm sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          อัปเดต:{" "}
                          <span className="font-medium text-gray-700">{updated}</span>
                        </div>
                        <div>
                          หมวดหมู่:{" "}
                          <span className="font-medium text-gray-700">
                            จุดพยากรณ์อากาศเกษตร
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 ? (
          <nav className="mt-10 flex items-center justify-center gap-1 sm:justify-end">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe === 1}
              className="rounded-lg px-2 py-2 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              aria-label="ก่อนหน้า"
            >
              <FiChevronLeft className="h-5 w-5" />
            </button>

            {pageTokens(pageSafe, totalPages).map((t, idx) => {
              if (t === "…") {
                return (
                  <span key={`dots-${idx}`} className="px-2 py-2 text-gray-400">
                    …
                  </span>
                );
              }

              const n = t as number;
              const active = n === pageSafe;

              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  className={[
                    "min-w-10 rounded-lg px-3 py-2 text-sm transition cursor-pointer",
                    active
                      ? "font-semibold text-gray-900"
                      : "text-gray-500 hover:bg-gray-100 hover:text-gray-900",
                  ].join(" ")}
                  aria-current={active ? "page" : undefined}
                >
                  {n}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageSafe === totalPages}
              className="rounded-lg px-2 py-2 text-gray-500 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              aria-label="ถัดไป"
            >
              <FiChevronRight className="h-5 w-5" />
            </button>
          </nav>
        ) : null}
      </section>
    </main>
  );
}

export default AgroforecastPage;
