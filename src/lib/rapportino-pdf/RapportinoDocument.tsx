import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import fs from "fs";

const TITLE_RED = "#8f2b2b";
const FOOTER_BG = "#8f2b2b";

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingHorizontal: 42,
    paddingBottom: 100,
    fontSize: 12,
    fontFamily: "Helvetica",
  },
  logoWrap: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  logo: {
    maxWidth: 300,
    maxHeight: 100,
  },
  title: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: TITLE_RED,
    marginBottom: 4,
  },
  titleLine: {
    height: 2,
    backgroundColor: TITLE_RED,
    marginBottom: 18,
  },
  label: {
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  row: {
    marginBottom: 10,
  },
  intro: {
    marginBottom: 18,
    textAlign: "justify",
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: TITLE_RED,
    marginBottom: 4,
  },
  sectionLine: {
    height: 2,
    backgroundColor: TITLE_RED,
    marginBottom: 12,
  },
  noteText: {
    marginBottom: 18,
  },
  signatures: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  sigCol: {
    width: "48%",
    alignItems: "center",
  },
  sigLabel: {
    marginBottom: 4,
  },
  sigName: {
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  sigLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    width: "100%",
    height: 50,
    marginBottom: 8,
  },
  sigImage: {
    width: 120,
    height: 50,
    objectFit: "contain",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: FOOTER_BG,
    color: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
    fontSize: 12,
  },
  footerLine: {
    marginBottom: 4,
  },
  footerBold: {
    fontFamily: "Helvetica-Bold",
    marginTop: 4,
  },
  semestraleIntro: {
    marginBottom: 12,
    textAlign: "justify",
    fontSize: 11,
  },
  semestraleList: {
    marginLeft: 12,
    marginBottom: 8,
  },
  semestraleItem: {
    marginBottom: 6,
  },
});

function boolStr(v: boolean | null | undefined): string {
  if (v === true) return "Si";
  if (v === false) return "No";
  return "—";
}

export type ManutenzioneForPdf = {
  id: string;
  dataManutenzione: Date | string;
  oraEsecuzione?: string | null;
  note?: string | null;
  clienteFirmatario?: string | null;
  firmaTecnico?: string | null;
  firmaCliente?: string | null;
  effettuaSemestrale?: boolean;
  efficienzaParacadute?: boolean | null;
  efficienzaLimitatoreVelocita?: boolean | null;
  efficienzaDispositiviSicurezza?: boolean | null;
  condizioneFuni?: string | null;
  condizioniAttacchiFuni?: string | null;
  condizioneIsolamentoImpianto?: string | null;
  efficienzaCollegamentiTerra?: boolean | null;
  osservazioniSemestrale?: string | null;
  impianto?: {
    numeroImpianto?: string | null;
    indirizzo?: string | null;
    comune?: string | null;
    cliente?: { denominazione?: string | null } | null;
  } | null;
  tecnico?: { name?: string | null } | null;
};

function Footer({
  numeroImpianto,
  giorno,
  pageNum,
  totalPages,
}: {
  numeroImpianto: string;
  giorno: string;
  pageNum: number;
  totalPages: number;
}) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerLine}>Nolasco s.r.l.</Text>
      <Text style={styles.footerLine}>
        Via Giacomo Matteotti, 30 - 90014 Casteldaccia (PA)
      </Text>
      <Text style={styles.footerLine}>
        C.F. e P.IVA 05688840825 - Capitale Sociale i.v. € 10.000,00
      </Text>
      <Text style={styles.footerLine}>
        Tel: 091 556 79 74 - Numero Verde: 800 050 797
      </Text>
      <Text style={styles.footerLine}>
        info@nolasco.it - nolasco@pec.net - www.nolasco.it
      </Text>
      <Text style={[styles.footerLine, styles.footerBold]}>
        Pagina {pageNum} di {totalPages}
      </Text>
      <Text style={styles.footerLine}>
        Ricevuta manutenzione impianto {numeroImpianto || "—"} del {giorno || "—"}
      </Text>
    </View>
  );
}

function LogoImage({ logoPath }: { logoPath: string | null }) {
  if (!logoPath) return null;
  try {
    if (!fs.existsSync(logoPath)) return null;
  } catch {
    return null;
  }
  return (
    <View style={styles.logoWrap}>
      <Image src={logoPath} style={styles.logo} />
    </View>
  );
}

