import { NextResponse } from "next/server";

export const revalidate = 300; // cache api 300 วินาที / 5 นาที

export async function GET() {
  try {
    const TMD_AGROMET_URL = process.env.TMD_AGROMET_URL;

    if (!TMD_AGROMET_URL) {
      return NextResponse.json(
        { success: false, message: "Missing TMD_AGROMET_URL in environment variables" },
        { status: 500 }
      );
    }

    const res = await fetch(TMD_AGROMET_URL, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 }, // cache upstream 300 วินาที / 5 นาที
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: `Upstream error: ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch Agroforecast API",
        snippet: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}