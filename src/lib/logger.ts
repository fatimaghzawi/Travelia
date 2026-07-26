/**
 * Winston logger — fully configured in Step 7.
 * Stub keeps imports working until then.
 */
export const logger = {
  info: (...args: unknown[]) => console.log("[info]", ...args),
  warn: (...args: unknown[]) => console.warn("[warn]", ...args),
  error: (...args: unknown[]) => console.error("[error]", ...args),
  debug: (...args: unknown[]) => console.debug("[debug]", ...args),
};
