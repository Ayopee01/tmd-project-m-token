// app/layout.tsx
import "./globals.css";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import LayoutClient from "./layout-client";
import Script from "next/script";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoThai = Noto_Sans_Thai({
  subsets: ["thai"],
  variable: "--font-thai",
  weight: ["400", "700"],
  display: "swap",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${inter.variable} ${notoThai.variable} antialiased`}>
        <Script
          src="https://czp.dga.or.th/cportal/sdk/iu/v4/sdk.js"
          strategy="afterInteractive"
        />
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}
