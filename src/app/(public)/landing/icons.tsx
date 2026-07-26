import type { SVGProps } from "react";

/**
 * Small line-icon set used across the landing page.
 * Kept local (no extra dependency) since lucide-react isn't in package.json yet.
 * All icons inherit color via `currentColor`, so control color with text-* classes.
 */

export function MapPinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

export function PassportIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} {...props}>
      <rect x="3.5" y="2.5" width="13" height="17" rx="1.8" />
      <circle cx="10" cy="9" r="2.6" />
      <path d="M7 15.2c0-1.6 1.3-2.4 3-2.4s3 .8 3 2.4" />
      <path d="M6.5 5.5h7M6.5 17h7" />
      <circle cx="18" cy="17" r="4.5" fill="currentColor" stroke="none" opacity={0.12} />
      <path d="m16.3 17 1.2 1.2 2.3-2.4" stroke="currentColor" strokeWidth={1.8} />
    </svg>
  );
}

export function SuitcaseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </svg>
  );
}

export function MountainIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="m3 19 6.5-11L13 14l2.5-4L21 19Z" />
    </svg>
  );
}

export function LoungeChairIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="17" cy="5" r="2" />
      <path d="M3 15h9l7 5" />
      <path d="M4 15 9 4h3l-3 11" />
      <path d="M6 20h4" />
    </svg>
  );
}

export function HeartsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M12 20s-6-4.1-6-8.3A3.7 3.7 0 0 1 12 9a3.7 3.7 0 0 1 6 2.7C18 15.9 12 20 12 20Z" />
    </svg>
  );
}

export function LeafIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M5 20c9 0 14-5 14-14-9 0-14 5-14 14Z" />
      <path d="M5 20c0-6 3-9 9-11" />
    </svg>
  );
}

export function ColumnsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M3 21h18" />
      <path d="M4 21V10M9 21V10M15 21V10M20 21V10" />
      <path d="M2 10 12 4l10 6" />
    </svg>
  );
}

export function DiamondIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M6 8h12l3 4-9 9-9-9Z" />
      <path d="M6 8 9 3h6l3 5" />
      <path d="M3 12h18" />
    </svg>
  );
}

export function CalendarCheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
      <path d="m8.5 14 2 2 4-4" />
    </svg>
  );
}

export function ChecklistIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="m8 8 1.5 1.5L12 7" />
      <path d="M8 14h8M8 18h8" />
    </svg>
  );
}

export function WalletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3" />
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M16 13.5h2" />
    </svg>
  );
}

export function BeachIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <path d="M3 21c4-3 14-3 18 0" />
      <path d="M12 21c0-6-2-9-2-9" />
      <path d="M12 12s-7-1-7-7c6 0 7 7 7 7Z" />
      <path d="M12 12s7-1 7-7c-6 0-7 7-7 7Z" />
    </svg>
  );
}

export function FamilyIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="8" cy="6" r="2.2" />
      <circle cx="16" cy="6" r="2.2" />
      <path d="M3.5 19c0-3 2-5.2 4.5-5.2s4.5 2.2 4.5 5.2" />
      <path d="M11.5 19c0-3 2-5.2 4.5-5.2s4.5 2.2 4.5 5.2" />
    </svg>
  );
}

export function SoloIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} {...props}>
      <circle cx="12" cy="7" r="3.2" />
      <path d="M5 20c0-4 3-6.5 7-6.5s7 2.5 7 6.5" />
    </svg>
  );
}


export function StarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z" />
    </svg>
  );
}