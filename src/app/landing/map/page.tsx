"use client";

import { useEffect, useMemo, useRef, useState } from "react";
// Components
import ZoomableImage from "@/app/components/ZoomableImage";
// library
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import type { Swiper as SwiperType } from "swiper";
import "swiper/css";
// icons
import { FiCalendar, FiChevronDown, FiChevronLeft, FiChevronRight, FiMap } from "react-icons/fi";
// types
import type { UpperWindItem, UpperWindResponse, SoundingStation } from "@/app/types/map";

/* -------------------- Config API routes -------------------- */

const basePath = process.env.NEXT_PUBLIC_API_ROUTE ?? "";
const MAP_API_ROUTE = `${basePath}/api/map`;

/* -------------------- Config pure helpers -------------------- */

// กำหนด Menu ประเภทแผนที่
const Type_Menu = [
  "แผนที่อากาศผิวพื้น",
  "แผนที่ลมชั้นบนระดับ 925 hPa",
  "แผนที่ลมชั้นบนระดับ 850 hPa",
  "แผนที่ลมชั้นบนระดับ 700 hPa",
  "แผนที่ลมชั้นบนระดับ 500 hPa",
  "แผนที่ลมชั้นบนระดับ 300 hPa",
  "แผนที่ลมชั้นบนระดับ 200 hPa",
  "แผนที่ลมชั้นบนระดับ 600 m",
  "แผนที่ลมชั้นบนรวม 4 ระดับ",
  "แผนที่รายละเอียดประเทศไทยและใกล้เคียง",
  "แผนที่ค่าเปลี่ยนแปลงความกดอากาศ",
  "แผนที่ค่าเปลี่ยนแปลงอุณหภูมิ",
  "แผนที่ค่าเปลี่ยนแปลงอุณหภูมิจุดน้ำค้าง",
  "แผนที่หยั่งอากาศ",
] as const;

const SOUNDING_TYPE_LABEL = "แผนที่หยั่งอากาศ" as const;
const SOUNDING_API_KEY = "AirMapWeather" as const;

const TYPE_TO_API_KEY: Record<(typeof Type_Menu)[number], string> = {
  "แผนที่อากาศผิวพื้น": "AirmapSurface",
  "แผนที่ลมชั้นบนระดับ 925 hPa": "UpperWind925hPa",
  "แผนที่ลมชั้นบนระดับ 850 hPa": "UpperWind850hPa",
  "แผนที่ลมชั้นบนระดับ 700 hPa": "UpperWind700hPa",
  "แผนที่ลมชั้นบนระดับ 500 hPa": "UpperWind500hPa",
  "แผนที่ลมชั้นบนระดับ 300 hPa": "UpperWind300hPa",
  "แผนที่ลมชั้นบนระดับ 200 hPa": "UpperWind200hPa",
  "แผนที่ลมชั้นบนระดับ 600 m": "UpperWind600m",
  "แผนที่ลมชั้นบนรวม 4 ระดับ": "AirMap4Levels",
  "แผนที่รายละเอียดประเทศไทยและใกล้เคียง": "AirMapThai",
  "แผนที่ค่าเปลี่ยนแปลงความกดอากาศ": "AirMapAtmos",
  "แผนที่ค่าเปลี่ยนแปลงอุณหภูมิ": "AirMapTemp",
  "แผนที่ค่าเปลี่ยนแปลงอุณหภูมิจุดน้ำค้าง": "AirMapDew",
  "แผนที่หยั่งอากาศ": SOUNDING_API_KEY,
};

// ชื่อเดือนภาษาไทย
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
] as const;

/* -------------------- Function -------------------- */

// ใช้กับ AirMapWeather เท่านั้น: ดึงจังหวัดจากคู่ฟิลด์ xxxTitle / xxxImagePath โดยข้ามรายการที่ชื่อซ้ำหรือข้อมูลไม่ครบ
function extractSoundingStations(item: UpperWindItem): SoundingStation[] {
  const seenTitle = new Set<string>();
  const out: SoundingStation[] = [];

  for (const key of Object.keys(item)) {
    if (!key.endsWith("Title")) continue;

    const base = key.replace(/Title$/, "");
    const title = item[key as keyof UpperWindItem] as string | null;
    const imagePath = item[`${base}ImagePath` as keyof UpperWindItem] as string | null;

    if (!title || !imagePath || seenTitle.has(title)) continue;

    seenTitle.add(title);
    out.push({ id: title, title, imagePath });
  }

  return out;
}

