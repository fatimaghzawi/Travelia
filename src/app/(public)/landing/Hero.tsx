import Image from "next/image";
import Link from "next/link";
import { Header } from "./Header";

type HeroProps = {
  isAuthenticated?: boolean;
};

export function Hero({ isAuthenticated = false }: HeroProps) {
  return (
    <section className="lp-hero-block">
      <div className="lp-hero">
        <Image
          src="/images/dest2.jpg"
          alt="Cliffside blue-domed church overlooking the sea in Santorini, Greece"
          fill
          priority
          sizes="1120px"
          className="lp-hero__img"
        />
        <div className="lp-hero__veil" aria-hidden />
        <Header isAuthenticated={isAuthenticated} />
        <div className="lp-hero__content">
          <h1>
            Plan trips.
            <br />
            Book moments.
          </h1>
          <p>
            Your journey starts here—discover places, find stays, and create
            memories that last.
          </p>
          <div className="lp-hero__actions">
            <Link href="/destinations" className="lp-btn lp-btn--teal">
              Explore destinations
            </Link>
            <Link
              href={isAuthenticated ? "/dashboard" : "/register"}
              className="lp-btn lp-btn--ghost"
            >
              {isAuthenticated ? "Go to dashboard" : "Start planning"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
