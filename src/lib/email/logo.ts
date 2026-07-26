import { readFileSync, existsSync } from "fs";
import { join } from "path";

let cachedLogoDataUri: string | null = null;

function loadLogoDataUri(): string | null {
  if (cachedLogoDataUri) return cachedLogoDataUri;

  const logoPath = join(process.cwd(), "public", "images", "logo.png");
  if (!existsSync(logoPath)) return null;

  const base64 = readFileSync(logoPath).toString("base64");
  cachedLogoDataUri = `data:image/png;base64,${base64}`;
  return cachedLogoDataUri;
}

/** Public URL override, otherwise inline base64. Returns null if no logo is available (emails still send, just without the logo). */
export function getLogoImageSrc(): string | null {
  if (process.env.EMAIL_LOGO_URL) return process.env.EMAIL_LOGO_URL;
  return loadLogoDataUri();
}
