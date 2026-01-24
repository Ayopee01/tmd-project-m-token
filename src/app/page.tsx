'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// หน้า Landing Page สำหรับทดสอบการ Login กับ DGA
function LoginContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Waiting for credentials...');
  const [userData, setUserData] = useState<any>(null);

  // กันยิงซ้ำในรอบ mount (React StrictMode/ re-render)
  const didAutoLoginRef = useRef(false);

  useEffect(() => {
    const appId = searchParams.get('appId');
    const mToken = searchParams.get('mToken');

    if (!appId || !mToken) {
      setStatus('No credentials (appId, mToken) found in URL.');
      return;
    }

    // กันยิงซ้ำใน component lifecycle
    if (didAutoLoginRef.current) return;

    // กันยิงซ้ำใน 1 session (กรณี StrictMode ทำ effect ซ้ำ)
    const sessionKey = `dga_autologin_done:${appId}:${mToken}`;
    if (sessionStorage.getItem(sessionKey) === '1') {
      didAutoLoginRef.current = true;
      setStatus('Already authenticated in this session.');
      return;
    }

    didAutoLoginRef.current = true;
    sessionStorage.setItem(sessionKey, '1');

    void handleLogin(appId, mToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleLogin = async (appId: string, mToken: string) => {
    try {
      setStatus('Authenticating with DGA...');

      // basePath = /test2 → เรียก API ใต้ /test2
      const res = await fetch('/test2/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, mToken }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.success) {
        setStatus(`Error: ${data?.error || data?.message || res.status}`);
        return;
      }

      setUserData(data.user);

      // หา userId ที่ถูกต้องสำหรับ notification
      const userId =
        data.user?.userId ??
        data.user?.UserId ??
        data.user?.czpUserId ??
        data.user?.CZPUserId;

      if (!userId) {
        setStatus('Login Successful! แต่ไม่พบ userId สำหรับส่งแจ้งเตือน');
        return;
      }

      // ยิง notification route (ที่คุณมีอยู่แล้ว: src/app/api/auth/notification/route.ts)
      const nRes = await fetch('/test2/api/auth/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId,
          userId: String(userId),
          message: 'เข้าสู่ระบบสำเร็จ',
        }),
      });

      const nData = await nRes.json().catch(() => ({}));

      if (!nRes.ok || nData?.success === false) {
        setStatus(
          `Login Successful! แต่แจ้งเตือนล้ม: ${nData?.message || nData?.error || nRes.status}`
        );
      } else {
        setStatus('Login Successful! (Notification sent)');
      }
    } catch (err) {
      setStatus('Network Error');
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-blue-800">DGA Login Test (/test2)</h1>

      <div
        className={`p-4 rounded-lg mb-6 ${
          userData ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
        }`}
      >
        Status: <strong>{status}</strong>
      </div>

      {userData && (
        <div className="border border-gray-300 p-6 rounded-lg shadow-sm bg-white">
          <h2 className="text-xl font-bold mb-4 border-b pb-2">User Profile</h2>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <p>
              <span className="font-semibold w-32 inline-block">Citizen ID:</span>{' '}
              {userData.citizenId}
            </p>
            <p>
              <span className="font-semibold w-32 inline-block">Name:</span> {userData.firstName}{' '}
              {userData.lastName}
            </p>
          </div>

          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-500">Raw Data:</p>
            <pre className="text-xs bg-gray-50 p-2 mt-1 overflow-x-auto rounded">
              {JSON.stringify(userData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
