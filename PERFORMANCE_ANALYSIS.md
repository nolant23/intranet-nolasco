# Analisi performance – Intranet Nolasco

Analisi delle cause di lentezza e interventi consigliati per avvicinare l’app alle altre che risultano “velocissime”.

---

## 1. Auth e permessi su ogni richiesta (impatto alto)

**Problema**
- Il layout dashboard esegue **getCurrentUser()** e **getPermissionsForRole()** prima di qualsiasi contenuto.
- **getPermissionsForRole(role)** chiama **getPermissions()**, che fa ogni volta `prisma.rolePermission.findMany()`: nessun caching.
- Molte pagine richiamano di nuovo getCurrentUser e getPermissionsForRole, quindi nella stessa richiesta auth + permessi possono essere usati più volte.

**Effetto**
- Ogni navigazione paga 1–2 (o più) round-trip DB prima di mostrare la UI.
- I permessi cambiano raramente; la lettura dal DB è ripetitiva e costosa.

**Interventi**
- Memorizzare in cache **getPermissions()** o **getPermissionsForRole(role)** con `unstable_cache` (es. `revalidate: 300` o 60 secondi).
- In alternativa, cache in memoria (es. Map per role) con TTL, invalidata quando si aggiornano i permessi in impostazioni.
- Valutare di leggere user + permissions una sola volta nel layout e passarli ai figli (tramite context o props) per evitare richieste duplicate nella stessa render.

---

## 2. Caricamento di intere tabelle senza paginazione (impatto molto alto)

**Problema**
- **/contratti**: `getContratti()` carica **tutti** i contratti con `impianto` (cliente, amministratore) e `servizi`; in più `getImpianti()` carica **tutti** gli impianti. Con migliaia di record il payload e il tempo di risposta esplodono.
- **/impianti**: carica **tutti** gli impianti + **tutti** i clienti + **tutti** gli amministratori in una sola pagina. Tre tabelle intere a ogni apertura.
- **/amministratori**: `getAmministratori()` carica tutti gli amministratori (meno pesante, ma sempre full scan).

**Effetto**
- Primo caricamento di Contratti e Impianti molto lento e pesante.
- HTML/JSON di risposta grandi, parsing e idratazione più lenti.

**Interventi**
- Introdurre **paginazione lato server** per contratti e impianti (come già fatto per clienti, manutenzioni, interventi, fatture): prima pagina (es. 25–50) + totale per la paginazione.
- Per **Impianti**: non caricare clienti e amministratori interi per la lista; caricare solo i dati necessari per le celle (es. denominazione) o usare lookup solo quando serve (es. modale/creazione). In alternativa, caricare clienti/amministratori in modo lazy (solo quando si apre il form).
- Mantenere le liste virtualizzate (VirtualizedTable) e alimentarle con dati paginati invece che con array “tutto in uno”.

---

## 3. Uso di `window.location.reload()` (impatto alto sulla percezione)

**Problema**
- Dopo create/update/delete in molte liste si usa **window.location.reload()** (es. ManutenzioniClient, InterventiClient, FattureClient, ClientiClient, ImpiantiClient, AmministratoriClient, NoteCreditoClient, ImpostazioniClient).
- Un reload completo: scarica di nuovo tutto il JS, rifà auth, rifà tutte le query della pagina.

**Effetto**
- L’app sembra “pesante” e lenta dopo ogni azione: niente aggiornamento fluido, nessun riuso della SPA.

**Interventi**
- Sostituire con **router.refresh()** (RSC) oppure **revalidatePath("/manutenzioni")** (o path della sezione) e aggiornare lo stato lato client (rifetch della lista o invalidation) senza reload.
- Dopo mutate, chiamare `revalidatePath` per la route della lista e, nel client, o rifetchare solo i dati della lista (es. `getManutenzioniPaginated`) o usare `router.refresh()` per rifare il fetch RSC senza ricaricare l’intera pagina.
- Evitare `window.location.reload()` ovunque tranne dove serve davvero (es. dopo logout o cambio permessi globali).

---

## 4. Ricerca globale (home) senza cache e senza cancel (impatto medio-alto)

**Problema**
- **globalSearch** esegue 7+ query Prisma in parallelo (clienti, amministratori, impianti, contratti, interventi, manutenzioni, fatture) a ogni ricerca (debounce 250 ms).
- Nessuna cache: stesse ricerche ripetute = stesse query ripetute.
- Nessun abort della richiesta precedente: digitando veloce si accodano più chiamate e si può avere race condition e lavoro inutile.

