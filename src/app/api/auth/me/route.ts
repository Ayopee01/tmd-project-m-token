import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { MeResponseBody, SessionUser } from '@/app/types/auth';

const COOKIE_NAME = 'dga_session'; // ถ้าคุณใช้ชื่ออื่นให้แก้ตรงนี้

export async function GET() {
  const cookieStore = await cookies(); // ✅ สำคัญ: cookies() เป็น async ใน Next 16.1+
  const raw = cookieStore.get(COOKIE_NAME)?.value;

  if (!raw) {
    const body: MeResponseBody = { success: false, message: 'Not authenticated' };
    return NextResponse.json(body, { status: 401 });
  }

  // NOTE: สมมติว่า cookie เก็บ JSON ของ user แบบ minimal
  // ถ้าคุณใช้ signed/encrypted cookie ให้เปลี่ยนเป็นฟังก์ชัน decode ของคุณ
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
