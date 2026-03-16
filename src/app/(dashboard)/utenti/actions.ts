"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getUtenti() {
  return await prisma.user.findMany({
    orderBy: { name: "asc" },
  });
}

export async function saveUtente(data: any) {
  try {
    if (data.id) {
      await prisma.user.update({
        where: { id: data.id },
        data: {
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role,
          attivo: data.attivo ?? true,
        },
      });
    } else {
      await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role,
          attivo: data.attivo ?? true,
        },
      });
    }
    revalidatePath("/utenti");
    return { success: true };
  } catch (error) {
    console.error("Errore salvataggio utente:", error);
    return { success: false, error: "Errore durante il salvataggio" };
  }
}

export async function deleteUtente(id: string) {
  try {
    await prisma.user.delete({ where: { id } });
    revalidatePath("/utenti");
    return { success: true };
  } catch (error) {
    console.error("Errore eliminazione utente:", error);
    return { success: false, error: "Errore durante l'eliminazione" };
  }
}
