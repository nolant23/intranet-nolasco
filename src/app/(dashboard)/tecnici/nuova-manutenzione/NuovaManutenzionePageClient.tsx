"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ManutenzioneForm } from "@/app/(dashboard)/manutenzioni/components/ManutenzioneForm";

type Props = {
  impiantiDaManutenere: any[];
  tecnici: any[];
  currentUser: any;
  backHref?: string;
  onSuccessRedirect?: string;
};

export function NuovaManutenzionePageClient({
  impiantiDaManutenere,
  tecnici,
  currentUser,
  backHref = "/tecnici",
  onSuccessRedirect = "/tecnici",
}: Props) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6 w-full min-h-0">
      <div className="flex items-center gap-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold"
        >
          <ArrowLeft className="h-5 w-5" /> Indietro
        </Link>
      </div>
      <div className="bg-white p-6 md:p-8 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex-1">
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 mb-6">
          Nuova manutenzione
        </h1>
        <ManutenzioneForm
          impiantiDaManutenere={impiantiDaManutenere}
          tecnici={tecnici}
          currentUser={currentUser}
          onSuccess={() => router.push(onSuccessRedirect)}
        />
      </div>
    </div>
  );
}
