/**
 * Converte l'URL di un'immagine (firma) in data URL base64.
 * Usato all'import da CSV per salvare le firme in base64 invece che come URL.
 */
export async function urlToBase64DataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");
    const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}
