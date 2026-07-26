type DividerProps = {
  label?: string;
  className?: string;
};

export function Divider({ label = "or", className = "" }: DividerProps) {
  return (
    <div
      className={`flex items-center gap-3 text-sm text-[#94a3b8] ${className}`}
    >
      <span className="h-px flex-1 bg-[#e2e8f0]" />
      {label}
      <span className="h-px flex-1 bg-[#e2e8f0]" />
    </div>
  );
}
