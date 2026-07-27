"use client";

import Link from "next/link";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/destinations", label: "Destinations" },
  { href: "/#explore-by-mood", label: "Explore by Mood" },
] as const;

type LandingNavProps = {
  isAuthenticated?: boolean;
};

export function LandingNav({ isAuthenticated = false }: LandingNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const primaryHref = isAuthenticated ? "/dashboard" : "/login";
  const primaryLabel = isAuthenticated ? "Dashboard" : "Login";
  const ctaHref = isAuthenticated ? "/destinations" : "/register";
  const ctaLabel = isAuthenticated ? "Explore" : "Plan a trip";

  return (
    <header className="lp-nav">
      <div className="lp-nav__inner">
        <Link href="/" className="lp-logo" aria-label="Travelia home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.png"
            alt="Travelia"
            className="lp-logo__img"
          />
        </Link>

        <div className="lp-nav__right">
          <nav className="lp-nav__links" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
          <Link href={primaryHref} className="lp-nav__login">
            {primaryLabel}
          </Link>
          <Link href={ctaHref} className="lp-btn lp-btn--teal lp-nav__cta">
            {ctaLabel}
          </Link>
          <button
            type="button"
            className="lp-nav__burger"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <div className={`lp-nav__mobile${menuOpen ? " is-open" : ""}`}>
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setMenuOpen(false)}
          >
            {link.label}
          </Link>
        ))}
        <Link href={primaryHref} onClick={() => setMenuOpen(false)}>
          {primaryLabel}
        </Link>
        <Link
          href={ctaHref}
          className="lp-btn lp-btn--teal"
          onClick={() => setMenuOpen(false)}
        >
          {ctaLabel}
        </Link>
      </div>
    </header>
  );
}
