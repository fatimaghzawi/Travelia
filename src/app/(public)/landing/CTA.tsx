import Link from "next/link";

type CTAProps = {
  isAuthenticated?: boolean;
};

export function CTA({ isAuthenticated = false }: CTAProps) {
  return (
    <section className="lp-cta">
      <div className="lp-wrap">
        <div className="lp-cta__inner">
          <div className="lp-cta__copy">
            <h2>Ready to travel?</h2>
            <p>Your next adventure is just a plan away.</p>
          </div>
          <Link
            href={isAuthenticated ? "/dashboard" : "/register"}
            className="lp-btn lp-btn--teal"
          >
            {isAuthenticated ? "Open dashboard" : "Get started"}
          </Link>
        </div>
      </div>
    </section>
  );
}