// Function แปลง string วันเวลาจาก API เป็น Date
function toDate(value?: string | null) {
  if (!value) return new Date(0);
  return new Date(value.replace(" ", "T").replace(/\.\d+$/, ""));
}

// Function แปลง Date เป็นรูปแบบวันเวลาไทย (พ.ศ.)
function thaiDateTime(date: Date) {
  const day = date.getDate();
  const month = THAI_MONTHS[date.getMonth()];
  const yearBE = date.getFullYear() + 543;
  const time = date.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${day} ${month} ${yearBE} ${time} น.`;
}

// Function แปลงข้อมูล data จาก API ให้เป็น array ของ { apiKey, item }
function normalizeToEntries(data: UpperWindResponse["data"]) {
  return Object.entries(data).flatMap(([apiKey, value]) =>
    (Array.isArray(value) ? value : value ? [value] : []).map((item) => ({
      apiKey,
      item: item as UpperWindItem,
    }))
  );
}

// Function เทียบ apiKey กับ mapping ของ Menu
function isMatchType(
  menuLabel: (typeof Type_Menu)[number],
  entry: { apiKey: string; item: UpperWindItem }
) {
  return entry.apiKey === TYPE_TO_API_KEY[menuLabel];
}

// Function สร้างรายการตัวเลือกวันเวลา โดยดึงจาก contentdate, ตัดค่าซ้ำ, เรียงจากใหม่ไปเก่า และแปลงเป็นข้อความภาษาไทย
function getTimeOptions(items: UpperWindItem[]) {
  const times = new Map<string, Date>();

  for (const item of items) {
    const key = item.contentdate as string | undefined;
    if (key) times.set(key, toDate(key));
  }

  return Array.from(times.entries())
    .sort((a, b) => b[1].getTime() - a[1].getTime())
    .map(([key, date]) => ({ key, label: thaiDateTime(date) }));
}

// Function หา type และ time เริ่มต้นของหน้า โดยเลือกประเภทแรกที่มีข้อมูลและใช้เวลาล่าสุดเป็นค่าเริ่มต้น
function getDefaultSelection(data: UpperWindResponse["data"]) {
  const entries = normalizeToEntries(data);

  const typeLabel =
    Type_Menu.find((label) => entries.some((entry) => isMatchType(label, entry))) ??
    Type_Menu[0];

  const items = entries
    .filter((entry) => isMatchType(typeLabel, entry))
    .map(({ item }) => item);

  return {
    typeLabel,
    timeKey: getTimeOptions(items)[0]?.key ?? "",
  };
}

/* -------------------- Component -------------------- */

function MapPage() {
  // type dropdown
  const [typeOpen, setTypeOpen] = useState(false);
  const typeWrapRef = useRef<HTMLDivElement | null>(null);

  // date/time dropdown
  const [timeOpen, setTimeOpen] = useState(false);
  const timeWrapRef = useRef<HTMLDivElement | null>(null);

  const [raw, setRaw] = useState<UpperWindResponse>({
    success: true,
    data: {} as UpperWindResponse["data"],
    message: "",
  });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // dropdown state
  const [selectedTypeLabel, setSelectedTypeLabel] = useState<string>(Type_Menu[0]);
  const [selectedTimeKey, setSelectedTimeKey] = useState<string>("");

  // apply เมื่อกดปุ่ม “แสดงแผนที่”
  const [applied, setApplied] = useState<{ typeLabel: string; timeKey: string }>({
    typeLabel: Type_Menu[0],
    timeKey: "",
  });

  // Swiper ref
  const soundingSwiperRef = useRef<SwiperType | null>(null);

  /* -------------------- useEffect -------------------- */

  // โหลดข้อมูลแผนที่ครั้งแรก โดยเริ่มจาก mode=initial เพื่อให้หน้าแสดงผลเร็วขึ้น
  useEffect(() => {
    let ignore = false;

    async function fetchMap(mode?: "initial") {
      const url = mode ? `${MAP_API_ROUTE}?mode=${mode}` : MAP_API_ROUTE;
      const res = await fetch(url, { cache: "no-store" });
      // ถ้า initial โหลดไม่สำเร็จจะ fallback ไปโหลดข้อมูลเต็มแทน
      if (!res.ok) {
        throw new Error(`Map API error: ${res.status}`);
      }

      return (await res.json()) as UpperWindResponse;
    }
    // หลังจาก initial สำเร็จ จะค่อยโหลดข้อมูลเต็มเพิ่มเติมเบื้องหลัง
    async function load() {
      try {
        const initialJson = await fetchMap("initial");
        if (ignore) return;

        const initialSelection = getDefaultSelection(initialJson.data);

        setRaw(initialJson);
        setSelectedTypeLabel(initialSelection.typeLabel);
        setSelectedTimeKey(initialSelection.timeKey);
        setApplied(initialSelection);
        setLoading(false);
      } catch (error) {
        console.error("initial map load error:", error);

        try {
          const fullJson = await fetchMap();
          if (ignore) return;

          const fallbackSelection = getDefaultSelection(fullJson.data);

          setRaw(fullJson);
          setSelectedTypeLabel(fallbackSelection.typeLabel);
          setSelectedTimeKey(fallbackSelection.timeKey);
          setApplied(fallbackSelection);
        } catch (fallbackError) {
          console.error("map load error:", fallbackError);
        } finally {
          if (!ignore) setLoading(false);
        }

        return;
      }

      try {
        setLoadingMore(true);
        const fullJson = await fetchMap();
        if (!ignore) setRaw(fullJson);
      } catch (error) {
        console.error("full map load error:", error);
      } finally {
        if (!ignore) setLoadingMore(false);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, []);

  // ปิด dropdown เมื่อคลิกนอกกรอบ + Esc
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const target = e.target as Node;

      if (typeWrapRef.current && !typeWrapRef.current.contains(target)) {
        setTypeOpen(false);
      }

      if (timeWrapRef.current && !timeWrapRef.current.contains(target)) {
        setTimeOpen(false);
      }
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setTypeOpen(false);
        setTimeOpen(false);
      }
    }

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  /* -------------------- useMemo -------------------- */

  // แปลง raw.data จาก API ให้เป็นรายการ entry แบบ { apiKey, item } สำหรับนำไปจัดกลุ่มตามประเภท
  const entries = useMemo(() => normalizeToEntries(raw.data), [raw.data]);

  // จัดกลุ่มข้อมูลตามเมนูแต่ละประเภท พร้อมเรียงข้อมูลในแต่ละประเภทจากวันเวลาล่าสุดไปเก่าสุด
  const itemsByTypeLabel = useMemo(() => {
    const map = new Map<string, UpperWindItem[]>();

    for (const label of Type_Menu) {
      const items = entries
        .filter((entry) => isMatchType(label, entry))
        .map(({ item }) => item)
        .sort(
          (a, b) =>
            toDate(b.contentdate as string).getTime() -
            toDate(a.contentdate as string).getTime()
        );

      map.set(label, items);
    }

    return map;
  }, [entries]);

  // ข้อมูลของประเภทที่ผู้ใช้กำลังเลือกอยู่ใน dropdown
  const selectedItems = useMemo(
    () => itemsByTypeLabel.get(selectedTypeLabel) ?? [],
    [itemsByTypeLabel, selectedTypeLabel]
  );

  // สร้างรายการตัวเลือกวันเวลา จากข้อมูลของประเภทที่กำลังเลือก
  const timeOptions = useMemo(() => getTimeOptions(selectedItems), [selectedItems]);

  // เมื่อประเภทหรือรายการเวลาเปลี่ยน ให้ปรับ selectedTimeKey ให้สอดคล้องกับข้อมูลล่าสุด
  useEffect(() => {
    const nextTimeKey = timeOptions[0]?.key ?? "";

    if (!nextTimeKey) {
      setSelectedTimeKey("");
      setTimeOpen(false);
      return;
    }

    if (!timeOptions.some((time) => time.key === selectedTimeKey)) {
      setSelectedTimeKey(nextTimeKey);
    }

    setTimeOpen(false);
  }, [timeOptions, selectedTimeKey]);

  // ใช้ตรวจว่าประเภทที่เลือกอยู่มีข้อมูลหรือไม่
  const selectedHasData = selectedItems.length > 0;

  // label วันเวลาที่ใช้แสดงใน dropdown ของค่าที่กำลังเลือก
  const selectedTimeLabel =
    timeOptions.find((time) => time.key === selectedTimeKey)?.label ?? "";

  // ข้อมูลของประเภทที่กดปุ่มแสดงแผนที่แล้ว
  const appliedItems = useMemo(
    () => itemsByTypeLabel.get(applied.typeLabel) ?? [],
    [itemsByTypeLabel, applied.typeLabel]
  );

  // รายการวันเวลาของประเภทที่ถูกนำมาแสดงจริง
  const appliedTimeOptions = useMemo(() => getTimeOptions(appliedItems), [appliedItems]);

  // ข้อมูล item ที่ตรงกับ time ที่ถูก apply อยู่ ถ้าไม่พบให้ fallback เป็นรายการแรก
  const shown = useMemo(
    () => appliedItems.find((item) => item.contentdate === applied.timeKey) ?? appliedItems[0],
    [appliedItems, applied.timeKey]
  );

  // เก็บชื่อประเภทและข้อความวันเวลาที่ใช้แสดงผลบนหน้า
  const appliedTypeLabel = applied.typeLabel;
  const appliedTimeLabel =
    appliedTimeOptions.find((time) => time.key === applied.timeKey)?.label ?? "";

  // ===== Sounding (AirMapWeather) =====
  // ตรวจว่าข้อมูลที่แสดงอยู่เป็นแผนที่หยั่งอากาศหรือไม่ (AirMapWeather)
  const isSoundingApplied = appliedTypeLabel === SOUNDING_TYPE_LABEL;

  // ใช้กับ AirMapWeather เท่านั้น: ดึงจังหวัดจากคู่ฟิลด์ xxxTitle / xxxImagePath
  const soundingStations = useMemo(
    () => (isSoundingApplied && shown ? extractSoundingStations(shown) : []),
    [isSoundingApplied, shown]
  );

  // เก็บจังหวัดที่กำลัง active อยู่ในแผนที่หยั่งอากาศ
  const [activeSoundingId, setActiveSoundingId] = useState("");

  // เมื่อข้อมูล sounding เปลี่ยน ให้ตั้งจังหวัด active เริ่มต้น หรือคงค่าเดิมถ้ายังมีอยู่ในรายการ
  useEffect(() => {
    if (!isSoundingApplied || !soundingStations.length) {
      setActiveSoundingId("");
      return;
    }

    setActiveSoundingId((prev) =>
      prev && soundingStations.some((station) => station.id === prev)
        ? prev
        : soundingStations[0].id
    );
  }, [isSoundingApplied, soundingStations]);

  // หา index ของจังหวัดที่ active เพื่อใช้ sync กับ swiper และแสดงรูปที่ตรงกัน
  const activeSoundingIndex = useMemo(() => {
    if (!soundingStations.length) return 0;

    const idx = soundingStations.findIndex((station) => station.id === activeSoundingId);
    return idx >= 0 ? idx : 0;
  }, [soundingStations, activeSoundingId]);

  // sync ตำแหน่ง swiper ให้ตรงกับจังหวัดที่ active อยู่
  useEffect(() => {
    if (!isSoundingApplied) return;

    const swiper = soundingSwiperRef.current;
    if (!swiper || !soundingStations.length) return;

    const currentIndex = swiper.realIndex ?? swiper.activeIndex ?? 0;
    if (currentIndex === activeSoundingIndex) return;

    if (swiper.params.loop) {
      swiper.slideToLoop(activeSoundingIndex, 550);
    } else {
      swiper.slideTo(activeSoundingIndex, 550);
    }
  }, [isSoundingApplied, activeSoundingIndex, soundingStations.length]);

  // จังหวัดที่ active จริงในขณะนี้
  const activeSounding = isSoundingApplied ? soundingStations[activeSoundingIndex] : undefined;

  // เลือก src ของรูปที่จะแสดง โดยถ้าเป็น sounding จะใช้รูปของจังหวัดที่ active
  const imageSrc = isSoundingApplied
    ? activeSounding?.imagePath ?? ""
    : ((shown?.url as string) ?? "");

  // ข้อความ description จะแสดงเฉพาะแผนที่ทั่วไป ไม่ใช้กับ sounding
  const descText = isSoundingApplied ? "" : ((shown?.description as string) ?? "");

  /* -------------------- UI -------------------- */

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
              <div className="h-8 w-96 rounded bg-gray-200" />
              <div className="h-5 w-130 rounded bg-gray-200" />
              <div className="mt-4 h-11 w-full max-w-4xl rounded bg-gray-200" />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8">
          <div className="mx-auto h-130 max-w-130 rounded bg-gray-200" />
          <div className="mx-auto mt-6 h-4 w-180 max-w-full rounded bg-gray-200" />
        </section>
      </main>
    );
  }

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
              แผนที่อากาศผิวพื้นระดับต่างๆ
            </h1>

            <p className="mt-1 text-sm font-medium text-gray-600 sm:text-base">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="whitespace-nowrap">{appliedTypeLabel}</span>
                {appliedTimeLabel ? (
                  <span className="whitespace-nowrap text-gray-600">- {appliedTimeLabel}</span>
                ) : null}
              </span>
            </p>
          </div>

          {/* Controls row */}
          <div className="mt-5 flex flex-col gap-2 sm:mt-10 sm:flex-row sm:items-center sm:justify-start">
            {/* Type dropdown */}
            <div ref={typeWrapRef} className="relative w-full max-w-sm">
              <button
                type="button"
                onClick={() => {
                  setTypeOpen((open) => !open);
                  setTimeOpen(false);
                }}
                aria-expanded={typeOpen}
                className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-gray-300 bg-white px-5 py-3 text-left text-sm font-medium text-gray-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              >
                <span className="flex min-w-0 items-center justify-start gap-4">
                  <FiMap className="h-6 w-6 shrink-0 text-gray-800" />
                  <span className="block truncate">{selectedTypeLabel}</span>
                </span>

                <FiChevronDown
                  className={[
                    "h-6 w-6 shrink-0 text-gray-500 transition-transform duration-300 ease-in-out",
                    typeOpen ? "rotate-180" : "",
                  ].join(" ")}
                  aria-hidden="true"
                />
              </button>

              {typeOpen ? (
                <div className="absolute left-0 top-full z-50 mt-2 w-full">
                  <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg">
                    <div className="max-h-105 overflow-auto py-2">
                      {Type_Menu.map((label) => {
                        const has = (itemsByTypeLabel.get(label) ?? []).length > 0;
                        const active = label === selectedTypeLabel;

                        return (
                          <button
                            key={label}
                            type="button"
                            disabled={!has}
                            onClick={() => {
                              if (!has) return;
                              setSelectedTypeLabel(label);
                              setTypeOpen(false);
                              setTimeOpen(false);
                            }}
                            className={[
                              "w-full px-5 py-3 text-left text-sm font-medium",
                              active ? "bg-emerald-600 text-white" : "text-gray-700 hover:bg-gray-50",
                              has ? "cursor-pointer" : "cursor-not-allowed opacity-40 hover:bg-white",
                            ].join(" ")}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Date/Time dropdown */}
            <div ref={timeWrapRef} className="relative w-full max-w-sm">
              <button
                type="button"
                disabled={!selectedHasData}
                onClick={() => {
                  if (!selectedHasData) return;
                  setTimeOpen((open) => !open);
                  setTypeOpen(false);
                }}
                aria-expanded={timeOpen}
                className={[
                  "flex w-full items-center justify-between rounded-lg border bg-white px-5 py-3 text-left text-sm font-medium outline-none",
                  selectedHasData
                    ? "cursor-pointer border-gray-300 text-gray-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    : "cursor-not-allowed border-gray-200 text-gray-400",
                ].join(" ")}
              >
                <span className="flex min-w-0 items-center justify-start gap-4">
                  <FiCalendar
                    className={[
                      "h-6 w-6 shrink-0",
                      selectedHasData ? "text-gray-800" : "text-gray-400",
                    ].join(" ")}
                  />
                  <span className="block truncate">
                    {selectedHasData ? selectedTimeLabel : "ไม่มีข้อมูล"}
                  </span>
                </span>

                <FiChevronDown
                  className={[
                    "h-6 w-6 shrink-0 transition-transform duration-300 ease-in-out",
                    selectedHasData ? "text-gray-500" : "text-gray-300",
                    timeOpen ? "rotate-180" : "",
                  ].join(" ")}
                  aria-hidden="true"
                />
              </button>

              {selectedHasData && timeOptions.length > 1 && timeOpen ? (
                <div className="absolute left-0 top-full z-50 mt-2 w-full">
                  <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-lg">
                    <div className="max-h-105 overflow-auto py-2">
                      {timeOptions.map((time) => {
                        const active = time.key === selectedTimeKey;

                        return (
                          <button
                            key={time.key}
                            type="button"
                            onClick={() => {
                              setSelectedTimeKey(time.key);
                              setTimeOpen(false);
                            }}
                            className={[
                              "w-full cursor-pointer px-5 py-3 text-left text-sm font-medium",
                              active ? "bg-emerald-600 text-white" : "text-gray-700 hover:bg-gray-50",
                            ].join(" ")}
                          >
                            {time.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Button */}
            <button
              type="button"
              disabled={!selectedHasData || !selectedTimeKey}
              onClick={() => {
                setApplied({ typeLabel: selectedTypeLabel, timeKey: selectedTimeKey });
                setTypeOpen(false);
                setTimeOpen(false);
              }}
              className={[
                "h-12 whitespace-nowrap rounded-lg px-6 text-sm font-semibold text-white",
                selectedHasData && selectedTimeKey
                  ? "cursor-pointer bg-emerald-600 hover:bg-emerald-700"
                  : "cursor-not-allowed bg-gray-300",
              ].join(" ")}
            >
              แสดงแผนที่
            </button>
          </div>

          {loadingMore ? (
            <p className="mt-3 text-xs font-medium text-gray-500">
              กำลังโหลดข้อมูลเพิ่มเติม...
            </p>
          ) : null}
        </div>
      </section>

      {/* Title Map + Desktop arrows */}
      <section className="mx-auto max-w-7xl px-4 py-3 sm:py-6">
        <div className="flex items-start justify-between gap-3 sm:items-center">
          <div className="text-lg font-semibold text-gray-900 sm:text-2xl">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-2">
              <span className="whitespace-nowrap">
                {isSoundingApplied ? `${appliedTypeLabel} -` : appliedTypeLabel}
              </span>

              {appliedTimeLabel ? (
                <span className="whitespace-nowrap text-sm font-medium text-gray-600">
                  {isSoundingApplied ? appliedTimeLabel : `- ${appliedTimeLabel}`}
                </span>
              ) : null}

              {isSoundingApplied ? (
                <span className="whitespace-nowrap text-sm font-medium text-gray-500">
                  ({soundingStations.length} จังหวัด)
                </span>
              ) : null}
            </div>
          </div>

          {isSoundingApplied ? (
            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={() => soundingSwiperRef.current?.slidePrev()}
                disabled={soundingStations.length <= 1}
                className={[
                  "inline-flex items-center justify-center rounded-lg border px-2.5 py-2 text-sm font-semibold",
                  soundingStations.length <= 1
                    ? "cursor-not-allowed border-gray-200 text-gray-300"
                    : "cursor-pointer border-gray-300 text-gray-700 hover:bg-gray-50",
                ].join(" ")}
                aria-label="ก่อนหน้า"
              >
                <FiChevronLeft className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => soundingSwiperRef.current?.slideNext()}
                disabled={soundingStations.length <= 1}
                className={[
                  "inline-flex items-center justify-center rounded-lg border px-2.5 py-2 text-sm font-semibold",
                  soundingStations.length <= 1
                    ? "cursor-not-allowed border-gray-200 text-gray-300"
                    : "cursor-pointer border-gray-300 text-gray-700 hover:bg-gray-50",
                ].join(" ")}
                aria-label="ถัดไป"
              >
                <FiChevronRight className="h-5 w-5" />
              </button>
            </div>
          ) : null}
        </div>
      </section>

      {/* Sounding Cards */}
      {isSoundingApplied ? (
        <section className="mx-auto max-w-7xl px-0 pb-2 sm:px-4">
          <Swiper
            modules={[Autoplay]}
            onSwiper={(swiper) => {
              soundingSwiperRef.current = swiper;
            }}
            onSlideChange={(swiper) => {
              const idx = swiper.realIndex ?? 0;
              const id = soundingStations[idx]?.id ?? "";
              if (id) setActiveSoundingId(id);
            }}
            loop={soundingStations.length > 1}
            autoplay={
              soundingStations.length > 1
                ? {
                  delay: 10000,
                  disableOnInteraction: false,
                  pauseOnMouseEnter: true,
                }
                : false
            }
            speed={550}
            spaceBetween={12}
            slidesPerView="auto"
            grabCursor
            breakpoints={{
              640: {
                spaceBetween: 16,
              },
            }}
            className="!px-4 sm:!px-0"
          >
            {soundingStations.map((station, idx) => {
              const active = idx === activeSoundingIndex;

              return (
                <SwiperSlide
                  key={`${station.id}-${idx}`}
                  className="!h-auto !w-[220px] sm:!w-72"
                >
                  <button
                    type="button"
                    onClick={() => setActiveSoundingId(station.id)}
                    className={[
                      "relative h-24 w-full cursor-pointer overflow-hidden rounded-xl border p-4 text-left shadow-sm transition sm:h-auto",
                      active
                        ? "border-emerald-300 bg-white ring-2 ring-emerald-100"
                        : "border-sky-100 bg-gray-50 hover:bg-gray-100",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "absolute bottom-4 left-0 top-4 w-1 rounded-r transition",
                        active ? "bg-emerald-600" : "bg-transparent",
                      ].join(" ")}
                    />

                    <div className="flex h-full flex-col justify-center pl-2 sm:block">
                      <div className="text-sm font-semibold leading-tight text-gray-900">
                        จังหวัด {station.title}
                      </div>
                      <div className="mt-1 text-xs font-medium leading-tight text-gray-500">
                        แผนที่หยั่งอากาศ
                      </div>
                      {appliedTimeLabel ? (
                        <div className="mt-1 text-xs font-medium leading-tight text-gray-500">
                          วันที่ {appliedTimeLabel}
                        </div>
                      ) : null}
                    </div>
                  </button>
                </SwiperSlide>
              );
            })}
          </Swiper>
        </section>
      ) : null}

      {/* หัวข้อจังหวัด (Sounding) เหนือรูป */}
      {isSoundingApplied && activeSounding?.title ? (
        <section className="mx-auto max-w-7xl px-4 pb-3">
          <h2 className="text-center text-base font-semibold text-gray-900">
            จังหวัด {activeSounding.title}
          </h2>
        </section>
      ) : null}

      {/* Description (mobile) */}
      <section className="mx-auto max-w-7xl px-4 py-3 sm:hidden">
        {!isSoundingApplied ? (
          <p className="mx-auto text-sm leading-relaxed text-gray-700">{descText}</p>
        ) : null}
      </section>

      {/* Image */}
      <section className="mx-auto max-w-7xl px-4 pb-10">
        {imageSrc ? (
          <div className="flex justify-center">
            <div className="w-full max-w-130">
              <div className="shadow-xl">
                <ZoomableImage
                  src={imageSrc}
                  alt={
                    isSoundingApplied
                      ? `แผนที่หยั่งอากาศ - จังหวัด ${activeSounding?.title ?? ""}`
                      : ((shown?.alt as string) || (shown?.title as string) || "Map")
                  }
                  width={1600}
                  height={1000}
                  className="h-auto w-full"
                  clickAnywhereOnDesktop={false}
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-600">ไม่พบรูปแผนที่</p>
        )}

        {/* Description (desktop) */}
        {!isSoundingApplied ? (
          <div className="mx-auto mt-6 hidden max-w-5xl border-t border-gray-100 pt-4 sm:block">
            <p className="text-center text-sm text-gray-700">{descText}</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default MapPage;