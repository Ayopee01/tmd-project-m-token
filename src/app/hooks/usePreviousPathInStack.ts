"use client";

import { useLayoutEffect, useRef, useState } from "react";

export default function usePreviousPathInStack(pathname: string) {
    const stackRef = useRef<string[]>([pathname]);
    const [previousPath, setPreviousPath] = useState<string | null>(null);

    useLayoutEffect(() => {
        const stack = stackRef.current;
        const last = stack[stack.length - 1] ?? null;
        const secondLast = stack[stack.length - 2] ?? null;

        if (last === pathname) {
            setPreviousPath(secondLast);
            return;
        }

        if (secondLast === pathname) {
            // back
            stack.pop();
        } else if (last !== pathname) {
            // push new route
            stack.push(pathname);
        }

        setPreviousPath(stack[stack.length - 2] ?? null);
    }, [pathname]);

    return previousPath;
}