export function RapportinoDocument({
  manutenzione,
  logoPath,
}: {
  manutenzione: ManutenzioneForPdf;
  logoPath: string | null;
}) {
  const cliente = manutenzione.impianto?.cliente?.denominazione || "";
  const indirizzo = manutenzione.impianto?.indirizzo || "";
  const comune = manutenzione.impianto?.comune || "";
  const numeroImpianto = manutenzione.impianto?.numeroImpianto || "";
  const giorno = manutenzione.dataManutenzione
    ? new Date(manutenzione.dataManutenzione).toLocaleDateString("it-IT")
    : "—";
  const note = (manutenzione.note || "").trim();
  const firmatario = manutenzione.clienteFirmatario || "";
  const nomeTecnico = manutenzione.tecnico?.name || "";
  const hasSemestrale = manutenzione.effettuaSemestrale === true;
  const totalPages = hasSemestrale ? 2 : 1;

  return (
    <Document>
      {/* Pagina 1: Rapportino */}
      <Page size="A4" style={styles.page}>
        <LogoImage logoPath={logoPath} />

        <Text style={styles.title}>RAPPORTINO DI MANUTENZIONE IMPIANTO ELEVATORE</Text>
        <View style={styles.titleLine} />

        <View style={styles.row}>
          <Text style={styles.label}>Cliente: {cliente}</Text>
        </View>
        <View style={styles.row}>
          <Text>Ubicazione impianto: {indirizzo} - {comune}</Text>
        </View>
        <View style={styles.row}>
          <Text>Numero impianto: {numeroImpianto}</Text>
        </View>

        <Text style={styles.intro}>
          Gentile {cliente}, di seguito la ricevuta di manutenzione eseguita sul
          vostro impianto elevatore in data {giorno}.
        </Text>

        {note ? (
          <>
            <Text style={styles.sectionTitle}>EVENTUALI NOTE</Text>
            <View style={styles.sectionLine} />
            <Text style={styles.noteText}>{note}</Text>
          </>
        ) : null}

        <View style={styles.signatures}>
          <View style={styles.sigCol}>
            <Text style={styles.sigLabel}>Il Cliente</Text>
            <Text style={styles.sigName}>{firmatario}</Text>
            <View style={styles.sigLine} />
            {manutenzione.firmaCliente &&
            (manutenzione.firmaCliente.startsWith("data:image/png;base64,") ||
              manutenzione.firmaCliente.startsWith("data:image/jpeg;base64,")) ? (
              <Image src={manutenzione.firmaCliente} style={styles.sigImage} />
            ) : null}
          </View>
          <View style={styles.sigCol}>
            <Text style={styles.sigLabel}>Il Tecnico</Text>
            <Text style={styles.sigName}>{nomeTecnico}</Text>
            <View style={styles.sigLine} />
            {manutenzione.firmaTecnico &&
            (manutenzione.firmaTecnico.startsWith("data:image/png;base64,") ||
              manutenzione.firmaTecnico.startsWith("data:image/jpeg;base64,")) ? (
              <Image src={manutenzione.firmaTecnico} style={styles.sigImage} />
            ) : null}
          </View>
        </View>

        <Footer
          numeroImpianto={numeroImpianto}
          giorno={giorno}
          pageNum={1}
          totalPages={totalPages}
        />
      </Page>

      {/* Pagina 2: Verifica semestrale - solo se effettuaSemestrale è true */}
      {hasSemestrale ? (
        <Page size="A4" style={styles.page}>
          <LogoImage logoPath={logoPath} />

          <Text style={styles.title}>VERIFICA SEMESTRALE IMPIANTO ELEVATORE</Text>
          <View style={styles.titleLine} />

          <Text style={styles.semestraleIntro}>
            Gentile cliente, si comunica che in data odierna è stata eseguita
            anche la verifica semestrale dell'impianto elevatore oggetto di
            manutenzione, tale verifica è un controllo obbligatorio per legge,
            regolamentato dal D.P.R. 162/99, che impone una manutenzione
            periodica per garantire la sicurezza dell'impianto. Questa
            verifica, insieme a quella biennale, è fondamentale per accertare il
            corretto funzionamento dei dispositivi di sicurezza e lo stato di
            efficienza dei componenti.
          </Text>
          <Text style={styles.label}>Ecco il dettaglio della verifica appena eseguita:</Text>
          <View style={styles.semestraleList}>
            {manutenzione.efficienzaParacadute != null && (
              <Text style={styles.semestraleItem}>
                Efficienza paracadute: {boolStr(manutenzione.efficienzaParacadute)}
              </Text>
            )}
            {manutenzione.efficienzaLimitatoreVelocita != null && (
              <Text style={styles.semestraleItem}>
                Efficienza limitatore di velocità: {boolStr(manutenzione.efficienzaLimitatoreVelocita)}
              </Text>
            )}
            {manutenzione.efficienzaDispositiviSicurezza != null && (
              <Text style={styles.semestraleItem}>
                Efficienza dei dispositivi di sicurezza: {boolStr(manutenzione.efficienzaDispositiviSicurezza)}
              </Text>
            )}
            {manutenzione.condizioneFuni ? (
              <Text style={styles.semestraleItem}>Condizione delle funi: {manutenzione.condizioneFuni}</Text>
            ) : null}
            {manutenzione.condizioniAttacchiFuni ? (
              <Text style={styles.semestraleItem}>Condizioni degli attacchi funi: {manutenzione.condizioniAttacchiFuni}</Text>
            ) : null}
            {manutenzione.condizioneIsolamentoImpianto ? (
              <Text style={styles.semestraleItem}>
                Condizione dell'isolamento dell'impianto elettrico (&gt;2000 Ω/V con minimo di 250 kΩ):{" "}
                {manutenzione.condizioneIsolamentoImpianto}
              </Text>
            ) : null}
            {manutenzione.efficienzaCollegamentiTerra != null && (
              <Text style={styles.semestraleItem}>
                Efficienza dei collegamenti con la terra: {boolStr(manutenzione.efficienzaCollegamentiTerra)}
              </Text>
            )}
            {manutenzione.osservazioniSemestrale ? (
              <Text style={styles.semestraleItem}>Osservazioni: {manutenzione.osservazioniSemestrale}</Text>
            ) : null}
          </View>

          <Footer
            numeroImpianto={numeroImpianto}
            giorno={giorno}
            pageNum={2}
            totalPages={2}
          />
        </Page>
      ) : null}
    </Document>
  );
}
