/**
 * Script di migrazione: crea gli utenti Prisma in Supabase Auth e imposta app_metadata (role, prisma_user_id).
 *
 * Prerequisiti:
 * - Progetto Supabase creato, variabili in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL=
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=
 *   SUPABASE_SERVICE_ROLE_KEY=  (solo per questo script)
 * - Eseguire: npx tsx scripts/migrate-users-to-supabase.ts
 *
 * Nota: le password attuali sono in chiaro nel DB; lo script le invia a Supabase che le hasherà.
 * Dopo la migrazione si consiglia di far cambiare password agli utenti (o usare "Reset password" da Supabase).
 */

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ where: { attivo: true } });
  console.log(`Trovati ${users.length} utenti attivi. Creazione in Supabase...`);

  for (const user of users) {
    try {
      const { data: existing } = await supabase.auth.admin.listUsers();
      const alreadyExists = existing?.users?.some((u) => u.email === user.email);
      if (alreadyExists) {
        console.log(`  Skip ${user.email} (già presente in Supabase)`);
        continue;
      }

      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { name: user.name },
        app_metadata: {
          role: user.role,
          prisma_user_id: user.id,
        },
      });

      if (error) {
        console.error(`  Errore ${user.email}:`, error.message);
        continue;
      }
      console.log(`  OK ${user.email} (role: ${user.role})`);
    } catch (e) {
      console.error(`  Errore ${user.email}:`, e);
    }
  }

  console.log("Migrazione completata.");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
