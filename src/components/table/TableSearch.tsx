"use client";

import { Input } from "@/components/ui/input";

export function TableSearch({
  value,
  onChange,
  placeholder = "Cerca...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="w-full max-w-md sm:max-w-lg">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full min-w-0"
      />
    </div>
  );
}

