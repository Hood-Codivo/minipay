import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { LinkRailLogo } from "@/components/linkrail-logo";

const navigation = [
  { label: "Features", href: "#features", hasMenu: true },
  { label: "Solutions", href: "#solutions", hasMenu: false },
  { label: "Plans", href: "#plans", hasMenu: false },
  { label: "Learning", href: "#learning", hasMenu: true },
] as const;

export function LandingNavbar() {
  return (
    <div className="landing-navbar-shell">
      <nav className="landing-navbar">
        <Link href="/" className="landing-logo-link" aria-label="LinkRail home">
          <LinkRailLogo />
          <div>LinkRail</div>
        </Link>

        <div className="landing-nav-items" aria-label="Primary">
          {navigation.map((item) => (
            <a key={item.label} href={item.href} className="landing-nav-link">
              <span>{item.label}</span>
              {item.hasMenu ? (
                <ChevronDown size={16} aria-hidden="true" />
              ) : null}
            </a>
          ))}
        </div>

        <Link
          href="/create"
          className="button-hero-secondary liquid-glass landing-signup"
        >
          <span>Sign Up</span>
        </Link>
      </nav>
      <div className="landing-nav-divider" aria-hidden="true" />
    </div>
  );
}
