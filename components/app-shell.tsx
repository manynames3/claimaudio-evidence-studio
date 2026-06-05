"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AudioLines,
  LogOut,
  FileCheck2,
  FileText,
  LayoutDashboard,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { endClientSession, getClientSession, type ClientSessionUser } from "@/lib/client/auth-api";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/app",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true
  },
  {
    href: "/app/projects/claim-7842/workspace",
    label: "Evidence Workspace",
    icon: AudioLines
  },
  {
    href: "/app/projects/claim-7842/exports",
    label: "Exports",
    icon: FileText
  },
  {
    href: "/app/supervisor",
    label: "Supervisor Queue",
    icon: FileCheck2
  },
  {
    href: "/app/settings",
    label: "Security",
    icon: ShieldCheck
  }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<ClientSessionUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getClientSession()
      .then((session) => {
        if (!cancelled) {
          setUser(session.user);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    await endClientSession();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r bg-white lg:flex">
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <Link
                href={item.href}
                key={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950",
                  active && "bg-slate-100 text-slate-950"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t px-3 py-3 text-[10px] font-medium uppercase leading-4 tracking-wide text-muted-foreground">
          ©2026 SUPREME AI VENTURES LLC
        </div>
      </aside>
      <div className="lg:pl-56">
        <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
          <div className="flex h-12 items-center justify-between px-4 lg:px-6">
            <div>
              <p className="text-sm font-medium text-slate-900">Claim review workspace</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="hidden rounded-md border px-2 py-1 md:inline-flex">
                {user?.displayName || "Pilot user"}
              </span>
              <span className="rounded-md bg-emerald-50 px-2 py-1 font-medium capitalize text-emerald-800">
                {(user?.role || "pilot").replace("_", " ")}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="h-7 px-2">
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          </div>
          <nav className="claims-scrollbar flex gap-1 overflow-x-auto border-t px-4 py-2 lg:hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);

              return (
                <Link
                  href={item.href}
                  key={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-slate-600",
                    active && "bg-slate-100 text-slate-950"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        <main className="mx-auto max-w-[1720px] px-4 py-4 lg:px-6">{children}</main>
        <footer className="border-t px-4 py-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground lg:hidden">
          ©2026 SUPREME AI VENTURES LLC
        </footer>
      </div>
    </div>
  );
}
