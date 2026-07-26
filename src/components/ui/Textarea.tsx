import type { TextareaHTMLAttributes } from "react";
import {
  fieldControlClass,
  fieldErrorClass,
  fieldLabelClass,
} from "./field";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  /** Optional character counter (e.g. maxLength). */
  counter?: { current: number; max: number };
};

export function Textarea({
  label,
  error,
  counter,
  className = "",
  id,
  ...props
}: TextareaProps) {
  const areaId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label htmlFor={areaId} className={fieldLabelClass}>
          {label}
        </label>
      ) : null}
      <div className="relative">
        <textarea
          id={areaId}
          className={fieldControlClass(
            !!error,
            `min-h-0 px-3 py-2 ${counter ? "pb-6" : ""} ${className}`
          )}
          aria-invalid={!!error}
          {...props}
        />
        {counter ? (
          <span className="pointer-events-none absolute bottom-1.5 right-3 text-xs text-[#67717A]">
            {counter.current} / {counter.max}
          </span>
        ) : null}
      </div>
      {error ? <p className={fieldErrorClass}>{error}</p> : null}
    </div>
  );
}
