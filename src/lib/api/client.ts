"use client";

import type { ApiResponse } from "@/types/api";

export class ApiClientError extends Error {
  status: number;
  code?: string;
  errors?: unknown[];

  constructor(message: string, status: number, code?: string, errors?: unknown[]) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

async function request<T>(
  path: string,
  init?: RequestInit & { query?: Record<string, string | number | boolean | undefined> }
): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const { query, ...rest } = init ?? {};
  let url = path.startsWith("http") ? path : `/api${path}`;

  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        params.set(key, String(value));
      }
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const isFormData = typeof FormData !== "undefined" && rest.body instanceof FormData;

  const response = await fetch(url, {
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(rest.headers ?? {}),
    },
    ...rest,
  });

  const json = (await response.json()) as ApiResponse<T>;

  if (!json.success) {
    throw new ApiClientError(json.message, response.status, json.code, json.errors);
  }

  return { data: json.data, meta: json.meta };
}

export const api = {
  get: <T>(path: string, query?: Record<string, string | number | boolean | undefined>) =>
    request<T>(path, { method: "GET", query }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, file: File, folder?: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (folder) formData.append("folder", folder);
    return request<T>(path, { method: "POST", body: formData });
  },
};
