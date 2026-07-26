import type { ReactNode } from "react";
import { CheckCircle2, Info } from "lucide-react";

type AlertVariant = "error" | "success" | "info";

type AlertProps = {
  children: ReactNode;
  variant?: AlertVariant;
  className?: string;
  /** Show a leading icon for info/success callouts. */
  withIcon?: boolean;
};

const STYLES: Record<AlertVariant, string> = {
  error: "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700",
  success:
    "rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-[#127E83]",
  info: "rounded-xl border border-[#34BDAF]/50 bg-[#E8F8F6] px-3 py-3 text-sm text-[#0F5C5A]",
};

export function Alert({
  children,
  variant = "error",
  className = "",
  withIcon = false,
}: AlertProps) {
  const role = variant === "error" ? "alert" : "status";
  const showIcon = withIcon && variant !== "error";

  if (showIcon) {
    const Icon = variant === "success" ? CheckCircle2 : Info;
    return (
      <div className={`flex gap-2.5 ${STYLES[variant]} ${className}`} role={role}>
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[#127E83]" />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    );
  }

  return (
    <p className={`${STYLES[variant]} ${className}`} role={role}>
      {children}
    </p>
  );
}
