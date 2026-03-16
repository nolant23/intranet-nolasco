"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FatturaDetailView } from "../components/FatturaDetailView";

export function FatturaDetailPageClient({
  fattura,
  permissions,
}: {
  fattura: any;
  permissions: any;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromHome = searchParams.get("from") === "home";
  const fromArchivio = searchParams.get("from") === "archivio";
  const returnQ = searchParams.get("q");
  const handleClose = () => {
    if (fromHome && returnQ != null && returnQ !== "") {
      router.push(`/home?q=${encodeURIComponent(returnQ)}`);
    } else if (fromArchivio) {
      router.push("/fatture/archivio");
    } else {
      router.push("/fatture");
    }
  };

  return (
    <FatturaDetailView
      fattura={fattura}
      permissions={permissions}
      onClose={handleClose}
      isStandalone
    />
  );
}
