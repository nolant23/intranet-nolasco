"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getImpiantoDetail } from "../actions";
import { ImpiantoDetailDialogContent } from "./ImpiantoDetailDialogContent";

export function ImpiantoDetailDialog({
  impiantoId,
  children,
  className,
}: {
  impiantoId: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !impiantoId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getImpiantoDetail(impiantoId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res?.success && res.impianto) setDetail(res.impianto);
      else setDetail(null);
    });
    return () => { cancelled = true; };
  }, [open, impiantoId]);

  if (!impiantoId) return <>{children}</>;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? "text-blue-600 hover:underline text-left"}
      >
        {children}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl bg-white p-0 overflow-hidden rounded-2xl max-h-[90vh] overflow-y-auto">
          <ImpiantoDetailDialogContent
            detail={detail}
            loading={loading}
            onClose={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
