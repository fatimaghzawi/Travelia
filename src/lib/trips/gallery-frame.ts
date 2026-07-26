export type GalleryFrameId =
  | "none"
  | "fieldnote"
  | "atlas"
  | "stamp"
  | "coast"
  | "skyline"
  | "summit";

export type GalleryFrameMeta = {
  tripTitle?: string | null;
  destinationTitle?: string | null;
  city?: string | null;
  country?: string | null;
  categorySlug?: string | null;
  dayLabel?: string | null;
};

export const GALLERY_FRAMES: {
  id: GalleryFrameId;
  label: string;
  swatch: string;
  hint: string;
}[] = [
  { id: "none", label: "Clean", swatch: "#1a1a1a", hint: "No border" },
  {
    id: "fieldnote",
    label: "Field note",
    swatch: "#F4FAFB",
    hint: "Paper journal",
  },
  { id: "atlas", label: "Atlas", swatch: "#012A3E", hint: "Map chapter" },
  { id: "stamp", label: "Passport", swatch: "#E4574A", hint: "Entry stamp" },
  { id: "coast", label: "Coast", swatch: "#127E83", hint: "Sea & sand" },
  { id: "skyline", label: "Skyline", swatch: "#002642", hint: "City nights" },
  { id: "summit", label: "Summit", swatch: "#3d5a40", hint: "Peaks & trails" },
];

const NAVY = "#012A3E";
const DEEP = "#002642";
const TEAL = "#127E83";
const CORAL = "#E4574A";
const MINT = "#9aebed";
const SKY = "#51A5D6";
const PAPER = "#F4FAFB";

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load photo"));
    img.src = url;
  });
}

async function tryLoadLogo(): Promise<HTMLImageElement | null> {
  try {
    return await loadImage("/images/logo.png");
  } catch {
    return null;
  }
}

function drawHairlineRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  width = 1
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.strokeRect(x + width / 2, y + width / 2, w - width, h - width);
}

function drawCornerBrackets(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  len: number,
  color: string,
  line = 2
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = line;
  ctx.lineCap = "square";
  ctx.beginPath();
  ctx.moveTo(x, y + len);
  ctx.lineTo(x, y);
  ctx.lineTo(x + len, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + w - len, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + len);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y + h - len);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + len, y + h);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + w - len, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - len);
  ctx.stroke();
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Pick a Travelia frame that matches the destination vibe. */
export function suggestFrameForDestination(
  categorySlug?: string | null,
  city?: string | null,
  country?: string | null
): GalleryFrameId {
  const slug = (categorySlug || "").toLowerCase();
  const place = `${city || ""} ${country || ""}`.toLowerCase();

  if (
    /dubai|abu dhabi|singapore|tokyo|new york|beirut|marrakech|kyoto/.test(
      place
    ) ||
    slug === "city"
  ) {
    return "skyline";
  }
  if (
    /banff|alps|himalaya|everest|rockies/.test(place) ||
    slug === "mountain"
  ) {
    return "summit";
  }
  if (slug === "beach" || slug === "island" || /bali|santorini|amalfi|maldives/.test(place)) {
    return "coast";
  }
  if (slug === "cultural") return "stamp";
  if (slug === "nature") return "atlas";
  return "fieldnote";
}

export function destinationBadgeLabel(meta?: GalleryFrameMeta | null): string {
  if (!meta) return "TRAVELIA";
  const city = (meta.city || "").trim();
  const country = (meta.country || "").trim();
  const dest = (meta.destinationTitle || "").trim();
  if (city && country) return `${city.toUpperCase()} · ${country.toUpperCase()}`;
  if (city) return city.toUpperCase();
  if (dest) return dest.toUpperCase();
  if (country) return country.toUpperCase();
  return "TRAVELIA";
}

