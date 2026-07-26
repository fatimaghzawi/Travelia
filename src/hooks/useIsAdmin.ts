"use client";

import { ROLES } from "@/lib/constants/roles";
import { useCurrentUser } from "./useCurrentUser";

export function useIsAdmin() {
  const { user, isLoading, isAuthenticated } = useCurrentUser();
  return {
    isAdmin: isAuthenticated && user?.role === ROLES.ADMIN,
    isLoading,
  };
}
