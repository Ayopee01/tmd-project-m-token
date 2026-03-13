"use client";

import { useEffect, useRef, type RefObject } from "react";
import html2canvas from "html2canvas";
import { setPageSnapshot } from "@/app/lib/page-snapshot-store";

type PageSnapshotRecorderProps = {
    pathname: string;
    targetRef: RefObject<HTMLElement | null>;
    enabled?: boolean;
    delay?: number;
};

function waitForNextPaint() {
    return new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
        });
    });
}

function waitForImages(root: HTMLElement, timeout = 2000) {
    const images = Array.from(root.querySelectorAll("img"));

    return Promise.all(
        images.map((img) => {
            if (img.complete) return Promise.resolve();

            return new Promise<void>((resolve) => {
                const done = () => resolve();

                img.addEventListener("load", done, { once: true });
                img.addEventListener("error", done, { once: true });
                window.setTimeout(done, timeout);
            });
        })
    );
}

export default function PageSnapshotRecorder({
    pathname,
    targetRef,
    enabled = true,
    delay = 180,
}: PageSnapshotRecorderProps) {
    const runningRef = useRef(false);

    useEffect(() => {
        if (!enabled) return;
        if (typeof window === "undefined") return;

        let cancelled = false;

        const timer = window.setTimeout(async () => {
            if (cancelled || runningRef.current) return;

            const el = targetRef.current;
            if (!el) return;

            runningRef.current = true;

            try {
                await waitForNextPaint();

                if ("fonts" in document) {
                    try {
                        await (document as Document & { fonts: FontFaceSet }).fonts.ready;
                    } catch {
                        // ignore
                    }
                }

                await waitForImages(el);

                const canvas = await html2canvas(el, {
                    useCORS: true,
                    backgroundColor: "#ffffff",
                    logging: false,
                    scale: Math.min(window.devicePixelRatio || 1, 1.5),
                    width: el.clientWidth,
                    height: Math.min(el.scrollHeight, window.innerHeight),
                    windowWidth: document.documentElement.clientWidth,
                    windowHeight: window.innerHeight,
                    scrollX: 0,
                    scrollY: -window.scrollY,
                    imageTimeout: 5000,
                    onclone: (clonedDoc) => {
                        const clonedRoot = clonedDoc.body;
                        if (clonedRoot) {
                            clonedRoot.style.background = "#ffffff";
                        }
                    },
                    ignoreElements: (node) =>
                        node instanceof HTMLElement &&
                        node.hasAttribute("data-snapshot-ignore"),
                });

                if (cancelled) return;

                const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
                setPageSnapshot(pathname, dataUrl);
            } catch (error) {
                console.error("snapshot failed:", error);
            } finally {
                runningRef.current = false;
            }
        }, delay);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [pathname, targetRef, enabled, delay]);

    return null;
}