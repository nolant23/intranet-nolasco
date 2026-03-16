"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Comune {
  nome: string;
  provincia: string;
  cap: string[];
}

interface ComuneAutocompleteProps {
  value?: string;
  onSelectData: (comune: string, cap: string, provincia: string) => void;
  error?: boolean;
}

export function ComuneAutocomplete({ value, onSelectData, error }: ComuneAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Comune[]>([]);
  const [loading, setLoading] = useState(false);

  // For multi-cap selection
  const [selectedComune, setSelectedComune] = useState<Comune | null>(null);
  const [multiCapOpen, setMultiCapOpen] = useState(false);
  const [chosenCap, setChosenCap] = useState("");

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const fetchComuni = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/comuni?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const delay = setTimeout(fetchComuni, 300);
    return () => clearTimeout(delay);
  }, [query]);

  const handleSelect = (comune: Comune) => {
    setOpen(false);
    if (comune.cap.length === 1) {
      onSelectData(comune.nome, comune.cap[0], comune.provincia);
    } else {
      setSelectedComune(comune);
      setMultiCapOpen(true);
    }
  };

  const confirmMultiCap = () => {
    if (selectedComune && chosenCap) {
      onSelectData(selectedComune.nome, chosenCap, selectedComune.provincia);
      setMultiCapOpen(false);
      setSelectedComune(null);
      setChosenCap("");
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger 
          id="comune-autocomplete-trigger"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "w-full justify-between font-normal h-11 px-3 rounded-lg border-2 border-slate-200 bg-white hover:border-slate-300 text-sm transition-all duration-200",
            !value && "text-slate-400",
            error && "border-destructive"
          )}
        >
          {value || "Seleziona un comune..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Cerca comune (es. Palermo)..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {loading && (
                <div className="py-6 text-center text-sm flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ricerca in corso...
                </div>
              )}
              {!loading && results.length === 0 && query.length >= 2 && (
                <CommandEmpty>Nessun comune trovato.</CommandEmpty>
              )}
              {!loading && results.length > 0 && (
                <CommandGroup>
                  {results.map((c) => (
                    <CommandItem
                      key={c.nome + c.provincia}
                      value={c.nome}
                      onSelect={() => handleSelect(c)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === c.nome ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {c.nome} ({c.provincia})
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={multiCapOpen} onOpenChange={setMultiCapOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selezione CAP Multiplo</DialogTitle>
            <DialogDescription>
              Il comune di {selectedComune?.nome} ha più di un CAP. Seleziona quello corretto per l'indirizzo indicato.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Scegli il CAP</Label>
              <Select value={chosenCap} onValueChange={(val) => val && setChosenCap(val)}>
                <SelectTrigger id="multi-cap-select-trigger">
                  <SelectValue placeholder="Seleziona un CAP..." />
                </SelectTrigger>
                <SelectContent>
                  {selectedComune?.cap.map((cap) => (
                    <SelectItem key={cap} value={cap}>
                      {cap}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={confirmMultiCap} disabled={!chosenCap} className="w-full">
              Conferma CAP
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
