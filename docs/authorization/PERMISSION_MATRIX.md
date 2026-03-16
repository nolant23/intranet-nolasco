# Permission matrix completa

## Ruoli

- **ADMIN**: pieno accesso a tutto; può modificare permessi e utenti.
- **UFFICIO**: lettura e creazione su quasi tutti i moduli; update/delete dove previsto; nessun accesso a Utenti/Impostazioni.
- **TECNICO**: solo moduli “operativi”; solo record assegnati (ownership); nessun update/delete su rapportini; nessun dato economico, utenti, impostazioni.

## Matrice per modulo (UI + API)

| Modulo | ADMIN | UFFICIO | TECNICO |
|--------|-------|---------|---------|
| Servizi | R C U D | R | - |
| Field | R C U D | R | R |
| Fatturazione | R C U D | R | - |
| Tecnici | R C U D | R | R (solo dashboard) |
| Clienti | R C U D | R C U | R* (solo assegnati, campi limitati) |
| Amministratori | R C U D | R C U | R* (solo assegnati) |
| Impianti | R C U D | R C U | R* (solo assegnati), no C/U/D |
| Contratti | R C U D | R C U | - |
| Manutenzioni | R C U D | R C U D | R C (no U/D) |
| Interventi | R C U D | R C U D | R C (no U/D) |
| VerificheBiennali | R C U D | R C U D | R C (no U/D) |
| Presenze | R C U D | R C U D | R* (solo propri) |
| PresenzeCantiere | R C U D | R C U D | R C (no U/D) |
| Booking | R C U D | R C U D | R (no C/U/D su booking) |
| Fatture | R C U D | R C U | - |
| Archivio | R | R | - |
| Utenti | R C U D | - | - |
| Impostazioni | R C U D | - | - |

Legenda: R = READ, C = CREATE, U = UPDATE, D = DELETE. `*` = ownership: solo record collegati al tecnico.

## Campi sensibili (nascosti al TECNICO)

- **Contratto**: `canoneManutenzione`, `periodicitaFatturazione`, `dataInizioFatturazione`, `gratuito`; tutti i campi di `ServizioContratto.importo`.
- **Fattura / NotaCredito**: intera entità (il tecnico non deve accedere alle route).
- **Cliente**: campi fiscali e commerciali (P.IVA, codice fiscale, email PEC, dati Fatture in Cloud) se non necessari per il rapportino.
- **User**: elenco utenti, ruoli, password hash.
- **RolePermission**: intera tabella.

## Implementazione

- La matrice sopra è implementata in `src/lib/authz/matrix.ts` e usata da `src/lib/authz/guard.ts`.
- Le query sono filtrate in `src/lib/authz/filters.ts` (es. impianti per tecnico, manutenzioni per tecnico).
- Le server actions chiamano `requirePermission()`, `requireOwnership()` e i filtri prima di ogni operazione e restituiscono 403 in caso di mancanza permesso.
