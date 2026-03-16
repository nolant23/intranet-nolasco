"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Pulsante Chiudi: se la pagina è stata aperta dalla ricerca home (?from=home&q=...)
 * torna a /home?q=... altrimenti alla lista indicata.
 */
export function ChiudiButton({
  listPath,
  className,
}: {
  listPath: string;
  className?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromHome = searchParams.get("from") === "home";
  const returnQ = searchParams.get("q");

  const handleClose = () => {
    if (fromHome && returnQ != null && returnQ !== "") {
      router.push(`/home?q=${encodeURIComponent(returnQ)}`);
    } else {
      router.push(listPath);
    }
  };

  return (
    <Button
      variant="destructive"
      className={className ?? "bg-red-600 hover:bg-red-700 text-white"}
      onClick={handleClose}
    >
      Chiudi
    </Button>
  );
}
