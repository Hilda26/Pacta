"use client";

import { FilePlus2, Gauge, LogOut, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api/pacta";
import { useSession } from "@/hooks/use-session";
import { Button, IconButton } from "./ui";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/covenants/new", label: "New covenant", icon: FilePlus2 }
] as const;

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSession();
  const logout = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      queryClient.clear();
      router.replace("/login");
    }
  });
  const walletAddress = session.data?.user.walletAddress;

  return (
    <main className="min-h-screen">
      <header className="border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-3 text-stone-950">
            <span className="inline-flex size-10 items-center justify-center rounded-md bg-stone-950 text-white">
              <ShieldCheck aria-hidden className="size-5" />
            </span>
            <span className="text-lg font-bold">Pacta</span>
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold transition ${
                    active ? "bg-emerald-100 text-emerald-900" : "text-stone-600 hover:bg-stone-100 hover:text-stone-950"
                  }`}
                >
                  <Icon aria-hidden className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
                    {walletAddress ? (
                      <a
                        href={`/reputation/${walletAddress}`}
                        className="hidden rounded-md border border-stone-200 bg-stone-50 px-3 py-2 font-mono text-xs text-stone-700 sm:block"
                      >
                        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                      </a>
                    ) : null}
                    {walletAddress ? (
                      <IconButton title="Open reputation" onClick={() => window.location.assign(`/reputation/${walletAddress}`)}>
                        <UserRound aria-hidden className="size-4" />
                      </IconButton>
                    ) : null}
            <Button variant="secondary" onClick={() => logout.mutate()} disabled={logout.isPending}>
              <LogOut aria-hidden className="size-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
    </main>
  );
}
