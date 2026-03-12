"use client";
import { useEffect, useMemo, useRef, useState } from "react";
// Swiper
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css/pagination";
import "swiper/css";
// lib
import { STORAGE_KEY, fetchGPSProvince, rotateToToday, toDDMMYYYY, } from "@/app/lib/gps";
// icons
import { FiChevronDown, FiDroplet, FiCompass, FiWind, FiSearch, FiX, } from "react-icons/fi";
import { WiDaySunny, WiRain, WiThunderstorm, WiDayCloudy, WiStormShowers } from "react-icons/wi";
// types
import type { DashboardOK, ProvinceForecast, WeatherDay, WeatherCardData } from "@/app/types/dashboard";
import type { AwsWeatherItem, AwsApiResponse } from "@/app/types/aws-weather";
import type { Swiper as SwiperType } from "swiper";
import type { IconType } from "react-icons";

/* -------------------- Config API routes -------------------- */

const DASHBOARD_ROUTE = "/api/dashboard";
const AWS_ROUTE = "/api/aws-weather";

/* -------------------- Config pure helpers -------------------- */

const TH_COLLATOR = new Intl.Collator("th", { sensitivity: "base" });
const KNOT_TO_KMH = 1.852;

/* -------------------- Functions -------------------- */

// Function เลือก icon ให้ตรง Description TH ใน API
function pickWeatherIcon(desc?: string): IconType | null {
  const t = (desc ?? "").trim();

  if (!t) return null;

  if (t.includes("พายุฝนฟ้าคะนอง")) return WiThunderstorm;
  if (t.includes("ฝนฟ้าคะนอง")) return WiStormShowers;
  if (t.includes("ฝน")) return WiRain;
  if (t.includes("ท้องฟ้ามีเมฆบางส่วน")) return WiDayCloudy;
  if (t.includes("ท้องฟ้าโปร่ง")) return WiDaySunny;

  return null;
}

