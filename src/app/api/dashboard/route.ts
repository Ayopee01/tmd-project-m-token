import { NextResponse } from "next/server";
// library
import { XMLParser } from "fast-xml-parser";
// lib
import { buildDashboardResponse } from "@/app/lib/province";
// types
import type { DashboardFail, DashboardResponse } from "@/app/types/dashboard";


export const revalidate = 300;

export async function GET(req: Request) {
  try {
    const TMD_DASHBOARD_URL = process.env.TMD_DASHBOARD_URL;

    if (!TMD_DASHBOARD_URL) {
      const out: DashboardFail = {
        success: false,
        message: "Missing TMD_DASHBOARD in environment variables",
      };
      return NextResponse.json(out, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const province = searchParams.get("province") ?? undefined;

    const res = await fetch(TMD_DASHBOARD_URL, {
      headers: { Accept: "application/xml" },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      const out: DashboardFail = {
        success: false,
        message: `Upstream error: ${res.status}`,
      };
      return NextResponse.json(out, { status: 502 });
    }

    const rawXml = await res.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      trimValues: true,
    });

    const parsed = parser.parse(rawXml);

    const out: DashboardResponse = buildDashboardResponse(parsed, province);

    return NextResponse.json(out);
  } catch (err: unknown) {
    const out: DashboardFail = {
      success: false,
      message: "Failed to fetch dashboard",
      snippet: err instanceof Error ? err.message : String(err),
    };
    return NextResponse.json(out, { status: 500 });
  }
}
