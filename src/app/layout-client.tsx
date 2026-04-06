"use client";
import { useEffect, useState, Suspense } from "react";
import { usePathname } from "next/navigation";
// Components
import Navbar from "@/app/components/Navbar";
import DrawerMenu from "./components/DrawerMenu_Sticky";
import Footer from "./components/Footer";
import QueryString from "@/app/components/QueryString";
import { AuthProvider } from "@/app/hooks/auth-hook";
import ScrollTopButton from "@/app/components/ScrollTop";
import WarningNews from "@/app/components/Warning_News";

function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    window.czpSdk?.setBackButtonVisible?.(true);
  }, [pathname]);

  return (
    <AuthProvider>

      <Suspense fallback={null}>
        <QueryString />
        <WarningNews />
      </Suspense>

      <Navbar onOpenMenu={() => setOpen((i) => !i)} />
      <DrawerMenu open={open} onClose={() => setOpen(false)} />

      {children}

      <Footer />
      <ScrollTopButton />
    </AuthProvider>
  );
}

export default RootLayoutClient;