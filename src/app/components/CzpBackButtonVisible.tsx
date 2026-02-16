"use client";
import { useEffect } from "react";

function waitForSdk(timeoutMs = 8000) {
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
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const sdk = await waitForSdk();
      if (cancelled || !sdk) return;

      sdk.setBackButtonVisible(visible);
      // ย้ำอีกครั้ง เผื่อหัว native/render ช้า
      setTimeout(() => sdk.setBackButtonVisible(visible), 300);
      setTimeout(() => sdk.setBackButtonVisible(visible), 900);
    })();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  return null;
}
