import { NextResponse } from "next/server";

export function ok<T>(data: T, message = "Success", meta?: Record<string, unknown>) {
  return NextResponse.json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  });
}

export function fail(
  message: string,
  status = 400,
  code?: string,
  errors?: unknown[]
) {
  return NextResponse.json(
    {
      success: false,
      message,
      ...(code ? { code } : {}),
      ...(errors ? { errors } : {}),
    },
    { status }
  );
}
