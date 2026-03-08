import { NextResponse } from "next/server";
import type { AwsApiResponse, AwsErrorResponse } from "@/app/types/aws-weather";

export const revalidate = 0;
export const dynamic = "force-dynamic";

const AWS_BY_PROVINCE_URL =
  "https://tmd.go.th/api/weather/get-aws-weather-by-province";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
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

const PROVINCE_SET = new Set<string>(PROVINCE_81);

function isProvince81(x: string): x is Province81 {
  return PROVINCE_SET.has(x);
}

async function fetchAwsOne(province: Province81): Promise<AwsApiResponse> {
  const url = `${AWS_BY_PROVINCE_URL}?province=${encodeURIComponent(province)}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Upstream error: ${res.status}`);
  }

  return (await res.json()) as AwsApiResponse;
}

async function fetchAwsAll(
  limit = 8
): Promise<Record<string, AwsApiResponse | AwsErrorResponse>> {
  const names = [...PROVINCE_81];
  const out: Record<string, AwsApiResponse | AwsErrorResponse> = {};

  let idx = 0;

  const worker = async () => {
    while (idx < names.length) {
      const name = names[idx++]!;

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

  const workerCount = Math.max(1, Math.min(limit, names.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return out;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    if (searchParams.get("all") === "1") {
      const data = await fetchAwsAll(8);

      return NextResponse.json(
        {
          success: true,
          count: PROVINCE_81.length,
          data,
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    const province = searchParams.get("province");

    if (!province) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing query param: province (or use all=1)",
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    if (!isProvince81(province)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid province value (not in PROVINCE_81)",
          province,
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const data = await fetchAwsOne(province);

    return NextResponse.json(data, { headers: NO_STORE_HEADERS });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch AWS weather",
        snippet: err instanceof Error ? err.message : String(err),
      },
      { status: 502, headers: NO_STORE_HEADERS }
    );
  }
}