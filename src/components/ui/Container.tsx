import type { HTMLAttributes, ReactNode } from "react";

type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function Container({ children, className = "", ...props }: ContainerProps) {
  return (
    <div className={`mx-auto w-full max-w-6xl px-4 ${className}`} {...props}>
      {children}
    </div>
  );
}
