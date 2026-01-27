// 'use client';

// import { useEffect } from 'react';
// import { usePathname, useSearchParams } from 'next/navigation';
// import { useAuth } from '@/app/hooks/auth-hook';
// import type { LoginResponseBody, MeResponseBody } from '@/app/types/auth';

// // ฟังก์ชันช่วยสร้าง URL สำหรับเรียก API
// const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

// function api(path: string) {
//   return `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
// }
// // Component สำหรับจัดการการยืนยันตัวตนเมื่อโหลดแอป
// export default function AuthBootstrap() {
//   const sp = useSearchParams(); // ดึง query parameters
//   const pathname = usePathname(); // ดึง pathname ปัจจุบัน
//   const { setUser } = useAuth(); // ดึงฟังก์ชัน setUser จาก context

//   useEffect(() => {
//     const run = async () => {
//       // 1) เช็ค session ก่อน (รองรับ refresh/เปิดลิงก์ที่ไม่มี query)
//       const meRes = await fetch(api('/api/auth/me')).catch(() => null);
//       if (meRes?.ok) {
//         const me = (await meRes.json().catch(() => null)) as MeResponseBody | null;
//         if (me?.success) {
//           setUser(me.user);
//           return; // ✅ มี session แล้ว -> ไม่ยิง login ซ้ำ แม้ URL ยังมี mToken
//         }
//       }

//       // 2) ถ้ามี appId+mToken -> login (ครั้งแรก/ยังไม่มี session)
//       const appId = sp.get('appId');
//       const mToken = sp.get('mToken');
//       if (!appId || !mToken) return;

//       const loginRes = await fetch(api('/api/auth/login'), {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ appId, mToken }),
//       });

//       const login = (await loginRes.json().catch(() => null)) as LoginResponseBody | null;
//       if (loginRes.ok && login?.success) {
//         setUser(login.user);
//       }
//     };

//     void run();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [sp, pathname]);

//   return null;
// }
