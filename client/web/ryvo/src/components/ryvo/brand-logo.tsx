import { Zap } from "lucide-react";
import Link from "next/link";

import { APP_NAME } from "@/configs/const";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  subtitle?: string;
  href?: string;
  className?: string;
  /** Called after navigation (e.g. close mobile drawer). */
  onNavigate?: () => void;
};

export function BrandLogo({
  subtitle = "Mobility",
  href = "/landing",
  className,
  onNavigate,
}: BrandLogoProps) {
  const inner = (
    <>
      <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl shadow-lg shadow-primary/25">
        <Zap className="size-5" fill="currentColor" strokeWidth={2.5} />
      </div>
      <div className="flex flex-col">
        <span className="text-primary text-xl leading-none font-bold tracking-tight">{APP_NAME}</span>
        <span className="text-muted-foreground text-[9px] leading-tight tracking-[0.2em] uppercase">
          {subtitle}
        </span>
      </div>
    </>
  );

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn("flex items-center gap-2 transition active:scale-95", className)}
    >
      {inner}
    </Link>
  );
}