**Effetto**
- Ricerca che può risultare lenta e DB sotto carico inutile per query ripetute o obsolete.

**Interventi**
- Usare **AbortController** nella fetch/action della ricerca: alla nuova digitazione abort della richiesta precedente.
- Valutare **unstable_cache** per `globalSearch(query)` con chiave `query` e `revalidate: 60` (o simile) per evitare di rifare le stesse 7 query a parità di testo.
- Opzionale: ritardare la ricerca fino a 300–400 ms dopo l’ultimo keystroke e mostrare subito uno stato “in caricamento” per feedback visivo.

---

## 5. Pagine liste senza dynamic import (impatto medio)

**Problema**
- **Clienti** e **Contratti** usano `dynamic(() => import("./components/...Client"), { loading: () => <PageSkeleton /> })`: la lista non blocca il first paint.
- **Impianti** e **Amministratori** importano il client component in modo statico: il bundle della lista è nel chunk della pagina e il first paint può aspettare più a lungo.

**Effetto**
- Time-to-interactive più lungo per Impianti e Amministratori, soprattutto su reti lente.

**Interventi**
- Usare **dynamic import** con **loading** (skeleton) anche per ImpiantiClient e AmministratoriClient, come già fatto per Clienti e Contratti.
- Estendere lo stesso pattern a tutte le liste “pesanti” (es. Fatture, Interventi, Manutenzioni se non già fatto).

---

## 6. Dettaglio amministratore – N+1 sulle fatture (impatto medio, solo dettaglio)

**Problema**
- In **getAmministratoreDetail** per ogni impianto dell’amministratore si fa un `prisma.fattura.findMany` (ciclo for sugli impianti). Con molti impianti = molte query.

**Effetto**
- Apertura dettaglio amministratore lenta se ha molti impianti.

**Interventi**
- Costruire una sola query fatture con `OR` su tutti i `numeroImpianto` (o su una lista di codici) e un solo `findMany`, poi deduplicare per id fattura se necessario.
- In alternativa, query fatture con `where: { OR: impianti.map(...) }` in un’unica chiamata.

---

## 7. Configurazione e payload grandi (impatto medio)

**Problema**
- **bodySizeLimit: "20mb"** per le Server Actions indica payload molto grandi (es. base64 per firme/foto). Invii grandi = più tempo di upload e di elaborazione.

**Effetto**
- Form con firme/foto lenti nell’invio e potenzialmente timeout o lentezza server.

**Interventi**
- Evitare di inviare file in base64 nelle action: usare **upload su storage** (S3, Vercel Blob, ecc.) e passare solo l’URL nell’action.
- Comprimere le immagini lato client prima dell’upload e mantenere dimensioni massime ragionevoli (es. 800–1200 px lato lungo).

---

## 8. Riepilogo priorità

| Priorità | Intervento                                      | Effetto atteso                    |
|----------|--------------------------------------------------|-----------------------------------|
| Alta     | Cache per getPermissions / getPermissionsForRole | Meno DB e layout più veloce       |
| Alta     | Paginazione server per Contratti e Impianti      | Primo caricamento molto più veloce|
| Alta     | Sostituire window.location.reload() con refresh/revalidate | App più reattiva dopo mutate     |
| Media    | AbortController + eventuale cache su globalSearch | Ricerca più fluida e meno carico  |
| Media    | Dynamic import per Impianti e Amministratori      | First paint più veloce            |
| Media    | Una sola query fatture in getAmministratoreDetail | Dettaglio amministratore più veloce |
| Media    | Upload file invece di base64 in form              | Form con firme/foto più veloci    |

---

## 9. Verifiche veloci consigliate

1. **React DevTools Profiler**: vedere quali componenti si ri-renderizzano dopo azioni (es. digitazione in ricerca, click su lista).
2. **Network tab**: dimensioni delle risposte per le pagine Contratti e Impianti (HTML/JSON).
3. **Prisma**: log delle query (in dev) per contare quante query partono per una singola pagina (layout + page + eventuali action).
4. **Lighthouse / WebPageTest**: LCP, TBT, FCP sulle pagine più usate (home, liste, dettagli).

Implementando prima cache permessi, paginazione liste pesanti e rimozione dei `reload()`, l’app dovrebbe già risultare sensibilmente più veloce e reattiva.
