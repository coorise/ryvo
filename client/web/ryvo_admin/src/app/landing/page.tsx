import { BadgeDollarSign, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";

import { LandingHeroActions } from "@/components/landing/landing-hero-actions";
import { LandingCityGrid } from "@/components/landing/landing-city-grid";
import { SiteHeader } from "@/components/layout/site-header";
import { RyvoButton } from "@/components/ryvo/ryvo-button";
import { APP_TAGLINE, ROUTES } from "@/configs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "End-to-end safety",
    description: "Verified drivers, live tracking, and 24/7 support when you need it.",
  },
  {
    icon: Zap,
    title: "Match in under 4 min",
    description: "Smart dispatch sends offers to nearby drivers instantly.",
  },
  {
    icon: BadgeDollarSign,
    title: "Transparent pricing",
    description: "See the fare upfront — no surprises at the end of your trip.",
  },
];

const SAFETY_POINTS = [
  {
    title: "Verified drivers",
    description: "KYC and document checks before anyone can accept rides on the platform.",
  },
  {
    title: "Live trip tracking",
    description: "Share your route in real time with trusted contacts when you travel.",
  },
  {
    title: "24/7 support",
    description: "In-app chat with our team for billing, safety, or account issues.",
  },
];

export const dynamic = "force-dynamic";

export default function LandingPage() {
  return (
    <div className="bg-background text-foreground min-h-svh">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-24">
          <div className="space-y-8 lg:col-span-7">
            <div className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wider uppercase">
              <span className="bg-primary size-2 animate-pulse rounded-full" />
              New · Montréal launch
            </div>
            <h1 className="text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl lg:text-7xl">
              Urban mobility,
              <br />
              <span className="text-primary">reimagined.</span>
            </h1>
            <p className="text-muted-foreground max-w-xl text-lg leading-relaxed">{APP_TAGLINE}</p>
            <LandingHeroActions />
          </div>
          <div className="lg:col-span-5">
            <Card className="border-primary/20 rounded-3xl shadow-xl shadow-primary/10">
              <CardHeader>
                <CardTitle>Ride in 3 taps</CardTitle>
                <CardDescription>Destination → vehicle → pay. Nothing extra.</CardDescription>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-2 text-sm">
                <p>• Real-time driver location</p>
                <p>• Secure payments after driver accepts</p>
                <p>• In-trip chat with your driver</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="features" className="border-border border-t py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-primary mb-2 text-xs font-bold tracking-[0.2em] uppercase">Why Ryvo-Line</p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="border-border/80 rounded-3xl">
                <CardHeader>
                  <div className="bg-primary/10 text-primary mb-2 flex size-12 items-center justify-center rounded-2xl">
                    <f.icon className="size-6" />
                  </div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                  <CardDescription>{f.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <LandingCityGrid />

      <section id="safety" className="border-border border-t py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase">Safety</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Built for peace of mind</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {SAFETY_POINTS.map((item) => (
              <Card key={item.title} className="border-border/80 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="drivers" className="border-border border-t py-16">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div>
            <p className="text-primary text-xs font-bold tracking-[0.2em] uppercase">Become a driver</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">Drive. Earn. On your terms.</h2>
            <p className="text-muted-foreground mt-3 max-w-lg">
              Flexible hours, transparent earnings, and fast KYC onboarding.
            </p>
          </div>
          <RyvoButton intent="signIn" size="lg" className="rounded-full" asChild>
            <Link href={ROUTES.auth.login}>Staff sign in</Link>
          </RyvoButton>
        </div>
      </section>

      <footer className="border-border text-muted-foreground border-t px-4 py-8 text-center text-sm sm:px-6">
        <p className="mb-2">© {new Date().getFullYear()} Ryvo-Line · Montréal, QC</p>
        <Link href={ROUTES.legal.tos} className="hover:text-foreground mr-4">
          Terms
        </Link>
        <Link href={ROUTES.legal.privacy} className="hover:text-foreground">
          Privacy
        </Link>
      </footer>
    </div>
  );
}
