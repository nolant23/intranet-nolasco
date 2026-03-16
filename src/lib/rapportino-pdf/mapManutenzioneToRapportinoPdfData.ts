import type { RapportinoPdfData } from "./RapportinoProfessionalePdf";
import type { ManutenzioneForPdf } from "./RapportinoDocument";

/** Converte booleano semestrale in "Si" / "No" / "-" */
function boolToStr(v: boolean | null | undefined): string {
  if (v === true) return "Si";
  if (v === false) return "No";
  return "-";
}

/**
 * Mappa i dati di una Manutenzione (DB / fullForPdf) nel formato RapportinoPdfData
 * usato da RapportinoProfessionalePdf.
 */
export function mapManutenzioneToRapportinoPdfData(
  manutenzione: ManutenzioneForPdf,
  logoPath: string | null
): RapportinoPdfData {
  const dataDate = manutenzione.dataManutenzione
    ? new Date(manutenzione.dataManutenzione).toLocaleDateString("it-IT")
    : "-";

  const imp = manutenzione as {
    impianto?: {
      cliente?: { denominazione?: string };
      amministratore?: { denominazione?: string };
    };
  };
  const clienteNome = imp.impianto?.cliente?.denominazione;
  const amministratoreNome = imp.impianto?.amministratore?.denominazione;

  return {
    azienda: {
      nome: "Nolasco s.r.l.",
      indirizzo: "Via Giacomo Matteotti, 30",
      citta: "90014 Casteldaccia (PA)",
      telefono: "091 556 79 74",
      email: "info@nolasco.it",
      piva: "05688840825",
      logo: logoPath ?? undefined,
    },
    documento: {
      data: dataDate,
      tipo: "Manutenzione",
    },
    cliente: {
      nome: clienteNome ?? "-",
      indirizzo: undefined,
      comune: undefined,
      referente: undefined,
      email: undefined,
      telefono: undefined,
    },
    impianto: {
      numero: manutenzione.impianto?.numeroImpianto ?? "-",
      indirizzo: manutenzione.impianto?.indirizzo ?? undefined,
      comune: manutenzione.impianto?.comune ?? undefined,
      clienteNome: clienteNome ?? undefined,
      amministratoreNome: amministratoreNome ?? undefined,
    },
    intervento: {
      data: dataDate,
      oraInizio: manutenzione.oraEsecuzione ?? undefined,
      oraFine: manutenzione.oraEsecuzione ?? undefined,
      tecnico: manutenzione.tecnico?.name ?? "-",
      tipologia: "Manutenzione",
      note: manutenzione.note ?? undefined,
    },
    firme: {
      firmatarioCliente: manutenzione.clienteFirmatario ?? undefined,
      firmaCliente: manutenzione.firmaCliente ?? undefined,
      firmaTecnico: manutenzione.firmaTecnico ?? undefined,
    },
    semestrale: manutenzione.effettuaSemestrale
      ? {
          attiva: true,
          paracadute: boolToStr(manutenzione.efficienzaParacadute),
          limitatore: boolToStr(manutenzione.efficienzaLimitatoreVelocita),
          dispositivi: boolToStr(manutenzione.efficienzaDispositiviSicurezza),
          condizioniFuni: manutenzione.condizioneFuni ?? undefined,
          attacchiFuni: manutenzione.condizioniAttacchiFuni ?? undefined,
          isolamento: manutenzione.condizioneIsolamentoImpianto ?? undefined,
          terra: boolToStr(manutenzione.efficienzaCollegamentiTerra),
          osservazioni: manutenzione.osservazioniSemestrale ?? undefined,
        }
      : undefined,
  };
}
