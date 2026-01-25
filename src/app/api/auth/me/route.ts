import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { MeResponseBody, SessionUser } from '@/app/types/auth';

const COOKIE_NAME = 'dga_session'; // ถ้าคุณใช้ชื่ออื่นให้แก้ตรงนี้

export async function GET() {
  const raw = cookies().get(COOKIE_NAME)?.value;

  if (!raw) {
    const body: MeResponseBody = { success: false, message: 'Not authenticated' };
    return NextResponse.json(body, { status: 401 });
  }

  // ✅ NOTE: ตรงนี้สมมติว่า cookie เก็บ JSON ของ user แบบ minimal
  // ถ้าคุณใช้ signed cookie ให้เปลี่ยนเป็น readSessionValue(...) ตามที่ทำไว้
  let user: SessionUser | null = null;
  try {
    user = JSON.parse(raw) as SessionUser;
  } catch {
    user = null;
  }

  if (!user) {
    const body: MeResponseBody = { success: false, message: 'Invalid session' };
    return NextResponse.json(body, { status: 401 });
  }

  const body: MeResponseBody = { success: true, user };
  return NextResponse.json(body);
}
