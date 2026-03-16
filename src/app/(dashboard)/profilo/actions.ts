"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";

export async function updateProfilo(data: { email: string; password?: string }) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: "Non autorizzato" };

    const updateData: any = { email: data.email };
    if (data.password) {
      updateData.password = data.password;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    revalidatePath("/profilo");
    return { success: true };
  } catch (error) {
    console.error("Errore aggiornamento profilo:", error);
    return { success: false, error: "Errore durante l'aggiornamento" };
  }
}
