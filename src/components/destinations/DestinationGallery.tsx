"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { DestinationImage } from "./DestinationImage";

type DestinationGalleryProps = {
  images: string[];
  title: string;
  /** Overlay tiny thumbs on the hero (bottom-right). */
  placement?: "hero" | "inline";
};

export function DestinationGallery({
  images,
  title,
  placement = "inline",
}: DestinationGalleryProps) {
  const thumbs = images.filter(Boolean);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setActiveIndex(null), []);

  const showPrev = useCallback((e?: MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setActiveIndex((current) => {
      if (current === null || thumbs.length < 2) return current;
      return (current - 1 + thumbs.length) % thumbs.length;
    });
  }, [thumbs.length]);

  const showNext = useCallback((e?: MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setActiveIndex((current) => {
      if (current === null || thumbs.length < 2) return current;
      return (current + 1) % thumbs.length;
    });
  }, [thumbs.length]);

  const updateStripScroll = useCallback(() => {
    const el = stripRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(max > 4 && el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    updateStripScroll();
    const el = stripRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateStripScroll, { passive: true });
    const ro = new ResizeObserver(updateStripScroll);
    ro.observe(el);
    window.addEventListener("resize", updateStripScroll);

    return () => {
      el.removeEventListener("scroll", updateStripScroll);
      ro.disconnect();
      window.removeEventListener("resize", updateStripScroll);
    };
  }, [thumbs.length, updateStripScroll]);

  useEffect(() => {
    if (activeIndex === null) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") showPrev();
      if (e.key === "ArrowRight") showNext();
    }

    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [activeIndex, close, showPrev, showNext]);

  useEffect(() => {
    if (activeIndex === null || !stripRef.current) return;
    const btn = stripRef.current.querySelector<HTMLElement>(
      `[data-thumb-index="${activeIndex}"]`
    );
    btn?.scrollIntoView({
      behavior: "smooth",
      inline: "nearest",
      block: "nearest",
    });
  }, [activeIndex]);

  if (thumbs.length === 0) return null;

  const isHero = placement === "hero";
  const activeSrc = activeIndex !== null ? thumbs[activeIndex] : null;
  const dense = thumbs.length > 6;

  function scrollStrip(direction: "left" | "right") {
    const el = stripRef.current;
    if (!el) return;
    const amount = Math.max(120, el.clientWidth * 0.7);
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  const heroThumbClass = dense
    ? "relative h-7 w-9 shrink-0 overflow-hidden rounded ring-1 ring-white/40 transition hover:ring-2 hover:ring-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white sm:h-8 sm:w-11"
    : "relative h-9 w-12 shrink-0 overflow-hidden rounded-md ring-1 ring-white/40 transition hover:ring-2 hover:ring-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-10 sm:w-[3.4rem]";

  return (
    <>
      <div
        className={
          isHero
            ? "absolute right-3 bottom-3 z-20 flex max-w-[min(calc(100%-1.5rem),18rem)] items-center gap-1 rounded-lg bg-[#012A3E]/40 p-1 backdrop-blur-[2px] sm:right-5 sm:bottom-5 sm:max-w-[min(42vw,26rem)] sm:gap-1.5 sm:p-1.5"
            : "relative flex max-w-full items-center gap-1"
        }
      >
        {canScrollLeft ? (
          <button
            type="button"
            onClick={() => scrollStrip("left")}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-black/40 text-white transition hover:bg-black/55 sm:h-8 sm:w-8"
            aria-label="Scroll thumbnails left"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
          </button>
        ) : null}

        <div
          ref={stripRef}
          className={
            isHero
              ? "flex min-w-0 flex-1 gap-1 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-1.5 [&::-webkit-scrollbar]:hidden"
              : "-mx-1 flex flex-1 gap-2.5 overflow-x-auto scroll-smooth px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-3 [&::-webkit-scrollbar]:hidden"
          }
        >
          {thumbs.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              data-thumb-index={index}
              onClick={() => setActiveIndex(index)}
              className={
                isHero
                  ? `${heroThumbClass} ${
                      activeIndex === index
                        ? "ring-2 ring-[#127E83] ring-offset-1 ring-offset-[#012A3E]/50"
                        : ""
                    }`
                  : "relative h-16 w-[4.75rem] shrink-0 overflow-hidden rounded-lg bg-[#e8eef0] ring-1 ring-[#d1e8ea] transition hover:ring-[#127E83] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#127E83] sm:h-[4.5rem] sm:w-24 sm:rounded-xl"
              }
              aria-label={`View gallery image ${index + 1}`}
              aria-current={activeIndex === index ? "true" : undefined}
            >
              <DestinationImage
                src={src}
                alt={`${title} gallery ${index + 1}`}
                fill
                sizes={isHero ? (dense ? "40px" : "56px") : "96px"}
                className="object-cover"
              />
            </button>
          ))}
        </div>

        {canScrollRight ? (
          <button
            type="button"
            onClick={() => scrollStrip("right")}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-black/40 text-white transition hover:bg-black/55 sm:h-8 sm:w-8"
            aria-label="Scroll thumbnails right"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2.25} />
          </button>
        ) : null}
      </div>

      {activeSrc && activeIndex !== null ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#012A3E]/55 p-4 sm:p-8"
          role="presentation"
          onClick={close}
        >
          {/* Compact viewer — does not fill the page */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${title} gallery`}
            className="relative z-[81] flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-[#012A3E] shadow-2xl sm:max-w-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-3 py-2.5 sm:px-4">
              <p className="truncate text-sm font-medium text-white/90">
                {title}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-white/70">
                  {activeIndex + 1} / {thumbs.length}
                </span>
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                  aria-label="Close gallery"
                >
                  <X className="h-4 w-4" strokeWidth={2.25} />
                </button>
              </div>
            </div>

            <div className="relative aspect-[4/3] w-full bg-black">
              <DestinationImage
                key={activeSrc}
                src={activeSrc}
                alt={`${title} — image ${activeIndex + 1}`}
                fill
                sizes="(max-width: 640px) 90vw, 576px"
                className="object-contain"
              />

              {thumbs.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={showPrev}
                    className="absolute top-1/2 left-2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75 sm:h-10 sm:w-10"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
                  </button>
                  <button
                    type="button"
                    onClick={showNext}
                    className="absolute top-1/2 right-2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/75 sm:h-10 sm:w-10"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5" strokeWidth={2.25} />
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
