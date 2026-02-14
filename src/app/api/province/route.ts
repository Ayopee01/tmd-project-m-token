import { NextRequest, NextResponse } from "next/server";
<<<<<<< HEAD
import type {
  NominatimResponse,
  ProvinceFail,
  ProvinceResponse,
} from "@/app/types/dashboard";
import {
  buildNominatimUrl,
  normalizeProvinceThai,
  pickProvinceThai,
} from "@/app/lib/province";
=======
import type { NominatimResponse, ProvinceFail, ProvinceResponse } from "@/app/types/dashboard";
import { buildNominatimUrl, normalizeProvinceThai, pickProvinceThai } from "src/app/lib/province";
>>>>>>> 1a028e5 (update)

export const dynamic = "force-dynamic"; // ✅ route นี้ต้อง dynamic เพราะมี query params

<<<<<<< HEAD
export async function GET(req: NextRequest) {
  try {
    const lat = req.nextUrl.searchParams.get("lat");
    const lng = req.nextUrl.searchParams.get("lng");
=======
// ✅ บังคับให้เป็น dynamic ชัดเจน (กัน build ฟ้องเรื่อง static)
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // ✅ ใช้ nextUrl แทน new URL(req.url) เพื่อไม่แตะ request.url
    const searchParams = req.nextUrl.searchParams;
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
>>>>>>> 1a028e5 (update)

    if (!lat || !lng) {
      const out: ProvinceFail = { success: false, message: "Missing lat/lng" };
      return NextResponse.json(out, { status: 400 });
    }

    const url = buildNominatimUrl(lat, lng);

    const res = await fetch(url, {
      headers: { "User-Agent": "TMD_Project/1.0" },
<<<<<<< HEAD
      next: { revalidate: 86400 }, // ✅ cache ผล reverse ตาม url นี้ (แยกตาม lat/lng)
=======
      next: { revalidate: 86400 }, // หรือ next: { revalidate } ก็ได้
>>>>>>> 1a028e5 (update)
    });

    if (!res.ok) {
      const out: ProvinceFail = {
        success: false,
        message: `Reverse geocode error: ${res.status}`,
      };
      return NextResponse.json(out, { status: 502 });
    }

    const data = (await res.json()) as NominatimResponse;

    const rawProvince = pickProvinceThai(data);
    const finalName = normalizeProvinceThai(rawProvince);

    const out: ProvinceResponse = {
      success: true,
      provinceThai: finalName,
    };

    return NextResponse.json(out, {
      // (ทางเลือก) ถ้าต้องการให้ CDN ช่วย cache response ของ API ด้วย
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
      },
    });
  } catch (err: unknown) {
    console.error("reverse-province error:", err);
    const out: ProvinceFail = { success: false, message: "Reverse geocode failed" };
    return NextResponse.json(out, { status: 500 });
  }
}
