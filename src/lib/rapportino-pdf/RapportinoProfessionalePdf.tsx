import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

export type RapportinoPdfData = {
  azienda: {
    nome: string;
    indirizzo?: string;
    citta?: string;
    telefono?: string;
    email?: string;
    piva?: string;
    logo?: string;
  };

  documento: {
    data: string;
    tipo?: string;
  };

  cliente: {
    nome: string;
    indirizzo?: string;
    comune?: string;
    referente?: string;
    email?: string;
    telefono?: string;
  };

  impianto: {
    numero: string;
    indirizzo?: string;
    comune?: string;
    /** Nome cliente collegato all'impianto */
    clienteNome?: string;
    /** Nome amministratore collegato all'impianto (se esiste) */
    amministratoreNome?: string;
  };

  intervento: {
    data: string;
    oraInizio?: string;
    oraFine?: string;
    tecnico: string;
    tipologia?: string;
    note?: string;
  };

  firme: {
    firmatarioCliente?: string;
    firmaCliente?: string;
    firmaTecnico?: string;
  };

  semestrale?: {
    attiva?: boolean;
    paracadute?: string;
    limitatore?: string;
    dispositivi?: string;
    condizioniFuni?: string;
    attacchiFuni?: string;
    isolamento?: string;
    terra?: string;
    osservazioni?: string;
  };
};

const colors = {
  navy: "#1F3A5F",
  blue: "#315D8C",
  lightBlue: "#EAF1F7",
  border: "#D6DEE8",
  text: "#1F2933",
  muted: "#66788A",
  white: "#FFFFFF",
  light: "#F7F9FC",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.text,
    backgroundColor: colors.white,
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 20,
    lineHeight: 1.35,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    marginBottom: 10,
  },

  brandBox: {
    width: "58%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 12,
    backgroundColor: colors.white,
  },

  docBox: {
    width: "40%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    overflow: "hidden",
  },

  logo: {
    width: 150,
    height: 46,
    objectFit: "contain",
    marginBottom: 8,
  },

  companyName: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.navy,
    marginBottom: 4,
  },

  companyText: {
    fontSize: 9,
    color: colors.muted,
    marginBottom: 2,
  },

  docBoxHeader: {
    backgroundColor: colors.navy,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },

  docBoxHeaderText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
  },

  docBoxBody: {
    padding: 10,
    backgroundColor: colors.white,
  },

  docRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F6",
    paddingBottom: 4,
  },

  docLabel: {
    fontSize: 8,
    color: colors.muted,
    textTransform: "uppercase",
  },

  docValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.text,
  },

  hero: {
    backgroundColor: colors.lightBlue,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },

  heroTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: colors.navy,
    marginBottom: 4,
    textTransform: "uppercase",
  },

  heroSub: {
    fontSize: 10,
    color: colors.muted,
  },

  grid2: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  card: {
    width: "49%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    backgroundColor: colors.white,
    overflow: "hidden",
  },

  cardFull: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    backgroundColor: colors.white,
    overflow: "hidden",
    marginBottom: 8,
  },

  cardHeader: {
    backgroundColor: colors.light,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },

  cardHeaderText: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.navy,
    textTransform: "uppercase",
  },

  cardBody: {
    padding: 10,
  },

  cardBodyTwoCols: {
    padding: 10,
    flexDirection: "row",
    gap: 16,
  },

  cardBodyCol: {
    flex: 1,
    width: "48%",
  },

  fieldRow: {
    marginBottom: 7,
  },

  fieldLabel: {
    fontSize: 8,
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: 2,
  },

  fieldValue: {
    fontSize: 10,
    color: colors.text,
  },

  fieldValueBold: {
    fontSize: 10,
    color: colors.text,
    fontWeight: "bold",
  },

  longTextBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 8,
    minHeight: 52,
    backgroundColor: colors.white,
  },

  longText: {
    fontSize: 10,
    color: colors.text,
  },

  signaturesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },

  signatureCard: {
    width: "49%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    backgroundColor: colors.white,
    overflow: "hidden",
  },

  signatureHead: {
    backgroundColor: colors.light,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },

  signatureHeadText: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.navy,
    textTransform: "uppercase",
  },

  signatureBody: {
    padding: 8,
    minHeight: 115,
    justifyContent: "space-between",
  },

  signatureName: {
    fontSize: 10,
    color: colors.text,
    fontWeight: "bold",
    marginBottom: 8,
  },

  signatureImage: {
    width: 180,
    height: 56,
    objectFit: "contain",
    marginTop: 6,
  },

  signatureFooterLine: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 5,
    fontSize: 8,
    color: colors.muted,
    textAlign: "center",
  },

  footer: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
  },

  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },

  footerText: {
    fontSize: 8,
    color: colors.muted,
  },

  footerPageNum: {
    fontSize: 10,
    fontWeight: "bold",
    color: colors.text,
  },

  bulletRow: {
    flexDirection: "row",
    marginBottom: 6,
  },

  bullet: {
    width: 10,
    fontSize: 10,
  },

  bulletText: {
    flex: 1,
    fontSize: 10,
    color: colors.text,
  },
});

