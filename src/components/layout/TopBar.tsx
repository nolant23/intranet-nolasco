"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { User, LogOut, Settings, ArrowLeft } from "lucide-react";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { logoutUser } from "@/app/actions";
import { NAV_AREAS, getAreaFromPathname } from "@/lib/navigation";

interface TopBarProps {
  userName: string;
  userRole: string;
  permissions: any;
}

export function TopBar({ userName, userRole, permissions }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentArea = pathname.startsWith("/home") ? "home" : getAreaFromPathname(pathname);

  const handleLogout = async () => {
    await logoutUser();
  };

  const visibleAreas = NAV_AREAS.filter((area) => {
    // Visibilità tab navbar controllata dai permessi dedicati alle dashboard
    // (configurabili in Impostazioni).
    if (area.id === "admin") {
      // Admin ha senso solo se può vedere almeno Utenti o Impostazioni
      return Boolean(permissions?.Utenti?.READ || permissions?.Impostazioni?.READ);
    }
    return Boolean(permissions?.[area.permKey]?.READ);
  });

  // Per Ufficio e Admin aggiungiamo HOME come prima voce (link a /home)
  const showHome = userRole === "UFFICIO" || userRole === "ADMIN";
  const areasWithOptionalHome = showHome
    ? [{ id: "home" as const, label: "Home", href: "/home" }, ...visibleAreas]
    : visibleAreas;

  const dashboardPaths = new Set(areasWithOptionalHome.map((a) => a.href));
  const isDashboardPage = dashboardPaths.has(pathname) || pathname.startsWith("/home");
  const currentAreaHref =
    areasWithOptionalHome.find((a) => a.id === currentArea)?.href ?? "/servizi";

  // Se siamo su una pagina con "dettagli/modali" gestiti via querystring, il back della TopBar
  // deve ignorarli e tornare alla pagina precedente "vera" (route) dell'area.
  const hasDetailQuery =
    searchParams.has("f") ||
    searchParams.has("nc") ||
    searchParams.has("c") ||
    searchParams.has("i") ||
    searchParams.has("contr") ||
    searchParams.has("m") ||
    searchParams.has("returnTo");

  return (
    <div className="w-full h-[72px] bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 shadow-sm shrink-0">
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <Link href="/" className="shrink-0">
          <div className="h-10 w-20 sm:h-11 sm:w-36 relative">
            <Image
              src="/images/logo.png"
              alt="Nolasco Ascensori Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>

        {/* Desktop navbar */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2 overflow-x-auto">
          {areasWithOptionalHome.map((area) => {
            const isActive = currentArea === area.id;
            return (
              <Link
                key={area.id}
                href={area.href}
                className={cn(
                  "whitespace-nowrap px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                {area.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        {!isDashboardPage ? (
          <button
            type="button"
            onClick={() => {
              // Il pulsante "Indietro" deve navigare SOLO tra le pagine della navbar (dashboard aree),
              // quindi torna sempre alla dashboard dell'area corrente.
              router.push(currentAreaHref);
            }}
            className={cn(
              "shrink-0 inline-flex items-center gap-2 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-sm font-black uppercase tracking-wider",
              "bg-primary text-primary-foreground shadow-sm hover:opacity-95 transition-opacity"
            )}
            title="Indietro"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Indietro</span>
          </button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger
            id="user-menu-trigger"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "flex items-center gap-3 h-12 rounded-xl hover:bg-slate-100"
            )}
          >
            <div className="bg-primary/10 p-2 rounded-full">
              <User className="h-5 w-5 text-primary" />
            </div>
            <span className="hidden sm:inline-block font-bold text-slate-700 tracking-wide">
              {userName}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl p-2">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-bold text-slate-400 uppercase tracking-wider text-xs px-2 py-2">
                Il mio account
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />

            <DropdownMenuItem render={<Link href="/profilo" className="w-full" />}>
              <div className="flex items-center gap-3 w-full py-1 cursor-pointer">
                <Settings className="h-4 w-4 text-slate-500" />
                <span className="font-medium text-slate-700">Profilo</span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <div className="flex items-center gap-3 w-full py-1 cursor-pointer">
                <LogOut className="h-4 w-4 text-red-500" />
                <span className="font-medium text-red-600">Esci</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
