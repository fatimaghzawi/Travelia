"use client";

import type { LucideIcon } from "lucide-react";
import { Globe2, ScanFace, ShieldCheck } from "lucide-react";

interface Stage {
  label: string;
  count: number;
  percent: number;
  icon: LucideIcon;
  ringColor: string;
  bg: string;
}

export function VerificationFunnel({
  unverified,
  pending,
  verified,
}: {
  unverified: number;
  pending: number;
  verified: number;
}) {
  const total = unverified + pending + verified || 1;
  const stages: Stage[] = [
    {
      label: "Unverified",
      count: unverified,
      percent: Math.round((unverified / total) * 100),
      icon: Globe2,
      ringColor: "#51A5D6",
      bg: "bg-sky-500/10 text-sky-500",
    },
    {
      label: "Pending",
      count: pending,
      percent: Math.round((pending / total) * 100),
      icon: ScanFace,
      ringColor: "#d1e8ea",
      bg: "bg-surface-muted text-ink-muted",
    },
    {
      label: "Verified",
      count: verified,
      percent: Math.round((verified / total) * 100),
      icon: ShieldCheck,
      ringColor: "#127E83",
      bg: "bg-teal-50 text-teal-600",
    },
  ];

  return (
    <div className="space-y-0">
      {stages.map((stage, i) => {
        const Icon = stage.icon;
        const isLast = i === stages.length - 1;
        return (
          <div key={stage.label} className="relative flex items-center gap-4 pb-6 last:pb-0">
            {!isLast ? (
              <span
                className="absolute left-[27px] top-[56px] h-[calc(100%-40px)] border-l-2 border-dashed"
                style={{ borderColor: "var(--color-border)" }}
              />
            ) : null}
            <span
              className={`z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full ring-4 ring-surface ${stage.bg}`}
            >
              <Icon className="h-6 w-6" />
            </span>
            <div className="flex flex-1 items-center justify-between">
              <div>
                <p className="text-sm text-ink-muted">{stage.label}</p>
                <p className="text-2xl font-semibold text-ink">{stage.count.toLocaleString()}</p>
              </div>
              <span className="text-sm font-medium text-ink-soft">{stage.percent}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
