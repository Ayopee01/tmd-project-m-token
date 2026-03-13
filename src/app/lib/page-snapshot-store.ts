"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "__page_snapshots_v1__";
const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function emit() {
    listeners.forEach((listener) => listener());
}

function hydrateFromSessionStorage() {
    if (typeof window === "undefined") return;
    if (memory.size > 0) return;

    try {
        const raw = window.sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        const parsed = JSON.parse(raw) as Record<string, string>;
        for (const [key, value] of Object.entries(parsed)) {
            memory.set(key, value);
        }
    } catch {
        // ignore
    }
}

function persistToSessionStorage() {
    if (typeof window === "undefined") return;

    try {
        const obj = Object.fromEntries(memory.entries());
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch {
        // ignore
    }
}

export function getPageSnapshot(pathname: string): string | null {
    hydrateFromSessionStorage();
    return memory.get(pathname) ?? null;
}

export function setPageSnapshot(pathname: string, dataUrl: string) {
    hydrateFromSessionStorage();
    memory.set(pathname, dataUrl);

    const keys = [...memory.keys()];
    if (keys.length > 8) {
        const removeCount = keys.length - 8;
        for (let i = 0; i < removeCount; i += 1) {
            memory.delete(keys[i]);
        }
    }

    persistToSessionStorage();
    emit();
}

export function subscribePageSnapshots(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function usePageSnapshot(pathname: string | null) {
    return useSyncExternalStore(
        subscribePageSnapshots,
        () => {
            if (!pathname) return null;
            return getPageSnapshot(pathname);
        },
        () => null
    );
}