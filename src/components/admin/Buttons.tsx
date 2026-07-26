"use client";

import { Search } from "lucide-react";

export function PrimaryButton({
  className = "",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  className = "",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-muted disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({
  className = "",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink-soft focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
      />
    </div>
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
