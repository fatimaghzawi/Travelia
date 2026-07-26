"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";

export function SignOutButton({ className = "" }: { className?: string }) {
  return (
    <Button
      type="button"
      variant="secondary"
      className={className}
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      Log out
    </Button>
  );
}