function safe(v?: string) {
  return v && String(v).trim() !== "" ? v : "-";
}

function isFilled(v?: string) {
  return !!v && String(v).trim() !== "";
}

function InfoField({
  label,
  value,
  bold,
}: {
  label: string;
  value?: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={bold ? styles.fieldValueBold : styles.fieldValue}>{safe(value)}</Text>
    </View>
  );
}

function BulletField({ label, value }: { label: string; value?: string }) {
  if (!isFilled(value)) return null;

  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bullet}>•</Text>
      <Text style={styles.bulletText}>
        <Text style={{ fontWeight: "bold" }}>{label}: </Text>
        {value}
      </Text>
    </View>
  );
}

export function RapportinoProfessionalePdf({
  data,
}: {
  data: RapportinoPdfData;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.brandBox}>
            {data.azienda.logo ? (
              <Image src={data.azienda.logo} style={styles.logo} />
            ) : null}
            <Text style={styles.companyText}>
              {safe(data.azienda.indirizzo)} {data.azienda.citta ? `- ${data.azienda.citta}` : ""}
            </Text>
            <Text style={styles.companyText}>
              Tel. {safe(data.azienda.telefono)} | Email {safe(data.azienda.email)}
            </Text>
            <Text style={styles.companyText}>P.IVA {safe(data.azienda.piva)}</Text>
          </View>

          <View style={styles.docBox}>
            <View style={styles.docBoxHeader}>
              <Text style={styles.docBoxHeaderText}>Dati intervento</Text>
            </View>
            <View style={styles.docBoxBody}>
              <View style={styles.docRow}>
                <Text style={styles.docLabel}>Data</Text>
                <Text style={styles.docValue}>{safe(data.documento.data)}</Text>
              </View>
              <View style={styles.docRow}>
                <Text style={styles.docLabel}>Tipo</Text>
                <Text style={styles.docValue}>{safe(data.documento.tipo || "Rapportino")}</Text>
              </View>
              <View style={[styles.docRow, { marginBottom: 0, borderBottomWidth: 0 }]}>
                <Text style={styles.docLabel}>Tecnico</Text>
                <Text style={styles.docValue}>{safe(data.intervento.tecnico)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Rapportino di manutenzione impianto elevatore</Text>
          <Text style={styles.heroSub}>
            Documento tecnico con riepilogo dell'intervento eseguito e firma delle parti.
          </Text>
        </View>

        <View style={styles.cardFull}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderText}>Dati impianto</Text>
          </View>
          <View style={styles.cardBodyTwoCols}>
            <View style={styles.cardBodyCol}>
              <InfoField label="Cliente" value={data.impianto.clienteNome ?? data.cliente.nome} bold />
              <InfoField label="Numero impianto" value={data.impianto.numero} />
              {data.impianto.amministratoreNome ? (
                <InfoField label="Amministratore" value={data.impianto.amministratoreNome} />
              ) : null}
            </View>
            <View style={styles.cardBodyCol}>
              <InfoField label="Ubicazione" value={data.impianto.indirizzo} />
              <InfoField label="Comune" value={data.impianto.comune} />
            </View>
          </View>
        </View>

        {isFilled(data.intervento.note) && (
          <View style={styles.cardFull}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderText}>Note</Text>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.longTextBox}>
                <Text style={styles.longText}>{data.intervento.note}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={[styles.cardFull, { break: "avoid" } as any]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderText}>Firme</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.signaturesRow}>
              <View style={styles.signatureCard}>
                <View style={styles.signatureHead}>
                  <Text style={styles.signatureHeadText}>Firma cliente</Text>
                </View>
                <View style={styles.signatureBody}>
                  <View>
                    <Text style={styles.fieldLabel}>Firmatario</Text>
                    <Text style={styles.signatureName}>
                      {safe(data.firme.firmatarioCliente)}
                    </Text>
                    {data.firme.firmaCliente ? (
                      <Image
                        src={data.firme.firmaCliente}
                        style={styles.signatureImage}
                      />
                    ) : null}
                  </View>
                  <Text style={styles.signatureFooterLine}>Presa visione del rapporto</Text>
                </View>
              </View>

              <View style={styles.signatureCard}>
                <View style={styles.signatureHead}>
                  <Text style={styles.signatureHeadText}>Firma tecnico</Text>
                </View>
                <View style={styles.signatureBody}>
                  <View>
                    <Text style={styles.fieldLabel}>Tecnico incaricato</Text>
                    <Text style={styles.signatureName}>{safe(data.intervento.tecnico)}</Text>
                    {data.firme.firmaTecnico ? (
                      <Image
                        src={data.firme.firmaTecnico}
                        style={styles.signatureImage}
                      />
                    ) : null}
                  </View>
                  <Text style={styles.signatureFooterLine}>Intervento eseguito</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Documento generato digitalmente</Text>
            <Text style={styles.footerPageNum}>
              Pagina 1 di {data.semestrale?.attiva ? 2 : 1}
            </Text>
          </View>
          <Text style={styles.footerText}>
            Manutenzione impianto {safe(data.impianto.numero)} del {safe(data.documento.data)}
          </Text>
        </View>
      </Page>

      {data.semestrale?.attiva && (
        <Page size="A4" style={styles.page}>
          <View style={styles.header}>
            <View style={styles.brandBox}>
              {data.azienda.logo ? (
                <Image src={data.azienda.logo} style={styles.logo} />
              ) : null}
              <Text style={styles.companyText}>
                Verifica semestrale impianto elevatore
              </Text>
            </View>

            <View style={styles.docBox}>
              <View style={styles.docBoxHeader}>
                <Text style={styles.docBoxHeaderText}>Riferimento impianto</Text>
              </View>
              <View style={styles.docBoxBody}>
                <View style={styles.docRow}>
                  <Text style={styles.docLabel}>Numero impianto</Text>
                  <Text style={styles.docValue}>{safe(data.impianto.numero)}</Text>
                </View>
                <View style={[styles.docRow, { marginBottom: 0, borderBottomWidth: 0 }]}>
                  <Text style={styles.docLabel}>Data</Text>
                  <Text style={styles.docValue}>{safe(data.intervento.data)}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.hero}>
            <Text style={styles.heroTitle}>Verbale di verifica semestrale</Text>
            <Text style={styles.heroSub}>
              Controllo periodico eseguito ai sensi della manutenzione obbligatoria dell'impianto elevatore.
            </Text>
          </View>

          <View style={styles.cardFull}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderText}>Premessa</Text>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.longTextBox}>
                <Text style={styles.longText}>
                  Gentile cliente, si comunica che in data odierna è stata eseguita anche la verifica semestrale dell'impianto elevatore oggetto di manutenzione, tale verifica è un controllo obbligatorio per legge, regolamentato dal D.P.R. 162/99, che impone una manutenzione periodica per garantire la sicurezza dell'impianto. Questa verifica, insieme a quella biennale, è fondamentale per accertare il corretto funzionamento dei dispositivi di sicurezza e lo stato di efficienza dei componenti.
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.cardFull}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderText}>Esiti della verifica</Text>
            </View>
            <View style={styles.cardBody}>
              <BulletField label="Efficienza paracadute" value={data.semestrale.paracadute} />
              <BulletField label="Efficienza limitatore di velocità" value={data.semestrale.limitatore} />
              <BulletField label="Efficienza dispositivi di sicurezza" value={data.semestrale.dispositivi} />
              <BulletField label="Condizioni delle funi" value={data.semestrale.condizioniFuni} />
              <BulletField label="Condizioni attacchi funi" value={data.semestrale.attacchiFuni} />
              <BulletField label="Isolamento impianto elettrico" value={data.semestrale.isolamento} />
              <BulletField label="Collegamenti a terra" value={data.semestrale.terra} />
              <BulletField label="Osservazioni" value={data.semestrale.osservazioni} />
            </View>
          </View>

          <View style={styles.footer} fixed>
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>
                Allegato tecnico di verifica semestrale
              </Text>
              <Text style={styles.footerPageNum}>Pagina 2 di 2</Text>
            </View>
            <Text style={styles.footerText}>
              Manutenzione impianto {safe(data.impianto.numero)} del {safe(data.documento.data)}
            </Text>
          </View>
        </Page>
      )}
    </Document>
  );
}
