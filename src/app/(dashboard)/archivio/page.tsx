import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, FileMinus, Wrench, Hammer, Archive } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getPermissionsForRole } from "@/lib/permissions";
import { redirect } from "next/navigation";

const CARD_STYLES = [
  "from-sky-600 via-sky-500 to-sky-400 text-white",
  "from-red-600 via-red-500 to-red-400 text-white",
  "from-emerald-600 via-emerald-500 to-emerald-400 text-white",
  "from-amber-500 via-amber-400 to-amber-300 text-slate-900",
] as const;

const CARD_SUBTITLE = [
  "text-sky-50",
  "text-red-50",
  "text-emerald-50",
  "text-amber-900",
] as const;

const CARD_ICON_BG = [
  "bg-white/15 group-hover:bg-white/25",
  "bg-white/15 group-hover:bg-white/25",
  "bg-white/15 group-hover:bg-white/25",
  "bg-white/40 group-hover:bg-white/60",
] as const;

export default async function ArchivioPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const permissions = await getPermissionsForRole(user.role);
  if (!permissions?.Archivio?.READ) redirect("/");

  const cards = [
    {
      title: "Fatture",
      description: "Fatture degli anni passati",
      href: "/fatture/archivio",
      icon: Receipt,
      permKey: "Fatture" as const,
    },
    {
      title: "Note di credito",
      description: "Note di credito degli anni passati",
      href: "/fatture/note-credito/archivio",
      icon: FileMinus,
      permKey: "Fatture" as const,
    },
    {
      title: "Manutenzioni",
      description: "Manutenzioni degli anni passati",
      href: "/manutenzioni/archivio",
      icon: Wrench,
      permKey: "Manutenzioni" as const,
    },
    {
      title: "Interventi",
      description: "Interventi degli anni passati",
      href: "/interventi/archivio",
      icon: Hammer,
      permKey: "Interventi" as const,
    },
  ].filter((c) => permissions?.[c.permKey]?.READ);

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase">
            Archivio
          </h1>
          <p className="text-slate-500 text-lg font-medium mt-2">
            Record non relativi all&apos;anno in corso: fatture, note di credito, manutenzioni, interventi
          </p>
        </div>
        <div className="flex items-center gap-3 text-primary bg-primary/10 px-6 py-4 rounded-2xl font-black tracking-wide uppercase text-sm">
          <Archive className="h-6 w-6" strokeWidth={2.5} />
          <span>Archivio</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => {
          const Icon = card.icon;
          const gradient = CARD_STYLES[index % CARD_STYLES.length];
          const subtitleClass = CARD_SUBTITLE[index % CARD_SUBTITLE.length];
          const iconBg = CARD_ICON_BG[index % CARD_ICON_BG.length];
          const iconColor = card.title === "Interventi" ? "text-amber-700" : "text-white";
          return (
            <Link key={card.href} href={card.href} className="block group">
              <Card className={`h-full hover:shadow-xl transition-all duration-300 border-none shadow-[0_14px_40px_rgba(15,23,42,0.20)] rounded-[24px] group-hover:-translate-y-1 bg-gradient-to-br ${gradient} overflow-hidden relative`}>
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Icon className="w-32 h-32 text-current" />
                </div>
                <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                  <CardTitle className={`text-xl font-black uppercase tracking-wider ${card.title === "Interventi" ? "text-slate-900/90" : "text-white/90"}`}>
                    {card.title}
                  </CardTitle>
                  <div className={`p-4 rounded-2xl transition-colors duration-300 ${iconBg}`}>
                    <Icon className={`h-8 w-8 ${iconColor}`} strokeWidth={2.5} />
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <p className={`text-base font-bold uppercase tracking-wider ${subtitleClass}`}>
                    {card.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
