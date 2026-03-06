import { NextResponse } from "next/server";

<<<<<<< HEAD
export const revalidate = 0;
export const dynamic = "force-dynamic";
=======
export const revalidate = 300;
>>>>>>> main

const AWS_BY_PROVINCE_URL =
  "https://tmd.go.th/api/weather/get-aws-weather-by-province";

<<<<<<< HEAD
const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

=======
>>>>>>> main
export type AwsWeatherItem = {
  provinceId: number;
  provinceNameTh: string;
  provinceNameEn: string;
  regionNameTh: string;
  regionNameEn: string;
  stationId: number;
  stationNameTh: string;
  stationNameEn: string;
  stationLat: number;
  stationLon: number;
  temperature: number | null;
  temperatureMinToday: number | null;
  temperatureMaxToday: number | null;
  humidity: number | null;
  windDirection: number | null;
  windSpeed: number | null;
  precip15Mins: number | null;
  precip1Hr: number | null;
  precipToday: number | null;
  pressure: number | null;
  weatherType: string | null;
  tempType: string | null;
  waveType: string | null;
  dateTimeUtc7: string; // "2026-02-17T17:27:00.000+0700"
};

export type AwsApiResponse = {
  success: boolean;
  data: AwsWeatherItem[];
  message: string;
};

const PROVINCE_81 = [
  "เชียงราย",
  "เชียงใหม่",
  "น่าน",
  "พะเยา",
  "แพร่",
  "แม่ฮ่องสอน",
  "ลำปาง",
  "ลำพูน",
  "อุตรดิตถ์",
  "ตาก",
  "สุโขทัย",
  "พิษณุโลก",
  "พิจิตร",
  "เพชรบูรณ์",
  "กำแพงเพชร",
  "นครสวรรค์",
  "อุทัยธานี",
  "กาฬสินธุ์",
  "ขอนแก่น",
  "ชัยภูมิ",
  "นครพนม",
  "นครราชสีมา",
  "บึงกาฬ",
  "บุรีรัมย์",
  "มหาสารคาม",
  "มุกดาหาร",
  "ยโสธร",
  "ร้อยเอ็ด",
  "เลย",
  "สกลนคร",
  "ศรีสะเกษ",
  "สุรินทร์",
  "หนองคาย",
  "หนองบัวลำภู",
  "อุดรธานี",
  "อุบลราชธานี",
  "อำนาจเจริญ",
  "กรุงเทพมหานคร",
  "กาญจนบุรี",
  "ชัยนาท",
  "นครนายก",
  "นครปฐม",
  "นนทบุรี",
  "ปทุมธานี",
  "พระนครศรีอยุธยา",
  "ราชบุรี",
  "ลพบุรี",
  "สระบุรี",
  "สิงห์บุรี",
  "สุพรรณบุรี",
  "สมุทรปราการ",
  "สมุทรสาคร",
  "สมุทรสงคราม",
  "อ่างทอง",
  "เพชรบุรี",
  "ประจวบคีรีขันธ์",
  "ฉะเชิงเทรา",
  "ชลบุรี",
  "จันทบุรี",
  "ตราด",
  "ปราจีนบุรี",
  "ระยอง",
  "สระแก้ว",
  "พัทยา",
  "หัวหิน (ประจวบคีรีขันธ์)",
  "กระบี่",
  "ชุมพร",
  "ตรัง",
  "นครศรีธรรมราช",
  "นราธิวาส",
  "ปัตตานี",
  "พังงา",
  "พัทลุง",
  "ภูเก็ต",
  "ยะลา",
  "ระนอง",
  "สตูล",
  "สงขลา",
  "สุราษฎร์ธานี",
  "หาดใหญ่",
  "เกาะสมุย (สุราษฎร์ธานี)",
] as const;

type Province81 = (typeof PROVINCE_81)[number];
<<<<<<< HEAD
const PROVINCE_SET = new Set<string>(PROVINCE_81);

function isProvince81(x: string): x is Province81 {
  return PROVINCE_SET.has(x);
}

