"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function waitForCzpSdk(timeoutMs = 6000) {
  return new Promise<any | null>((resolve) => {
    const t0 = Date.now();
    const timer = setInterval(() => {
      const sdk = (window as any).czpSdk;
      if (sdk?.setBackButtonVisible) {
        clearInterval(timer);
        resolve(sdk);
      } else if (Date.now() - t0 > timeoutMs) {
        clearInterval(timer);
        resolve(null);
      }
    }, 100);
  });
}

export default function CzpBackButtonVisible({ visible }: { visible: boolean }) {
  const pathname = usePathname();
  console.log("czpSdk =", (window as any).czpSdk);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const sdk = await waitForCzpSdk();
      if (cancelled || !sdk) return;

      // สั่ง 2 ครั้ง เผื่อบาง WebView ต้อง “ย้ำ” หลัง render
      sdk.setBackButtonVisible(visible);
      setTimeout(() => sdk.setBackButtonVisible(visible), 250);
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, pathname]);

  return null;
}
