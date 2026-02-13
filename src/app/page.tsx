// "use client";

// import { useEffect, useMemo, useRef, useState } from "react";
// import type { DashboardOK, ProvinceForecast } from "@/app/types/dashboard";
// import {
//   STORAGE_KEY,
//   fetchDashboard,
//   fetchGPSProvince,
//   rotateToToday,
//   toDDMMYYYY,
// } from "@/app/lib/gps";

// import {
//   FiChevronDown,
//   FiChevronUp,
//   FiDroplet,
//   FiCompass,
//   FiWind,
//   FiSearch,
//   FiX,
// } from "react-icons/fi";

// import type { IconType } from "react-icons";
// import {
//   WiDaySunny, // ท้องฟ้าโปร่ง
//   WiRain, // ฝน
//   WiThunderstorm, // ฝนฟ้าคะนอง
//   WiDayCloudy, // ท้องฟ้ามีเมฆบางส่วน
// } from "react-icons/wi";

// /** dd/mm/yyyy -> timestamp */
// const ddmmyyyyToTime = (s: string) => {
//   const [dd, mm, yyyy] = (s ?? "").split("/").map((x) => Number(x));
//   if (!dd || !mm || !yyyy) return Number.POSITIVE_INFINITY;
//   return new Date(yyyy, mm - 1, dd).getTime();
// };

// function parseDDMMYYYY(s: string): Date | null {
//   const [dd, mm, yyyy] = (s ?? "").split("/").map((x) => Number(x));
//   if (!dd || !mm || !yyyy) return null;
//   const d = new Date(yyyy, mm - 1, dd);
//   return Number.isNaN(d.getTime()) ? null : d;
// }

// const TH_DOW = new Intl.DateTimeFormat("th-TH", { weekday: "short" });

// function shortCondition(text?: string) {
//   const t = (text ?? "").trim();
//   if (!t) return "-";
//   const first = t.split(/[\n。.!?]/)[0]?.trim() ?? t;
//   return first.length > 28 ? first.slice(0, 28) + "…" : first;
// }

// /** เลือกไอคอนอากาศจากคำอธิบาย (ไทย) */
// function pickWeatherIcon(desc?: string): IconType {
//   const t = (desc ?? "").trim();

//   if (t.includes("ฝนฟ้าคะนอง")) return WiThunderstorm;
//   if (t === "ฝน" || t.includes("ฝน")) return WiRain;
//   if (t.includes("ท้องฟ้ามีเมฆบางส่วน")) return WiDayCloudy;
//   if (t.includes("ท้องฟ้าโปร่ง")) return WiDaySunny;

//   return WiDayCloudy;
// }

// /** เรียงไทย ก-ฮ ให้ชัวร์ */
// const TH_COLLATOR = new Intl.Collator("th", { sensitivity: "base" });
// function sortThai(a: string, b: string) {
//   return TH_COLLATOR.compare(a, b);
// }

// function DashboardPage() {
//   const [provinceQuery, setProvinceQuery] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [provinceOpen, setProvinceOpen] = useState(false);
//   const provinceWrapRef = useRef<HTMLDivElement | null>(null);
//   const searchInputRef = useRef<HTMLInputElement | null>(null);

//   const [error, setError] = useState<string | null>(null);

//   const [provinceIndex, setProvinceIndex] =
//     useState<DashboardOK["provincesIndex"]>([]);
//   const [provinceData, setProvinceData] = useState<ProvinceForecast | null>(
//     null
//   );

//   const [selectedProvinceKey, setSelectedProvinceKey] = useState("");
//   const [todayStr, setTodayStr] = useState("");

//   const [selectedIdx, setSelectedIdx] = useState(0);
//   const userChangedRef = useRef(false);

//   const applyOK = (ok: DashboardOK) => {
//     setProvinceIndex(ok.provincesIndex);
//     setProvinceData(ok.province ?? null);

//     const key = ok.province?.provinceNameThai ?? "";
//     if (key) {
//       setSelectedProvinceKey(key);
//       localStorage.setItem(STORAGE_KEY, key);
//     }
//   };

//   const loadProvince = async (provinceThai?: string) => {
//     setLoading(true);
//     setError(null);

