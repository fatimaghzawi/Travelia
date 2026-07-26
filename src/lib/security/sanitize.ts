import xss from "xss";

function sanitizeString(value: string): string {
  return xss(value.trim(), {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ["script", "style"],
  });
}

/**
 * Deep-sanitize user input: strip XSS and reject Mongo operator injection keys.
 */
export function sanitizeInput<T>(input: T): T {
  return sanitizeValue(input) as T;
}

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (key.startsWith("$") || key.includes(".")) {
        continue;
      }
      result[key] = sanitizeValue(nested);
    }
    return result;
  }

  return value;
}
