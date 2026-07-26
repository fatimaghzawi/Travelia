import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db/mongoose";

const STATE_LABEL: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

/**
 * Liveness/readiness probe. Production responses omit host/db name.
 */
export async function GET() {
  const isProd = process.env.NODE_ENV === "production";
  try {
    await connectDB();

    const readyState = mongoose.connection.readyState;
    const connected = readyState === 1;

    return NextResponse.json(
      {
        success: connected,
        message: connected ? "OK" : "Database not ready",
        data: {
          status: connected ? "healthy" : "unhealthy",
          database: STATE_LABEL[readyState] ?? "unknown",
          ...(isProd
            ? {}
            : {
                readyState,
                host: mongoose.connection.host || null,
                name: mongoose.connection.name || null,
              }),
        },
      },
      { status: connected ? 200 : 503 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Service unavailable",
        data: {
          status: "unhealthy",
          database: "disconnected",
          error:
            !isProd && error instanceof Error ? error.message : undefined,
        },
      },
      { status: 503 }
    );
  }
}