//     try {
//       const ok = await fetchDashboard(provinceThai);
//       applyOK(ok);
//     } catch (e: unknown) {
//       setError(e instanceof Error ? e.message : "Unknown error");
//       setProvinceData(null);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ปิด dropdown เมื่อคลิกนอก/กด ESC
//   useEffect(() => {
//     const onMouseDown = (e: MouseEvent) => {
//       if (!provinceWrapRef.current) return;
//       if (!provinceWrapRef.current.contains(e.target as Node)) {
//         setProvinceOpen(false);
//       }
//     };

//     const onKeyDown = (e: KeyboardEvent) => {
//       if (e.key === "Escape") setProvinceOpen(false);
//     };

//     document.addEventListener("mousedown", onMouseDown);
//     document.addEventListener("keydown", onKeyDown);
//     return () => {
//       document.removeEventListener("mousedown", onMouseDown);
//       document.removeEventListener("keydown", onKeyDown);
//     };
//   }, []);

//   useEffect(() => {
//     setTodayStr(toDDMMYYYY(new Date()));
//     let cancelled = false;

//     const saved = localStorage.getItem(STORAGE_KEY) ?? "";
//     if (saved) setSelectedProvinceKey(saved);

//     loadProvince(saved || undefined);

//     (async () => {
//       const gpsProvince = await fetchGPSProvince(() => {});
//       if (cancelled) return;
//       if (!gpsProvince) return;

//       if (!userChangedRef.current && gpsProvince !== (saved || "")) {
//         await loadProvince(gpsProvince);
//       }
//     })();

//     return () => {
//       cancelled = true;
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   /** ✅ Options: เรียงไทย ก-ฮ ก่อนเสมอ */
//   const provinceOptions = useMemo(() => {
//     return [...provinceIndex]
//       .sort((a, b) => sortThai(a.provinceNameThai, b.provinceNameThai))
//       .map((p) => ({
//         label: `${p.provinceNameThai} (${p.provinceNameEnglish})`,
//         value: p.provinceNameThai,
//       }));
//   }, [provinceIndex]);

//   const selectedProvinceLabel = useMemo(() => {
//     return (
//       provinceOptions.find((o) => o.value === selectedProvinceKey)?.label ??
//       "จังหวัด"
//     );
//   }, [provinceOptions, selectedProvinceKey]);

//   /** ✅ Search ใน dropdown (ค้นจาก label ทั้งไทย+อังกฤษ) */
//   const shownProvinceOptions = useMemo(() => {
//     const q = provinceQuery.trim().toLowerCase();
//     if (!q) return provinceOptions;

//     return provinceOptions.filter((o) => o.label.toLowerCase().includes(q));
//   }, [provinceOptions, provinceQuery]);

//   /** เปิด dropdown แล้ว focus input + เคลียร์คำค้น (ถ้าต้องการ) */
//   useEffect(() => {
//     if (!provinceOpen) return;
//     // โฟกัสช่องค้นหา
//     const t = window.setTimeout(() => {
//       searchInputRef.current?.focus();
//     }, 0);
//     return () => window.clearTimeout(t);
//   }, [provinceOpen]);

//   const sevenDaysForShow = useMemo(() => {
//     const list = provinceData?.sevenDays ?? [];
//     const sorted = [...list].sort(
//       (a, b) => ddmmyyyyToTime(a.forecastDate) - ddmmyyyyToTime(b.forecastDate)
//     );
//     return todayStr ? rotateToToday(sorted, todayStr) : sorted;
//   }, [provinceData, todayStr]);

//   useEffect(() => {
//     if (!sevenDaysForShow.length) return;
//     setSelectedIdx(0);
//   }, [sevenDaysForShow]);

//   const selectedDay = sevenDaysForShow[selectedIdx] ?? sevenDaysForShow[0];
//   const isTodaySelected = !!todayStr && selectedDay?.forecastDate === todayStr;
//   const WeatherIcon = pickWeatherIcon(selectedDay?.descriptionThai);

//   return (
//     <main className="flex justify-center bg-white px-5 py-10 text-slate-900">
//       <section>
//         {/* Province select */}
//         <header className="w-full max-w-90">
//           <label className="sr-only">เลือกจังหวัด</label>

