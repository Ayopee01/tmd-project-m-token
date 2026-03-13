"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

type RouteSnapshotProps = {
  pathname: string;
  current: ReactNode;
  children: (snapshot: ReactNode | null) => ReactNode;
};

export default function RouteSnapshot({
  pathname,
  current,
  children,
}: RouteSnapshotProps) {
  const prevPathRef = useRef(pathname);
  const prevCurrentRef = useRef<ReactNode>(current);
  const cachedSnapshotRef = useRef<ReactNode | null>(null);

  const snapshot =
    prevPathRef.current !== pathname
      ? prevCurrentRef.current
      : cachedSnapshotRef.current;

  useLayoutEffect(() => {
    if (prevPathRef.current !== pathname) {
      cachedSnapshotRef.current = prevCurrentRef.current;
      prevPathRef.current = pathname;
    }

    prevCurrentRef.current = current;
  }, [pathname, current]);

  return <>{children(snapshot)}</>;
}