function drawDestinationBadge(
  ctx: CanvasRenderingContext2D,
  opts: {
    x: number;
    y: number;
    photoW: number;
    label: string;
    tone: "light" | "dark" | "coral" | "mint";
  }
) {
  const { x, y, photoW, label, tone } = opts;
  const fontSize = Math.max(10, Math.round(photoW * 0.018));
  ctx.font = `700 ${fontSize}px ui-monospace, "SF Mono", Menlo, monospace`;
  const textW = ctx.measureText(label).width;
  const padX = Math.max(8, Math.round(photoW * 0.014));
  const padY = Math.max(5, Math.round(photoW * 0.008));
  const badgeW = textW + padX * 2;
  const badgeH = fontSize + padY * 2;

  let fill = NAVY;
  let stroke = MINT;
  let text = MINT;
  if (tone === "light") {
    fill = "rgba(255,255,255,0.92)";
    stroke = TEAL;
    text = NAVY;
  } else if (tone === "coral") {
    fill = "rgba(228,87,74,0.92)";
    stroke = "#fff";
    text = "#fff";
  } else if (tone === "mint") {
    fill = "rgba(154,235,237,0.95)";
    stroke = NAVY;
    text = NAVY;
  }

  ctx.save();
  roundRectPath(ctx, x, y, badgeW, badgeH, badgeH / 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.25;
  ctx.stroke();
  ctx.fillStyle = text;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + padX, y + badgeH / 2 + 0.5);
  ctx.restore();
}

