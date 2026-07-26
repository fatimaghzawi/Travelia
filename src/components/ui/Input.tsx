import type { InputHTMLAttributes, ReactNode } from "react";
import {
  fieldControlClass,
  fieldErrorClass,
  fieldIconLeftClass,
  fieldLabelClass,
} from "./field";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
};

export function Input({
  label,
  error,
  leftIcon,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={inputId} className={fieldLabelClass}>
          {label}
        </label>
      ) : null}
      <div className="relative">
        {leftIcon ? <span className={fieldIconLeftClass}>{leftIcon}</span> : null}
        <input
          id={inputId}
          className={fieldControlClass(
            !!error,
            `${leftIcon ? "pl-10" : "px-3"} pr-3 py-2 ${className}`
          )}
          aria-invalid={!!error}
          aria-describedby={error && inputId ? `${inputId}-error` : undefined}
          {...props}
        />
      </div>
      {error ? (
        <p
          id={inputId ? `${inputId}-error` : undefined}
          className={fieldErrorClass}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