async function fetchAwsOne(province: Province81): Promise<AwsApiResponse> {
  const url = `${AWS_BY_PROVINCE_URL}?province=${encodeURIComponent(province)}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store", // ✅ realtime (ไม่ cache)
=======

function isProvince81(x: string): x is Province81 {
  return (PROVINCE_81 as readonly string[]).includes(x);
}

async function fetchAwsOne(province: string): Promise<AwsApiResponse> {
  const url = `${AWS_BY_PROVINCE_URL}?province=${encodeURIComponent(province)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
>>>>>>> main
  });

  if (!res.ok) {
    throw new Error(`Upstream error: ${res.status}`);
  }
<<<<<<< HEAD

  return (await res.json()) as AwsApiResponse;
}

/** ดึงครบทั้ง 81 โดยจำกัดจำนวนยิงพร้อมกัน */
async function fetchAwsAll(concurrency = 8) {
  const names = [...PROVINCE_81];
  const out: Record<
    string,
    AwsApiResponse | { success: false; data: []; message: string }
  > = {};

=======
  return (await res.json()) as AwsApiResponse;
}

// ดึงครบทั้ง 81 (กันยิงพร้อมกัน 81 ยิงทีเดียว ด้วย worker pool)
async function fetchAwsAll(limit = 8) {
  const names = [...PROVINCE_81];
  const out: Record<string, AwsApiResponse | { success: false; data: []; message: string }> = {};
>>>>>>> main
  let idx = 0;

  const worker = async () => {
    while (idx < names.length) {
<<<<<<< HEAD
      const name = names[idx++]!;
=======
      const name = names[idx++];
>>>>>>> main
      try {
        out[name] = await fetchAwsOne(name);
      } catch (e) {
        out[name] = {
          success: false,
          data: [],
          message: e instanceof Error ? e.message : String(e),
        };
      }
    }
  };

<<<<<<< HEAD
  const n = Math.max(1, Math.min(concurrency, names.length));
  await Promise.all(Array.from({ length: n }, worker));
=======
  await Promise.all(Array.from({ length: Math.min(limit, names.length) }, worker));
>>>>>>> main
  return out;
}

export async function GET(req: Request) {
<<<<<<< HEAD
  const { searchParams } = new URL(req.url);

  try {
    // all=1 -> ดึงครบ 81
    if (searchParams.get("all") === "1") {
      const data = await fetchAwsAll(8);
      return NextResponse.json(
        { success: true, count: PROVINCE_81.length, data },
        { headers: NO_STORE_HEADERS }
      );
    }

    // province=...
=======
  try {
    const { searchParams } = new URL(req.url);

    // 1) ถ้าเรียกแบบ all=1 -> ดึงครบ 81
    const all = searchParams.get("all") === "1";
    if (all) {
      const data = await fetchAwsAll(8);
      return NextResponse.json({
        success: true,
        count: PROVINCE_81.length,
        data,
      });
    }

    // 2) เรียกแบบ province=...
>>>>>>> main
    const province = searchParams.get("province");
    if (!province) {
      return NextResponse.json(
        { success: false, message: "Missing query param: province (or use all=1)" },
<<<<<<< HEAD
        { status: 400, headers: NO_STORE_HEADERS }
=======
        { status: 400 }
>>>>>>> main
      );
    }

    if (!isProvince81(province)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid province value (not in PROVINCE_81)",
          province,
        },
<<<<<<< HEAD
        { status: 400, headers: NO_STORE_HEADERS }
=======
        { status: 400 }
>>>>>>> main
      );
    }

    const data = await fetchAwsOne(province);
<<<<<<< HEAD
    return NextResponse.json(data, { headers: NO_STORE_HEADERS });
=======
    return NextResponse.json(data);
>>>>>>> main
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch AWS weather",
        snippet: err instanceof Error ? err.message : String(err),
      },
<<<<<<< HEAD
      { status: 502, headers: NO_STORE_HEADERS }
    );
  }
}
=======
      { status: 500 }
    );
  }
}
>>>>>>> main
