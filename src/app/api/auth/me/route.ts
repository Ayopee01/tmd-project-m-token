// import { NextResponse } from 'next/server';
// import { cookies } from 'next/headers';
// import type { MeResponseBody, SessionUser } from '@/app/types/auth';

// const COOKIE_NAME = 'dga_session'; // ถ้าคุณใช้ชื่ออื่นให้แก้ตรงนี้

// export async function GET() {
//   const cookieStore = await cookies(); // การดึงค่า cookie
//   const raw = cookieStore.get(COOKIE_NAME)?.value; // การดึงค่า session จาก cookie

//   if (!raw) {
//     const body: MeResponseBody = { success: false, message: 'Not authenticated' };
//     return NextResponse.json(body, { status: 401 });
//   }

//   let user: SessionUser | null = null; // การแปลงค่า cookie เป็น SessionUser
//   try {
//     user = JSON.parse(raw) as SessionUser; // session ถูกเก็บในรูปแบบ JSON
//   } catch { // ถ้าแปลงค่าไม่สำเร็จ
//     user = null; // กำหนด user เป็น null
//   }

//   if (!user) { // ถ้าไม่มี user ที่ถูกต้อง
//     const body: MeResponseBody = { success: false, message: 'Invalid session' }; // ส่งกลับข้อความแสดงข้อผิดพลาด
//     return NextResponse.json(body, { status: 401 }); // 401 Unauthorized
//   }

//   const body: MeResponseBody = { success: true, user }; // ส่งกลับข้อมูล user ที่ถูกต้อง
//   return NextResponse.json(body); // 200 OK
// }
