# Analisi rischi – Sistema autorizzazioni

## Stato attuale (pre-refactor)

### Rischio ALTO

| Rischio | Descrizione | Impatto |
|--------|-------------|---------|
| **Server actions senza controllo permessi** | Tutte le `actions.ts` (impianti, manutenzioni, interventi, fatture, clienti, booking, ecc.) eseguono query Prisma senza verificare ruolo o ownership. Chi invoca l’action (es. da DevTools) può creare/leggere/aggiornare/eliminare qualsiasi record. | Tecnico può leggere tutti i clienti, tutti gli impianti, tutte le fatture; può modificare o cancellare record altrui. |
| **Nessun filtro per tecnico** | Le query `getImpianti()`, `getManutenzioni()`, `getInterventi()` restituiscono tutti i record. Il tecnico in UI vede solo ciò che il frontend nasconde, ma i dati arrivano comunque al client. | Dati di altri tecnici e di altri clienti esposti via rete e nel payload. |
| **Dati economici visibili al tecnico** | Contratti (canone, importi), Fatture, Note credito, Condizioni pagamento non sono filtrati lato server. La UI nasconde solo pulsanti. | Perdita di riservatezza commerciale; possibile uso improprio. |
| **Nessuna RLS su database** | Se il database è Supabase Postgres, l’assenza di RLS permette accessi diretti (es. con service role o altro client) senza passare dall’app. | Bypass completo delle regole applicative; nessuna difesa in profondità. |

### Rischio MEDIO

| Rischio | Descrizione | Impatto |
|--------|-------------|---------|
| **Accesso pagine solo via redirect UI** | Le pagine fanno `if (!permissions?.READ) redirect("/")` ma i dati sono già stati caricati dalle server actions prima del redirect (nelle page server component). | In teoria i dati potrebbero essere elaborati prima del redirect; dipende dall’ordine di esecuzione. |
| **Permessi modificabili solo da admin** | La matrice permessi è in DB (RolePermission); un bug o un accesso al DB potrebbe alterare i ruoli. | Senza audit e senza RLS, difficile rilevare abusi. |
| **Utenti e impostazioni** | Le action per utenti e impostazioni non verificano il ruolo. Solo la UI nasconde le sezioni. | Un tecnico potrebbe provare a chiamare `savePermissions` o `deleteUtente` se riesce a invocare l’action. |

### Rischio BASSO (mitigato dopo refactor)

| Rischio | Descrizione | Mitigazione |
|--------|-------------|-------------|
| **Frontend come unica barriera** | Oggi la sicurezza è solo “nascondi pulsante”. | Refactor: tutte le API/actions restituiscono 403 e filtrano i dati per ruolo e ownership. |
| **Trust nel client** | Il client potrebbe essere manomesso. | Politica: deny by default, least privilege, nessuna fiducia nel frontend. |

---

## Modello di sicurezza target

- **RBAC**: ADMIN, UFFICIO, TECNICO con permessi per modulo (READ, CREATE, UPDATE, DELETE).
- **Ownership**: il tecnico vede solo record dove `tecnicoId = currentUser.id` (manutenzioni, interventi, verifiche, presenze, presenze cantiere); per gli impianti vede solo quelli su cui ha almeno un rapporto (manutenzione/intervento/verifica) assegnato a lui.
- **Dati sensibili**: il tecnico non vede mai importi, canoni, fatture, note credito, utenti, impostazioni, dati amministrativi non strettamente necessari per i rapportini.
- **Deny by default**: ogni action e ogni pagina verifica permesso + ownership; in caso di mancanza ritorna 403 o redirect.
- **RLS**: policy Supabase su tutte le tabelle per difesa in profondità quando l’accesso avviene con JWT utente.

---

## Entità e regole ownership

| Entità | Ownership | Chi può leggere | Chi può creare | Chi può aggiornare | Chi può eliminare |
|--------|-----------|------------------|----------------|--------------------|--------------------|
| Impianto | Nessuno (condiviso) | ADMIN/UFFICIO: tutti; TECNICO: solo quelli con almeno un rapporto assegnato a lui | ADMIN, UFFICIO | ADMIN, UFFICIO | ADMIN, UFFICIO |
| Manutenzione | `tecnicoId` | ADMIN/UFFICIO: tutti; TECNICO: solo propri | ADMIN, UFFICIO, TECNICO | ADMIN, UFFICIO (TECNICO no) | ADMIN, UFFICIO |
| Intervento | `tecnicoId` | Idem Manutenzione | ADMIN, UFFICIO, TECNICO | ADMIN, UFFICIO | ADMIN, UFFICIO |
| VerificaBiennale | `tecnicoId` | Idem | ADMIN, UFFICIO, TECNICO | ADMIN, UFFICIO | ADMIN, UFFICIO |
| Presenza | `tecnicoId` | ADMIN/UFFICIO: tutti; TECNICO: solo propri | ADMIN, UFFICIO | ADMIN, UFFICIO | ADMIN, UFFICIO |
| PresenzaCantiere | `tecnicoId` | Idem | ADMIN, UFFICIO, TECNICO | No (solo creazione) | ADMIN, UFFICIO |
| Cliente | Nessuno | ADMIN/UFFICIO: tutti; TECNICO: solo clienti degli impianti assegnati (campi limitati, no economici) | ADMIN, UFFICIO | ADMIN, UFFICIO | ADMIN, UFFICIO |
| Contratto | Nessuno | ADMIN, UFFICIO (TECNICO mai; contiene canoni) | ADMIN, UFFICIO | ADMIN, UFFICIO | ADMIN, UFFICIO |
| Fattura / NotaCredito | Nessuno | ADMIN, UFFICIO (TECNICO mai) | ADMIN, UFFICIO | ADMIN, UFFICIO | ADMIN, UFFICIO |
| Booking / PresenzeCantiere | Vedi sopra | ADMIN, UFFICIO, TECNICO (filtrato) | ADMIN, UFFICIO, TECNICO | ADMIN, UFFICIO | ADMIN, UFFICIO |
| User / RolePermission / Impostazioni | Solo ADMIN | Solo ADMIN | Solo ADMIN | Solo ADMIN | Solo ADMIN |
