"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, CalendarCheck, CalendarDays, Receipt, Shield, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  userRole: string;
  permissions: any;
};

type Item = {
  key: string;
  label: string;
  href: string;
  isActive: (pathname: string) => boolean;
  icon: React.ComponentType<{ className?: string }>;
  showIf: (p: any) => boolean;
};

export function MobileBottomNav({ userRole, permissions }: Props) {
  const pathname = usePathname();
  const homeHref = userRole === "TECNICO" ? "/tecnici" : "/home";

  const items: Item[] = [
    {
      key: "home",
      label: "Home",
      href: homeHref,
      isActive: (p) => p === homeHref || p === "/" || p.startsWith("/home") || p.startsWith("/tecnici"),
      icon: Home,
      showIf: () => true,
    },
    {
      key: "servizi",
      label: "Servizi",
      href: "/servizi",
      isActive: (p) => p.startsWith("/servizi") || p.startsWith("/clienti") || p.startsWith("/amministratori") || p.startsWith("/impianti") || p.startsWith("/contratti"),
      icon: LayoutGrid,
      showIf: (perm) => Boolean(perm?.Servizi?.READ),
    },
    {
      key: "booking",
      label: "Booking",
      href: "/booking",
      isActive: (p) => p.startsWith("/booking"),
      icon: CalendarCheck,
      showIf: (perm) => Boolean(perm?.Booking?.READ),
    },
    {
      key: "presenze",
      label: "Presenze",
      href: "/presenze",
      isActive: (p) => p.startsWith("/presenze"),
      icon: CalendarDays,
      showIf: (perm) => Boolean(perm?.Presenze?.READ),
    },
    {
      key: "fatturazione",
      label: "Fatture",
      href: "/fatturazione",
      isActive: (p) => p.startsWith("/fatturazione") || p.startsWith("/fatture"),
      icon: Receipt,
      showIf: (perm) => Boolean(perm?.Fatturazione?.READ),
    },
    {
      key: "archivio",
      label: "Archivio",
      href: "/archivio",
      isActive: (p) => p === "/archivio" || p.startsWith("/manutenzioni/archivio") || p.startsWith("/fatture/archivio") || p.startsWith("/interventi/archivio"),
      icon: Archive,
      showIf: (perm) => Boolean(perm?.Archivio?.READ),
    },
    {
      key: "admin",
      label: "Admin",
      href: "/admin",
      isActive: (p) => p.startsWith("/admin") || p.startsWith("/utenti") || p.startsWith("/impostazioni"),
      icon: Shield,
      showIf: (perm) => Boolean(perm?.Utenti?.READ || perm?.Impostazioni?.READ),
    },
  ];

  // Ordine e massimo elementi (7 per includere Booking + Admin)
  const visible = items.filter((i) => i.showIf(permissions)).slice(0, 7);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <nav className="grid" style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))` }}>
        {visible.map((item) => {
          const active = item.isActive(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5",
                active ? "text-primary" : "text-slate-600"
              )}
            >
              <Icon className={cn("h-6 w-6", active ? "text-primary" : "text-slate-500")} />
              <span className={cn("text-[11px] font-semibold", active ? "text-primary" : "text-slate-600")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