function drawTraveliaMark(
  ctx: CanvasRenderingContext2D,
  logo: HTMLImageElement | null,
  cx: number,
  cy: number,
  photoW: number,
  tone: "light" | "dark" | "mint"
) {
  const brand = "TRAVELIA";
  if (logo) {
    const logoH = Math.max(14, Math.round(photoW * 0.028));
    const ratio = (logo.naturalWidth || 1) / (logo.naturalHeight || 1);
    const logoW = logoH * ratio;
    ctx.globalAlpha = 0.95;
    ctx.drawImage(logo, cx - logoW / 2, cy - logoH / 2, logoW, logoH);
    ctx.globalAlpha = 1;
    return;
  }
  ctx.fillStyle =
    tone === "dark" ? NAVY : tone === "mint" ? MINT : "rgba(255,255,255,0.92)";
  ctx.font = `700 ${Math.max(10, Math.round(photoW * 0.018))}px ui-monospace, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(brand, cx, cy);
}

/**
 * Draw the photo onto a canvas with a Travelia-branded, destination-aware frame.
 */
export async function composeFramedPhoto(
  photoUrl: string,
  frame: GalleryFrameId,
  caption?: string | null,
  meta?: GalleryFrameMeta | null
): Promise<Blob> {
  const [img, logo] = await Promise.all([loadImage(photoUrl), tryLoadLogo()]);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
  const photoW = Math.round(srcW * scale);
  const photoH = Math.round(srcH * scale);

  let padX = 0;
  let padTop = 0;
  let padBottom = 0;
  let bg = NAVY;

  if (frame === "fieldnote") {
    padX = Math.round(photoW * 0.055);
    padTop = Math.round(photoW * 0.08);
    padBottom = Math.round(photoW * 0.16);
    bg = PAPER;
  } else if (frame === "atlas") {
    padX = Math.round(photoW * 0.07);
    padTop = Math.round(photoW * 0.1);
    padBottom = Math.round(photoW * 0.12);
    bg = NAVY;
  } else if (frame === "stamp") {
    padX = Math.round(photoW * 0.08);
    padTop = Math.round(photoW * 0.08);
    padBottom = Math.round(photoW * 0.1);
    bg = "#F8FBFC";
  } else if (frame === "coast") {
    padX = Math.round(photoW * 0.05);
    padTop = Math.round(photoW * 0.06);
    padBottom = Math.round(photoW * 0.15);
    bg = TEAL;
  } else if (frame === "skyline") {
    padX = Math.round(photoW * 0.045);
    padTop = Math.round(photoW * 0.09);
    padBottom = Math.round(photoW * 0.14);
    bg = DEEP;
  } else if (frame === "summit") {
    padX = Math.round(photoW * 0.05);
    padTop = Math.round(photoW * 0.07);
    padBottom = Math.round(photoW * 0.15);
    bg = "#2c3e30";
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, photoW + padX * 2);
  canvas.height = Math.max(1, photoH + padTop + padBottom);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  // Background
  if (frame === "coast") {
    const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    g.addColorStop(0, TEAL);
    g.addColorStop(0.55, "#0f6d71");
    g.addColorStop(1, NAVY);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (frame === "atlas") {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, "#02364d");
    g.addColorStop(1, NAVY);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (frame === "skyline") {
    const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    g.addColorStop(0, DEEP);
    g.addColorStop(0.45, NAVY);
    g.addColorStop(1, "#041820");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // soft sky band
    const sky = ctx.createLinearGradient(0, 0, 0, padTop);
    sky.addColorStop(0, "rgba(81,165,214,0.35)");
    sky.addColorStop(1, "rgba(81,165,214,0)");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, padTop);
  } else if (frame === "summit") {
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, "#4a6741");
    g.addColorStop(0.4, "#2c3e30");
    g.addColorStop(1, NAVY);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const placeBadge = destinationBadgeLabel(meta);
  const label = (
    caption ||
    meta?.tripTitle ||
    meta?.destinationTitle ||
    "Travelia"
  ).slice(0, 42);
  const brand = "TRAVELIA";

  if (frame === "fieldnote") {
    ctx.strokeStyle = "rgba(18,126,131,0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    ctx.strokeStyle = TEAL;
    ctx.lineWidth = Math.max(2, Math.round(padX * 0.12));
    ctx.beginPath();
    ctx.moveTo(padX, Math.round(padTop * 0.55));
    ctx.lineTo(canvas.width - padX, Math.round(padTop * 0.55));
    ctx.stroke();
    ctx.fillStyle = TEAL;
    ctx.font = `700 ${Math.max(9, Math.round(photoW * 0.016))}px ui-monospace, monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(brand, padX, Math.round(padTop * 0.32));
  }

  if (frame === "atlas") {
    const inset = Math.max(6, Math.round(padX * 0.28));
    drawHairlineRect(
      ctx,
      inset,
      inset,
      canvas.width - inset * 2,
      canvas.height - inset * 2,
      MINT,
      1.5
    );
    drawHairlineRect(
      ctx,
      inset + 5,
      inset + 5,
      canvas.width - (inset + 5) * 2,
      canvas.height - (inset + 5) * 2,
      "rgba(154,235,237,0.45)",
      1
    );
    ctx.fillStyle = MINT;
    ctx.font = `600 ${Math.max(11, Math.round(photoW * 0.022))}px ui-monospace, monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(
      "TRAVELIA ATLAS",
      inset + 8,
      Math.round(inset / 2) + Math.round(padTop * 0.22)
    );
  }

  if (frame === "stamp") {
    ctx.fillStyle = NAVY;
    ctx.fillRect(
      Math.round(padX * 0.35),
      Math.round(padTop * 0.35),
      canvas.width - Math.round(padX * 0.7),
      canvas.height - Math.round(padTop * 0.7)
    );
    ctx.fillStyle = PAPER;
    const inner = Math.max(4, Math.round(padX * 0.18));
    ctx.fillRect(
      Math.round(padX * 0.35) + inner,
      Math.round(padTop * 0.35) + inner,
      canvas.width - Math.round(padX * 0.7) - inner * 2,
      canvas.height - Math.round(padTop * 0.7) - inner * 2
    );
    const bracketLen = Math.max(18, Math.round(padX * 0.55));
    drawCornerBrackets(
      ctx,
      padX - Math.round(padX * 0.15),
      padTop - Math.round(padTop * 0.15),
      photoW + Math.round(padX * 0.3),
      photoH + Math.round(padTop * 0.3),
      bracketLen,
      CORAL,
      Math.max(2, Math.round(padX * 0.08))
    );
  }

  if (frame === "coast") {
    const inset = Math.max(4, Math.round(padX * 0.22));
    ctx.fillStyle = NAVY;
    ctx.fillRect(inset, inset, canvas.width - inset * 2, canvas.height - inset * 2);
    ctx.strokeStyle = MINT;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(
      inset + 4,
      inset + 4,
      canvas.width - (inset + 4) * 2,
      canvas.height - (inset + 4) * 2
    );
  }

  if (frame === "skyline") {
    const inset = Math.max(5, Math.round(padX * 0.2));
    drawHairlineRect(
      ctx,
      inset,
      inset,
      canvas.width - inset * 2,
      canvas.height - inset * 2,
      SKY,
      1.5
    );
    // top brand bar
    ctx.fillStyle = "rgba(81,165,214,0.15)";
    ctx.fillRect(inset + 2, inset + 2, canvas.width - (inset + 2) * 2, Math.round(padTop * 0.55));
    ctx.fillStyle = SKY;
    ctx.font = `700 ${Math.max(10, Math.round(photoW * 0.017))}px ui-monospace, monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(
      "TRAVELIA · CITY LOG",
      inset + 10,
      inset + Math.round(padTop * 0.28)
    );
  }

  if (frame === "summit") {
    const inset = Math.max(5, Math.round(padX * 0.22));
    // peak motif line
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const midY = inset + Math.round(padTop * 0.35);
    ctx.moveTo(inset + 8, midY + 8);
    ctx.lineTo(inset + Math.round(photoW * 0.12), midY - 6);
    ctx.lineTo(inset + Math.round(photoW * 0.2), midY + 4);
    ctx.lineTo(inset + Math.round(photoW * 0.28), midY - 10);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = `700 ${Math.max(10, Math.round(photoW * 0.017))}px ui-monospace, monospace`;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(
      "TRAVELIA SUMMIT",
      canvas.width - inset - 10,
      inset + Math.round(padTop * 0.28)
    );
  }

  // Photo
  if (frame !== "none") {
    ctx.fillStyle = "rgba(1,42,62,0.18)";
    ctx.fillRect(padX + 2, padTop + 3, photoW, photoH);
  }
  ctx.drawImage(img, padX, padTop, photoW, photoH);

  // Destination badge on the photo (always when framed)
  if (frame !== "none") {
    const badgeTone =
      frame === "fieldnote" || frame === "stamp"
        ? "light"
        : frame === "coast" || frame === "atlas"
          ? "mint"
          : frame === "summit"
            ? "light"
            : "coral";
    drawDestinationBadge(ctx, {
      x: padX + Math.max(10, Math.round(photoW * 0.03)),
      y: padTop + Math.max(10, Math.round(photoW * 0.03)),
      photoW,
      label: placeBadge,
      tone: badgeTone === "coral" ? "coral" : badgeTone,
    });

    // small Travelia corner chip opposite the badge
    ctx.save();
    const chip = "✈ TRAVELIA";
    const chipSize = Math.max(9, Math.round(photoW * 0.015));
    ctx.font = `700 ${chipSize}px ui-monospace, monospace`;
    const chipW = ctx.measureText(chip).width + 14;
    const chipH = chipSize + 10;
    const chipX = padX + photoW - chipW - Math.max(10, Math.round(photoW * 0.03));
    const chipY = padTop + Math.max(10, Math.round(photoW * 0.03));
    roundRectPath(ctx, chipX, chipY, chipW, chipH, chipH / 2);
    ctx.fillStyle = "rgba(1,42,62,0.72)";
    ctx.fill();
    ctx.fillStyle = MINT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(chip, chipX + chipW / 2, chipY + chipH / 2 + 0.5);
    ctx.restore();
  }

  // Captions / marks
  if (frame === "fieldnote") {
    ctx.fillStyle = NAVY;
    ctx.font = `${Math.max(16, Math.round(photoW * 0.032))}px Georgia, "Times New Roman", serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, canvas.width / 2, padTop + photoH + padBottom * 0.38);
    drawTraveliaMark(
      ctx,
      logo,
      canvas.width / 2,
      padTop + photoH + padBottom * 0.72,
      photoW,
      "dark"
    );
  }

  if (frame === "atlas") {
    ctx.fillStyle = "rgba(154,235,237,0.9)";
    ctx.font = `${Math.max(12, Math.round(photoW * 0.024))}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, canvas.width / 2, padTop + photoH + padBottom * 0.32);
    drawTraveliaMark(
      ctx,
      logo,
      canvas.width / 2,
      padTop + photoH + padBottom * 0.68,
      photoW,
      "mint"
    );
  }

  if (frame === "stamp") {
    ctx.save();
    ctx.translate(canvas.width - padX * 0.55, padTop * 0.55);
    ctx.rotate((-18 * Math.PI) / 180);
    ctx.strokeStyle = CORAL;
    ctx.lineWidth = Math.max(2, Math.round(photoW * 0.004));
    const stampW = Math.max(78, Math.round(photoW * 0.24));
    const stampH = Math.max(30, Math.round(photoW * 0.075));
    ctx.strokeRect(-stampW / 2, -stampH / 2, stampW, stampH);
    ctx.fillStyle = CORAL;
    ctx.font = `700 ${Math.max(10, Math.round(photoW * 0.018))}px ui-monospace, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("ARRIVED", 0, -fontOffset(photoW));
    ctx.font = `600 ${Math.max(8, Math.round(photoW * 0.014))}px ui-monospace, monospace`;
    ctx.fillText(placeBadge.slice(0, 22), 0, fontOffset(photoW) + 2);
    ctx.restore();

    ctx.fillStyle = NAVY;
    ctx.font = `${Math.max(13, Math.round(photoW * 0.022))}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, canvas.width / 2, padTop + photoH + padBottom * 0.45);
    ctx.fillStyle = TEAL;
    ctx.font = `700 ${Math.max(9, Math.round(photoW * 0.015))}px ui-monospace, monospace`;
    ctx.fillText(brand, canvas.width / 2, padTop + photoH + padBottom * 0.78);
  }

  if (frame === "coast" || frame === "skyline" || frame === "summit") {
    ctx.fillStyle = "#ffffff";
    ctx.font = `${Math.max(15, Math.round(photoW * 0.03))}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, canvas.width / 2, padTop + photoH + padBottom * 0.36);
    if (meta?.dayLabel) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = `500 ${Math.max(10, Math.round(photoW * 0.016))}px ui-monospace, monospace`;
      ctx.fillText(
        meta.dayLabel,
        canvas.width / 2,
        padTop + photoH + padBottom * 0.55
      );
    }
    drawTraveliaMark(
      ctx,
      logo,
      canvas.width / 2,
      padTop + photoH + padBottom * 0.78,
      photoW,
      "light"
    );
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Could not export photo"));
        else resolve(blob);
      },
      "image/jpeg",
      0.92
    );
  });
}

function fontOffset(photoW: number) {
  return Math.max(6, Math.round(photoW * 0.012));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function shareFramedBlob(
  blob: Blob,
  filename: string,
  title: string
): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: blob.type || "image/jpeg" });

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    (!navigator.canShare || navigator.canShare({ files: [file] }))
  ) {
    try {
      await navigator.share({
        files: [file],
        title,
        text: `${title} · Travelia`,
      });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
    }
  }

  downloadBlob(blob, filename);
  return "downloaded";
}

export function frameMetaFromPhoto(photo: {
  tripTitle?: string | null;
  destinationTitle?: string | null;
  city?: string | null;
  country?: string | null;
  categorySlug?: string | null;
  dayLabel?: string | null;
}): GalleryFrameMeta {
  return {
    tripTitle: photo.tripTitle ?? null,
    destinationTitle: photo.destinationTitle ?? null,
    city: photo.city ?? null,
    country: photo.country ?? null,
    categorySlug: photo.categorySlug ?? null,
    dayLabel: photo.dayLabel ?? null,
  };
}
