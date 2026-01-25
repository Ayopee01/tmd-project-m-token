import './globals.css';
import React, { Suspense } from 'react';

import Navbar from '@/app/components/Navbar';
import AuthBootstrap from '@/app/components/AuthBootstrap';
import { AuthProvider } from '@/app/hooks/auth-hook';


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <AuthProvider>
          <Navbar />
          <Suspense fallback={null}>
            <AuthBootstrap />
          </Suspense>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
