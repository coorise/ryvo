"use client";

import { Menu, Moon, Sun, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { BrandLogo } from "@/components/ryvo/brand-logo";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { LANDING_NAV_LINKS, ROUTES } from "@/configs";
import { dashboardPathForUser } from "@/guards/abac";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-media-query";

export function SiteHeader() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { user, isReady } = useAuth();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const dark = theme === "dark";
  const loggedIn = isReady && Boolean(user);
  const dashboardHref = loggedIn ? dashboardPathForUser(user) : ROUTES.auth.login;

  return (
    <header className="bg-background/75 sticky top-0 z-40 border-b border-border/60 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <BrandLogo href={ROUTES.landing} />

        <nav className="bg-muted/40 hidden items-center gap-1 rounded-full border border-border/60 px-1 py-1 lg:flex">
          {LANDING_NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="hover:text-foreground text-muted-foreground rounded-full px-4 py-2 text-sm font-semibold transition hover:bg-card"
            >
              {t(l.labelKey)}
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
          <LanguageSwitcher compact className="hidden md:flex" />
          {loggedIn ? (
            <RyvoButton intent="cta" size="sm" className="hidden sm:flex" asChild>
              <Link href={dashboardHref}>{t("landing.goToDashboard")}</Link>
            </RyvoButton>
          ) : (
            <RyvoButton intent="cta" size="sm" className="hidden sm:flex" asChild>
              <Link href={ROUTES.auth.login}>{t("common.signIn")}</Link>
            </RyvoButton>
          )}
          {isMobile && (
            <button
              type="button"
              aria-label={t("nav.menu")}
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
          {LANDING_NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="block rounded-xl px-4 py-3 text-sm font-semibold hover:bg-muted"
            >
              {t(l.labelKey)}
            </a>
          ))}
          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
            <LanguageSwitcher />
            {loggedIn ? (
              <RyvoButton intent="cta" className="w-full" asChild>
                <Link href={dashboardHref} onClick={() => setMenuOpen(false)}>
                  {t("landing.goToDashboard")}
                </Link>
              </RyvoButton>
            ) : (
              <RyvoButton intent="cta" className="w-full" asChild>
                <Link href={ROUTES.auth.login} onClick={() => setMenuOpen(false)}>
                  {t("common.signIn")}
                </Link>
              </RyvoButton>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
