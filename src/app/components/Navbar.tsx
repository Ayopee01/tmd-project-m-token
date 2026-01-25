'use client';

import React from 'react';
import { useAuth } from '@/app/hooks/auth-hook';

export default function Navbar() {
  const { user } = useAuth();

  return (
    <div className="w-full border-b bg-white">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <div className="font-bold text-blue-800">TMD Project</div>
        <div className="text-sm">
          {user ? (
            <span>สวัสดี, <b>{user.firstName} {user.lastName}</b></span>
          ) : (
            <span className="text-gray-500">ยังไม่ได้เข้าสู่ระบบ</span>
          )}
        </div>
      </div>
    </div>
  );
}
