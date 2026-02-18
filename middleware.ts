import { NextRequest, NextResponse } from "next/server";

const PUBLIC_FILE = /\.(.*)$/;

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  // ข้ามของระบบ/ไฟล์ static
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    PUBLIC_FILE.test(pathname) ||
    pathname === "/__404__"
  ) {
    return NextResponse.next();
  }

  const appId = searchParams.get("appId");
  const mToken = searchParams.get("mToken");
  const okCookie = req.cookies.get("dga_ok")?.value === "1";

  // ไม่มี params และไม่มี cookie => rewrite ไป path ที่ไม่มีจริง => Next ตอบ 404 default
  if ((!appId || !mToken) && !okCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/__404__";
    url.search = "";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/landing/:path*"], // ปรับได้
};
