import { NextRequest, NextResponse } from "next/server";
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

export const dynamic = "force-dynamic"; // ✅ route นี้ต้อง dynamic เพราะมี query params

export async function GET(req: NextRequest) {
  try {
    const lat = req.nextUrl.searchParams.get("lat");
    const lng = req.nextUrl.searchParams.get("lng");

    if (!lat || !lng) {
      const out: ProvinceFail = { success: false, message: "Missing lat/lng" };
      return NextResponse.json(out, { status: 400 });
    }

    const url = buildNominatimUrl(lat, lng);

    const res = await fetch(url, {
      headers: { "User-Agent": "TMD_Project/1.0" },
      next: { revalidate: 86400 }, // ✅ cache ผล reverse ตาม url นี้ (แยกตาม lat/lng)
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
