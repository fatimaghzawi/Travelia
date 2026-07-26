import type { LucideProps } from "lucide-react";
import {
  isTaxonomyEmojiIcon,
  isTaxonomyImageIcon,
  taxonomyIcon,
} from "./taxonomy-icons";

type TaxonomyIconProps = {
  slug: string;
  icon?: string | null;
  className?: string;
  strokeWidth?: LucideProps["strokeWidth"];
};

/**
 * Renders a category/mood icon from Lucide slug, emoji, or image URL.
 */
export function TaxonomyIcon({
  slug,
  icon,
  className = "h-3.5 w-3.5",
  strokeWidth = 1.75,
}: TaxonomyIconProps) {
  const field = (icon || "").trim();

  if (isTaxonomyImageIcon(field)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- admin-provided taxonomy icon URL
      <img src={field} alt="" className={`object-contain ${className}`} />
    );
  }

  if (isTaxonomyEmojiIcon(field)) {
    return (
      <span
        className={`inline-flex items-center justify-center leading-none ${className}`}
        aria-hidden
      >
        <span className="text-[0.95em]">{field}</span>
      </span>
    );
  }

  const Icon = taxonomyIcon(slug, icon);
  return <Icon className={className} strokeWidth={strokeWidth} />;
}
