"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DashboardOK, ProvinceForecast } from "@/app/types/dashboard";
import type { AwsWeatherItem, AwsApiResponse } from "@/app/types/aws-weather";
import {
  STORAGE_KEY,
  fetchGPSProvince,
  rotateToToday,
  toDDMMYYYY,
} from "@/app/lib/gps";

import {
  FiChevronDown,
  FiDroplet,
  FiCompass,
  FiWind,
  FiSearch,
  FiX,
} from "react-icons/fi";

import type { IconType } from "react-icons";
import {
  WiDaySunny,
  WiRain,
  WiThunderstorm,
  WiDayCloudy,
} from "react-icons/wi";

/** ---------- ROUTES (ชัดเจน) ---------- */
const DASHBOARD_ROUTE = "/api/dashboard";
const AWS_ROUTE = "/api/aws-weather";

/** ---------- HELPERS ---------- */
/** dd/mm/yyyy -> timestamp */
const ddmmyyyyToTime = (s: string) => {
  const [dd, mm, yyyy] = (s ?? "").split("/").map((x) => Number(x));
  if (!dd || !mm || !yyyy) return Number.POSITIVE_INFINITY;
  return new Date(yyyy, mm - 1, dd).getTime();
};

function parseDDMMYYYY(s: string): Date | null {
  const [dd, mm, yyyy] = (s ?? "").split("/").map((x) => Number(x));
  if (!dd || !mm || !yyyy) return null;
  const d = new Date(yyyy, mm - 1, dd);
  return Number.isNaN(d.getTime()) ? null : d;
}

const TH_DOW = new Intl.DateTimeFormat("th-TH", { weekday: "short" });

function formatThaiShortDate2DigitYear(d: Date) {
  const parts = new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).formatToParts(d);

  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const year = parts.find((p) => p.type === "year")?.value ?? "";

  if (!day || !month || !year) return "";

  const year2 = year.slice(-2);
  return `${day} ${month} ${year2}`;
}

function formatThaiShortDateBE(d: Date) {
  const parts = new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).formatToParts(d);

  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const year = parts.find((p) => p.type === "year")?.value ?? "";

  if (!day || !month || !year) return "";
  return `${day} ${month} พ.ศ. ${year}`;
}

