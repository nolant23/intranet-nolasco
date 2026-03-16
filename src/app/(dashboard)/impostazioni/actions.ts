"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { PermissionMatrix } from "@/lib/permissions";

export async function savePermissions(matrix: PermissionMatrix) {
  try {
    for (const [role, perms] of Object.entries(matrix)) {
      const permsString = JSON.stringify(perms);
      
      await prisma.rolePermission.upsert({
        where: { role },
        update: { permissions: permsString },
        create: { role, permissions: permsString },
      });
    }

    revalidatePath("/", "layout"); // Revalidate everything so that the new permissions take effect everywhere
    return { success: true };
  } catch (error) {
    console.error("Errore nel salvataggio permessi:", error);
    return { success: false, error: "Impossibile salvare i permessi" };
  }
}
