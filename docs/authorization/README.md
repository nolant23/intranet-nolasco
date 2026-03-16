# Sistema autorizzazioni

Refactor production-grade: RBAC + ownership, deny by default, nessuna fiducia nel frontend.

## Documenti

- **ANALISI_RISCHI.md** – Rischi attuali e modello di sicurezza target
- **PERMISSION_MATRIX.md** – Matrice permessi per modulo e regole campi sensibili
- **SCHEMA_RLS.md** – Schema tabelle e uso JWT per RLS Supabase

## Codice

- **`src/lib/authz/`**
  - `constants.ts` – Ruoli, permessi, entità ownership/economic/admin-only
  - `matrix.ts` – `hasModulePermission()`, `getModuleForEntity()`
  - `guard.ts` – `requireAuth()`, `requirePermission()`, `requireEntityPermission()`, `requireOwnership()`, `withAuthz()`, `ForbiddenError`
  - `filters.ts` – Filtri Prisma per ruolo: `impiantiWhereForRole()`, `manutenzioneWhereForRole()`, ecc.
  - `index.ts` – Export pubblici

## Uso nelle server actions

1. **Lettura lista (con ownership)**  
   `const ctx = await requireEntityPermission("Impianto", "READ");`  
   Poi usa `impiantiWhereForRole(ctx)` nel `where` di Prisma.

2. **Lettura singolo record (ownership)**  
   Dopo `findUnique`, chiama `requireOwnership(ctx, record.tecnicoId)` (per entità con tecnicoId).

3. **Create/Update/Delete**  
   `await requireEntityPermission("Impianto", "CREATE"|"UPDATE"|"DELETE");`  
   Per UPDATE/DELETE su entità con ownership, leggi il record e chiama `requireOwnership(ctx, record.tecnicoId)` prima di modificare.

4. **Ritorno 403**  
   Cattura `ForbiddenError` e restituisci `{ success: false, error: e.message, forbidden: true }`; nelle page fare redirect se `forbidden`.

## RLS Supabase

Le policy sono in `supabase/migrations/20250309000000_rls_authorization.sql`.  
Si applicano quando l’accesso al DB avviene con il client Supabase e JWT utente (con `app_metadata.prisma_user_id` e `app_metadata.role`).  
Con solo Prisma (connection diretto) la sicurezza è garantita dal layer applicativo (guard + filtri).

## Esempi refactor

- **Impianti**: `src/app/(dashboard)/impianti/actions.ts` e `page.tsx` – getImpianti/getImpiantoDetail/save/delete con permessi e filtri tecnico.
- **Manutenzioni (rapportini)**: `src/app/(dashboard)/manutenzioni/actions.ts` e `page.tsx` – getManutenzioniPaginated, getManutenzioneById, saveManutenzione, deleteManutenzione con READ/ownership e CREATE/UPDATE/DELETE + ownership.
