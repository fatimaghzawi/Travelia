import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: "teal" | "navy" | "amber" | "rose";
}

const tones = {
  teal: "bg-teal-50 text-teal-600",
  navy: "bg-navy-900/5 text-navy-900",
  amber: "bg-amber-500/10 text-amber-500",
  rose: "bg-rose-500/10 text-rose-500",
};

export function StatCard({ label, value, icon: Icon, hint, tone = "teal" }: StatCardProps) {
  return (
    <div className="admin-panel flex items-center gap-4 p-5">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-ink-muted">{label}</p>
        <p className="truncate text-2xl font-semibold text-ink">{value}</p>
        {hint ? <p className="text-xs text-ink-soft">{hint}</p> : null}
      </div>
    </div>
  );
}
