'use client';
import React from 'react'
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

// หน้า Landing Page สำหรับทดสอบการ Login กับ DGA
function LoginContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Waiting for credentials...');
  const [userData, setUserData] = useState<any>(null);

  // ดึง appId และ mToken จาก URL Params
  useEffect(() => {
    const appId = searchParams.get('appId');
    const mToken = searchParams.get('mToken');

    // ถ้ามีทั้ง appId และ mToken ให้ทำการ Login
    if (appId && mToken) {
      handleLogin(appId, mToken);
    } else {
      setStatus('No credentials (appId, mToken) found in URL.');
    }
  }, [searchParams]);

  const handleLogin = async (appId: string, mToken: string) => {
    try {
      setStatus('Authenticating with DGA...');
      
      // เรียก API จาก Route /api/auth/login
      const res = await fetch('api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, mToken }),
      });

      // รับผลลัพธ์จาก API
      const data = await res.json();

      if (data.success) {
        setStatus('Login Successful!');
        setUserData(data.user);
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (err) {
      setStatus('Network Error');
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-blue-800">DGA Login Test (/test2)</h1>
      
      <div className={`p-4 rounded-lg mb-6 ${userData ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
        Status: <strong>{status}</strong>
      </div>

      {userData && (
        <div className="border border-gray-300 p-6 rounded-lg shadow-sm bg-white">
          <h2 className="text-xl font-bold mb-4 border-b pb-2">User Profile</h2>
          <div className="grid grid-cols-1 gap-2 text-sm">
             {/* แสดงข้อมูลบางส่วน */}
            <p><span className="font-semibold w-32 inline-block">Citizen ID:</span> {userData.citizenId}</p>
            <p><span className="font-semibold w-32 inline-block">Name:</span> {userData.firstName} {userData.lastName}</p>
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

function page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}

export default page