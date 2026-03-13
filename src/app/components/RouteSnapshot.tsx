"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

type RouteSnapshotStackProps = {
  pathname: string;
  current: ReactNode;
  maxSnapshots?: number;
  children: (snapshot: ReactNode | null) => ReactNode;
};

export default function RouteSnapshotStack({
  pathname,
  current,
  maxSnapshots = 10,
  children,
}: RouteSnapshotStackProps) {
  const stackRef = useRef<string[]>([pathname]);
  const snapshotsRef = useRef<Record<string, ReactNode>>({});

  const prevPathRef = useRef(pathname);
  const prevCurrentRef = useRef<ReactNode>(current);

  const isPathChanged = prevPathRef.current !== pathname;

  const previousPathInStack =
    stackRef.current.length >= 2
      ? stackRef.current[stackRef.current.length - 2]
      : null;

  // กรณีเพิ่งเปลี่ยน route ใน render นี้
  // ให้ใช้ current ของ route ก่อนหน้าโดยตรงก่อน effect จะ commit
  const snapshot =
    isPathChanged
      ? prevCurrentRef.current
      : previousPathInStack
        ? snapshotsRef.current[previousPathInStack] ?? null
        : null;

  useLayoutEffect(() => {
    const prevPath = prevPathRef.current;

    // ยัง route เดิม ไม่ต้องขยับ stack
    if (prevPath === pathname) {
      prevCurrentRef.current = current;
      return;
    }

    // เก็บ snapshot ของหน้าที่กำลังออก
    snapshotsRef.current[prevPath] = prevCurrentRef.current;

    const stack = stackRef.current;
    const secondLast = stack[stack.length - 2];
    const last = stack[stack.length - 1];

    // กรณีย้อนกลับ เช่น A -> B -> กลับ A
    if (secondLast === pathname) {
      stack.pop();
    }
    // กรณีไปหน้าใหม่
    else if (last !== pathname) {
      stack.push(pathname);
    }

    // จำกัดจำนวน snapshot
    if (stack.length > maxSnapshots) {
      const removeCount = stack.length - maxSnapshots;
      const removed = stack.splice(0, removeCount);

      for (const key of removed) {
        // อย่าลบ path ปัจจุบันที่ยังใช้อยู่
        if (key !== pathname) {
          delete snapshotsRef.current[key];
        }
      }
    }

    prevPathRef.current = pathname;
    prevCurrentRef.current = current;
  }, [pathname, current, maxSnapshots]);

  return <>{children(snapshot)}</>;
}