"use client";

import { Languages, Menu, Moon, Sun, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useTheme } from "next-themes";

import { ROUTES } from "@/configs";
import { BrandLogo } from "@/components/ryvo/brand-logo";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { useIsMobile } from "@/hooks/use-media-query";

export function SiteHeader() {
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const dark = theme === "dark";

  const links = [
    { label: "Features", href: "#features" },
    { label: "Cities", href: "#cities" },
    { label: "Drivers", href: "#drivers" },
    { label: "Safety", href: "#safety" },
  ];

  return (
    <header className="bg-background/75 sticky top-0 z-40 border-b border-border/60 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandLogo />

        <nav className="bg-muted/40 hidden items-center gap-1 rounded-full border border-border/60 px-1 py-1 lg:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="hover:text-foreground text-muted-foreground rounded-full px-4 py-2 text-sm font-semibold transition hover:bg-card"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Toggle theme"
            onClick={() => setTheme(dark ? "light" : "dark")}
            className="hover:border-primary hidden size-9 items-center justify-center rounded-full border border-border transition md:flex"
          >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <RyvoButton intent="ghost" size="sm" className="hidden md:flex" asChild>
            <Link href={ROUTES.auth.login}>
              <Languages className="size-3.5" /> EN
            </Link>
          </RyvoButton>
          <RyvoButton intent="outline" size="sm" className="hidden sm:flex" asChild>
            <Link href={ROUTES.auth.login}>Sign in</Link>
          </RyvoButton>
          <RyvoButton intent="cta" size="sm" className="hidden sm:flex" asChild>
            <Link href={ROUTES.auth.login}>Staff sign in</Link>
          </RyvoButton>
          {isMobile && (
            <button
              type="button"
              aria-label="Menu"
              onClick={() => setMenuOpen((o) => !o)}
              className="bg-muted flex size-10 items-center justify-center rounded-full lg:hidden"
            >
              {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          )}
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-border bg-background/95 px-4 py-4 backdrop-blur-xl lg:hidden">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="block rounded-xl px-4 py-3 text-sm font-semibold hover:bg-muted"
            >
              {l.label}
            </a>
          ))}
          <div className="mt-3 flex gap-2 border-t border-border pt-3">
            <RyvoButton intent="outline" className="flex-1" asChild>
              <Link href={ROUTES.auth.login}>Sign in</Link>
            </RyvoButton>
            <RyvoButton intent="cta" className="flex-1" asChild>
              <Link href={ROUTES.auth.login}>Staff sign in</Link>
            </RyvoButton>
          </div>
        </nav>
      )}
    </header>
  );
}