//           <div ref={provinceWrapRef} className="relative w-full">
//             <button
//               type="button"
//               onClick={() => {
//                 setProvinceOpen((v) => !v);
//                 // เปิดแล้วเริ่มค้นหาใหม่ (ถ้าไม่อยากเคลียร์ ให้ลบบรรทัดนี้ออก)
//                 if (!provinceOpen) setProvinceQuery("");
//               }}
//               disabled={loading || provinceOptions.length === 0}
//               aria-expanded={provinceOpen}
//               className={[
//                 "h-11 w-full cursor-pointer rounded-full px-4 pr-4 text-sm outline-none",
//                 "flex items-center justify-between",
//                 "border border-slate-900/10 bg-white text-slate-800 shadow-sm",
//                 "focus:ring-2 focus:ring-emerald-300/60",
//                 "disabled:cursor-not-allowed disabled:opacity-60",
//               ].join(" ")}
//             >
//               <span className="min-w-0 truncate">{selectedProvinceLabel}</span>

//               <FiChevronDown
//                 className={[
//                   "h-5 w-5 shrink-0 transition-transform",
//                   "text-slate-600",
//                   provinceOpen ? "rotate-180" : "",
//                 ].join(" ")}
//                 aria-hidden="true"
//               />
//             </button>

//             {provinceOpen && (
//               <div className="absolute left-0 top-full z-50 mt-2 w-full">
//                 <div className="overflow-hidden rounded-2xl border border-slate-900/10 bg-white shadow-lg">
//                   {/* ✅ Search box */}
//                   <div className="border-b border-slate-900/10 p-3">
//                     <div className="relative">
//                       <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
//                       <input
//                         ref={searchInputRef}
//                         value={provinceQuery}
//                         onChange={(e) => setProvinceQuery(e.target.value)}
//                         placeholder="ค้นหาจังหวัด..."
//                         className="h-10 w-full rounded-xl border border-slate-900/10 bg-white pl-9 pr-9 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-300/60"
//                       />
//                       {provinceQuery ? (
//                         <button
//                           type="button"
//                           onClick={() => {
//                             setProvinceQuery("");
//                             searchInputRef.current?.focus();
//                           }}
//                           className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-500 hover:bg-slate-100"
//                           aria-label="ล้างคำค้นหา"
//                         >
//                           <FiX className="h-4 w-4" />
//                         </button>
//                       ) : null}
//                     </div>

//                     <div className="mt-2 text-[11px] text-slate-500">
//                       {shownProvinceOptions.length} รายการ
//                     </div>
//                   </div>

//                   {/* ✅ List (เรียง ก-ฮ แล้ว + ถูก filter แล้ว) */}
//                   <div className="max-h-80 overflow-auto py-2">
//                     {shownProvinceOptions.length === 0 ? (
//                       <div className="px-5 py-4 text-sm text-slate-600">
//                         ไม่พบจังหวัดที่ตรงกับ “{provinceQuery}”
//                       </div>
//                     ) : (
//                       shownProvinceOptions.map((opt) => {
//                         const active = opt.value === selectedProvinceKey;

//                         return (
//                           <button
//                             key={opt.value}
//                             type="button"
//                             onClick={() => {
//                               userChangedRef.current = true;
//                               const v = opt.value;
//                               setSelectedProvinceKey(v);
//                               localStorage.setItem(STORAGE_KEY, v);
//                               loadProvince(v);
//                               setProvinceOpen(false);
//                             }}
//                             className={[
//                               "w-full cursor-pointer px-5 py-3 text-left text-sm font-medium",
//                               active
//                                 ? "bg-emerald-600 text-white"
//                                 : "text-gray-800 hover:bg-gray-50",
//                             ].join(" ")}
//                           >
//                             {opt.label}
//                           </button>
//                         );
//                       })
//                     )}
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>
//         </header>

