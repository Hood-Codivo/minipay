import { LandingNavbar } from "@/components/landing-navbar";

interface LandingHeroSectionProps {
  demoHref: string;
}

export function LandingHeroSection({ demoHref }: LandingHeroSectionProps) {
  return (
    <section className="landing-hero">
      <LandingNavbar />

      <div className="landing-hero-content">
        <div className="landing-hero-copy">
          <h1>LinkRail</h1>
          <p className="landing-hero-subtext">
            Direct stablecoin checkout
            <br />
            for MiniPay merchants
          </p>
          <div className="landing-hero-cta">
            <a href={demoHref} className="button-hero-secondary liquid-glass">
              <span>Launch a Live Demo</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
