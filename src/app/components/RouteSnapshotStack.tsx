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

    const snapshot = isPathChanged
        ? prevCurrentRef.current
        : previousPathInStack
            ? snapshotsRef.current[previousPathInStack] ?? null
            : null;

    useLayoutEffect(() => {
        const prevPath = prevPathRef.current;

        if (prevPath === pathname) {
            prevCurrentRef.current = current;
            return;
        }

        snapshotsRef.current[prevPath] = prevCurrentRef.current;

        const stack = stackRef.current;
        const secondLast = stack[stack.length - 2];
        const last = stack[stack.length - 1];

        if (secondLast === pathname) {
            stack.pop();
        } else if (last !== pathname) {
            stack.push(pathname);
        }

        if (stack.length > maxSnapshots) {
            const removeCount = stack.length - maxSnapshots;
            const removed = stack.splice(0, removeCount);

            for (const key of removed) {
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