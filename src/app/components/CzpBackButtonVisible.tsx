"use client";

import { useEffect } from "react";

export default function CzpBackButtonVisible({ visible }: { visible: boolean }) {
  useEffect(() => {
    // กันกรณีเปิดใน browser ปกติที่ไม่มี czpSdk
    window?.czpSdk?.setBackButtonVisible?.(visible);

    // ถ้าต้องการ: ออกจากหน้าให้ซ่อนกลับเสมอ
    return () => {
      window?.czpSdk?.setBackButtonVisible?.(false);
    };
  }, [visible]);

  return null;
}
