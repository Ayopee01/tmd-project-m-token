"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { czpSetBackButtonVisible } from "@/app/lib/czp";

export default function CzpBackButtonGate({
  visible,
  showWebFallback = true,
}: {
  visible: boolean;
  showWebFallback?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sdkOk, setSdkOk] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const res = await czpSetBackButtonVisible(visible);
      if (cancelled) return;
      setSdkOk(res.ok);
      // ถ้าอยาก debug:
      // console.log("[CZP]", res);
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, pathname]);

  // Fallback: ถ้า SDK ไม่พร้อม/ไม่รองรับ และอยากให้ผู้ใช้ย้อนกลับได้แน่นอน
  if (showWebFallback && pathname !== "/" && sdkOk === false) {
    return (
      <button
        type="button"
        onClick={() => router.back()}
        style={{
          position: "fixed",
          top: 90,
          left: 12,
          zIndex: 99999,
          padding: "10px 12px",
          borderRadius: 999,
          background: "white",
          boxShadow: "0 8px 20px rgba(0,0,0,.12)",
        }}
        aria-label="ย้อนกลับ"
      >
        ← ย้อนกลับ
      </button>
    );
  }

  return null;
}
