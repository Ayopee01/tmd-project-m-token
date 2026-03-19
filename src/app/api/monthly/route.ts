import { NextResponse } from "next/server";

export const revalidate = 300; // cache api 300 วินาที / 5 นาที

export async function GET() {
  try {
    const TMD_MONTHLY_URL = process.env.TMD_MONTHLY_URL;

    if (!TMD_MONTHLY_URL) {
      return NextResponse.json(
        { success: false, message: "Missing TMD_MONTHLY_URL in environment variables" },
        { status: 500 }
      );
    }

    const res = await fetch(TMD_MONTHLY_URL, {
      headers: { Accept: "application/json" },
      next: { revalidate },
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
        message: "Failed to fetch Monthly API",
        snippet: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}