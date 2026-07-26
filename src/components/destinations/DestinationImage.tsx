"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Props = {
  src: string;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
  fallback?: string;
};

/**
 * next/image for local paths; falls back when remote/invalid src fails.
 */
export function DestinationImage({
  src,
  alt,
  fill,
  priority,
  sizes,
  className,
  fallback = "/images/dest2.jpg",
}: Props) {
  const [current, setCurrent] = useState(src || fallback);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resync fallback state when the src prop changes
    setCurrent(src || fallback);
  }, [src, fallback]);

  const isRemote = /^https?:\/\//i.test(current);

  if (isRemote) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={current}
        alt={alt}
        className={
          fill
            ? `absolute inset-0 h-full w-full object-cover ${className ?? ""}`
            : className
        }
        onError={() => setCurrent(fallback)}
      />
    );
  }

  return (
    <Image
      src={current}
      alt={alt}
      fill={fill}
      priority={priority}
      sizes={sizes}
      className={className}
      onError={() => setCurrent(fallback)}
    />
  );
}
