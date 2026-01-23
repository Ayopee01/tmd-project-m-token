import React from "react";

type IconProps = { className?: string };

export function BurgerIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronDown({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 3v10m0 0l4-4m-4 4l-4-4M5 17v3h14v-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Droplet({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 2s6 7 6 12a6 6 0 1 1-12 0C6 9 12 2 12 2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export function ArrowDown({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 5v14m0 0l-5-5m5 5l5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ArrowUp({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 19V5m0 0l-5 5m5-5l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** simple weather-ish icons */
export function WeatherCloudRain({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M8 15a4 4 0 0 1 0-8 5 5 0 0 1 9.5 1.5A3.5 3.5 0 1 1 18 15H8z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M9 17l-1 2m5-2l-1 2m5-2l-1 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
export function WeatherSun({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z" fill="none" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2M12 20v2M2 12h2M20 12h2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M19.8 4.2l-1.4 1.4M5.6 18.4l-1.4 1.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function WeatherDrop({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 2s6 7 6 12a6 6 0 1 1-12 0C6 9 12 2 12 2z" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
export function WeatherMountain({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M3 20l7-12 4 7 3-5 4 10H3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
export function WeatherWind({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M3 8h10a3 3 0 1 0-3-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 12h14a3 3 0 1 1-3 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M3 16h8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
export function WeatherSnow({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 2v20M4 7l16 10M20 7L4 17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function CloudIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.2 12.2 3.5 3.5 0 0 0 7 18Z" />
    </svg>
  );
}

export function PartlyCloudyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      {/* sun */}
      <path d="M8 6.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
      <path d="M8 2v2M8 15v2M2 9h2M12 9h2M3.2 3.2l1.4 1.4M11.4 13.4l1.4 1.4M12.8 3.2l-1.4 1.4" />
      {/* cloud */}
      <path d="M10 18h8a3.2 3.2 0 0 0 .3-6.38A4.8 4.8 0 0 0 9.7 13.3 2.7 2.7 0 0 0 10 18Z" />
    </svg>
  );
}

export function ThunderIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 15h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6.2 9.2 3.5 3.5 0 0 0 7 15Z" />
      <path d="M12 14l-2 4h3l-1 4 4-6h-3l2-2" />
    </svg>
  );
}

export function FogIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 10h16M6 14h12M5 18h14" />
      <path d="M7 9.5a5 5 0 0 1 10 0" />
    </svg>
  );
}

export function TempMaxIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M10 14a2 2 0 1 0 4 0V6a2 2 0 0 0-4 0v8Z" />
      <path d="M12 3v3" />
      <path d="M8 14h8" />
      <path d="M12 20l-4-4h8l-4 4Z" />
    </svg>
  );
}

export function TempMinIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M10 14a2 2 0 1 0 4 0V6a2 2 0 0 0-4 0v8Z" />
      <path d="M12 21v-3" />
      <path d="M8 14h8" />
      <path d="M12 4l4 4H8l4-4Z" />
    </svg>
  );
}

export function WaveIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 16c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
      <path d="M3 12c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
    </svg>
  );
}

export function NearbyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
      <path d="M12 11.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    </svg>
  );
}
