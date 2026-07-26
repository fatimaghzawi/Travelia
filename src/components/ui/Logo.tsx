type LogoProps = {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
};

const SIZES = {
  sm: "w-[140px] max-h-9",
  md: "w-[180px] max-h-11",
  lg: "w-[220px] max-h-14",
  xl: "w-[280px] sm:w-[320px] max-h-16 sm:max-h-[4.75rem]",
} as const;

/** Brand mark from /public/images/logo.png (full color — no invert). */
export function Logo({ className = "", size = "md" }: LogoProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo.png"
        alt="Travelia"
        className={`${SIZES[size]} h-auto object-contain`}
      />
    </div>
  );
}

/** @deprecated Prefer `Logo` — kept as alias for clarity in brand contexts. */
export const TraveliaLogo = Logo;
