import type { ReactNode, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import {
  fieldControlClass,
  fieldErrorClass,
  fieldIconLeftClass,
  fieldIconRightClass,
  fieldLabelClass,
} from "./field";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  leftIcon?: ReactNode;
  children: ReactNode;
};

export function Select({
  label,
  error,
  leftIcon,
  className = "",
  id,
  children,
  ...props
}: SelectProps) {
  const selectId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className={fieldLabelClass}>
        {label}
      </label>
      <div className="relative">
        {leftIcon ? <span className={fieldIconLeftClass}>{leftIcon}</span> : null}
        <select
          id={selectId}
          className={fieldControlClass(
            !!error,
            `appearance-none py-2 ${leftIcon ? "pl-10" : "pl-3"} pr-9 ${className}`
          )}
          aria-invalid={!!error}
          {...props}
        >
          {children}
        </select>
        <span className={fieldIconRightClass}>
          <ChevronDown size={16} />
        </span>
      </div>
      {error ? <p className={fieldErrorClass}>{error}</p> : null}
    </div>
  );
}
