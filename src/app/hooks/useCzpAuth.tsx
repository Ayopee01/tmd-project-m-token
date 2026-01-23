"use client";

import React, { createContext, useContext } from "react";

export type CzpUser = {
    userId: string;
    citizenId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    mobile?: string;
};

type CzpAuthState = {
    loading: boolean;
    error: string | null;
    appId: string | null;
    mToken: string | null;
    user: CzpUser | null;
    relogin: () => Promise<void>;
};

const CzpAuthContext = createContext<CzpAuthState | null>(null);

export function CzpAuthProvider({ value, children }: { value: CzpAuthState; children: React.ReactNode }) {
    return <CzpAuthContext.Provider value={ value }> { children } </CzpAuthContext.Provider>;
}

export function useCzpAuth() {
    const ctx = useContext(CzpAuthContext);
    if (!ctx) throw new Error("useCzpAuth must be used within <CzpAuthProvider>");
    return ctx;
}