//         {/* Content */}
//         <section className="mt-8 flex flex-1 flex-col items-center justify-start text-center">
//           {loading ? (
//             <div className="w-full max-w-xl rounded-3xl border border-slate-900/10 bg-white p-6 text-slate-800 shadow-sm">
//               <div className="animate-pulse space-y-4">
//                 <div className="mx-auto h-4 w-40 rounded bg-slate-900/10" />
//                 <div className="mx-auto h-3 w-56 rounded bg-slate-900/10" />
//                 <div className="mx-auto mt-2 h-16 w-48 rounded bg-slate-900/10" />
//                 <div className="mx-auto h-16 w-48 rounded bg-slate-900/10" />
//                 <div className="mx-auto mt-6 h-14 w-full max-w-md rounded-2xl bg-slate-900/10" />
//               </div>
//             </div>
//           ) : error ? (
//             <div className="w-full max-w-xl rounded-3xl border border-red-200 bg-red-50 p-6 text-left text-red-700">
//               โหลดข้อมูลไม่สำเร็จ: {error}
//             </div>
//           ) : !provinceData ? (
//             <div className="w-full max-w-xl rounded-3xl border border-slate-900/10 bg-white p-6 text-slate-800 shadow-sm">
//               ไม่พบข้อมูลจังหวัด
//             </div>
//           ) : (
//             <>
//               <div className="mt-4 text-[26px] font-semibold leading-none text-slate-900">
//                 {provinceData.provinceNameThai}
//               </div>

//               <div className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-700">
//                 <span className="truncate">
//                   {shortCondition(selectedDay?.descriptionThai)}
//                 </span>
//                 <WeatherIcon className="h-5 w-5 translate-y-1 text-slate-700" />
//                 {isTodaySelected ? (
//                   <span className="ml-1 rounded-full bg-slate-900/5 px-2 py-0.5 text-[11px] text-slate-700">
//                     วันนี้
//                   </span>
//                 ) : null}
//               </div>

//               {/* Big temp block */}
//               <div className="mt-8">
//                 <div className="flex items-center justify-center gap-3">
//                   <div className="flex flex-col items-center leading-none">
//                     <div className="text-[78px] font-light tracking-tight text-gray-700">
//                       {selectedDay?.maxTempC ?? "-"}°
//                     </div>
//                     <div className="text-[78px] font-light tracking-tight text-gray-500">
//                       {selectedDay?.minTempC ?? "-"}°
//                     </div>
//                   </div>

//                   <div className="flex flex-col items-center justify-center text-slate-400">
//                     <FiChevronUp className="h-4 w-4" />
//                     <FiChevronDown className="-mt-1 h-4 w-4" />
//                   </div>
//                 </div>
//               </div>

//               {/* Metrics row */}
//               <div className="mt-14 flex items-end justify-center gap-10">
//                 <div className="flex flex-col items-center">
//                   <FiCompass className="h-7 w-7 text-slate-800" />
//                   <div className="mt-2 text-[11px] text-slate-600">
//                     ทิศทางลม
//                   </div>
//                   <div className="mt-1 text-xs font-medium text-slate-900">
//                     {(selectedDay?.windDirectionDeg ?? "-") + "°"}
//                   </div>
//                 </div>

//                 <div className="flex flex-col items-center">
//                   <FiDroplet className="h-7 w-7 text-slate-800" />
//                   <div className="mt-2 text-[11px] text-slate-600">
//                     ปริมาณฝน
//                   </div>
//                   <div className="mt-1 text-xs font-medium text-slate-900">
//                     {selectedDay?.percentRainCover ?? "-"} %
//                   </div>
//                 </div>

//                 <div className="flex flex-col items-center">
//                   <FiWind className="h-7 w-7 text-slate-800" />
//                   <div className="mt-2 text-[11px] text-slate-600">
//                     ความเร็วลม
//                   </div>
//                   <div className="mt-1 text-xs font-medium text-slate-900">
//                     {selectedDay?.windSpeedKmh ?? "-"} กม./ชม.
//                   </div>
//                 </div>
//               </div>

//               {/* Weekly pills */}
//               <div className="mt-10 w-full">
//                 <div className="text-center text-sm text-slate-800">
//                   อุณหภูมิสูงสุด-ต่ำสุด สัปดาห์นี้
//                 </div>

//                 <div className="mx-auto mt-4 grid max-w-105 grid-cols-7 gap-2">
//                   {sevenDaysForShow.slice(0, 7).map((d, idx) => {
//                     const isActive = idx === selectedIdx;
//                     const dt = parseDDMMYYYY(d.forecastDate);
//                     const dow = dt ? TH_DOW.format(dt) : "";

