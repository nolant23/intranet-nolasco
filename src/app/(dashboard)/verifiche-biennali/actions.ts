"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";
import { uploadPdfToSupabaseFromLocal } from "@/lib/supabase-storage";

const DEFAULT_PAGE_SIZE = 25;

const VERBALI_UPLOAD_DIR = "verifiche-biennali";

/** Salva un file verbale da FormData e restituisce l'URL (locale o Supabase). */
async function saveVerbaleFile(formData: FormData): Promise<string | null> {
  const file = formData.get("verbaleFile");
  if (!file || !(file instanceof File) || file.size === 0) return null;
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || (file.type === "application/pdf" ? ".pdf" : ".jpg");
  const base = path.basename(file.name, path.extname(file.name)).replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 60) || "verbale";
  const safeName = `${Date.now()}-${base}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", VERBALI_UPLOAD_DIR);
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, safeName);
  fs.writeFileSync(filePath, buffer);
  const localPath = `/uploads/${VERBALI_UPLOAD_DIR}/${safeName}`;
  if (file.type === "application/pdf") {
    const supabaseUrl = await uploadPdfToSupabaseFromLocal(localPath, safeName, VERBALI_UPLOAD_DIR);
    return supabaseUrl ?? localPath;
  }
  return localPath;
}

/** Crea una nuova verifica biennale da form (con eventuale allegato verbale). Usata dal form crea. */
export async function createVerificaBiennale(formData: FormData) {
  try {
    const verbaleUrl = await saveVerbaleFile(formData);
    const dataVerifica = formData.get("dataVerifica");
    const impiantoId = formData.get("impiantoId");
    const tecnicoId = formData.get("tecnicoId");
    const enteNotificato = formData.get("enteNotificato");
    const clienteFirmatario = formData.get("clienteFirmatario");
    const ingegnere = formData.get("ingegnere");
    const prescrizioni = formData.get("prescrizioni");
    const firmaCliente = formData.get("firmaCliente");
    const data: {
      dataVerifica: Date;
      impiantoId?: string;
      tecnicoId?: string;
      enteNotificato?: string | null;
      clienteFirmatario?: string | null;
      ingegnere?: string | null;
      verbaleUrl?: string | null;
      prescrizioni?: string | null;
      firmaCliente?: string | null;
    } = {
      dataVerifica: dataVerifica ? new Date(String(dataVerifica)) : new Date(),
      impiantoId: impiantoId ? String(impiantoId) : undefined,
      tecnicoId: tecnicoId ? String(tecnicoId) : undefined,
      enteNotificato: enteNotificato ? String(enteNotificato) : null,
      clienteFirmatario: clienteFirmatario ? String(clienteFirmatario) : null,
      ingegnere: ingegnere ? String(ingegnere) : null,
      verbaleUrl: verbaleUrl ?? (formData.get("verbaleUrl") ? String(formData.get("verbaleUrl")) : null),
      prescrizioni: prescrizioni ? String(prescrizioni) : null,
      firmaCliente: firmaCliente ? String(firmaCliente) : null,
    };
    await prisma.verificaBiennale.create({
      data: {
        dataVerifica: data.dataVerifica,
        impiantoId: data.impiantoId ?? undefined,
        tecnicoId: data.tecnicoId ?? undefined,
        enteNotificato: data.enteNotificato ?? undefined,
        clienteFirmatario: data.clienteFirmatario ?? undefined,
        ingegnere: data.ingegnere ?? undefined,
        verbaleUrl: data.verbaleUrl ?? undefined,
        prescrizioni: data.prescrizioni ?? undefined,
        firmaCliente: data.firmaCliente ?? undefined,
      },
    });
    revalidatePath("/verifiche-biennali");
    revalidatePath("/field");
    return { success: true };
  } catch (error) {
    console.error("Errore salvataggio verifica biennale da form:", error);
    return { success: false, error: "Errore durante il salvataggio" };
  }
}

/** @deprecated Usare createVerificaBiennale(formData). Mantenuto per compatibilità. */
export async function saveVerificaBiennaleFromForm(formData: FormData) {
  return createVerificaBiennale(formData);
}

export async function saveVerificaBiennale(data: {
  dataVerifica: Date;
  impiantoId?: string;
  tecnicoId?: string;
  enteNotificato?: string | null;
  clienteFirmatario?: string | null;
  ingegnere?: string | null;
  verbaleUrl?: string | null;
  prescrizioni?: string | null;
  firmaCliente?: string | null;
}) {
  try {
    await prisma.verificaBiennale.create({
      data: {
        dataVerifica: data.dataVerifica,
        impiantoId: data.impiantoId ?? undefined,
        tecnicoId: data.tecnicoId ?? undefined,
        enteNotificato: data.enteNotificato ?? undefined,
        clienteFirmatario: data.clienteFirmatario ?? undefined,
        ingegnere: data.ingegnere ?? undefined,
        verbaleUrl: data.verbaleUrl ?? undefined,
        prescrizioni: data.prescrizioni ?? undefined,
        firmaCliente: data.firmaCliente ?? undefined,
      },
    });
    revalidatePath("/verifiche-biennali");
    revalidatePath("/field");
    return { success: true };
  } catch (error) {
    console.error("Errore salvataggio verifica biennale:", error);
    return { success: false, error: "Errore durante il salvataggio" };
  }
}

export async function getVerificheBiennaliPaginated(
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
  search: string | null = null
) {
  const skip = (page - 1) * pageSize;
  const where: any = {};
  if (search?.trim()) {
    const q = search.trim();
    where.OR = [
      { clienteFirmatario: { contains: q, mode: "insensitive" } },
      { enteNotificato: { contains: q, mode: "insensitive" } },
      { ingegnere: { contains: q, mode: "insensitive" } },
      { prescrizioni: { contains: q, mode: "insensitive" } },
      { impianto: { numeroImpianto: { contains: q, mode: "insensitive" } } },
      { tecnico: { name: { contains: q, mode: "insensitive" } } },
    ];
  }
  const [data, total] = await Promise.all([
    prisma.verificaBiennale.findMany({
      where,
      include: {
        impianto: true,
        tecnico: true,
      },
      orderBy: { dataVerifica: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.verificaBiennale.count({ where }),
  ]);
  return { data, total };
}

export async function getVerificaBiennaleById(id: string) {
  try {
    const v = await prisma.verificaBiennale.findUnique({
      where: { id },
      include: {
        impianto: { include: { cliente: true } },
        tecnico: true,
      },
    });
    if (!v) return { success: false, error: "Verifica non trovata" };
    return { success: true, data: v };
  } catch (error) {
    console.error("Errore recupero verifica biennale:", error);
    return { success: false, error: "Errore durante il recupero" };
  }
}

/** Aggiorna una verifica biennale da form (con eventuale nuovo allegato verbale). */
export async function updateVerificaBiennale(id: string, formData: FormData) {
  try {
    const verbaleUrl = await saveVerbaleFile(formData);
    const dataVerifica = formData.get("dataVerifica");
    const impiantoId = formData.get("impiantoId");
    const tecnicoId = formData.get("tecnicoId");
    const enteNotificato = formData.get("enteNotificato");
    const clienteFirmatario = formData.get("clienteFirmatario");
    const ingegnere = formData.get("ingegnere");
    const prescrizioni = formData.get("prescrizioni");
    const firmaCliente = formData.get("firmaCliente");
    const existing = await prisma.verificaBiennale.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Verifica non trovata" };
    const updateData: {
      dataVerifica: Date;
      impiantoId?: string | null;
      tecnicoId?: string | null;
      enteNotificato?: string | null;
      clienteFirmatario?: string | null;
      ingegnere?: string | null;
      verbaleUrl?: string | null;
      prescrizioni?: string | null;
      firmaCliente?: string | null;
    } = {
      dataVerifica: dataVerifica ? new Date(String(dataVerifica)) : existing.dataVerifica,
      impiantoId: impiantoId ? String(impiantoId) : existing.impiantoId,
      tecnicoId: tecnicoId ? String(tecnicoId) : existing.tecnicoId,
      enteNotificato: enteNotificato ? String(enteNotificato) : existing.enteNotificato,
      clienteFirmatario: clienteFirmatario ? String(clienteFirmatario) : existing.clienteFirmatario,
      ingegnere: ingegnere ? String(ingegnere) : existing.ingegnere,
      verbaleUrl: verbaleUrl ?? (formData.get("verbaleUrl") ? String(formData.get("verbaleUrl")) : existing.verbaleUrl),
      prescrizioni: prescrizioni ? String(prescrizioni) : existing.prescrizioni,
      firmaCliente: firmaCliente ? String(firmaCliente) : existing.firmaCliente,
    };
    await prisma.verificaBiennale.update({
      where: { id },
      data: updateData,
    });
    revalidatePath("/verifiche-biennali");
    revalidatePath("/field");
    return { success: true };
  } catch (error) {
    console.error("Errore aggiornamento verifica biennale:", error);
    return { success: false, error: "Errore durante l'aggiornamento" };
  }
}

/** Elimina una verifica biennale. */
export async function deleteVerificaBiennale(id: string) {
  try {
    await prisma.verificaBiennale.delete({ where: { id } });
    revalidatePath("/verifiche-biennali");
    revalidatePath("/field");
    return { success: true };
  } catch (error) {
    console.error("Errore eliminazione verifica biennale:", error);
    return { success: false, error: "Errore durante l'eliminazione" };
  }
}
