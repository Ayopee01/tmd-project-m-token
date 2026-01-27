'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AuthContextValue, DgaUser } from '@/app/types/auth';

// กำหนด key สำหรับเก็บ user ใน sessionStorage
const AUTH_STORAGE_KEY = 'dga_user';
// สร้าง AuthContext เก็บสถานะ auth ต่างๆ เช่น user, loading, setUser, logout ค่า Defult เป็น null
const AuthContext = createContext<AuthContextValue | null>(null);

// Function Provider สำหรับครอบ component ที่ต้องการใช้ AuthContext
export function AuthProvider({ children }: { children: React.ReactNode }) {
  //user เริ่มเป็น null
  const [user, setUser] = useState<DgaUser | null>(null);
  // loading เริ่มเป็น true (กำลังจะไปเช็ค storage)
  const [loading, setLoading] = useState(true);

  // โหลด user จาก sessionStorage ครั้งเดียวตอนเริ่ม
  useEffect(() => {
    try {
      // ดึงข้อมูล user จาก sessionStorage ['dga_user']
      const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
      // ถ้ามีข้อมูลให้แปลงจาก JSON แล้วตั้งเป็น user
      if (raw) setUser(JSON.parse(raw));
      // กรณี error 
    } catch {
      // ให้ลบข้อมูลใน sessionStorage ทิ้ง
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      // คืนค่า loading ใน AuthProvider เป็น false
    } finally {
      setLoading(false);
    }
  }, []);

  // เก็บ user ลง sessionStorage ทุกครั้งที่ user เปลี่ยนแปลง
  useEffect(() => {
    // ถ้า user เป็น null 
    if (!user) {
      // ให้ลบข้อมูลใน sessionStorage ทิ้ง
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }
    // แปลง user เป็น JSON แล้วเก็บใน sessionStorage
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  }, [user]);

  // ฟังก์ชัน logout ตั้ง user เป็น null และลบข้อมูลใน sessionStorage
  const logout = () => {
    // ตั้ง user เป็น null
    setUser(null);
    // ลบข้อมูลใน sessionStorage
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  };

  // สร้างค่า value สำหรับเก็บใน AuthContext
  const value = useMemo<AuthContextValue>(
    // คืนค่า object ที่มี user, loading, setUser, logout
    () => ({ user, loading, setUser, logout }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}


