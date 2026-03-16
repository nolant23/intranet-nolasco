"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { TECNICO_NAV_ITEMS, getTecnicoCurrentArea, tecnicoCanSeeServizi } from "@/lib/navigation";

type Props = {
  permissions: any;
};

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  servizi: LayoutGrid,
  presenze: CalendarDays,
};

export function TecnicoMobileNav({ permissions }: Props) {
  const pathname = usePathname();
  const currentArea = getTecnicoCurrentArea(pathname);

  const visibleItems = TECNICO_NAV_ITEMS.filter((item) => {
    if (item.id === "home") return true;
    if (item.id === "servizi") return tecnicoCanSeeServizi(permissions);
    return Boolean(permissions?.[item.permKey]?.READ);
  }).slice(0, 5);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 pb-[env(safe-area-inset-bottom)]">
      <nav
        className="grid h-14"
        style={{ gridTemplateColumns: `repeat(${visibleItems.length}, minmax(0, 1fr))` }}
      >
        {visibleItems.map((item) => {
          const active = currentArea === item.id;
          const Icon = ICONS[item.id] ?? Home;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-2",
                active ? "text-primary" : "text-slate-600"
              )}
            >
              <Icon className={cn("h-6 w-6", active ? "text-primary" : "text-slate-500")} />
              <span
                className={cn(
                  "text-[10px] font-semibold leading-tight",
                  active ? "text-primary" : "text-slate-600"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
