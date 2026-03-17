"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
// library
import ReactPaginate from "react-paginate";
// icons
import { FiCalendar, FiChevronDown, FiChevronLeft, FiChevronRight, FiDownload } from "react-icons/fi";
// types
import type { Agro7DaysItem, Agro7DaysResponse, YearFilter } from "@/app/types/agroforecast";

/* -------------------- Config API routes -------------------- */

const basePath = process.env.NEXT_PUBLIC_API_ROUTE ?? "";
const AGRO_API_ROUTE = `${basePath}/api/agroforecast`;

/* -------------------- Config pure helpers -------------------- */

// กำหนดจำนวน Card ใน Page
const PAGE_SIZE = 6;

/* -------------------- Functions -------------------- */

// Function แปลง string เป็น Date โดยพยายามแก้ไขรูปแบบให้เป็น ISO ถ้าเป็นไปได้
function toDate(raw: string): Date | null {
  if (!raw) return null;
  const isoLike = raw.trim().replace(" ", "T").replace(/\.\d+$/, "");
  const d = new Date(isoLike);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Function แปลง Date เป็น string
function thaiDate(d: Date): string {
  return TH_DATE.format(d);
}

// Format วันที่แบบไทย (พ.ศ.)
const TH_DATE = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

// Function แปลงปี ค.ศ. เป็น พ.ศ.
function beYear(d: Date): number {
  return d.getFullYear() + 543;
}

// Function หาชื่อเรื่องจาก item โดยดูจาก title > alt > "—"
function titleOf(it: Agro7DaysItem): string {
  return (it.title || it.alt || "—").trim() || "—";
}

/* -------------------- component -------------------- */

function AgroforecastPage() {
  const [items, setItems] = useState<Agro7DaysItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dropdown filter
  const [yearFilter, setYearFilter] = useState<YearFilter>("all");

  // Custom dropdown state
  const [yearOpen, setYearOpen] = useState<boolean>(false);
  const yearDropRef = useRef<HTMLDivElement | null>(null);

  // Pagination
  const [page, setPage] = useState<number>(1);

  /* -------------------- API fetchers -------------------- */

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

  /* -------------------- useEffect -------------------- */

  useEffect(() => {
    load();
  }, []);

  // เมื่อเปลี่ยน filter ให้กลับไปหน้าแรกเสมอ
  useEffect(() => {
    setPage(1);
  }, [yearFilter]);

  // Close dropdown เมื่อ click outside / ESC
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

  /* -------------------- useMemo -------------------- */

  // หา list ปีทั้งหมดจาก items เพื่อใช้ใน dropdown filter
  const yearOptions = useMemo<number[]>(() => {
    const set = new Set<number>();
    for (const it of items) {
      const d = toDate(it.contentdate);
      if (d) set.add(beYear(d));
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [items]);

  // กรอง items ตามปีที่เลือกใน filter
  const filtered = useMemo<Agro7DaysItem[]>(() => {
    if (yearFilter === "all") return items;
    const y = Number(yearFilter);
    return items.filter((it) => {
      const d = toDate(it.contentdate);
      return d ? beYear(d) === y : false;
    });
  }, [items, yearFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(Math.max(1, page), totalPages);

  const pageItems = useMemo<Agro7DaysItem[]>(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, pageSafe]);

  /* -------------------- Handlers -------------------- */

  // Function เปลี่ยนหน้า และเลื่อนกลับไปบนสุดทุกครั้ง
  function handlePageChange(selectedItem: { selected: number }): void {
    const nextPage = selectedItem.selected + 1;
    setPage(nextPage);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* -------------------- UI Loading -------------------- */

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <section className="relative min-h-60 border-b border-gray-200">
          <div
            className="absolute inset-0 hidden bg-contain bg-no-repeat bg-top-right sm:block"
            style={{ backgroundImage: `url(${basePath}/bg_top.png)` }}
          />
          <div className="relative z-10 mx-auto max-w-7xl px-4 py-6">
            <div className="space-y-3 animate-pulse">
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

  /* -------------------- UI Error -------------------- */

  if (error) {
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

  /* -------------------- UI section -------------------- */

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <section className="relative min-h-60 border-b border-gray-200">
        <div
          className="absolute inset-0 hidden bg-contain bg-no-repeat bg-top-right sm:block"
          style={{ backgroundImage: `url(${basePath}/bg_top.png)` }}
        />
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-medium text-gray-900 sm:text-3xl">
              พยากรณ์อากาศเพื่อการเกษตรราย 7 วัน
            </h1>
            <p className="mt-1 text-sm text-gray-700 sm:text-base">
              พยากรณ์อากาศเกษตร 7 วันข้างหน้า
            </p>
          </div>

          {/* Filter */}
          <div className="mt-12 flex flex-col gap-2 sm:mt-10 sm:flex-row sm:items-center sm:justify-between">
            <div ref={yearDropRef} className="relative w-full max-w-sm">
              <button
                type="button"
                onClick={() => setYearOpen((v) => !v)}
                aria-expanded={yearOpen}
                aria-haspopup="listbox"
                className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-gray-300 bg-white px-5 py-3 text-left text-sm font-medium text-gray-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              >
                <span className="flex min-w-0 items-center justify-start gap-4">
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
                          "w-full cursor-pointer px-5 py-3 text-left text-sm font-medium",
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
                              "w-full cursor-pointer px-5 py-3 text-left text-sm font-medium",
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
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <h3
                        className="
                          min-w-0 flex-1
                          wrap-break-word
                          text-base font-semibold leading-snug text-gray-900
                          md:min-h-11 lg:min-h-13 lg:text-lg
                        "
                      >
                        {titleOf(it)}
                      </h3>

                      <a
                        href={it.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-600 bg-white px-3 py-2 transition duration-150 hover:bg-emerald-700 active:bg-emerald-800 lg:px-3 lg:py-3"
                      >
                        <FiDownload
                          className="h-5 w-5 text-emerald-600 transition-colors group-hover:text-gray-100 group-active:text-gray-100 lg:h-6 lg:w-6"
                          aria-hidden="true"
                        />
                        <span className="text-xs font-semibold leading-none text-emerald-600 transition-colors group-hover:text-gray-100 group-active:text-gray-100 lg:text-sm">
                          ดาวน์โหลดเอกสาร
                        </span>
                      </a>
                    </div>

                    <div className="mt-4 border-t border-gray-100 pt-3">
                      <div className="flex flex-col gap-1 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between lg:text-sm">
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
          <div className="mt-10 flex justify-center sm:justify-end">
            <ReactPaginate
              breakLabel="…"
              nextLabel={<FiChevronRight className="h-5 w-5" />}
              previousLabel={<FiChevronLeft className="h-5 w-5" />}
              onPageChange={handlePageChange}
              pageCount={totalPages}
              forcePage={pageSafe - 1}
              pageRangeDisplayed={3}
              marginPagesDisplayed={1}
              renderOnZeroPageCount={null}
              containerClassName="flex items-center justify-center gap-1"
              pageClassName=""
              pageLinkClassName="flex min-w-10 cursor-pointer items-center justify-center rounded-lg px-3 py-2 text-sm text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              activeClassName=""
              activeLinkClassName="font-semibold text-gray-900"
              previousClassName=""
              previousLinkClassName="flex cursor-pointer items-center justify-center rounded-lg px-2 py-2 text-gray-500 transition hover:bg-gray-100"
              nextClassName=""
              nextLinkClassName="flex cursor-pointer items-center justify-center rounded-lg px-2 py-2 text-gray-500 transition hover:bg-gray-100"
              breakClassName=""
              breakLinkClassName="flex items-center justify-center px-2 py-2 text-gray-400"
              disabledClassName="opacity-40 cursor-not-allowed"
              disabledLinkClassName="pointer-events-none"
            />
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default AgroforecastPage;