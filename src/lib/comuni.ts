import comuniData from "@/data/comuni.json";

type ComuneRecord = {
  nome: string;
  provincia: string;
  cap: string[];
};

function normalizeComuneName(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[’']/g, "’")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const comuniIndex: Map<string, ComuneRecord> = new Map(
  (comuniData as ComuneRecord[]).map((c) => [normalizeComuneName(c.nome), c])
);

export function resolveComune(inputComune?: string | null) {
  if (!inputComune) return null;
  const key = normalizeComuneName(inputComune);
  return comuniIndex.get(key) || null;
}