// Function แปลงค่าเวลา ISO string ที่เป็น UTC+7 ให้เป็น Date object (ถ้าแปลงไม่ได้ให้คืนค่า null)
function parseUtc7(iso: string): Date | null {
  if (!iso) return null;
  const fixed = iso.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const d = new Date(fixed);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Function แปลงวันที่จาก "dd/MM/yyyy" เป็น timestamp (ถ้าแปลงไม่ได้ให้คืนค่า Infinity เพื่อให้เรียงท้ายสุด)
function ddmmyyyyToTime(s: string) {
  const [dd, mm, yyyy] = (s ?? "").split("/").map((x) => Number(x));
  if (!dd || !mm || !yyyy) return Number.POSITIVE_INFINITY;
  return new Date(yyyy, mm - 1, dd).getTime();
}

// Function แปลงวันที่จาก "dd/MM/yyyy" เป็น Date object (ถ้าแปลงไม่ได้ให้คืนค่า null)
function parseDDMMYYYY(s: string): Date | null {
  const [dd, mm, yyyy] = (s ?? "").split("/").map((x) => Number(x));
  if (!dd || !mm || !yyyy) return null;
  const d = new Date(yyyy, mm - 1, dd);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Function แปลงเวลาเป็นรูปแบบ 24 ชม. "HH:mm"
function formatTime24(d: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

// Function แปลงวันที่เป็นรูปแบบ "d MMM yy" (ปี 2 หลัก)
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
  // return `${day} ${month} พ.ศ. ${year}`;
}

// Function ตัดข้อความสภาพอากาศให้สั้นลงสำหรับแสดงผล
function shortCondition(text?: string) {
  const t = (text ?? "").trim();
  if (!t) return "-";
  const first = t.split(/[\n。.!?]/)[0]?.trim() ?? t;
  return first.length > 28 ? first.slice(0, 28) + "…" : first;
}

// Function เรียงไทย ก-ฮ
function sortThai(a: string, b: string) {
  return TH_COLLATOR.compare(a, b);
}

// Function แปลงความเร็วลม * ด้วยค่า KONT_TO_KMH แล้วปัดเศษให้เหลือทศนิยม 1 ตำแหน่ง (ถ้าแปลงไม่ได้ให้คืนค่า null)
function windToKmh(v?: number | null) {
  if (typeof v !== "number" || Number.isNaN(v)) return null;
  return Math.round(v * KNOT_TO_KMH * 10) / 10;
}

// Function เลือกข้อมูลวันที่จะแสดงจาก list ของ 7 วัน โดยใช้ selectedIdx เป็นตัวเลือก (ถ้า selectedIdx ไม่ถูกต้องให้คืนค่าเป็นวันที่ 0)
function getSelectedWeatherDay(
  list: WeatherDay[],
  selectedIdx: number
): WeatherDay | null {
  return list[selectedIdx] ?? list[0];
}

/* -------------------- API fetchers -------------------- */

async function fetchDashboard(
  provinceThai?: string
): Promise<DashboardOK> {
  const queryString = provinceThai ? `?province=${encodeURIComponent(provinceThai)}` : "";

  const res = await fetch(`${DASHBOARD_ROUTE}${queryString}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as DashboardOK | null;

  if (!res.ok) {
    throw new Error(`Dashboard error: ${res.status}`);
  }

  if (!json || !Array.isArray(json.provincesIndex)) {
    throw new Error("Bad dashboard response shape");
  }

  return json;
}

/* -------------------- component -------------------- */

function DashboardPage() {
  /* state / refs */
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

  const weatherSwiperRef = useRef<SwiperType | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const userChangedRef = useRef(false);

  // AWS states
  const [awsLoading, setAwsLoading] = useState(false);
  const [awsError, setAwsError] = useState<string | null>(null);
  const [awsItem, setAwsItem] = useState<AwsWeatherItem | null>(null);

  // Handlers for Swiper
  function handleWeatherSwiper(swiper: SwiperType) {
    weatherSwiperRef.current = swiper;
  }

  // เมื่อเปลี่ยน slide ให้เปลี่ยน selectedIdx ด้วย
  function handleWeatherSlideChange(swiper: SwiperType) {
    setSelectedIdx(swiper.activeIndex);
  }

  // handlers / async actions
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

      const json = (await res.json().catch(() => null)) as AwsApiResponse | null;

      if (!res.ok) {
        throw new Error(json?.message || `HTTP ${res.status}`);
      }

      if (!json?.success || !Array.isArray(json.data)) {
        throw new Error(json?.message || "Bad AWS response shape");
      }

      setAwsItem(json.data[0] ?? null);
    } catch (e: unknown) {
      setAwsItem(null);
      setAwsError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setAwsLoading(false);
    }
  };

  const loadProvince = async (provinceThai?: string) => {
    setLoading(true);
    setError(null);

    try {
      const ok = await fetchDashboard(provinceThai);
      applyOK(ok);

      const key = provinceThai || ok.province?.provinceNameThai || "";
      if (key) void loadAws(key);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setProvinceData(null);
      setAwsItem(null);
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- useEffect -------------------- */

  // ปิด dropdown เมื่อคลิกนอก/กด ESC
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!provinceWrapRef.current?.contains(e.target as Node)) {
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

  // เปิด dropdown แล้ว focus input ก่อน
  useEffect(() => {
    if (!provinceOpen) return;
    const t = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [provinceOpen]);

  // โหลดข้อมูลจังหวัดตอนเริ่มจาก localStorage ก่อนและถ้ามี GPS ก็โหลดข้อมูลจังหวัดจาก GPS มาเปรียบเทียบ (ถ้ายังไม่เคยเลือกเอง)
  useEffect(() => {
    setTodayStr(toDDMMYYYY(new Date()));
    let cancelled = false;

    const saved = localStorage.getItem(STORAGE_KEY) ?? "";
    if (saved) setSelectedProvinceKey(saved);

    void loadProvince(saved || undefined);

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

  /* -------------------- useMemo -------------------- */

  // Options จังหวัด เรียง ก-ฮ จาก API
  const provinceOptions = useMemo(() => {
    return [...provinceIndex]
      .sort((a, b) => sortThai(a.provinceNameThai, b.provinceNameThai))
      .map((p) => ({
        label: `${p.provinceNameThai} (${p.provinceNameEnglish})`,
        value: p.provinceNameThai,
      }));
  }, [provinceIndex]);

  // Label จังหวัดที่เลือก (ถ้าไม่มีให้แสดง คำว่า "ไม่พบจังหวัด")
  const selectedProvinceLabel = useMemo(() => {
    return (
      provinceOptions.find((o) => o.value === selectedProvinceKey)?.label ??
      "ไม่พบจังหวัด"
    );
  }, [provinceOptions, selectedProvinceKey]);

  // Search ใน dropdown (ค้นจาก label TH หรือ EN ก็ได้)
  const shownProvinceOptions = useMemo(() => {
    const query = provinceQuery.trim().toLowerCase();
    if (!query) return provinceOptions;
    return provinceOptions.filter((o) => o.label.toLowerCase().includes(query));
  }, [provinceOptions, provinceQuery]);

  // จัดเรียงข้อมูล 7 วันให้เริ่มจากวันนี้ (ถ้าวันนี้อยู่ในข้อมูล)
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
    weatherSwiperRef.current?.slideTo(0, 0);
  }, [sevenDaysForShow]);

  //แปลงเวลาอัปเดต AWS เป็นข้อความวันที่/เวลาแบบไทย
  const awsUpdatedText = useMemo(() => {
    const dt = awsItem?.dateTimeUtc7 ? parseUtc7(awsItem.dateTimeUtc7) : null;
    if (!dt) return "";
    return `${formatThaiShortDate2DigitYear(dt)} เวลา ${formatTime24(dt)} น.`;
  }, [awsItem?.dateTimeUtc7]);

  /* -------------------- UI section -------------------- */

  return (
    <main className="flex justify-center px-5 py-10 text-slate-900 bg-gradient-to-br from-sky-200 via-white to-fuchsia-200">
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
              bg-white rounded-full border border-gray-200 shadow-sm text-slate-800
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
                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                  <div className="border-b border-gray-200 p-3">
                    <div className="relative">
                      <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        ref={searchInputRef}
                        value={provinceQuery}
                        onChange={(e) => setProvinceQuery(e.target.value)}
                        placeholder="ค้นหาจังหวัด..."
                        className="h-10 w-full rounded-xl border border-gray-200 bg-white pl-9 pr-9 text-base text-slate-900 outline-none focus:ring-2 focus:ring-emerald-600"
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

                    <div className="mt-2 text-xs text-slate-500">
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
                              void loadProvince(v);
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
            <div className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-6 text-slate-800 shadow-sm">
              <div className="animate-pulse space-y-4">
                <div className="mx-auto h-4 w-40 rounded bg-gray-200" />
                <div className="mx-auto h-3 w-56 rounded bg-gray-200" />
                <div className="mx-auto mt-2 h-16 w-48 rounded bg-gray-200" />
                <div className="mx-auto h-16 w-48 rounded bg-gray-200" />
                <div className="mx-auto mt-6 h-14 w-full max-w-md rounded-2xl bg-gray-200" />
              </div>
            </div>
          ) : error ? (
            <div className="w-full max-w-xl rounded-3xl border border-red-200 bg-red-50 p-6 text-left text-red-700">
              โหลดข้อมูลไม่สำเร็จ: {error}
            </div>
          ) : !provinceData ? (
            <div className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white p-6 text-slate-800 shadow-sm">
              ไม่พบข้อมูลจังหวัด
            </div>
          ) : (
            <>
              {/* Section Card */}
              <section className="mt-6 gap-4 w-full max-w-xs mx-auto">
                {/* AWS Card */}
                <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm backdrop-blur">
                  {/* Header */}
                  <div className="flex flex-col">
                    <div className="text-left">
                      <div className="text-sm font-semibold text-slate-800">
                        สภาพอากาศปัจจุบัน
                      </div>

                      {awsItem?.stationNameTh ? (
                        <div className="mt-1 truncate text-xs text-slate-500">
                          {awsItem.stationNameTh}
                        </div>
                      ) : null}

                      <div className="text-xs text-slate-600 mt-1.5">
                        {awsLoading ? "กำลังโหลด..." : awsUpdatedText || "-"}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  {awsError ? (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      โหลด AWS ไม่สำเร็จ: {awsError}
                    </div>
                  ) : (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white/80 px-3 py-2 text-center text-sm leading-tight text-slate-700">
                        <span className="flex items-center text-sm text-slate-700 h-8">
                          {awsItem?.temperature != null ? `${awsItem.temperature} °C` : "-"}
                        </span>
                      </div>

                      <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white/80 px-3 py-2 text-center text-sm leading-tight text-slate-700">
                        <span className="flex items-center text-sm text-slate-700 h-8">
                          {awsItem?.windSpeed != null ? `${awsItem.windSpeed} m/s` : "-"}
                        </span>
                      </div>

                      <div className="flex items-center justify-center rounded-2xl border border-gray-200 bg-white/80 px-3 py-2 text-center text-sm leading-tight text-slate-700">
                        <span className="flex items-center text-sm text-slate-700 h-8">
                          {awsItem?.precip15Mins != null ? `${awsItem.precip15Mins} มม.` : "-"}
                        </span>
                      </div>

                      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white/80 px-3 py-2 text-center leading-tight">
                        <span className="text-sm text-slate-700">
                          {awsItem?.precipToday != null ? `${awsItem.precipToday} มม.` : "-"}
                        </span>
                        <span className="text-xs text-slate-500">
                          (ตั้งแต่ 07:00 น.)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Weather 7 day Card */}
              <section className="mt-4 w-full max-w-xs mx-auto">
                <Swiper
                  key={`${provinceData?.provinceNameThai}-${sevenDaysForShow.length}`}
                  modules={[Pagination]}
                  pagination={{ clickable: true }}
                  onSwiper={handleWeatherSwiper}
                  onSlideChange={handleWeatherSlideChange}
                  slidesPerView={1}
                  spaceBetween={12}
                  className="weather-swiper w-full"
                >
                  {sevenDaysForShow.slice(0, 7).map((d, idx) => {
                    const isToday = d.forecastDate === todayStr;
                    const slideDateObj = parseDDMMYYYY(d.forecastDate);
                    const slideDateShortBE = slideDateObj
                      ? formatThaiShortDate2DigitYear(slideDateObj)
                      : "";
                    const SlideWeatherIcon = pickWeatherIcon(d.descriptionThai);

                    return (
                      <SwiperSlide
                        key={`${provinceData?.provinceNameThai}-${d.forecastDate}-${idx}`}
                        className="!w-full"
                      >
                        <div className="w-full rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
                          <div className="flex items-center justify-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-center text-xs text-slate-700">
                              {shortCondition(d.descriptionThai)}
                            </span>

                            {SlideWeatherIcon && (
                              <SlideWeatherIcon className="h-7 w-7 shrink-0 text-slate-700" />
                            )}

                            <span className="shrink-0 rounded-xl bg-gray-200 px-2 text-xs text-slate-600">
                              {isToday ? "วันนี้" : slideDateShortBE || d.forecastDate || "-"}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center justify-center">
                            <div className="flex items-center gap-2 leading-none">
                              <div className="text-2xl font-light tracking-tight text-gray-700">
                                {d.maxTempC ?? "-"}°
                              </div>
                              <div className="text-2xl font-light tracking-tight text-gray-600">
                                {d.minTempC ?? "-"}°
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-3 gap-3">
                            <div className="min-w-0 flex flex-col items-center text-center">
                              <FiCompass className="h-7 w-7 text-slate-800" />
                              <div className="mt-2 text-[11px] text-slate-600">ทิศทางลม</div>
                              <div className="mt-1 text-xs font-medium text-slate-900">
                                {(d.windDirectionDeg ?? "-") + "°"}
                              </div>
                            </div>

                            <div className="min-w-0 flex flex-col items-center text-center">
                              <FiWind className="h-7 w-7 text-slate-800" />
                              <div className="mt-2 text-[11px] text-slate-600">ความเร็วลม</div>
                              <div className="mt-1 text-xs font-medium text-slate-900">
                                {windToKmh(d.windSpeedKmh) ?? "-"} กม./ชม.
                              </div>
                            </div>

                            <div className="min-w-0 flex flex-col items-center text-center">
                              <FiDroplet className="h-7 w-7 text-slate-800" />
                              <div className="mt-2 text-[11px] text-slate-600">พื้นที่ฝนตก</div>
                              <div className="mt-1 text-xs font-medium text-slate-900">
                                {d.percentRainCover ?? "-"} %
                              </div>
                            </div>
                          </div>
                        </div>
                      </SwiperSlide>
                    );
                  })}
                </Swiper>
              </section>
            </>
          )}
        </section>
      </section>
    </main>
  );
}

export default DashboardPage;