"use client";

import { Bell, Menu, Moon, Settings, Sun, User } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { AdminGlobalSearch } from "@/components/layout/admin-global-search";
import { AdminSidebarContent } from "@/components/layout/admin-sidebar-content";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ROUTES } from "@/configs/const";
import { useAdminDashboard } from "@/hooks/use-admin-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { useRbac } from "@/hooks/use-rbac";

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { hasPermission, hasPermPrefix } = useRbac();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const { data: dashboard } = useAdminDashboard();
  const dark = theme === "dark";
  const { data: notifications } = useNotifications();
  const [navOpen, setNavOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);

  const closeNav = () => setNavOpen(false);

  const requestSignOut = () => {
    closeNav();
    setSignOutOpen(true);
  };

  const confirmSignOut = () => {
    setSignOutOpen(false);
    void signOut().then(() => router.push(ROUTES.landing));
  };

  const sidebarProps = {
    hasPermission,
    hasPermPrefix,
    onNavigate: closeNav,
    onSignOut: requestSignOut,
  };

  const unread =
    (notifications?.notifications?.filter((n) => !n.read_at).length ?? 0) +
    (dashboard?.badges.tickets ?? 0);

  return (
    <div className="bg-muted/30 text-foreground flex h-svh overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="border-border bg-card hidden h-svh w-64 shrink-0 flex-col border-r md:flex">
        <AdminSidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent
          side="left"
          showCloseButton
          className="w-[min(100vw-2rem,18rem)] gap-0 p-0 sm:max-w-xs"
        >
          <SheetTitle className="sr-only">{t("nav.menu")}</SheetTitle>
          <AdminSidebarContent {...sidebarProps} />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-border bg-background/80 z-30 flex shrink-0 items-center gap-2 border-b px-3 py-3 backdrop-blur-md sm:gap-4 sm:px-4 md:px-6">
          <button
            type="button"
            aria-label={t("nav.openMenu")}
            onClick={() => setNavOpen(true)}
            className="hover:border-primary flex size-10 shrink-0 items-center justify-center rounded-full border border-border md:hidden"
          >
            <Menu className="size-5" />
          </button>

          <AdminGlobalSearch />

          <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
            <LanguageSwitcher compact />
            <button
              type="button"
              aria-label="Toggle theme"
              onClick={() => setTheme(dark ? "light" : "dark")}
              className="hover:border-primary flex size-9 items-center justify-center rounded-full border border-border sm:size-10"
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <div className="relative">
              <button
                type="button"
                className="hover:border-primary flex size-9 items-center justify-center rounded-full border border-border sm:size-10"
                aria-label="Notifications"
                onClick={() => {
                  const el = document.getElementById("admin-notifications-panel");
                  el?.classList.toggle("hidden");
                }}
              >
                <Bell className="size-4" />
                {unread > 0 && (
                  <span className="bg-destructive absolute top-1 right-1 size-2 rounded-full" />
                )}
              </button>
              <div
                id="admin-notifications-panel"
                className="border-border bg-card absolute top-11 right-0 z-50 hidden max-h-80 w-[min(100vw-2rem,20rem)] overflow-y-auto rounded-2xl border p-2 shadow-xl"
              >
                {(notifications?.notifications ?? []).slice(0, 12).map((n) => (
                  <div key={n.id} className="border-border border-b px-3 py-2 text-xs last:border-0">
                    <p className="font-semibold">{n.type}</p>
                    <p className="text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                ))}
                {!notifications?.notifications?.length && (
                  <p className="text-muted-foreground px-3 py-4 text-center text-xs">No notifications</p>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="hover:border-primary hidden items-center gap-2 rounded-full border border-border px-2 py-1.5 sm:flex"
                  aria-label="User menu"
                >
                  <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full text-sm font-bold">
                    {user?.email?.[0]?.toUpperCase() ?? "A"}
                  </div>
                  <div className="hidden text-left text-sm leading-tight lg:block">
                    <p className="font-semibold">Admin</p>
                    <p className="text-muted-foreground max-w-[160px] truncate text-xs">{user?.email}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="space-y-0.5">
                  <div className="text-sm font-semibold leading-tight">Admin Principal</div>
                  <div className="text-muted-foreground truncate text-xs font-normal">{user?.email ?? "-"}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push(ROUTES.admin.settingsProfile)}
                  className="cursor-pointer"
                >
                  <User className="size-4" /> Mon profil
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push(ROUTES.admin.settingsConfigurations)}
                  className="cursor-pointer"
                >
                  <Settings className="size-4" /> Paramètres
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={requestSignOut}
                  className="cursor-pointer"
                >
                  Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main
          key={pathname}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 lg:p-8"
        >
          {children}
        </main>
      </div>

      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Se déconnecter ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous serez déconnecté et devrez vous reconnecter pour accéder au tableau de bord.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmSignOut}>
              Se déconnecter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
