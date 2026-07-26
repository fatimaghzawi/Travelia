import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

/**
 * Edge middleware — edge-safe authConfig only (no Mongoose).
 * Scoped to auth-gated surfaces + journal media rewrite.
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/uploads/journals/")) {
    const parts = pathname.split("/").filter(Boolean);
    const tripId = parts[2];
    const filename = parts[3];
    if (!tripId || !filename || parts.length !== 4) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    const url = req.nextUrl.clone();
    url.pathname = `/api/media/journals/${tripId}/${filename}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/uploads/journals/:path*",
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/trips/:path*",
    "/api/bookings/:path*",
    "/api/payments/:path*",
    "/api/profile/:path*",
    "/api/favorites/:path*",
    "/api/checklists/:path*",
    "/api/expenses/:path*",
    "/api/notifications/:path*",
    "/api/visited/:path*",
    "/api/media/:path*",
    "/api/admin/:path*",
  ],
};
