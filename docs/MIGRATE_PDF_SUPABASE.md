# Trasferimento PDF esistenti su Supabase Storage

I PDF di **fatture** e **note di credito** che oggi sono in `public/uploads/` possono essere trasferiti su Supabase Storage in modo che l’URL nel DB punti al file su Supabase (come per i rapportini interventi).

## Quando serve

- Hai già fatture/note di credito con `urlDocumento` tipo `/uploads/fatture/...` o `/uploads/note-credito/...`.
- Vuoi avere tutti i PDF su Supabase (stesso posto dei rapportini) e non dipendere dai file in `public/uploads/`.

## Prerequisiti

- `.env` con `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (e opzionale `SUPABASE_STORAGE_BUCKET`, default `nolasco-files`).
- Bucket Supabase già usato per i rapportini, con policy che permettono l’upload (service role) e la lettura pubblica degli URL.

## Esecuzione

Dalla root del progetto:

```bash
npx tsx scripts/migrate-pdf-to-supabase.ts
```

Lo script:

1. Trova tutte le **Fatture** con `urlDocumento` che inizia con `/uploads/fatture/`.
2. Per ciascuna: se il file esiste in `public/uploads/fatture/`, lo carica su Supabase (cartella `fatture/`) e aggiorna `urlDocumento` con l’URL pubblico Supabase.
3. Fa lo stesso per le **Note di credito** con `/uploads/note-credito/` → cartella `note-credito/` su Supabase.

In console vedi OK / SKIP (file non trovato) / FAIL (errore upload) e un riepilogo finale.

## Dopo la migrazione

- I record nel DB avranno `urlDocumento` con URL Supabase; i link “Apri PDF” continueranno a funzionare.
- I file in `public/uploads/fatture/` e `public/uploads/note-credito/` non sono più necessari per il funzionamento; puoi eliminarli o tenerli come backup.
