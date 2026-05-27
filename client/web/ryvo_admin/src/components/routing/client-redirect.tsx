"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

type ClientRedirectProps = {
  href: string;
};

/** Client-only redirect for static export (no server `redirect()`). */
export function ClientRedirect({ href }: ClientRedirectProps) {
  const router = useRouter();

  useEffect(() => {
    router.replace(href);
  }, [href, router]);

  return (
    <main className="flex min-h-svh items-center justify-center">
      <p className="text-muted-foreground text-sm">Redirecting…</p>
    </main>
  );
}
