import { NextResponse } from "next/server";
// Types
import type { TmdWarningApiResponse, WarningItem, WarningSource } from "@/app/types/warning";

export const dynamic = "force-dynamic";

function txt(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeWarnings(raw: TmdWarningApiResponse | null): WarningItem[] {
  if (!raw || raw.success === false || !Array.isArray(raw.data)) {
    return [];
  }

  return raw.data
    .map((item: WarningSource, index): WarningItem | null => {
      const title = txt(item.title) || "ประกาศ";
      const description = txt(item.description);
      const contentdate = txt(item.contentdate) || null;
      const url = txt(item.url) || null;
      const alt = txt(item.alt) || null;

      if (!title && !description && !url) {
        return null;
      }

      return {
        key: `${contentdate || title}-${index}`,
        title,
        description,
        contentdate,
        url,
        alt,
        raw: item,
      };
    })
    .filter((item): item is WarningItem => Boolean(item));
}

export async function GET() {
  try {
    const TMD_WARNING_NEWS_URL = process.env.TMD_WARNING_NEWS_URL;

    if (!TMD_WARNING_NEWS_URL) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing TMD_WARNING_NEWS_URL in environment variables",
          warnings: [],
        },
        { status: 500 }
      );
    }

    const res = await fetch(TMD_WARNING_NEWS_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const raw =
      (await res.json().catch(() => null)) as TmdWarningApiResponse | null;

    const warnings = normalizeWarnings(raw);

    return NextResponse.json({
      success: true,
      warnings,

      // เผื่อ component เก่ายังเรียก json.warning อยู่
      warning: warnings[0] ?? null,
    });
  } catch {
    return NextResponse.json({
      success: true,
      warnings: [],
      warning: null,
    });
  }
}