//                     return (
//                       <button
//                         key={`${provinceData.provinceNameThai}-${d.forecastDate}`}
//                         type="button"
//                         onClick={() => setSelectedIdx(idx)}
//                         className={[
//                           "group cursor-pointer rounded-2xl border px-2 py-3 text-center transition",
//                           "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70",
//                           "active:scale-[0.98]",
//                           isActive
//                             ? [
//                                 "border-emerald-500/70 bg-emerald-600 text-white",
//                                 "hover:bg-emerald-600 active:bg-emerald-700",
//                               ].join(" ")
//                             : [
//                                 "border-slate-900/10 bg-white text-slate-800",
//                                 "hover:border-emerald-400/50 hover:bg-emerald-500/10",
//                                 "active:bg-emerald-500/20",
//                               ].join(" "),
//                         ].join(" ")}
//                       >
//                         <div
//                           className={[
//                             "text-[12px] font-medium",
//                             isActive ? "text-white" : "text-slate-800",
//                           ].join(" ")}
//                         >
//                           {d.maxTempC ?? "-"}°
//                         </div>

//                         <div
//                           className={[
//                             "mt-0.5 text-[11px]",
//                             isActive ? "text-white/90" : "text-slate-600",
//                           ].join(" ")}
//                         >
//                           {d.minTempC ?? "-"}°
//                         </div>

//                         <div
//                           className={[
//                             "mt-2 text-[10px]",
//                             isActive ? "text-white/90" : "text-slate-500",
//                           ].join(" ")}
//                         >
//                           {dow}
//                         </div>
//                       </button>
//                     );
//                   })}
//                 </div>
//               </div>
//             </>
//           )}
//         </section>
//       </section>
//     </main>
//   );
// }

// export default DashboardPage;

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
// import type { DashboardOK, ProvinceForecast } from "@/app/types/tmd";
import type { DashboardOK, ProvinceForecast } from "@/app/types/dashboard";
import {
  STORAGE_KEY,
  fetchDashboard,
  fetchGPSProvince,
  rotateToToday,
  toDDMMYYYY,
} from "@/app/lib/gps";

/** dd/mm/yyyy -> timestamp */
const ddmmyyyyToTime = (s: string) => {
  const [dd, mm, yyyy] = (s ?? "").split("/").map((x) => Number(x));
  if (!dd || !mm || !yyyy) return Number.POSITIVE_INFINITY;
  return new Date(yyyy, mm - 1, dd).getTime();
};

