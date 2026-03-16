import {
  Users,
  Building2,
  ServerCog,
  FileText,
  Wrench,
  Hammer,
  CalendarDays,
  Receipt,
  UserCog,
  Settings,
  ClipboardCheck,
  CalendarCheck,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

export type NavArea = "servizi" | "booking" | "field" | "fatturazione" | "tecnici" | "archivio" | "admin";

export const NAV_AREAS: {
  id: NavArea;
  label: string;
  href: string;
  permKey: string;
  sidebarLinks: { name: string; href: string; icon: LucideIcon; permKey: string }[];
}[] = [
  {
    id: "servizi",
    label: "Servizi",
    href: "/servizi",
    permKey: "Servizi",
    sidebarLinks: [
      { name: "Clienti", href: "/clienti", icon: Users, permKey: "Clienti" },
      { name: "Amministratori", href: "/amministratori", icon: Building2, permKey: "Amministratori" },
      { name: "Impianti", href: "/impianti", icon: ServerCog, permKey: "Impianti" },
      { name: "Contratti", href: "/contratti", icon: FileText, permKey: "Contratti" },
    ],
  },
  {
    id: "booking",
    label: "Booking",
    href: "/booking",
    permKey: "Booking",
    sidebarLinks: [
      { name: "Commesse", href: "/booking/commesse", icon: ClipboardList, permKey: "Booking" },
    ],
  },
  {
    id: "field",
    label: "Field",
    href: "/field",
    permKey: "Field",
    sidebarLinks: [
      { name: "Manutenzioni", href: "/manutenzioni", icon: Wrench, permKey: "Manutenzioni" },
      { name: "Interventi", href: "/interventi", icon: Hammer, permKey: "Interventi" },
      { name: "Verifiche biennali", href: "/verifiche-biennali", icon: ClipboardCheck, permKey: "VerificheBiennali" },
      { name: "Giro", href: "/giro", icon: CalendarDays, permKey: "Manutenzioni" },
    ],
  },
  {
    id: "fatturazione",
    label: "Fatturazione",
    href: "/fatturazione",
    permKey: "Fatturazione",
    sidebarLinks: [
      { name: "Fatture", href: "/fatture", icon: Receipt, permKey: "Fatture" },
    ],
  },
  {
    id: "tecnici",
    label: "Tecnici",
    href: "/tecnici",
    permKey: "Tecnici",
    sidebarLinks: [
      { name: "Presenze", href: "/presenze", icon: CalendarDays, permKey: "Presenze" },
    ],
  },
  {
    id: "archivio",
    label: "Archivio",
    href: "/archivio",
    permKey: "Archivio",
    sidebarLinks: [],
  },
  {
    id: "admin",
    label: "Admin",
    href: "/admin",
    permKey: "Admin",
    sidebarLinks: [
      { name: "Utenti", href: "/utenti", icon: UserCog, permKey: "Utenti" },
      { name: "Impostazioni", href: "/impostazioni", icon: Settings, permKey: "Impostazioni" },
    ],
  },
];

export function getAreaFromPathname(pathname: string): NavArea {
  if (pathname === "/archivio" || pathname.startsWith("/manutenzioni/archivio") || pathname.startsWith("/fatture/archivio") || pathname.startsWith("/fatture/note-credito/archivio") || pathname.startsWith("/interventi/archivio")) return "archivio";
  if (pathname === "/" || pathname.startsWith("/servizi")) return "servizi";
  if (pathname.startsWith("/clienti") || pathname.startsWith("/amministratori") || pathname.startsWith("/impianti") || pathname.startsWith("/contratti")) return "servizi";
  if (pathname.startsWith("/booking")) return "booking";
  if (pathname.startsWith("/field") || pathname.startsWith("/manutenzioni") || pathname.startsWith("/interventi") || pathname.startsWith("/verifiche-biennali") || pathname.startsWith("/giro")) return "field";
  if (pathname.startsWith("/fatturazione") || pathname.startsWith("/fatture")) return "fatturazione";
  if (pathname.startsWith("/tecnici") || pathname.startsWith("/presenze")) return "tecnici";
  if (pathname.startsWith("/admin") || pathname.startsWith("/utenti") || pathname.startsWith("/impostazioni")) return "admin";
  return "servizi";
}

export function getSidebarLinksForArea(area: NavArea) {
  return NAV_AREAS.find((a) => a.id === area)?.sidebarLinks ?? NAV_AREAS[0].sidebarLinks;
}

/** Menu ridotto per l’area dedicata ai tecnici (stessa app, layout semplificato) */
export const TECNICO_NAV_ITEMS: { id: string; label: string; href: string; permKey: string }[] = [
  { id: "home", label: "Home", href: "/tecnici", permKey: "Tecnici" },
  { id: "servizi", label: "Servizi", href: "/tecnici/servizi", permKey: "Manutenzioni" },
  { id: "presenze", label: "Presenze", href: "/presenze", permKey: "Presenze" },
];

/** Visibilità voce Servizi: visibile se il tecnico ha almeno uno tra Manutenzioni, Interventi, VerificheBiennali */
export function tecnicoCanSeeServizi(permissions: any): boolean {
  return Boolean(
    permissions?.Manutenzioni?.READ ||
    permissions?.Interventi?.READ ||
    permissions?.VerificheBiennali?.READ
  );
}

export function getTecnicoCurrentArea(pathname: string): string {
  if (pathname === "/tecnici" || pathname === "/") return "home";
  if (pathname === "/tecnici/servizi" || pathname.startsWith("/manutenzioni") || pathname.startsWith("/interventi") || pathname.startsWith("/verifiche-biennali") || pathname.startsWith("/giro")) return "servizi";
  if (pathname.startsWith("/presenze")) return "presenze";
  return "home";
}
