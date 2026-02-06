// app/components/Footer.tsx (หรือ src/app/components/Footer.tsx)
import Image from "next/image";
import Link from "next/link";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type FooterLink = {
  href: string;
  label: string;
};

function withBasePath(href: string) {
  if (!BASE_PATH) return href;
  if (href.startsWith("http")) return href;
  if (href.startsWith(BASE_PATH + "/")) return href;
  if (href.startsWith("/")) return `${BASE_PATH}${href}`;
  return `${BASE_PATH}/${href}`;
}

type FooterProps = {
  year?: number;
  logoSrc?: string;
  links?: FooterLink[];
};

export default function Footer({
  year = new Date().getFullYear(),
  logoSrc = "/test2/logo.png", 
  links = [
    { href: "/landing/daily", label: "พยากรณ์อากาศประจำวัน" },
    { href: "/landing/surface", label: "แผนที่อากาศผิวพื้น" },
    { href: "/landing/weekly", label: "สรุปอากาศรายสัปดาห์" },
    { href: "/landing/monthly", label: "สรุปอากาศรายเดือน" },
    { href: "/landing/agri", label: "อุตุนิยมวิทยาการเกษตร" },
  ],
}: FooterProps) {
  return (
    <footer className="mt-10">
      <div className="border-t border-gray-200 bg-white">
        {/* Top */}
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="flex flex-col items-center text-center">
            {/* Logo + Name */}
            <div className="flex items-center gap-3">
              <Image
                src={withBasePath(logoSrc)}
                alt="Thai Meteorological Department"
                width={100}
                height={100}
                className="object-contain"
                priority={false}
              />
            </div>

            {/* Nav */}
            <nav className="mt-7 w-full">
              <ul className="flex flex-col items-center gap-7 text-[15px] font-medium text-gray-900 sm:flex-row sm:justify-center sm:gap-10">
                {links.map((it) => (
                  <li key={it.href}>
                    <Link
                      href={withBasePath(it.href)}
                      className="transition-colors hover:text-emerald-700"
                    >
                      {it.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="bg-emerald-700">
          <div className="mx-auto max-w-7xl px-4 py-4 text-center text-sm font-medium text-white">
            © {year} Thai Meteorological Department
          </div>
        </div>
      </div>
    </footer>
  );
}