export default function Forecast7DaysPage() {
  const [loading, setLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsNote, setGpsNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [lastBuildDate, setLastBuildDate] = useState<string>();
  const [provinceIndex, setProvinceIndex] = useState<DashboardOK["provincesIndex"]>([]);
  const [provinceData, setProvinceData] = useState<ProvinceForecast | null>(null);

  const [selectedProvinceKey, setSelectedProvinceKey] = useState("");
  const [todayStr, setTodayStr] = useState("");

  // ✅ เลือกวันจากการ์ด
  const [selectedIdx, setSelectedIdx] = useState(0);

  // ✅ ถ้าผู้ใช้เปลี่ยนเอง จะไม่ให้ GPS override
  const userChangedRef = useRef(false);

  const applyOK = (ok: DashboardOK) => {
    setLastBuildDate(ok.lastBuildDate);
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

  useEffect(() => {
    setTodayStr(toDDMMYYYY(new Date()));

    let cancelled = false;

    const saved = localStorage.getItem(STORAGE_KEY) ?? "";
    if (saved) setSelectedProvinceKey(saved);

    // 1) โหลดทันที
    loadProvince(saved || undefined);

    // 2) GPS วิ่งคู่ขนาน
    (async () => {
      setGpsLoading(true);
      const gpsProvince = await fetchGPSProvince(setGpsNote);
      setGpsLoading(false);

      if (cancelled) return;
      if (!gpsProvince) return;

      if (!userChangedRef.current && gpsProvince !== (saved || "")) {
        await loadProvince(gpsProvince);
        setGpsNote(`เลือกจังหวัดอัตโนมัติจาก GPS: ${gpsProvince}`);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const provinceOptions = useMemo(
    () =>
      provinceIndex.map((p) => ({
        label: `${p.provinceNameThai} (${p.provinceNameEnglish})`,
        value: p.provinceNameThai,
      })),
    [provinceIndex]
  );

  // ✅ เรียงวันที่ให้ถูกก่อน แล้วค่อย rotate ให้ “วันนี้” อยู่หน้าแรก
  const sevenDaysForShow = useMemo(() => {
    const list = provinceData?.sevenDays ?? [];
    const sorted = [...list].sort(
      (a, b) => ddmmyyyyToTime(a.forecastDate) - ddmmyyyyToTime(b.forecastDate)
    );
    return todayStr ? rotateToToday(sorted, todayStr) : sorted;
  }, [provinceData, todayStr]);

  // ✅ เมื่อข้อมูลเปลี่ยน ให้เลือกการ์ดตัวแรก (วันนี้) เสมอ
  useEffect(() => {
    if (!sevenDaysForShow.length) return;
    setSelectedIdx(0);
  }, [sevenDaysForShow]);

  const selectedDay = sevenDaysForShow[selectedIdx] ?? sevenDaysForShow[0];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sky-200 via-sky-100 to-pink-100">
      {/* soft clouds */}
      <div className="pointer-events-none absolute -bottom-36 left-1/2 h-80 w-[1200px] -translate-x-1/2 rounded-[999px] bg-white/70 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-52 left-1/2 h-96 w-[1400px] -translate-x-1/2 rounded-[999px] bg-white/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/2 h-48 w-[1000px] -translate-x-1/2 rounded-[999px] bg-white/60 blur-2xl" />

      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Top bar */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-slate-900">
              อุตุนิยมวิทยาและแผ่นดินไหว
            </h1>

            <div className="text-xs text-slate-700/70">
              วันนี้: <span className="font-medium text-slate-900">{todayStr || "-"}</span>
              {lastBuildDate ? (
                <>
                  {" · "}อัปเดตล่าสุด:{" "}
                  <span className="font-medium text-slate-900">{lastBuildDate}</span>
                </>
              ) : null}
            </div>

            {gpsNote ? (
              <div className="text-xs text-slate-700/70">
                {gpsLoading ? "📍 " : "✅ "}
                {gpsNote}
              </div>
            ) : null}
          </div>

          {/* Province select */}
          <div className="w-full sm:w-[360px]">
            <label className="sr-only">เลือกจังหวัด</label>
            <div className="relative">
              <select
                className="w-full appearance-none rounded-full border border-white/40 bg-white/35 px-4 py-2.5 pr-10 text-sm text-slate-900 shadow-sm backdrop-blur
                           focus:outline-none focus:ring-2 focus:ring-white/70 disabled:opacity-60"
                value={selectedProvinceKey}
                onChange={(e) => {
                  userChangedRef.current = true;
                  const v = e.target.value;
                  setSelectedProvinceKey(v);
                  localStorage.setItem(STORAGE_KEY, v);
                  loadProvince(v);
                }}
                disabled={loading || provinceOptions.length === 0}
              >
                {provinceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-700/70">
                ▼
              </div>
            </div>
          </div>
        </header>

        {/* Main */}
        <div className="mt-10">
          {loading ? (
            <div className="mx-auto max-w-3xl rounded-3xl border border-white/40 bg-white/35 p-6 shadow-sm backdrop-blur">
              <div className="animate-pulse space-y-4">
                <div className="h-5 w-40 rounded bg-white/60" />
                <div className="h-3 w-72 rounded bg-white/50" />
                <div className="h-24 w-full rounded-2xl bg-white/40" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="h-28 rounded-2xl bg-white/40" />
                  <div className="h-28 rounded-2xl bg-white/40" />
                  <div className="h-28 rounded-2xl bg-white/40" />
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="mx-auto max-w-xl rounded-3xl border border-red-200/60 bg-white/60 p-6 text-red-700 shadow-sm backdrop-blur">
              โหลดข้อมูลไม่สำเร็จ: {error}
            </div>
          ) : !provinceData ? (
            <div className="mx-auto max-w-xl rounded-3xl border border-white/40 bg-white/35 p-6 text-slate-900 shadow-sm backdrop-blur">
              ไม่พบข้อมูลจังหวัด
            </div>
          ) : (
            <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
              {/* Title + selected date */}
              <div className="text-base font-semibold text-slate-900">
                {provinceData.provinceNameThai}
              </div>
              <div className="mt-1 text-xs text-slate-700/70">
                วันที่ที่เลือก:{" "}
                <span className="font-medium text-slate-900">
                  {selectedDay?.forecastDate ?? "-"}
                </span>
                {todayStr && selectedDay?.forecastDate === todayStr ? (
                  <span className="ml-2 rounded-full bg-white/60 px-2 py-0.5 text-[11px] text-slate-800 shadow-sm">
                    วันนี้
                  </span>
                ) : null}
              </div>

              {/* Description */}
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-700/80">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-yellow-400 shadow-sm" />
                <span className="max-w-[85vw] truncate">
                  {selectedDay?.descriptionThai ?? "-"}
                </span>
              </div>

              {/* Big temperature */}
              <div className="mt-7 rounded-[28px] border border-white/40 bg-white/30 px-8 py-7 shadow-sm backdrop-blur">
                <div className="flex items-center justify-center gap-10">
                  <div className="flex flex-col items-center">
                    <div className="text-7xl font-light tracking-tight text-slate-800">
                      {selectedDay?.maxTempC ?? "-"}°
                    </div>
                    <div className="text-6xl font-light tracking-tight text-slate-700/80">
                      {selectedDay?.minTempC ?? "-"}°
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2 text-slate-700/70">
                    <span className="text-sm leading-none">▲</span>
                    <span className="text-sm leading-none">▼</span>
                  </div>
                </div>
              </div>

              {/* Mini stats */}
              <div className="mt-8 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/40 bg-white/35 p-5 shadow-sm backdrop-blur">
                  <div className="text-2xl">💨</div>
                  <div className="mt-2 text-sm text-slate-700/80">ความเร็วลม</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">
                    {selectedDay?.windSpeedKmh ?? "-"} km/h
                  </div>
                </div>

                <div className="rounded-2xl border border-white/40 bg-white/35 p-5 shadow-sm backdrop-blur">
                  <div className="text-2xl">🌧️</div>
                  <div className="mt-2 text-sm text-slate-700/80">โอกาสฝน</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">
                    {selectedDay?.percentRainCover ?? "-"}%
                  </div>
                </div>

                <div className="rounded-2xl border border-white/40 bg-white/35 p-5 shadow-sm backdrop-blur">
                  <div className="text-2xl">🧭</div>
                  <div className="mt-2 text-sm text-slate-700/80">ทิศทางลม</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">
                    {selectedDay?.windDirectionDeg ?? "-"}°
                  </div>
                </div>
              </div>

              {/* 7 days cards */}
              <div className="mt-10 w-full">
                <div className="text-sm text-slate-800/80">
                  อุณหภูมิสูงสุด-ต่ำสุด ล่วงหน้า 7 วัน (กดเพื่อดูรายละเอียด)
                </div>

                <div
                  className="mt-4 overflow-x-auto pb-2
                             [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                  <div className="mx-auto flex w-max gap-3 snap-x snap-mandatory px-1">
                    {sevenDaysForShow.map((d, idx) => {
                      const isActive = idx === selectedIdx;
                      const isToday = todayStr && d.forecastDate === todayStr;

                      return (
                        <button
                          key={`${provinceData.provinceNameThai}-${d.forecastDate}`}
                          type="button"
                          onClick={() => setSelectedIdx(idx)}
                          className={[
                            "snap-start min-w-[104px] rounded-2xl border px-4 py-3 text-center shadow-sm backdrop-blur transition",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
                            isActive
                              ? "border-slate-900/25 bg-white/70 ring-1 ring-white/40"
                              : "border-white/40 bg-white/35 hover:bg-white/55",
                          ].join(" ")}
                          aria-label={`เลือกวันที่ ${d.forecastDate}`}
                        >
                          <div className="text-xs text-slate-700/80">
                            {d.forecastDate}
                            {isToday ? (
                              <span className="ml-1 text-[10px] text-slate-900/70">• วันนี้</span>
                            ) : null}
                          </div>

                          <div className="mt-2 text-lg font-semibold text-slate-900">
                            {d.maxTempC ?? "-"}°
                          </div>
                          <div className="text-sm text-slate-700/80">
                            {d.minTempC ?? "-"}°
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Optional English */}
              {selectedDay?.descriptionEnglish ? (
                <div className="mt-4 max-w-xl text-xs text-slate-700/60">
                  {selectedDay.descriptionEnglish}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}