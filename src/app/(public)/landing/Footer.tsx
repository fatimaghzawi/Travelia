import Link from "next/link";

type FooterProps = {
  isAuthenticated?: boolean;
};

export function Footer({ isAuthenticated = false }: FooterProps) {
  const footerLinks = [
    { href: "/destinations", label: "Destinations" },
    {
      href: isAuthenticated
        ? "/dashboard/bookings"
        : "/login?callbackUrl=/dashboard/bookings",
      label: "Bookings",
    },
    {
      href: isAuthenticated ? "/dashboard" : "/login",
      label: "Help",
    },
  ];

  return (
    <footer className="lp-footer">
      <div className="lp-wrap">
        <div className="lp-footer__inner">
          <Link href="/" className="lp-logo" aria-label="Travelia home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo.png"
              alt="Travelia"
              className="lp-logo__img lp-logo__img--light"
            />
          </Link>

          <nav className="lp-footer__links" aria-label="Footer">
            {footerLinks.map((link) => (
              <Link key={link.label} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>

          <p className="lp-footer__copy">
            © {new Date().getFullYear()} Travelia. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
