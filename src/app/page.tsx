"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DashboardOK, ProvinceForecast } from "@/app/types/dashboard";
import {
  STORAGE_KEY,
  fetchDashboard,
  fetchGPSProvince,
  rotateToToday,
  toDDMMYYYY,
} from "@/app/lib/gps";

import {
  FiChevronDown,
  FiChevronUp,
  FiDroplet,
  FiCompass,
  FiWind,
  FiSearch,
  FiX,
} from "react-icons/fi";

import type { IconType } from "react-icons";
import {
  WiDaySunny, // ท้องฟ้าโปร่ง
  WiRain, // ฝน
  WiThunderstorm, // ฝนฟ้าคะนอง
  WiDayCloudy, // ท้องฟ้ามีเมฆบางส่วน
} from "react-icons/wi";

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

/** เรียงไทย ก-ฮ ให้ชัวร์ */
const TH_COLLATOR = new Intl.Collator("th", { sensitivity: "base" });
function sortThai(a: string, b: string) {
  return TH_COLLATOR.compare(a, b);
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
  const [provinceData, setProvinceData] = useState<ProvinceForecast | null>(
    null
  );

  const [selectedProvinceKey, setSelectedProvinceKey] = useState("");
  const [todayStr, setTodayStr] = useState("");

  const [selectedIdx, setSelectedIdx] = useState(0);
  const userChangedRef = useRef(false);

  const applyOK = (ok: DashboardOK) => {
    setProvinceIndex(ok.provincesIndex);
    setProvinceData(ok.province ?? null);

    const key = ok.province?.provinceNameThai ?? "";
    if (key) {
      setSelectedProvinceKey(key);
      localStorage.setItem(STORAGE_KEY, key);
    }
  };

  const loadProvince = async (provinceThai?: string) => {
    setLoading(true);
    setError(null);

    try {
      const ok = await fetchDashboard(provinceThai);
      applyOK(ok);
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
      const gpsProvince = await fetchGPSProvince(() => {});
      if (cancelled) return;
      if (!gpsProvince) return;

      if (!userChangedRef.current && gpsProvince !== (saved || "")) {
        await loadProvince(gpsProvince);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ✅ Options: เรียงไทย ก-ฮ ก่อนเสมอ */
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

  /** ✅ Search ใน dropdown (ค้นจาก label ทั้งไทย+อังกฤษ) */
  const shownProvinceOptions = useMemo(() => {
    const q = provinceQuery.trim().toLowerCase();
    if (!q) return provinceOptions;

    return provinceOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [provinceOptions, provinceQuery]);

  /** เปิด dropdown แล้ว focus input + เคลียร์คำค้น (ถ้าต้องการ) */
  useEffect(() => {
    if (!provinceOpen) return;
    // โฟกัสช่องค้นหา
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

  return (
    <main className="flex justify-center bg-white px-5 py-10 text-slate-900">
      <section>
        {/* Province select */}
        <header className="w-full max-w-90">
          <label className="sr-only">เลือกจังหวัด</label>

          <div ref={provinceWrapRef} className="relative w-full">
            <button
              type="button"
              onClick={() => {
                setProvinceOpen((v) => !v);
                // เปิดแล้วเริ่มค้นหาใหม่ (ถ้าไม่อยากเคลียร์ ให้ลบบรรทัดนี้ออก)
                if (!provinceOpen) setProvinceQuery("");
              }}
              disabled={loading || provinceOptions.length === 0}
              aria-expanded={provinceOpen}
              className={[
                "h-11 w-full cursor-pointer rounded-full px-4 pr-4 text-sm outline-none",
                "flex items-center justify-between",
                "border border-slate-900/10 bg-white text-slate-800 shadow-sm",
                "focus:ring-2 focus:ring-emerald-300/60",
                "disabled:cursor-not-allowed disabled:opacity-60",
              ].join(" ")}
            >
              <span className="min-w-0 truncate">{selectedProvinceLabel}</span>

              <FiChevronDown
                className={[
                  "h-5 w-5 shrink-0 transition-transform",
                  "text-slate-600",
                  provinceOpen ? "rotate-180" : "",
                ].join(" ")}
                aria-hidden="true"
              />
            </button>

            {provinceOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-full">
                <div className="overflow-hidden rounded-2xl border border-slate-900/10 bg-white shadow-lg">
                  {/* ✅ Search box */}
                  <div className="border-b border-slate-900/10 p-3">
                    <div className="relative">
                      <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        ref={searchInputRef}
                        value={provinceQuery}
                        onChange={(e) => setProvinceQuery(e.target.value)}
                        placeholder="ค้นหาจังหวัด..."
                        className="h-10 w-full rounded-xl border border-slate-900/10 bg-white pl-9 pr-9 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-300/60"
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

                  {/* ✅ List (เรียง ก-ฮ แล้ว + ถูก filter แล้ว) */}
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

        {/* Content */}
        <section className="mt-8 flex flex-1 flex-col items-center justify-start text-center">
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
              <div className="mt-4 text-[26px] font-semibold leading-none text-slate-900">
                {provinceData.provinceNameThai}
              </div>

              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-700">
                <span className="truncate">
                  {shortCondition(selectedDay?.descriptionThai)}
                </span>
                <WeatherIcon className="h-5 w-5 translate-y-1 text-slate-700" />
                {isTodaySelected ? (
                  <span className="ml-1 rounded-full bg-slate-900/5 px-2 py-0.5 text-[11px] text-slate-700">
                    วันนี้
                  </span>
                ) : null}
              </div>

              {/* Big temp block */}
              <div className="mt-8">
                <div className="flex items-center justify-center gap-3">
                  <div className="flex flex-col items-center leading-none">
                    <div className="text-[78px] font-light tracking-tight text-gray-700">
                      {selectedDay?.maxTempC ?? "-"}°
                    </div>
                    <div className="text-[78px] font-light tracking-tight text-gray-500">
                      {selectedDay?.minTempC ?? "-"}°
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <FiChevronUp className="h-4 w-4" />
                    <FiChevronDown className="-mt-1 h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Metrics row */}
              <div className="mt-14 flex items-end justify-center gap-10">
                <div className="flex flex-col items-center">
                  <FiCompass className="h-7 w-7 text-slate-800" />
                  <div className="mt-2 text-[11px] text-slate-600">
                    ทิศทางลม
                  </div>
                  <div className="mt-1 text-xs font-medium text-slate-900">
                    {(selectedDay?.windDirectionDeg ?? "-") + "°"}
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <FiDroplet className="h-7 w-7 text-slate-800" />
                  <div className="mt-2 text-[11px] text-slate-600">
                    ปริมาณฝน
                  </div>
                  <div className="mt-1 text-xs font-medium text-slate-900">
                    {selectedDay?.percentRainCover ?? "-"} %
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <FiWind className="h-7 w-7 text-slate-800" />
                  <div className="mt-2 text-[11px] text-slate-600">
                    ความเร็วลม
                  </div>
                  <div className="mt-1 text-xs font-medium text-slate-900">
                    {selectedDay?.windSpeedKmh ?? "-"} กม./ชม.
                  </div>
                </div>
              </div>

              {/* Weekly pills */}
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
                            ? [
                                "border-emerald-500/70 bg-emerald-600 text-white",
                                "hover:bg-emerald-600 active:bg-emerald-700",
                              ].join(" ")
                            : [
                                "border-slate-900/10 bg-white text-slate-800",
                                "hover:border-emerald-400/50 hover:bg-emerald-500/10",
                                "active:bg-emerald-500/20",
                              ].join(" "),
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "text-[12px] font-medium",
                            isActive ? "text-white" : "text-slate-800",
                          ].join(" ")}
                        >
                          {d.maxTempC ?? "-"}°
                        </div>

                        <div
                          className={[
                            "mt-0.5 text-[11px]",
                            isActive ? "text-white/90" : "text-slate-600",
                          ].join(" ")}
                        >
                          {d.minTempC ?? "-"}°
                        </div>

                        <div
                          className={[
                            "mt-2 text-[10px]",
                            isActive ? "text-white/90" : "text-slate-500",
                          ].join(" ")}
                        >
                          {dow}
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
