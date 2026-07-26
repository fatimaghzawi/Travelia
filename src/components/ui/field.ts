/** Shared field chrome used by Input, PasswordInput, Select, Textarea. */
export const fieldLabelClass = "text-sm font-medium text-[#012A3E]";

export const fieldErrorClass = "text-sm text-[#E4574A]";

export const fieldControlBase =
  "min-h-10 w-full rounded-lg border border-[#CBD2D9] bg-white text-sm text-[#002642] outline-none transition placeholder:text-[#94A3B8] focus:border-[#127E83] focus:ring-2 focus:ring-[#127E83]/25";

export function fieldControlClass(error?: boolean, extra = "") {
  return `${fieldControlBase} ${error ? "border-[#E4574A]" : ""} ${extra}`.trim();
}

export const fieldIconLeftClass =
  "pointer-events-none absolute inset-y-0 left-3 flex items-center text-[#67717A]";

export const fieldIconRightClass =
  "pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#67717A]";
