"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

type Option = {
  value: string;
  label: string;
  description?: string;
};

interface SearchableSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  placeholder?: string;
  noResultsLabel?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Seleziona...",
  noResultsLabel = "Nessun risultato",
}: SearchableSelectProps) {
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(q) ||
      (opt.description
        ? opt.description.toLowerCase().includes(q)
        : false)
    );
  }, [options, search]);

  const currentOption = options.find((o) => o.value === value);
  const currentLabel = currentOption?.label ?? "";
  const currentDescription = currentOption?.description ?? "";
  const currentDisplay = currentLabel
    ? currentDescription
      ? `${currentLabel} — ${currentDescription}`
      : currentLabel
    : "";

  return (
    <div className="space-y-2">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={currentDisplay || placeholder}
        className="h-9 text-sm"
      />
      {search.trim().length > 0 && (
        <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white px-2 py-1">
          {filteredOptions.length === 0 ? (
            <div className="px-2 py-2 text-xs text-slate-500">
              {noResultsLabel}
            </div>
          ) : (
            filteredOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  // nascondi l'elenco dopo la selezione
                  setSearch("");
                }}
                className="w-full text-left border border-slate-200 rounded-xl my-1 px-3 py-2 bg-white hover:bg-slate-50 transition-colors"
              >
                <div className="flex flex-col items-start gap-0.5">
                  <span className="text-sm font-medium text-slate-900 whitespace-normal break-words">
                    {opt.label}
                  </span>
                  {opt.description ? (
                    <span className="text-[11px] text-slate-500 whitespace-normal break-words">
                      {opt.description}
                    </span>
                  ) : null}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

