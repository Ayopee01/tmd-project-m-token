"use client";
import { useEffect } from "react";

export default function CzpBackButtonVisible({ visible }: { visible: boolean }) {
  useEffect(() => {
    const sdk = (window as any).czpSdk;

    console.log("czpSdk =", sdk);
    console.log("has setBackButtonVisible =", !!sdk?.setBackButtonVisible);
    console.log(
      "back-related methods =",
      sdk ? Object.keys(sdk).filter(k => k.toLowerCase().includes("back")) : []
    );

    sdk?.setBackButtonVisible?.(visible);
  }, [visible]);

  return null;
}
