import "server-only";
import fs from "fs";
import path from "path";

/**
 * Service role key: usata SOLO in questo modulo lato server (upload Storage).
 * Non esporre SUPABASE_SERVICE_ROLE_KEY al client: i permessi reali devono
 * restare in RLS; il client usa solo anon key (createBrowserClient / createServerClient).
 */
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET || "nolasco-files";

/**
 * Carica un PDF locale su Supabase Storage e restituisce l'URL pubblico.
 * folder: sottocartella nel bucket (es. 'rapportini', 'fatture', 'note-credito'). Default 'rapportini'.
 * Se le variabili d'ambiente non sono configurate, restituisce null.
 */
export async function uploadPdfToSupabaseFromLocal(
  localPathOrUrl: string,
  objectName: string,
  folder: string = "rapportini"
): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      "Supabase storage non configurato (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY mancanti)."
    );
    return null;
  }

  let absolutePath: string;

  if (localPathOrUrl.startsWith("http://") || localPathOrUrl.startsWith("https://")) {
    // In futuro potremmo anche accettare URL remoti, per ora gestiamo solo file locali
    console.warn(
      "uploadPdfToSupabaseFromLocal chiamato con URL remoto; atteso percorso locale. Salto upload."
    );
    return null;
  }

  // Path tipo /uploads/..., /rapportini/... sono URL/path relativi a public/, non assoluti su filesystem
  const isWebPath = localPathOrUrl.startsWith("/uploads") || localPathOrUrl.startsWith("/rapportini");
  if (path.isAbsolute(localPathOrUrl) && !isWebPath) {
    absolutePath = localPathOrUrl;
  } else {
    const relative = localPathOrUrl.replace(/^\/+/, "");
    absolutePath = path.join(process.cwd(), "public", relative);
  }

  if (!fs.existsSync(absolutePath)) {
    console.warn("File PDF locale non trovato per upload Supabase:", absolutePath);
    return null;
  }

  const fileBuffer = await fs.promises.readFile(absolutePath);

  const objectPath = `${folder}/${objectName}`;
  const endpoint = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(
    SUPABASE_STORAGE_BUCKET
  )}/${objectPath}`;

  const res = await fetch(endpoint, {
    method: "PUT",
    headers: {
      "Content-Type": "application/pdf",
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "x-upsert": "true",
    },
    body: fileBuffer,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(
      "Errore upload PDF su Supabase:",
      res.status,
      res.statusText,
      text
    );
    return null;
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(
    SUPABASE_STORAGE_BUCKET
  )}/${objectPath}`;

  return publicUrl;
}

/**
 * Scarica un PDF da un URL (es. Glide) e lo carica su Supabase Storage.
 * Restituisce l'URL pubblico Supabase o null in caso di errore.
 */
export async function uploadPdfToSupabaseFromUrl(
  pdfUrl: string,
  objectName: string,
  folder: string = "rapportini"
): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("Supabase storage non configurato.");
    return null;
  }
  if (!pdfUrl?.startsWith("http://") && !pdfUrl?.startsWith("https://")) {
    return null;
  }
  try {
    const res = await fetch(pdfUrl);
    if (!res.ok) return null;
    const fileBuffer = await res.arrayBuffer();
    const objectPath = `${folder}/${objectName}`;
    const endpoint = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(
      SUPABASE_STORAGE_BUCKET
    )}/${objectPath}`;
    const uploadRes = await fetch(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/pdf",
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "x-upsert": "true",
      },
      body: fileBuffer,
    });
    if (!uploadRes.ok) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(
      SUPABASE_STORAGE_BUCKET
    )}/${objectPath}`;
  } catch {
    return null;
  }
}

/**
 * Carica un buffer su Supabase Storage e restituisce l'URL pubblico.
 * Usato per documenti booking (PDF, immagini, etc.).
 */
export async function uploadBufferToSupabase(
  buffer: Buffer,
  objectName: string,
  folder: string,
  contentType: string = "application/octet-stream"
): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("Supabase storage non configurato.");
    return null;
  }
  const objectPath = `${folder}/${objectName}`;
  const endpoint = `${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(
    SUPABASE_STORAGE_BUCKET
  )}/${objectPath}`;
  const res = await fetch(endpoint, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "x-upsert": "true",
    },
    body: new Uint8Array(buffer),
  });
  if (!res.ok) {
    console.error("Errore upload su Supabase:", res.status, await res.text().catch(() => ""));
    return null;
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(
    SUPABASE_STORAGE_BUCKET
  )}/${objectPath}`;
}

