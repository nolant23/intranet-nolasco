# Migrazione auth a Supabase

L’app usa **Supabase Auth** per login, sessione e permessi (ruolo in JWT). Il DB Prisma resta per tutti gli altri dati (Clienti, Impianti, Fatture, User come tecnici/manutenzioni, ecc.).

## 1. Configurazione Supabase

1. Crea un progetto su [supabase.com](https://supabase.com).
2. In **Settings → API** copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** (solo per lo script di migrazione) → `SUPABASE_SERVICE_ROLE_KEY`

3. Aggiungi in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # solo per migrate-users-to-supabase
```

## 2. Migrare gli utenti esistenti

Gli utenti sono ancora nella tabella Prisma `User`. Per avere il login Supabase con lo stesso ruolo:

1. Installa `tsx` se non c’è: `npm i -D tsx`
2. Esegui lo script (legge Prisma, crea utenti in Supabase con `app_metadata.role` e `app_metadata.prisma_user_id`):

```bash
npx tsx scripts/migrate-users-to-supabase.ts
```

Lo script:

- legge tutti gli utenti attivi da Prisma
- per ciascuno crea un utente Supabase con stessa email/password
- imposta `app_metadata: { role, prisma_user_id }` così il JWT contiene ruolo e id Prisma (per tecnicoId, profilo, ecc.)

**Nota:** le password in Prisma sono in chiaro; Supabase le hasherà. Dopo la migrazione puoi far cambiare password agli utenti o usare “Reset password” dal pannello Supabase.

## 3. Comportamento dopo la migrazione

- **Login:** `loginUser` usa `supabase.auth.signInWithPassword`; la sessione è nei cookie gestiti da `@supabase/ssr`.
- **Utente corrente:** `getCurrentUser()` legge dalla sessione Supabase (JWT) e restituisce `id` (prisma_user_id), `name`, `email`, `role` senza query su Prisma.
- **Permessi:** `getPermissionsForRole(role)` usa la matrice in codice + eventuali override da Prisma `RolePermission`, con cache 60 secondi.
- **Logout:** `logoutUser` chiama `supabase.auth.signOut()` e redirect a `/login`.

## 4. Creare nuovi utenti da Admin (Utenti)

Se in futuro vuoi che la pagina **Utenti** crei anche l’account Supabase quando crei un utente:

1. Aggiungi a Prisma `User` un campo opzionale `supabaseUserId String?`.
2. Nella server action di creazione utente usa l’API Admin Supabase (`auth.admin.createUser`) con `app_metadata: { role, prisma_user_id }` e salva `supabaseUserId` su Prisma.

Se non lo fai, i nuovi utenti creati solo da Prisma non potranno fare login finché non vengono creati anche in Supabase (a mano o con uno script simile a `migrate-users-to-supabase.ts`).

## 5. Variabili d’ambiente

| Variabile | Descrizione |
|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL progetto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chiave anon (pubblica) |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo per script/admin (non esporre nel client) |

## 6. Service role solo lato server – RLS

- **Client (browser):** usa solo `createSupabaseBrowserClient()` con `NEXT_PUBLIC_SUPABASE_ANON_KEY`. I permessi reali devono essere gestiti da **RLS** (Row Level Security) in Supabase.
- **Server (auth, session):** `createSupabaseServerClient()` usa solo la **anon key**; la sessione utente viene passata via cookie, quindi RLS si applica alle richieste autenticate.
- **Service role:** usata **solo** in `src/lib/supabase-storage.ts` (upload su Storage: documenti booking, fatture, rapportini, ecc.). Il modulo importa `server-only` quindi non può essere importato da componenti client; la chiave non viene mai inviata al browser.
