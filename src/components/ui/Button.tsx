import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
};

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const variants = {
    primary: "bg-[#127E83] text-white hover:bg-[#0f6b6f]",
    secondary: "border border-[#127E83] bg-white text-[#127E83] hover:bg-[#F4F6F8]",
    danger: "bg-[#E4574A] text-white hover:bg-[#c9473b]",
  };

  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
