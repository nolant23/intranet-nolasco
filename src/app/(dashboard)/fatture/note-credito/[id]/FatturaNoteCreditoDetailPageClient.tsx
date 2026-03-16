"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { NotaCreditoDetailView } from "../components/NotaCreditoDetailView";
import { FatturaDetailView } from "@/app/(dashboard)/fatture/components/FatturaDetailView";
import { getFatturaById } from "@/app/(dashboard)/fatture/actions";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export function FatturaNoteCreditoDetailPageClient({
  nota,
  permissionsFatture,
}: {
  nota: any;
  permissionsFatture?: any;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromHome = searchParams.get("from") === "home";
  const returnQ = searchParams.get("q");
  const handleClose = () => {
    if (fromHome && returnQ != null && returnQ !== "") {
      router.push(`/home?q=${encodeURIComponent(returnQ)}`);
    } else {
      router.push("/fatture/note-credito");
    }
  };
  const [selectedFatturaId, setSelectedFatturaId] = useState<string | null>(null);
  const [fatturaData, setFatturaData] = useState<any | null>(null);
  const [loadingFattura, setLoadingFattura] = useState(false);

  useEffect(() => {
    if (!selectedFatturaId) {
      setFatturaData(null);
      return;
    }
    let cancelled = false;
    setLoadingFattura(true);
    getFatturaById(selectedFatturaId).then((res) => {
      if (cancelled) return;
      setLoadingFattura(false);
      if (res?.success && (res as any).data) setFatturaData((res as any).data);
      else setFatturaData(null);
    });
    return () => { cancelled = true; };
  }, [selectedFatturaId]);

  return (
    <>
      <NotaCreditoDetailView
        nota={nota}
        onClose={handleClose}
        onOpenFattura={(id) => setSelectedFatturaId(id)}
        isStandalone
      />
      <Dialog open={!!selectedFatturaId} onOpenChange={(open) => !open && setSelectedFatturaId(null)}>
        <DialogContent className="sm:max-w-2xl bg-white p-0 overflow-hidden rounded-2xl max-h-[90vh] overflow-y-auto">
          {selectedFatturaId && (
            loadingFattura ? (
              <div className="p-8 text-slate-500">Caricamento...</div>
            ) : fatturaData ? (
              <FatturaDetailView fattura={fatturaData} permissions={permissionsFatture || {}} onClose={() => setSelectedFatturaId(null)} isStandalone={false} />
            ) : (
              <div className="p-8 text-slate-500">Fattura non trovata.</div>
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
