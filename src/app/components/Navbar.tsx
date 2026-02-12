'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { FaUserCircle } from 'react-icons/fa';

import { BurgerIcon } from '@/app/components/Icons';
import { useAuth } from '@/app/hooks/auth-hook';

type Props = {
  onOpenMenu: () => void;
};

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(href + '/');
}

function Navbar({ onOpenMenu }: Props) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();

  // sticky 
  return (
    <nav className="top-0 z-30 border-b border-gray-100 bg-white backdrop-blur shadow-lg xl:sticky ">
      <div className="flex h-18 w-full items-center justify-between px-4 md:h-22">
        {/* Left: Brand/Logo */}
        <Link href="/" className="flex items-center gap-3 h-full">
          <div className="relative h-full w-36 sm:w-40 md:w-42">
            <Image
              src="/test2/logo.png"
              alt="Logo"
              fill
              priority
              className="object-contain"
            />
          </div>
        </Link>

        {/* Center: Desktop menu */}
        <div className="hidden items-center gap-8 xl:flex">
          <Link
            href="/landing/daily"
            className={`group relative px-1 py-2 font-normal text-base leading-6 tracking-normal transition-colors text-gray-900`}
          >
            พยากรณ์อากาศประจำวัน
            <span
              className={`absolute left-0 -bottom-3 h-[4px] w-full origin-left bg-emerald-600
              transition-transform duration-500 ease-out
              ${isActivePath(pathname, "/landing/daily")
                  ? "scale-x-100"
                  : "scale-x-0 group-hover:scale-x-100"
                }`}
            />
          </Link>

          <Link
            href="/landing/map"
            className={`group relative px-1 py-2 font-normal text-base leading-6 tracking-normal transition-colors text-gray-900`}
          >
            แผนที่อากาศพื้นผิว
            <span
              className={`absolute left-0 -bottom-3 h-[4px] w-full origin-left rounded-full bg-emerald-600
              transition-transform duration-500 ease-out
              ${isActivePath(pathname, "/landing/map")
                  ? "scale-x-100"
                  : "scale-x-0 group-hover:scale-x-100"
                }`}
            />
          </Link>

          <Link
            href="/landing/week"
            className={`group relative px-1 py-2 font-normal text-base leading-6 tracking-normal transition-colors text-gray-900`}
          >
            สรุปลักษณะอากาศรายสัปดาห์
            <span
              className={`absolute left-0 -bottom-3 h-[4px] w-full origin-left rounded-full bg-emerald-600
              transition-transform duration-500 ease-out
              ${isActivePath(pathname, "/landing/week")
                  ? "scale-x-100"
                  : "scale-x-0 group-hover:scale-x-100"
                }`}
            />
          </Link>

          <Link
            href="/landing/monthly"
            className={`group relative px-1 py-2 font-normal text-base leading-6 tracking-normal transition-colors text-gray-900`}
          >
            สรุปลักษณะอากาศรายเดือน
            <span
              className={`absolute left-0 -bottom-3 h-[4px] w-full origin-left rounded-full bg-emerald-600
              transition-transform duration-500 ease-out
              ${isActivePath(pathname, "/landing/monthly")
                  ? "scale-x-100"
                  : "scale-x-0 group-hover:scale-x-100"
                }`}
            />
          </Link>

          <Link
            href="/landing/agroforecast"
            className={`group relative px-1 py-2 font-normal text-base leading-6 tracking-normal transition-colors text-gray-900`}
          >
            พยากรณ์อากาศเพื่อการเกษตรราย 7 วัน
            <span
              className={`absolute left-0 -bottom-3 h-[4px] w-full origin-left rounded-full bg-emerald-600
              transition-transform duration-500 ease-out
              ${isActivePath(pathname, "/landing/agroforecast")
                  ? "scale-x-100"
                  : "scale-x-0 group-hover:scale-x-100"
                }`}
            />
          </Link>
        </div>
        
        {/* Right: User + Mobile hamburger */}
        <div className="flex items-center gap-3">
          {/* ✅ User (ขวาสุด) */}
          <div className="hidden xl:flex items-center gap-2 rounded-full border border-gray-200 bg-white/70 px-3 py-2 text-sm text-gray-700 shadow-sm dark:border-gray-700">
            <FaUserCircle className="h-5 w-5" />
            <span className="max-w-[220px] truncate font-medium">
              {loading ? '...' : fullName || 'ผู้ใช้'}
            </span>
          </div>

          <button
            className="cursor-pointer inline-flex h-11 w-11 items-center justify-center rounded-full xl:hidden"
            onClick={onOpenMenu}
            aria-label="Open Menu"
            type="button"
          >
            <BurgerIcon className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-gray-500 hover:text-gray-700 transition duration-150" />
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;