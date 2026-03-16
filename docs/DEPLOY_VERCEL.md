# Deploy su Vercel

Guida per pubblicare l’app **intranet-nolasco** (Next.js + Prisma + Supabase) su Vercel.

---

## 1. Prepara il codice

- Assicurati che `npm run build` vada a buon fine in locale.
- Fai commit e push del progetto su **GitHub** (o GitLab/Bitbucket).  
  - Non committare `.env`: le variabili andranno configurate su Vercel.
  - Verifica che `.gitignore` contenga almeno: `.env`, `.env.local`, `node_modules`, `.next`.

---

## 2. Crea il progetto su Vercel

1. Vai su [vercel.com](https://vercel.com) e accedi (o crea un account).
2. **Add New…** → **Project**.
3. **Import** il repository GitHub (autorizza Vercel se richiesto) e seleziona il repo `intranet-nolasco`.
4. **Configure Project**:
   - **Framework Preset**: Next.js (di solito rilevato in automatico).
   - **Root Directory**: lascia vuoto se il progetto è nella root del repo, altrimenti indica la cartella (es. `intranet-nolasco`).
   - **Build Command**: `npm run build` (default).
   - **Output Directory**: default (Next.js).
   - **Install Command**: `npm install`.

Non fare ancora **Deploy**: prima imposta le variabili d’ambiente.

---

## 3. Variabili d’ambiente

In **Project → Settings → Environment Variables** aggiungi tutte le variabili che usi in `.env` in locale, per **Production** (e opzionalmente Preview):

| Variabile | Descrizione | Esempio |
|-----------|-------------|---------|
| `DATABASE_URL` | Connection string Postgres (Supabase o altro) | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `NEXT_PUBLIC_SUPABASE_URL` | URL progetto Supabase | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chiave anonima Supabase | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key Supabase (storage, ecc.) | `eyJ...` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Chiave pubblica VAPID (notifiche push) | `"BNx..."` |
| `VAPID_PRIVATE_KEY` | Chiave privata VAPID | `"abc..."` |

Se usi altre variabili (es. per auth, Fatture in Cloud, Glide), aggiungile allo stesso modo.

- Per le chiavi lunghe o con caratteri speciali usa le **virgolette** nel valore (in Vercel puoi incollare il valore già tra virgolette).
- **Non** inserire mai `.env` nel repository.

---

## 4. Database (Prisma)

- L’app in produzione deve usare lo **stesso** database Postgres (es. Supabase) o uno dedicato.
- Usa in `DATABASE_URL` l’URL del database di produzione (da Supabase: **Settings → Database → Connection string**, modalità URI).
- Lo **schema** va allineato una volta (migrazioni o push):

  **Opzione A – Migrazioni (consigliata se le usi già):**
  ```bash
  DATABASE_URL="postgresql://..." npx prisma migrate deploy
  ```
  Esegui questo comando una tantum dal tuo PC (con `DATABASE_URL` di produzione) oppure da un job/script che giri in un ambiente sicuro.

  **Opzione B – Solo sviluppo / prototipo:**
  ```bash
  DATABASE_URL="postgresql://..." npx prisma db push
  ```
  Allinea le tabelle al `schema.prisma` senza usare la history delle migrazioni.

Dopo il primo deploy, per nuovi modelli o modifiche ripeti migrate (o db push) verso lo stesso database.

---

## 5. Primo deploy

1. In Vercel clicca **Deploy**.
2. Attendi la fine del build (log in tempo reale).
3. Se il build fallisce, controlla i log (spesso manca una variabile d’ambiente o `DATABASE_URL` errata).
4. Al termine avrai un URL tipo: `https://intranet-nolasco-xxx.vercel.app`.

---

## 6. Dominio personalizzato (opzionale)

- **Settings → Domains** → aggiungi il tuo dominio (es. `app.nolasco.it`).
- Segui le istruzioni Vercel per i record DNS (CNAME o A).
- Per HTTPS non serve configurare nulla: Vercel lo gestisce.

---

## 7. Build e Prisma su Vercel

- In `package.json` è impostato:
  - `"build": "prisma generate && next build"`
  - `"postinstall": "prisma generate"`
- Così a ogni deploy Vercel genera il client Prisma e poi compila Next.js.  
- Le **migrazioni** non partono in automatico dal deploy: vanno eseguite a mano (o con uno script/job) verso il database di produzione, come in § 4.

---

## Riepilogo veloce

1. Codice su GitHub, senza `.env`.
2. Nuovo progetto Vercel → import repo.
3. Imposta **Environment Variables** (almeno `DATABASE_URL`, Supabase, VAPID).
4. Esegui **una volta** `prisma migrate deploy` (o `db push`) verso il DB di produzione.
5. **Deploy** e verifica l’URL.
6. (Opzionale) Aggiungi dominio in **Domains**.

Se un deploy fallisce, apri i **Build Logs** su Vercel e controlla l’errore (manca variabile, Prisma, tipo di account, ecc.).
