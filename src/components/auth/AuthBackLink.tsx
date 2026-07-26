import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type AuthBackLinkProps = {
  href?: string;
  children?: string;
  className?: string;
};

export function AuthBackLink({
  href = "/login",
  children = "Back to Sign in",
  className = "",
}: AuthBackLinkProps) {
  return (
    <p className={`mt-5 text-center text-sm ${className}`}>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 font-medium text-[#51A5D6] hover:underline"
      >
        <ArrowLeft size={16} />
        {children}
      </Link>
    </p>
  );
}
