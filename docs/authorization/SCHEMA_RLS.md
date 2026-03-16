# Schema e RLS

## Tabelle esistenti (Prisma)

Le tabelle sono definite in `prisma/schema.prisma` e create con `prisma migrate`. Nomi tabelle PostgreSQL (identificatori Prisma): `User`, `Cliente`, `Amministratore`, `Impianto`, `Contratto`, `ServizioContratto`, `Manutenzione`, `Intervento`, `VerificaBiennale`, `RolePermission`, `Presenza`, `Fattura`, `NotaCredito`, `Booking`, `PresenzaCantiere`, `CondizionePagamento`, `BookingCliente`.

## JWT per RLS (Supabase)

Se l’accesso al DB avviene tramite Supabase con JWT utente, le policy leggono:

- `(auth.jwt() -> 'app_metadata' ->> 'prisma_user_id')::uuid` → ID utente Prisma
- `(auth.jwt() -> 'app_metadata' ->> 'role')` → ruolo (ADMIN, UFFICIO, TECNICO)

Assicurarsi che al login vengano impostati `app_metadata.prisma_user_id` e `app_metadata.role` (vedi auth e Supabase).

## Quando si applica la RLS

- **Con Supabase Client** (browser o server con JWT utente): la RLS si applica e le policy sotto sono rilevanti.
- **Con solo Prisma** (connection string diretto, senza JWT): la RLS non viene valutata; l’unica protezione è il layer applicativo (server actions + authz). In quel caso le policy restano utili per futuri accessi via Supabase o per difesa in profondità se si introduce un proxy che inietta il JWT.

La migration in `supabase/migrations/` abilita RLS e crea le policy; va applicata solo se il database è Supabase Postgres e si vuole usare RLS.
