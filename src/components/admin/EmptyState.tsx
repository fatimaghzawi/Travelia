import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-muted px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-ink-soft shadow-sm">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-2 text-sm font-medium text-ink">{title}</p>
      {description ? <p className="max-w-sm text-sm text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
