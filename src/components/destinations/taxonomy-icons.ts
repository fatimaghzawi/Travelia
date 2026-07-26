import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Compass,
  Gem,
  Heart,
  Landmark,
  Leaf,
  Moon,
  Mountain,
  Palmtree,
  Ship,
  Smile,
  Sparkles,
  Tent,
  Trees,
  User,
  Users,
  UtensilsCrossed,
  Waves,
} from "lucide-react";

const SLUG_ICONS: Record<string, LucideIcon> = {
  // Generic
  compass: Compass,
  all: Compass,

  // Categories
  beach: Waves,
  beaches: Waves,
  mountain: Mountain,
  mountains: Mountain,
  city: Building2,
  cities: Building2,
  island: Ship,
  islands: Ship,
  cultural: Landmark,
  culture: Landmark,
  nature: Trees,
  tropical: Palmtree,

  // Moods
  romantic: Heart,
  romance: Heart,
  relaxation: Leaf,
  relax: Leaf,
  chill: Leaf,
  peaceful: Leaf,
  adventure: Tent,
  family: Users,
  solo: User,
  fun: Smile,
  party: Sparkles,
  luxury: Gem,
  food: UtensilsCrossed,
  culinary: UtensilsCrossed,
  nightlife: Moon,
};

/**
 * Map a category/mood slug (or free-text icon field) to a Lucide icon.
 */
export function taxonomyIcon(
  slug: string,
  iconField?: string | null
): LucideIcon {
  const candidates = [iconField, slug]
    .map((v) => (v || "").toLowerCase().trim())
    .filter(Boolean);

  for (const key of candidates) {
    if (key in SLUG_ICONS) return SLUG_ICONS[key];
  }

  for (const key of candidates) {
    for (const [token, Icon] of Object.entries(SLUG_ICONS)) {
      if (key.includes(token)) return Icon;
    }
  }

  return Compass;
}

export function isTaxonomyImageIcon(value: string | null | undefined) {
  const v = (value || "").trim();
  return (
    /^https?:\/\//i.test(v) ||
    v.startsWith("/") ||
    v.startsWith("data:image/")
  );
}

/** True when the icon field is an emoji / symbol rather than a Lucide slug key. */
export function isTaxonomyEmojiIcon(value: string | null | undefined) {
  const v = (value || "").trim();
  if (!v) return false;
  if (isTaxonomyImageIcon(v)) return false;
  if (/^[a-z0-9_-]+$/i.test(v)) return false;
  return [...v].length <= 8;
}
