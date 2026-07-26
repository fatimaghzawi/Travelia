"use client";

interface FieldWrapperProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, error, hint, required, children, className = "" }: FieldWrapperProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-sm font-medium text-ink">
        {label}
        {required ? <span className="text-rose-500"> *</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-ink-soft">{hint}</p> : null}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}

const baseInputStyles =
  "w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return <input className={`${baseInputStyles} ${className}`} {...rest} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = "", ...rest } = props;
  return <textarea className={`${baseInputStyles} min-h-[100px] resize-y ${className}`} {...rest} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = "", children, ...rest } = props;
  return (
    <select className={`${baseInputStyles} ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-teal-500" : "bg-slate-300"
      }`}
      aria-pressed={checked}
      aria-label={label}
    >
      <span
        className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5.5" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export function MultiSelectChips({
  options,
  selected,
  onChange,
}: {
  options: { id: string; label: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt.id);
        return (
          <button
            type="button"
            key={opt.id}
            onClick={() => toggle(opt.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "border-teal-500 bg-teal-50 text-teal-700"
                : "border-border bg-surface text-ink-muted hover:border-teal-300"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
      {options.length === 0 ? (
        <p className="text-xs text-ink-soft">Nothing to select yet.</p>
      ) : null}
    </div>
  );
}
