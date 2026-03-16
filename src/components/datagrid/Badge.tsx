"use client";

const TIPOLOGIA_VARIANT: Record<string, string> = {
  Ascensore: "ascensore",
  "Piattaforma Elevatrice": "piattaforma-elevatrice",
  Montavivande: "default",
  Montascale: "default",
  Vimec: "default",
  "Servoscala a pedana": "default",
  Montalettighe: "default",
  Montacarichi: "default",
};

const AZIONAMENTO_VARIANT: Record<string, string> = {
  Elettrico: "elettrico",
  Oleodinamico: "oleodinamico",
};

const ROLE_VARIANT: Record<string, string> = {
  ADMIN: "admin",
  UFFICIO: "ufficio",
  TECNICO: "tecnico",
};

export type BadgeVariant =
  | "ascensore"
  | "piattaforma-elevatrice"
  | "oleodinamico"
  | "elettrico"
  | "default"
  | "admin"
  | "ufficio"
  | "tecnico";

function normalizeKey(val: string | null | undefined): string {
  if (val == null) return "";
  return String(val).trim();
}

/** Restituisce la variant per un valore di tipologia impianto */
export function getTipologiaVariant(tipologia: string | null | undefined): BadgeVariant {
  const key = normalizeKey(tipologia);
  const v = TIPOLOGIA_VARIANT[key];
  return (v as BadgeVariant) ?? "default";
}

/** Restituisce la variant per un valore di azionamento */
export function getAzionamentoVariant(azionamento: string | null | undefined): BadgeVariant {
  const key = normalizeKey(azionamento);
  const v = AZIONAMENTO_VARIANT[key];
  return (v as BadgeVariant) ?? "default";
}

/** Restituisce la variant per un ruolo utente */
export function getRoleVariant(role: string | null | undefined): BadgeVariant {
  const key = normalizeKey(role)?.toUpperCase();
  const v = ROLE_VARIANT[key];
  return (v as BadgeVariant) ?? "default";
}

export function Badge({
  children,
  variant = "default",
  className = "",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={`datagrid-badge datagrid-badge--${variant} ${className}`.trim()}
      title={typeof children === "string" ? children : undefined}
    >
      {children ?? "—"}
    </span>
  );
}

/** Badge per tipologia impianto (Ascensore → blu, Piattaforma Elevatrice → viola, ecc.) */
export function TipologiaBadge({ value }: { value: string | null | undefined }) {
  return <Badge variant={getTipologiaVariant(value)}>{value || "—"}</Badge>;
}

/** Badge per azionamento (Elettrico → verde, Oleodinamico → arancione) */
export function AzionamentoBadge({ value }: { value: string | null | undefined }) {
  return <Badge variant={getAzionamentoVariant(value)}>{value || "—"}</Badge>;
}

/** Badge per ruolo utente */
export function RoleBadge({ value }: { value: string | null | undefined }) {
  return <Badge variant={getRoleVariant(value)}>{value || "—"}</Badge>;
}
