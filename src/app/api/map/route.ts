import { NextResponse } from "next/server";

export const revalidate = 300; // cache api 300 วินาที/5 นาที

// URL API แผนที่ลมบน
const TMD_URL = "https://data.tmd.go.th/api/UpperWindMap/v1/";

export async function GET() {
  try {
    const res = await fetch(TMD_URL, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 }, // cache upstream 300 วินาที/5 นาที
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: `Upstream error: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to fetch Map API" },
      { status: 500 }
    );
  }
}
