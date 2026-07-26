type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const toneStyles: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-ink-muted",
  success: "bg-teal-50 text-teal-700",
  warning: "bg-amber-500/10 text-amber-500",
  danger: "bg-rose-500/10 text-rose-500",
  info: "bg-sky-500/10 text-sky-500",
};

const statusToneMap: Record<string, BadgeTone> = {
  active: "success",
  verified: "success",
  confirmed: "success",
  completed: "success",
  paid: "success",
  approved: "success",
  published: "success",

  pending: "warning",
  processing: "warning",
  unverified: "neutral",

  inactive: "neutral",
  cancelled: "danger",
  rejected: "danger",
  failed: "danger",
  blocked: "danger",
  refunded: "info",
};

export function Badge({ children, tone }: { children: React.ReactNode; tone?: BadgeTone }) {
  const resolvedTone =
    tone ?? (typeof children === "string" ? statusToneMap[children.toLowerCase()] : undefined) ?? "neutral";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${toneStyles[resolvedTone]}`}
    >
      {children}
    </span>
  );
}
