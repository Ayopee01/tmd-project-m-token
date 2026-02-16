"use client";

import { useEffect } from "react";

export default function CzpBackButtonVisible({ visible }: { visible: boolean }) {
  useEffect(() => {
    window?.czpSdk?.setBackButtonVisible?.(visible);
  }, [visible]);

  return null;
}
