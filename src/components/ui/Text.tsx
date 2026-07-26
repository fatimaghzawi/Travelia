import type { HTMLAttributes, ReactNode } from "react";

type TextProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
  as?: "p" | "span";
};

export function Text({ children, as: Tag = "p", className = "", ...props }: TextProps) {
  return (
    <Tag className={`text-base text-zinc-700 ${className}`} {...props}>
      {children}
    </Tag>
  );
}
