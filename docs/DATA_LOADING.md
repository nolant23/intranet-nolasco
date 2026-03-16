# Data Loading Architecture – Detail Pages

## Principles

- **Load by ID only**: Detail pages fetch a single record by ID, never full tables.
- **Parallel queries**: Use `Promise.all()` for independent queries (e.g. main record + related lists).
- **Limit related data**: Related lists (contratti, interventi, manutenzioni, fatture) use `take` (e.g. 25–50) to keep response time under 200ms.
- **No N+1**: One query per relation; never loop and query per item (e.g. fatture per impianto).
- **Lightweight includes**: Use `select` / `include` only for fields needed by the UI.
- **Client cache**: SWR caches dialog fetches (e.g. cliente/amministratore from impianto detail) for 1 minute.
- **Fewer re-renders**: Detail client components are wrapped in `React.memo()` where they receive server-loaded props.

## Detail Endpoints

### Impianto (`getImpiantoDetail(id)`)

- **Auth**: TECNICO can only access if impianto is in allowed list (one extra query).
- **Queries** (after auth): 4 in parallel:
  1. `impianto.findUnique` + `cliente` + `amministratore`
  2. `contratto.findMany` (impiantoId, take 30)
  3. `intervento.findMany` (impiantoId, take 30, include tecnico name)
  4. `manutenzione.findMany` (impiantoId, take 30, include tecnico name)
- **Result**: Single round-trip; no N+1.

### Cliente (`getClienteDetail(id)`)

- **Queries**: 1 then 4 in parallel:
  1. `cliente.findUnique` + `impianti` (select id, numeroImpianto, indirizzo, take 200)
  2. Parallel: `fattura.findMany` (take 50), `contratto.findMany` (take 50), `intervento.findMany` (take 50), `manutenzione.findMany` (take 50) using `impiantoIds` from (1).
- **Result**: 2 round-trips; related lists limited.

### Amministratore (`getAmministratoreDetail(id)`)

- **Queries**: 2 sequential:
  1. `amministratore.findUnique` + `impianti` (include cliente select id/denominazione, take 150)
  2. Single `fattura.findMany` with one big `OR` (oggetto/note contains codice impianto for up to 25 codes), take 100.
- **Result**: N+1 on fatture removed; one fatture query instead of one per impianto.

### Manutenzione / Intervento by ID

- Single `findUnique` with minimal `include` (impianto + cliente or tecnico). No change; already lean.

## Indexes (Prisma)

Used for detail and list performance:

- `Impianto`: clienteId, amministratoreId, numeroImpianto
- `Contratto`, `Intervento`, `Manutenzione`, `VerificaBiennale`: impiantoId (and tecnicoId where used)
- `Fattura`: clienteId, data

## Client-Side

- **SWR** (`useDetailQuery`): Used in ImpiantoDetailClient for Cliente/Amministratore dialog; key `detail-{type}-{id}`, dedupe 1 min.
- **Memo**: ImpiantoDetailClient, ClienteDetailPageClient, AmministratoreDetailClient are wrapped in `memo()` to avoid re-renders when parent props are unchanged.
