"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/app/hooks/auth-hook";

const BASE_PATH = process.env.NEXT_PUBLIC_API_ROUTE ?? "";

function QueryString() {
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  // เก็บสถานะการทำงาน โดยใช้ useRef ไม่ทำให้ re-render หากทำเสร็จแล้วจะตั้งเป็น false
  const inFlightRef = useRef(false);
  const backBtnSetRef = useRef(false);

  // เปิดปุ่ม Back “True”
  useEffect(() => {
    if (backBtnSetRef.current) return;
    backBtnSetRef.current = true;

    window.czpSdk?.setBackButtonVisible?.(true);
  }, []);

  // รับค่า appId, mToken จาก URL Params (Query String)
  useEffect(() => {
    const appId = searchParams.get("appId");
    const mToken = searchParams.get("mToken");

    // ถ้าไม่มีค่าใดค่าหนึ่งจะหยุดทำงาน (รอ useEffect มีการเปลี่ยนแปลง)
    if (!appId || !mToken) return;

    // สร้าง key สำหรับเก็บสถานะการ login ใน sessionStorage กันยิงซ้ำ
    const loginKey = `dga_login_done:${appId}|${mToken}`;
    // หาก login แล้วจะส่งค่า loginKey เป็น 'done' เพื่อกันการ login ซ้ำ
    if (sessionStorage.getItem(loginKey) === "done") return;

    // เช็คสถานะหากเป็น true แสดงว่ากำลังทำงานอยู่ จะไม่ทำซ้ำ
    if (inFlightRef.current) return;
    // กำหนดสถานะกำลังทำงาน เป็น true
    inFlightRef.current = true;

    const handleLogin = async (appId: string, mToken: string, loginKey: string) => {
      try {
        // บันทึกสถานะการ login เป็น done
        sessionStorage.setItem(loginKey, "done");

        // 1) Function เรียก Route Login จาก /api/auth/login
        const res = await fetch(`${BASE_PATH}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appId, mToken }),
        });

        // รับผลลัพธ์เป็น JSON
        const data = await res.json().catch(() => ({}));

        // ตรวจสอบผลลัพธ์การ login
        if (!res.ok || !data?.success) {
          // ลบสถานะการ login ออก ในกรณีที่ไม่สำเร็จ
          sessionStorage.removeItem(loginKey);
          console.error("Login Error:", data?.error || data?.message || res.status);
          return;
        }

        // Login สำเร็จ -> เก็บ user ไว้ global
        setUser(data.user ?? null);

        // หา userId จาก data.user ใช้ในการ notification
        const userId = data.user?.userId;
        if (!userId) {
          console.warn("Login OK but missing userId for notification");
          return;
        }

        // สร้าง key สำหรับเก็บสถานะการ notification ใน sessionStorage กันยิงซ้ำ
        const notiKey = `dga_noti_done:${appId}|${mToken}`;
        // หากส่ง notification แล้วจะส่งค่า notiKey เป็น 'sent' เพื่อกันการส่งซ้ำ
        if (sessionStorage.getItem(notiKey) === "sent") return;
        // บันทึกสถานะการ notification เป็น sent
        sessionStorage.setItem(notiKey, "sent");

        // 2) Notification เรียก Route Login จาก /api/auth/notification
        const nRes = await fetch(`${BASE_PATH}/api/auth/notification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appId,
            userId: String(userId),
            message: "เข้าสู่ระบบสำเร็จ",
            mToken,
          }),
        });

        // รับผลลัพธ์เป็น JSON
        const nData = await nRes.json().catch(() => ({}));

        // ตรวจสอบผลลัพธ์การ notification
        if (!nRes.ok || nData?.success === false) {
          console.warn("Notification Failed:", nData?.message || nData?.error || nRes.status);

          // ถ้าอยากให้ “ส่งใหม่ได้” ตอน fail ให้เปิดบรรทัดนี้
          // sessionStorage.removeItem(notiKey);
        }
      } catch (err) {
        console.error("Network Error:", err);
        // ทำการ Remove ค่า 'done' ใน loginKey ออก
        sessionStorage.removeItem(loginKey);
      } finally {
        // ทำการตั้งสถานะการทำงานเป็น false (ปลดล็อกให้ทำงานครั้งถัดไปได้)
        inFlightRef.current = false;
      }
    };

    // เรียก Function handleLogin ส่งค่า appId, mToken และสถานะ loginKey
    void handleLogin(appId, mToken, loginKey);
  }, [searchParams, setUser]);

  return null;
}

export default QueryString;
