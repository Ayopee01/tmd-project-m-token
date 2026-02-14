import Image from "next/image";
import Link from "next/link";
import Logo from "public/logo.png"

function Footer() {
  return (
    <section>
      <div className='flex flex-col items-center bg-gray-100 py-8'>
        {/* Logo */}
        <div className="mb-8">
          <Link href="/">
            <Image
              src={Logo}
              alt="Thai Meteorological Department"
              width={100}
              height={100}
              className="object-contain h-9 w-auto"
              priority={false}
            />
          </Link>
        </div>
        {/* Menu */}
        <div className='flex flex-col flex-wrap gap-4 justify-center items-center text-gray-700 text-xs font-medium sm:flex-row '>
          <Link href="/landing/daily">พยากรณ์อากาศประจำวัน</Link>
          <Link href="/landing/map">แผนที่อากาศพื้นผิว</Link>
          <Link href="/landing/week">สรุปลักษณะอากาศรายสัปดาห์</Link>
          <Link href="/landing/monthly">สรุปลักษณะอากาศรายเดือน</Link>
          <Link href="/landing/agroforecast">พยากรณ์อากาศเพื่อการเกษตรราย 7 วัน</Link>
        </div>
      </div>
      {/* Copyright */}
      <div className='bg-emerald-600 text-gray-100 text-center text-xs font-light py-2'>
        <h2>© 2026 Thai Meteorological Department</h2>
      </div>
    </section>
  )
}

export default Footer