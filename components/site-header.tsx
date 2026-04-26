"use client";

import Link from "next/link";
import type { Route } from "next";
import {
  ChartColumnStacked,
  FileStack,
  House,
  ReceiptText,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const navigation: Array<{
  href: string;
  route: Route;
  label: string;
  icon: LucideIcon;
}> = [
  { href: "/", route: "/" as Route, label: "Overview", icon: House },
  { href: "/create", route: "/create" as Route, label: "Create", icon: ReceiptText },
  {
    href: "/dashboard",
    route: "/dashboard" as Route,
    label: "Dashboard",
    icon: ChartColumnStacked,
  },
  { href: "/history", route: "/history" as Route, label: "Activity", icon: ScrollText },
  { href: "/registry", route: "/registry" as Route, label: "Registry", icon: FileStack },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <Link href="/" className="brand-mark">
        <div className="brand-emblem">M</div>
        <div>
          <p className="brand-kicker">MiniPay Merchant Checkout</p>
          <h1>MiniPay Checkout</h1>
        </div>
      </Link>

      <nav className="site-nav">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

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
    </header>
  );
}
