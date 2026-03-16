"use client";

import { usePathname, useRouter } from "next/navigation";
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
import { TECNICO_NAV_ITEMS, getTecnicoCurrentArea, tecnicoCanSeeServizi } from "@/lib/navigation";

interface TecnicoTopBarProps {
  userName: string;
  permissions: any;
}

export function TecnicoTopBar({ userName, permissions }: TecnicoTopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const currentArea = getTecnicoCurrentArea(pathname);

  const handleLogout = async () => {
    await logoutUser();
  };

  const visibleItems = TECNICO_NAV_ITEMS.filter((item) => {
    if (item.id === "home") return true;
    if (item.id === "servizi") return tecnicoCanSeeServizi(permissions);
    return Boolean(permissions?.[item.permKey]?.READ);
  });

  const isDashboardPage =
    pathname === "/tecnici" ||
    pathname === "/tecnici/servizi" ||
    pathname.startsWith("/manutenzioni") ||
    pathname.startsWith("/interventi") ||
    pathname.startsWith("/verifiche-biennali") ||
    pathname === "/giro" ||
    pathname === "/presenze";
  const currentHref = visibleItems.find((a) => a.id === currentArea)?.href ?? "/tecnici";

  return (
    <div className="w-full h-14 md:h-[72px] bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-6 shadow-sm shrink-0">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <Link href="/tecnici" className="shrink-0">
          <div className="h-9 w-16 sm:h-11 sm:w-36 relative">
            <Image
              src="/images/logo.png"
              alt="Nolasco Ascensori Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>

        <nav className="hidden sm:flex items-center gap-1 overflow-x-auto">
          {visibleItems.map((item) => {
            const isActive = currentArea === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "whitespace-nowrap px-3 py-2 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-2">
        {!isDashboardPage ? (
          <button
            type="button"
            onClick={() => router.push(currentHref)}
            className={cn(
              "shrink-0 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-black uppercase tracking-wider",
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
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "flex items-center gap-2 h-10 rounded-xl hover:bg-slate-100"
            )}
          >
            <div className="bg-primary/10 p-1.5 rounded-full">
              <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <span className="hidden sm:inline-block font-bold text-slate-700 text-sm tracking-wide max-w-[120px] truncate">
              {userName}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 mt-2 rounded-xl p-2">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-bold text-slate-400 uppercase tracking-wider text-xs px-2 py-2">
                Il mio account
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/profilo" className="w-full" />}>
              <div className="flex items-center gap-3 w-full py-1 cursor-pointer">
                <Settings className="h-4 w-4 text-slate-500" />
                <span className="font-medium text-slate-700 text-sm">Profilo</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <div className="flex items-center gap-3 w-full py-1 cursor-pointer">
                <LogOut className="h-4 w-4 text-red-500" />
                <span className="font-medium text-red-600 text-sm">Esci</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
