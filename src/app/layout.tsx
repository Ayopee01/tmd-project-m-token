// app/layout.tsx
import "./globals.css";
import LayoutClient from "./layout-client";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}
