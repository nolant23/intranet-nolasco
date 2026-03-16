"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { generaEstrattoConto } from "../actions";

export function EstrattoContoButton({ amministratoreId }: { amministratoreId: string }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (!amministratoreId) return;
    setIsLoading(true);
    try {
      const res = await generaEstrattoConto(amministratoreId);
      if (!res?.success || !res.url) {
        alert(res?.error || "Errore durante la generazione dell'estratto conto");
        return;
      }
      window.open(res.url, "_blank");
    } catch (e) {
      alert("Errore imprevisto durante la generazione dell'estratto conto");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      size="lg"
      variant="outline"
      className="w-full sm:w-auto uppercase tracking-wider border-slate-300 text-slate-800 hover:bg-slate-50"
      onClick={handleClick}
      disabled={isLoading}
    >
      <FileDown className={`mr-2 h-5 w-5 ${isLoading ? "animate-pulse" : ""}`} />
      {isLoading ? "Generazione..." : "Estratto conto PDF"}
    </Button>
  );
}