function formatTime24(d: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function shortCondition(text?: string) {
  const t = (text ?? "").trim();
  if (!t) return "-";
  const first = t.split(/[\n。.!?]/)[0]?.trim() ?? t;
  return first.length > 28 ? first.slice(0, 28) + "…" : first;
}

/** เลือกไอคอนอากาศจากคำอธิบาย (ไทย) */
function pickWeatherIcon(desc?: string): IconType {
  const t = (desc ?? "").trim();
  if (t.includes("ฝนฟ้าคะนอง")) return WiThunderstorm;
  if (t === "ฝน" || t.includes("ฝน")) return WiRain;
  if (t.includes("ท้องฟ้ามีเมฆบางส่วน")) return WiDayCloudy;
  if (t.includes("ท้องฟ้าโปร่ง")) return WiDaySunny;
  return WiDayCloudy;
}

/** เรียงไทย ก-ฮ */
const TH_COLLATOR = new Intl.Collator("th", { sensitivity: "base" });
function sortThai(a: string, b: string) {
  return TH_COLLATOR.compare(a, b);
}

/** ✅ ชุดเดิม: แปลงความเร็วลม * 1.852 (เฉพาะของ forecast) */
const KNOT_TO_KMH = 1.852;
function windToKmh(v?: number | null) {
  if (typeof v !== "number" || Number.isNaN(v)) return null;
  return Math.round(v * KNOT_TO_KMH * 10) / 10;
}

/** ✅ parse dateTimeUtc7 แบบ +0700 -> +07:00 */
function parseUtc7(iso: string): Date | null {
  if (!iso) return null;
  const fixed = iso.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const d = new Date(fixed);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** ---------- ✅ แนวทาง B: เรียก /api/dashboard ตรง ๆ ---------- */
async function fetchDashboardDirect(provinceThai?: string): Promise<DashboardOK> {
  // ถ้า route ของคุณใช้ param อื่น ให้แก้ตรงนี้ (เช่น provinceName)
  const qs = provinceThai ? `?province=${encodeURIComponent(provinceThai)}` : "";
  const res = await fetch(`${DASHBOARD_ROUTE}${qs}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Dashboard error: ${res.status}`);
  }

  return (await res.json()) as DashboardOK;
}

function DashboardPage() {
  const [provinceQuery, setProvinceQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [provinceOpen, setProvinceOpen] = useState(false);
  const provinceWrapRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [provinceIndex, setProvinceIndex] =
    useState<DashboardOK["provincesIndex"]>([]);
  const [provinceData, setProvinceData] = useState<ProvinceForecast | null>(null);

  const [selectedProvinceKey, setSelectedProvinceKey] = useState("");
  const [todayStr, setTodayStr] = useState("");

  const [selectedIdx, setSelectedIdx] = useState(0);
  const userChangedRef = useRef(false);

  /* AWS states */
  const [awsLoading, setAwsLoading] = useState(false);
  const [awsError, setAwsError] = useState<string | null>(null);
  const [awsItem, setAwsItem] = useState<AwsWeatherItem | null>(null);

  const applyOK = (ok: DashboardOK) => {
    setProvinceIndex(ok.provincesIndex);
    setProvinceData(ok.province ?? null);

    const key = ok.province?.provinceNameThai ?? "";
    if (key) {
      setSelectedProvinceKey(key);
      localStorage.setItem(STORAGE_KEY, key);
    }
  };

  const loadAws = async (provinceThai: string) => {
    if (!provinceThai) return;

    setAwsLoading(true);
    setAwsError(null);

    try {
      const res = await fetch(
        `${AWS_ROUTE}?province=${encodeURIComponent(provinceThai)}`,
        {
          headers: { Accept: "application/json" },
          cache: "no-store",
        }
      );

      const json = (await res.json()) as AwsApiResponse;

      if (!res.ok || !json?.success) {
        throw new Error(json?.message || `HTTP ${res.status}`);
      }

      setAwsItem(json.data?.[0] ?? null);
    } catch (e: unknown) {
      setAwsItem(null);
      setAwsError(e instanceof Error ? e.message : String(e));
    } finally {
      setAwsLoading(false);
    }
  };

  const loadProvince = async (provinceThai?: string) => {
    setLoading(true);
    setError(null);

    try {
      const ok = await fetchDashboardDirect(provinceThai); // ✅ เรียก /api/dashboard ตรง ๆ
      applyOK(ok);

      const key = provinceThai || ok.province?.provinceNameThai || "";
      if (key) void loadAws(key);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setProvinceData(null);
    } finally {
      setLoading(false);
    }
  };

  // ปิด dropdown เมื่อคลิกนอก/กด ESC
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!provinceWrapRef.current) return;
      if (!provinceWrapRef.current.contains(e.target as Node)) {
        setProvinceOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProvinceOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    setTodayStr(toDDMMYYYY(new Date()));
    let cancelled = false;

    const saved = localStorage.getItem(STORAGE_KEY) ?? "";
    if (saved) setSelectedProvinceKey(saved);

    loadProvince(saved || undefined);

    (async () => {
      const gpsProvince = await fetchGPSProvince(() => { });
      if (cancelled) return;
      if (!gpsProvince) return;

      if (!userChangedRef.current && gpsProvince !== (saved || "")) {
        await loadProvince(gpsProvince);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* Options: เรียงไทย ก-ฮ ก่อนเสมอ */
  const provinceOptions = useMemo(() => {
    return [...provinceIndex]
      .sort((a, b) => sortThai(a.provinceNameThai, b.provinceNameThai))
      .map((p) => ({
        label: `${p.provinceNameThai} (${p.provinceNameEnglish})`,
        value: p.provinceNameThai,
      }));
  }, [provinceIndex]);

  const selectedProvinceLabel = useMemo(() => {
    return (
      provinceOptions.find((o) => o.value === selectedProvinceKey)?.label ??
      "จังหวัด"
    );
  }, [provinceOptions, selectedProvinceKey]);

  /* Search ใน dropdown (ค้นจาก label ทั้งไทย+อังกฤษ) */
  const shownProvinceOptions = useMemo(() => {
    const q = provinceQuery.trim().toLowerCase();
    if (!q) return provinceOptions;
    return provinceOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [provinceOptions, provinceQuery]);

  /** เปิด dropdown แล้ว focus input */
  useEffect(() => {
    if (!provinceOpen) return;
    const t = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [provinceOpen]);

  const sevenDaysForShow = useMemo(() => {
    const list = provinceData?.sevenDays ?? [];
    const sorted = [...list].sort(
      (a, b) => ddmmyyyyToTime(a.forecastDate) - ddmmyyyyToTime(b.forecastDate)
    );
    return todayStr ? rotateToToday(sorted, todayStr) : sorted;
  }, [provinceData, todayStr]);

  useEffect(() => {
    if (!sevenDaysForShow.length) return;
    setSelectedIdx(0);
  }, [sevenDaysForShow]);

  const selectedDay = sevenDaysForShow[selectedIdx] ?? sevenDaysForShow[0];
  const isTodaySelected = !!todayStr && selectedDay?.forecastDate === todayStr;
  const WeatherIcon = pickWeatherIcon(selectedDay?.descriptionThai);

  const selectedDateObj = selectedDay?.forecastDate
    ? parseDDMMYYYY(selectedDay.forecastDate)
    : null;

const selectedDateShortBE = selectedDateObj
  ? formatThaiShortDate2DigitYear(selectedDateObj)
  : "";

  /** AWS: format วันที่/เวลาแบบไทย + 24 ชม. */
  const awsUpdatedText = useMemo(() => {
    const dt = awsItem?.dateTimeUtc7 ? parseUtc7(awsItem.dateTimeUtc7) : null;
    if (!dt) return "";
    return `${formatThaiShortDate2DigitYear(dt)} เวลา ${formatTime24(dt)} น.`;
  }, [awsItem?.dateTimeUtc7]);

  /* icon */
  const awsView = useMemo(() => {
    return {
      stationName: awsItem?.stationNameTh ?? "-",
      temperatureText: awsItem?.temperature != null ? `${awsItem.temperature} °C` : "-",
      windSpeedText: awsItem?.windSpeed != null ? `${awsItem.windSpeed} m/s` : "-",
      precip15Text: awsItem?.precip15Mins != null ? `${awsItem.precip15Mins} มม.` : "-",
      precipTodayText: awsItem?.precipToday != null ? `${awsItem.precipToday} มม.` : "-",
      precipTodayNote: "(ตั้งแต่ 07:00 น.)",
    };
  }, [awsItem]);

  return (
    <main className="flex justify-center px-5 py-10 text-slate-900 
    bg-gradient-to-br from-sky-200 via-white to-fuchsia-200"
    >
      <section className="w-full relative">
        {/* Province select */}
        <header className="w-full max-w-sm mx-auto">
          <label className="sr-only">เลือกจังหวัด</label>
          <div ref={provinceWrapRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setProvinceOpen((v) => !v);
                if (!provinceOpen) setProvinceQuery("");
              }}
              disabled={loading || provinceOptions.length === 0}
              aria-expanded={provinceOpen}
              className="flex items-center w-full h-11 px-4 text-sm
              bg-white rounded-full border border-slate-900/10 shadow-sm text-slate-800
              focus:ring-2 focus:ring-emerald-600 outline-none cursor-pointer
              disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="min-w-0 flex-1 truncate pr-3 text-center">
                {selectedProvinceLabel}
              </span>

              <FiChevronDown
                className={`h-5 w-5 shrink-0 transition-transform text-slate-600
                ${provinceOpen ? "rotate-180" : "rotate-0"}`}
                aria-hidden="true"
              />
            </button>

            {provinceOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-full">
                <div className="overflow-hidden rounded-2xl border border-slate-900/10 bg-white shadow-lg">
                  <div className="border-b border-slate-900/10 p-3">
                    <div className="relative">
                      <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        ref={searchInputRef}
                        value={provinceQuery}
                        onChange={(e) => setProvinceQuery(e.target.value)}
                        placeholder="ค้นหาจังหวัด..."
                        className="h-10 w-full rounded-xl border border-slate-900/10 bg-white pl-9 pr-9 text-base text-slate-900 outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                      {provinceQuery ? (
                        <button
                          type="button"
                          onClick={() => {
                            setProvinceQuery("");
                            searchInputRef.current?.focus();
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                          aria-label="ล้างคำค้นหา"
                        >
                          <FiX className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-2 text-[11px] text-slate-500">
                      {shownProvinceOptions.length} รายการ
                    </div>
                  </div>

                  <div className="max-h-80 overflow-auto py-2">
                    {shownProvinceOptions.length === 0 ? (
                      <div className="px-5 py-4 text-sm text-slate-600">
                        ไม่พบจังหวัดที่ตรงกับ “{provinceQuery}”
                      </div>
                    ) : (
                      shownProvinceOptions.map((opt) => {
                        const active = opt.value === selectedProvinceKey;

                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              userChangedRef.current = true;
                              const v = opt.value;
                              setSelectedProvinceKey(v);
                              localStorage.setItem(STORAGE_KEY, v);
                              loadProvince(v);
                              setProvinceOpen(false);
                            }}
                            className={[
                              "w-full cursor-pointer px-5 py-3 text-left text-sm font-medium",
                              active
                                ? "bg-emerald-600 text-white"
                                : "text-gray-800 hover:bg-gray-50",
                            ].join(" ")}
                          >
                            {opt.label}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* UI Loading */}
        <section className="mt-4 flex flex-1 flex-col items-center justify-start text-center">
          {loading ? (
            <div className="w-full max-w-xl rounded-3xl border border-slate-900/10 bg-white p-6 text-slate-800 shadow-sm">
              <div className="animate-pulse space-y-4">
                <div className="mx-auto h-4 w-40 rounded bg-slate-900/10" />
                <div className="mx-auto h-3 w-56 rounded bg-slate-900/10" />
                <div className="mx-auto mt-2 h-16 w-48 rounded bg-slate-900/10" />
                <div className="mx-auto h-16 w-48 rounded bg-slate-900/10" />
                <div className="mx-auto mt-6 h-14 w-full max-w-md rounded-2xl bg-slate-900/10" />
              </div>
            </div>
          ) : error ? (
            <div className="w-full max-w-xl rounded-3xl border border-red-200 bg-red-50 p-6 text-left text-red-700">
              โหลดข้อมูลไม่สำเร็จ: {error}
            </div>
          ) : !provinceData ? (
            <div className="w-full max-w-xl rounded-3xl border border-slate-900/10 bg-white p-6 text-slate-800 shadow-sm">
              ไม่พบข้อมูลจังหวัด
            </div>
          ) : (
            <>

              {/* Section Card */}
              <section className="flex items-stretch mt-6 gap-4"
              >
                {/* Section AWS */}
                <div className="rounded-3xl border border-slate-900/10
                  bg-white p-4 shadow-sm backdrop-blur
                  "
                >
                  {/* Header */}
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div className="text-left">
                      <div className="text-sm font-semibold text-slate-800">
                        สภาพอากาศปัจจุบัน
                      </div>

                      {awsItem?.stationNameTh ? (
                        <div className="mt-1 truncate text-xs text-slate-500">
                          {awsItem.stationNameTh}
                        </div>
                      ) : null}
                    </div>

                    <div className="text-xs text-slate-600 text-left sm:text-right mt-0.5">
                      {awsLoading ? "กำลังโหลด..." : awsUpdatedText || "-"}
                    </div>
                  </div>

                  {/* Content */}
                  {awsError ? (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      โหลด AWS ไม่สำเร็จ: {awsError}
                    </div>
                  ) : (
                    <div className="mt-6 grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-center rounded-2xl border border-slate-900/10 bg-white/80 px-3 py-2 text-center text-sm leading-tight text-slate-700">
                        <span className="flex items-center text-sm text-slate-700 h-8">
                          {awsView.temperatureText}
                        </span>
                      </div>

                      <div className="flex items-center justify-center rounded-2xl border border-slate-900/10 bg-white/80 px-3 py-2 text-center text-sm leading-tight text-slate-700">
                        <span className="flex items-center text-sm text-slate-700 h-8">
                          {awsView.windSpeedText}
                        </span>
                      </div>

                      <div className="flex items-center justify-center rounded-2xl border border-slate-900/10 bg-white/80 px-3 py-2 text-center text-sm leading-tight text-slate-700">
                        <span className="flex items-center text-sm text-slate-700 h-8">
                          {awsView.precip15Text}
                        </span>
                      </div>

                      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-900/10 bg-white/80 px-3 py-2 text-center leading-tight">
                        <span className="text-sm text-slate-700">
                          {awsView.precipTodayText}
                        </span>
                        <span className="text-xs text-slate-500">
                          {awsView.precipTodayNote}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section Weather 7 day */}
                <div className="rounded-3xl border border-slate-900/10
                  bg-white p-4 text-slate-800 shadow-sm
                  flex flex-col items-center justify-between
                  "
                >
                  <div className="flex flex-col items-center justify-center gap-4">
                    <span className="text-center text-xs text-gray-700">
                      {shortCondition(selectedDay?.descriptionThai)}
                    </span>

                    <WeatherIcon className="h-7 w-7 text-slate-700" />

                    <span className="rounded-xl bg-gray-200 px-2 text-xs text-slate-600">
                      {isTodaySelected ? "วันนี้" : selectedDateShortBE || selectedDay?.forecastDate || "-"}
                    </span>
                  </div>

                  <div className="mt-8 flex items-center justify-center">
                    <div className="flex flex-col items-center leading-none">
                      <div className="text-2xl font-light tracking-tight text-gray-700">
                        {selectedDay?.maxTempC ?? "-"}°
                      </div>
                      <div className="mt-2 text-2xl font-light tracking-tight text-gray-600">
                        {selectedDay?.minTempC ?? "-"}°
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Metrics row */}
              <div className="mt-14 flex items-end justify-center gap-10">
                <div className="flex flex-col items-center">
                  <FiCompass className="h-7 w-7 text-slate-800" />
                  <div className="mt-2 text-[11px] text-slate-600">ทิศทางลม</div>
                  <div className="mt-1 text-xs font-medium text-slate-900">
                    {(selectedDay?.windDirectionDeg ?? "-") + "°"}
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <FiWind className="h-7 w-7 text-slate-800" />
                  <div className="mt-2 text-[11px] text-slate-600">ความเร็วลม</div>
                  <div className="mt-1 text-xs font-medium text-slate-900">
                    {windToKmh(selectedDay?.windSpeedKmh) ?? "-"} กม./ชม.
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <FiDroplet className="h-7 w-7 text-slate-800" />
                  <div className="mt-2 text-[11px] text-slate-600">พื้นที่ฝนตก</div>
                  <div className="mt-1 text-xs font-medium text-slate-900">
                    {selectedDay?.percentRainCover ?? "-"} %
                  </div>
                </div>
              </div>

              {/* Next 7 Day Card */}
              <div className="mt-10 w-full">
                <div className="text-center text-sm text-slate-800">
                  อุณหภูมิสูงสุด-ต่ำสุด สัปดาห์นี้
                </div>

                <div className="mx-auto mt-4 grid max-w-105 grid-cols-7 gap-2">
                  {sevenDaysForShow.slice(0, 7).map((d, idx) => {
                    const isActive = idx === selectedIdx;
                    const dt = parseDDMMYYYY(d.forecastDate);
                    const dow = dt ? TH_DOW.format(dt) : "";

                    return (
                      <button
                        key={`${provinceData.provinceNameThai}-${d.forecastDate}`}
                        type="button"
                        onClick={() => setSelectedIdx(idx)}
                        className={[
                          "group cursor-pointer rounded-2xl border px-2 py-3 text-center transition",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70",
                          "active:scale-[0.98]",
                          isActive
                            ? "border-emerald-500/70 bg-emerald-600 text-white hover:bg-emerald-600 active:bg-emerald-700"
                            : "border-slate-900/10 bg-white text-slate-800 hover:border-emerald-400/50 hover:bg-emerald-500/10 active:bg-emerald-500/20",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "text-xs",
                            isActive ? "text-white/90" : "text-slate-500",
                          ].join(" ")}
                        >
                          {dow}
                        </div>
                        <div
                          className={[
                            "text-xs font-light",
                            isActive ? "text-white" : "text-slate-800",
                          ].join(" ")}
                        >
                          {d.maxTempC ?? "-"}°
                        </div>

                        <div
                          className={[
                            "text-xs font-light mt-0.5",
                            isActive ? "text-white/90" : "text-slate-600",
                          ].join(" ")}
                        >
                          {d.minTempC ?? "-"}°
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}

export default DashboardPage;