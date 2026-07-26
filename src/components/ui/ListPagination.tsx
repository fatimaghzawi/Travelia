import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type ListPaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type ListPaginationProps = {
  meta: ListPaginationMeta;
  /** Build href for a target page (keeps other query params). */
  hrefForPage: (page: number) => string;
  className?: string;
};

/** Link-based pager for traveler / public list pages. */
export function ListPagination({
  meta,
  hrefForPage,
  className = "",
}: ListPaginationProps) {
  if (meta.total === 0 || meta.totalPages <= 1) return null;

  const start = (meta.page - 1) * meta.limit + 1;
  const end = Math.min(meta.page * meta.limit, meta.total);
  const prev = meta.page > 1 ? hrefForPage(meta.page - 1) : null;
  const next = meta.page < meta.totalPages ? hrefForPage(meta.page + 1) : null;

  return (
    <div
      className={`mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#d1e8ea] pt-4 ${className}`}
    >
      <p className="text-sm text-[#67717A]">
        Showing{" "}
        <span className="font-medium text-[#012A3E]">
          {start}–{end}
        </span>{" "}
        of <span className="font-medium text-[#012A3E]">{meta.total}</span>
      </p>
      <div className="flex items-center gap-1">
        {prev ? (
          <Link
            href={prev}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d1e8ea] text-[#67717A] hover:bg-[#F4FAFB] hover:text-[#012A3E]"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d1e8ea] text-[#67717A] opacity-40"
            aria-disabled
          >
            <ChevronLeft className="h-4 w-4" />
          </span>
        )}
        <span className="px-3 text-sm text-[#012A3E]">
          {meta.page} / {meta.totalPages}
        </span>
        {next ? (
          <Link
            href={next}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d1e8ea] text-[#67717A] hover:bg-[#F4FAFB] hover:text-[#012A3E]"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#d1e8ea] text-[#67717A] opacity-40"
            aria-disabled
          >
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );
}
