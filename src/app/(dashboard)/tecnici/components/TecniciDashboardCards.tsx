"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Hammer, ClipboardCheck, HardHat } from "lucide-react";

type Props = {
  permissions: any;
};

export function TecniciDashboardCards({ permissions }: Props) {
  const canManutenzioni = permissions?.Manutenzioni?.CREATE ?? permissions?.Manutenzioni?.READ;
  const canInterventi = permissions?.Interventi?.CREATE ?? permissions?.Interventi?.READ;
  const canVerifiche = permissions?.VerificheBiennali?.CREATE ?? permissions?.VerificheBiennali?.READ;
  const canPresenzeCantiere = permissions?.PresenzeCantiere?.CREATE ?? permissions?.PresenzeCantiere?.READ ?? permissions?.Booking?.READ;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {canManutenzioni && (
        <Link href="/tecnici/servizi/manutenzioni/nuova" className="block group">
          <Card className="h-full hover:shadow-xl transition-all duration-300 border-none shadow-[0_14px_40px_rgba(15,23,42,0.20)] rounded-[24px] group-hover:-translate-y-1 bg-gradient-to-br from-sky-600 via-sky-500 to-sky-400 text-white overflow-hidden relative">
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <CardTitle className="text-xl font-black uppercase tracking-wider text-white/90">
                Nuova manutenzione
              </CardTitle>
              <div className="p-4 bg-white/15 rounded-2xl group-hover:bg-white/25 transition-colors duration-300">
                <Wrench className="h-8 w-8 text-white" strokeWidth={2.5} />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <p className="text-base text-sky-50 font-bold uppercase tracking-wider">
                Registra manutenzione
              </p>
            </CardContent>
          </Card>
        </Link>
      )}
      {canInterventi && (
        <Link href="/tecnici/servizi/interventi/nuova" className="block group">
          <Card className="h-full hover:shadow-xl transition-all duration-300 border-none shadow-[0_14px_40px_rgba(15,23,42,0.20)] rounded-[24px] group-hover:-translate-y-1 bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-400 text-white overflow-hidden relative">
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <CardTitle className="text-xl font-black uppercase tracking-wider text-white/90">
                Nuovo intervento
              </CardTitle>
              <div className="p-4 bg-white/15 rounded-2xl group-hover:bg-white/25 transition-colors duration-300">
                <Hammer className="h-8 w-8 text-white" strokeWidth={2.5} />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <p className="text-base text-emerald-50 font-bold uppercase tracking-wider">
                Registra intervento
              </p>
            </CardContent>
          </Card>
        </Link>
      )}
      {canVerifiche && (
        <Link href="/tecnici/servizi/verifiche-biennali/nuova" className="block group">
          <Card className="h-full hover:shadow-xl transition-all duration-300 border-none shadow-[0_14px_40px_rgba(15,23,42,0.20)] rounded-[24px] group-hover:-translate-y-1 bg-gradient-to-br from-violet-600 via-violet-500 to-violet-400 text-white overflow-hidden relative">
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <CardTitle className="text-xl font-black uppercase tracking-wider text-white/90">
                Nuova verifica biennale
              </CardTitle>
              <div className="p-4 bg-white/15 rounded-2xl group-hover:bg-white/25 transition-colors duration-300">
                <ClipboardCheck className="h-8 w-8 text-white" strokeWidth={2.5} />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <p className="text-base text-violet-50 font-bold uppercase tracking-wider">
                Registra verifica periodica
              </p>
            </CardContent>
          </Card>
        </Link>
      )}
      {canPresenzeCantiere && (
        <Link href="/tecnici/presenze/presenze-cantiere/nuova" className="block group">
          <Card className="h-full hover:shadow-xl transition-all duration-300 border-none shadow-[0_14px_40px_rgba(15,23,42,0.20)] rounded-[24px] group-hover:-translate-y-1 bg-gradient-to-br from-amber-500 via-amber-400 to-amber-300 text-slate-900 overflow-hidden relative">
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <CardTitle className="text-xl font-black uppercase tracking-wider text-slate-900/90">
                Nuova presenza cantiere
              </CardTitle>
              <div className="p-4 bg-white/40 rounded-2xl group-hover:bg-white/60 transition-colors duration-300">
                <HardHat className="h-8 w-8 text-amber-700" strokeWidth={2.5} />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <p className="text-base text-amber-900 font-bold uppercase tracking-wider">
                Registra presenza in cantiere
              </p>
            </CardContent>
          </Card>
        </Link>
      )}
    </div>
  );
}
