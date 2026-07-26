"use client";

import { ROLES } from "@/lib/constants/roles";
import { useCurrentUser } from "./useCurrentUser";

export function useIsTraveler() {
  const { user, isLoading, isAuthenticated } = useCurrentUser();
  return {
    isTraveler:
      isAuthenticated &&
      (user?.role === ROLES.TRAVELER || user?.role === ROLES.ADMIN),
    isLoading,
  };
}
