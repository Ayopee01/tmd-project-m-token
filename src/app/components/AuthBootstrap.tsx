'use client';

import React, { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/app/hooks/auth-hook';
import type { LoginResponseBody, MeResponseBody } from '@/app/types/auth';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

function api(path: string) {
  return `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export default function AuthBootstrap() {
  const sp = useSearchParams();
  const pathname = usePathname();
  const { setUser } = useAuth();

  useEffect(() => {
    const run = async () => {
      // 1) เช็ค session ก่อน (รองรับ refresh/เปิดลิงก์ที่ไม่มี query)
      const meRes = await fetch(api('/api/auth/me')).catch(() => null);
      if (meRes?.ok) {
        const me = (await meRes.json().catch(() => null)) as MeResponseBody | null;
        if (me?.success) {
          setUser(me.user);
          return; // ✅ มี session แล้ว -> ไม่ยิง login ซ้ำ แม้ URL ยังมี mToken
        }
      }

      // 2) ถ้ามี appId+mToken -> login (ครั้งแรก/ยังไม่มี session)
      const appId = sp.get('appId');
      const mToken = sp.get('mToken');
      if (!appId || !mToken) return;

      const loginRes = await fetch(api('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, mToken }),
      });

      const login = (await loginRes.json().catch(() => null)) as LoginResponseBody | null;
      if (loginRes.ok && login?.success) {
        setUser(login.user);
      }

      // ✅ ไม่ลบ query ตามที่คุณต้องการ (ตัด STEP 3 ออก)
      // หมายเหตุ: URL จะยังคงมี appId/mToken อยู่
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp, pathname]);

  return null;
}
