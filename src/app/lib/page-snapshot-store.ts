"use client";

const STORAGE_KEY = "__page_snapshots_v1__";
const memory = new Map<string, string>();

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

  // เก็บแค่ล่าสุด 8 หน้า
  const keys = [...memory.keys()];
  if (keys.length > 8) {
    const removeCount = keys.length - 8;
    for (let i = 0; i < removeCount; i += 1) {
      memory.delete(keys[i]);
    }
  }

  persistToSessionStorage();
}