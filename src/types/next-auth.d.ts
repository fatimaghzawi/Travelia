import type { DefaultSession } from "next-auth";
import type { Role } from "@/lib/constants/roles";
import type { UserStatus } from "@/models/user.model";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      provider: string;
      emailVerified: boolean;
      status: UserStatus;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    provider: string;
    emailVerified: boolean;
    status: UserStatus;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    provider: string;
    emailVerified: boolean;
    status: UserStatus;
    /** Epoch ms — used to throttle DB role/status re-sync */
    lastSyncedAt?: number;
  }
}
