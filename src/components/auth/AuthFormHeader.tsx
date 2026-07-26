import type { ReactNode } from "react";
import { Logo } from "@/components/ui/Logo";

type AuthFormHeaderProps = {
  title: string;
  subtitle?: string;
  logoSize?: "sm" | "md" | "lg" | "xl";
  align?: "left" | "center";
  /** Content between logo and title (e.g. stepper). */
  belowLogo?: ReactNode;
};

export function AuthFormHeader({
  title,
  subtitle,
  logoSize = "md",
  align = "left",
  belowLogo,
}: AuthFormHeaderProps) {
  const alignClass = align === "center" ? "text-center" : "";

  return (
    <>
      <div className={`flex justify-center ${belowLogo ? "mb-3 sm:mb-4" : "mb-4"}`}>
        <Logo size={logoSize} />
      </div>
      {belowLogo}
      <h1
        className={`text-2xl font-bold leading-tight text-[#0f172a] ${alignClass}`}
      >
        {title}
      </h1>
      {subtitle ? (
        <p className={`mt-1 text-sm text-[#64748b] ${alignClass}`}>{subtitle}</p>
      ) : null}
    </>
  );
}
