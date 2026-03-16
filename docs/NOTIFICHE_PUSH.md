# Notifiche push – configurazione

L’app supporta le **notifiche push** (Web Push API): gli utenti possono abilitarle dalla pagina **Impostazioni → Notifiche push** (`/notifiche-push`) e ricevere avvisi anche a finestra chiusa.

## Requisiti

- **HTTPS** (obbligatorio per le push, tranne su `localhost`)
- Browser con supporto a Service Worker e Push API (Chrome, Firefox, Edge, Safari)
- **Chiavi VAPID** (una sola volta per ambiente)

## 1. Generare le chiavi VAPID

Esegui una volta (per sviluppo e una per produzione):

```bash
npx web-push generate-vapid-keys
```

Vedrai ad esempio:

```
Public Key:  BNx...
Private Key: abc...
```

## 2. Variabili d’ambiente

Aggiungi in `.env` (e in produzione nelle variabili del tuo host). Usa le **virgolette** per evitare problemi con caratteri speciali nelle chiavi:

```env
# Chiave pubblica (esposta al client)
NEXT_PUBLIC_VAPID_PUBLIC_KEY="BNx..."

# Chiave privata (solo server, mai nel client)
VAPID_PRIVATE_KEY="abc..."
```

Riavvia il server dopo aver modificato `.env`.

## 3. Database

La tabella `PushSubscription` è nel schema Prisma. Sincronizza il DB con:

```bash
npx prisma db push
```

(oppure, se usi le migrazioni: `npx prisma migrate dev --name add_push_subscriptions`).

## 4. Dove abilitare le notifiche

- **Pagina dedicata**: `/notifiche-push`  
  L’utente clicca “Abilita notifiche”, accetta il permesso del browser e la subscription viene salvata sul server.

- **Link in menu / impostazioni**: puoi aggiungere una voce “Notifiche” che punta a `/notifiche-push`.

## 5. Inviare una notifica da backend

Per inviare una push a un utente (es. quando crei un nuovo incarico):

```ts
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/web-push";

// Esempio: notifica al tecnico quando gli viene assegnata una manutenzione
const subs = await prisma.pushSubscription.findMany({
  where: { userId: tecnicoUserId },
});

for (const sub of subs) {
  await sendPushNotification(
    {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    },
    {
      title: "Nuova manutenzione assegnata",
      body: `Impianto ${impiantoNumero} - ${indirizzo}`,
      url: "/tecnici/servizi/manutenzioni",
    }
  );
}
```

Puoi anche creare una funzione helper in `src/lib/web-push.ts` che riceve `userId` e il payload e fa la `findMany` + ciclo internamente.

## 6. Service worker

Il file `public/sw.js` è già esteso per:

- **push**: ricevere l’evento e mostrare la notifica con titolo, corpo e URL.
- **notificationclick**: aprire la finestra (o focalizzarla) sull’URL indicato nel payload.

Le icone usate sono `/icon-192.png` e `/icon-72.png`; se non le hai, aggiungile in `public/` o il browser userà quella di default.

## 7. Test

1. Avvia l’app in HTTPS (o `localhost`).
2. Vai su `/notifiche-push` e clicca “Abilita notifiche”.
3. Accetta il permesso nel browser.
4. Clicca “Invia notifica di test”: dovresti ricevere la push (anche a scheda in secondo piano).

## Risoluzione problemi

- **“VAPID non configurato”**: controlla che `NEXT_PUBLIC_VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` siano in `.env` e che il server sia stato riavviato.
- **“Notifiche push non supportate”**: il sito deve essere servito in HTTPS (o localhost) e il browser deve supportare Service Worker e Push.
- **Permesso negato**: l’utente deve riattivare i permessi per il sito dalle impostazioni del browser.
