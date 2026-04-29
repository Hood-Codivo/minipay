"use client";

import Link from "next/link";
import type { Route } from "next";
import {
  ChartColumnStacked,
  FileStack,
  House,
  Menu,
  ReceiptText,
  ScrollText,
  X,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useEffect, useState } from "react";

import { LinkRailLogo } from "@/components/linkrail-logo";

const navigation: Array<{
  href: string;
  route: Route;
  label: string;
  icon: LucideIcon;
}> = [
  { href: "/", route: "/" as Route, label: "Overview", icon: House },
  {
    href: "/create",
    route: "/create" as Route,
    label: "Create",
    icon: ReceiptText,
  },
  {
    href: "/dashboard",
    route: "/dashboard" as Route,
    label: "Dashboard",
    icon: ChartColumnStacked,
  },
  {
    href: "/history",
    route: "/history" as Route,
    label: "Activity",
    icon: ScrollText,
  },
  {
    href: "/registry",
    route: "/registry" as Route,
    label: "Registry",
    icon: FileStack,
  },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (pathname === "/") {
    return null;
  }

  return (
    <header className={clsx("site-header", menuOpen && "menu-open")}>
      <div className="site-header-bar">
        <Link href="/" className="brand-mark">
          <LinkRailLogo />
          <div className="brand-copy">
            <h1>LinkRail</h1>
          </div>
        </Link>
        <button
          type="button"
          className="site-header-toggle"
          aria-expanded={menuOpen}
          aria-controls="site-header-panel"
          onClick={() => setMenuOpen((current) => !current)}
        >
          {menuOpen ? (
            <X size={18} aria-hidden="true" />
          ) : (
            <Menu size={18} aria-hidden="true" />
          )}
          <span>{menuOpen ? "Close" : "Menu"}</span>
        </button>
      </div>

      <div id="site-header-panel" className="site-header-panel">
        <nav className="site-nav">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.route}
                aria-current={isActive ? "page" : undefined}
                className={clsx("nav-link", isActive && "active")}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="header-actions">
          <span className="header-pill">MiniPay-ready</span>
          <Link href="/create" className="button-secondary header-cta">
            <ReceiptText size={16} aria-hidden="true" />
            <span>New invoice</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
