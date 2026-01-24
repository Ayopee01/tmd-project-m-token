'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// หน้า Landing Page สำหรับทดสอบการ Login กับ DGA
function LoginContent() {
  const searchParams = useSearchParams();

  const [status, setStatus] = useState('Waiting for credentials...');
  const [userData, setUserData] = useState<any>(null);

  // ✅ NEW: เก็บ log/response เพื่อแสดงบน UI
  const [loginHttp, setLoginHttp] = useState<{ ok: boolean; status: number } | null>(null);
  const [notifyHttp, setNotifyHttp] = useState<{ ok: boolean; status: number } | null>(null);
  const [loginRaw, setLoginRaw] = useState<any>(null);
  const [notifyRaw, setNotifyRaw] = useState<any>(null);
  const [notifyDebug, setNotifyDebug] = useState<any[] | null>(null);

  useEffect(() => {
    const appId = searchParams.get('appId');
    const mToken = searchParams.get('mToken');

    if (!appId || !mToken) {
      setStatus('No credentials (appId, mToken) found in URL.');
      return;
    }

    void handleLogin(appId, mToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleLogin = async (appId: string, mToken: string) => {
    try {
      setStatus('Authenticating with DGA...');
      setUserData(null);

      // reset logs
      setLoginHttp(null);
      setNotifyHttp(null);
      setLoginRaw(null);
      setNotifyRaw(null);
      setNotifyDebug(null);

      // ✅ basePath = /test2 → เรียก API ใต้ /test2
      const res = await fetch('/test2/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, mToken }),
      });

      const data = await res.json().catch(() => ({}));

      setLoginHttp({ ok: res.ok, status: res.status });
      setLoginRaw(data);

      if (!res.ok || !data?.success) {
        setStatus(`Login Error: ${data?.error || data?.message || res.status}`);
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

      setStatus('Login OK. Sending notification...');

      // ✅ ยิง notification route
      const nRes = await fetch('/test2/api/auth/notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId,
          userId: String(userId),
          message: 'เข้าสู่ระบบสำเร็จ',
          mToken, // ใช้เป็น AgentID ฝั่ง backend
        }),
      });

      const nData = await nRes.json().catch(() => ({}));

      setNotifyHttp({ ok: nRes.ok, status: nRes.status });
      setNotifyRaw(nData);
      setNotifyDebug(Array.isArray(nData?.debug) ? nData.debug : null);

      if (!nRes.ok || nData?.success === false) {
        setStatus(`Notification Failed: ${nData?.message || nData?.error || nRes.status}`);
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

      {/* ✅ NEW: แสดงผล HTTP status แบบอ่านง่าย */}
      <div className="mb-6 grid grid-cols-1 gap-3 text-sm">
        <div className="border rounded p-3 bg-white">
          <div className="font-semibold">Login Call</div>
          <div>
            HTTP:{' '}
            {loginHttp ? (
              <span className={loginHttp.ok ? 'text-green-700' : 'text-red-700'}>
                {loginHttp.status} {loginHttp.ok ? '(OK)' : '(FAIL)'}
              </span>
            ) : (
              '-'
            )}
          </div>
        </div>

        <div className="border rounded p-3 bg-white">
          <div className="font-semibold">Notification Call</div>
          <div>
            HTTP:{' '}
            {notifyHttp ? (
              <span className={notifyHttp.ok ? 'text-green-700' : 'text-red-700'}>
                {notifyHttp.status} {notifyHttp.ok ? '(OK)' : '(FAIL)'}
              </span>
            ) : (
              '-'
            )}
          </div>
        </div>
      </div>

      {userData && (
        <div className="border border-gray-300 p-6 rounded-lg shadow-sm bg-white">
          <h2 className="text-xl font-bold mb-4 border-b pb-2">User Profile</h2>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <p>
              <span className="font-semibold w-32 inline-block">Citizen ID:</span> {userData.citizenId}
            </p>
            <p>
              <span className="font-semibold w-32 inline-block">Name:</span> {userData.firstName} {userData.lastName}
            </p>
          </div>

          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-gray-500">Raw User Data:</p>
            <pre className="text-xs bg-gray-50 p-2 mt-1 overflow-x-auto rounded">
              {JSON.stringify(userData, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* ✅ NEW: แสดง Log/Debug ที่ได้จาก backend */}
      <div className="mt-6 border border-gray-200 rounded p-4 bg-white">
        <h3 className="font-bold mb-2">Debug Panel</h3>

        <div className="text-sm font-semibold mt-3">Login Response</div>
        <pre className="text-xs bg-gray-50 p-2 mt-1 overflow-x-auto rounded">
          {JSON.stringify(loginRaw, null, 2)}
        </pre>

        <div className="text-sm font-semibold mt-4">Notification Response</div>
        <pre className="text-xs bg-gray-50 p-2 mt-1 overflow-x-auto rounded">
          {JSON.stringify(notifyRaw, null, 2)}
        </pre>

        {notifyDebug && (
          <>
            <div className="text-sm font-semibold mt-4">Notification Debug Steps</div>
            <pre className="text-xs bg-gray-50 p-2 mt-1 overflow-x-auto rounded">
              {JSON.stringify(notifyDebug, null, 2)}
            </pre>
          </>
        )}
      </div>
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
