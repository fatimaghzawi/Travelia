"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  fieldControlClass,
  fieldErrorClass,
  fieldIconLeftClass,
  fieldLabelClass,
} from "./field";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  error?: string;
  leftIcon?: ReactNode;
};

export function PasswordInput({
  label,
  error,
  leftIcon,
  className = "",
  id,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className={fieldLabelClass}>
        {label}
      </label>
      <div className="relative">
        {leftIcon ? <span className={fieldIconLeftClass}>{leftIcon}</span> : null}
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          className={fieldControlClass(
            !!error,
            `${leftIcon ? "pl-10" : "pl-3"} pr-11 py-2 ${className}`
          )}
          aria-invalid={!!error}
          aria-describedby={error && inputId ? `${inputId}-error` : undefined}
          {...props}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-2 flex items-center rounded-md px-2 text-[#67717A] hover:text-[#012A3E]"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
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
