import React from "react";
import path from "path";
import fs from "fs";
import { renderToBuffer } from "@react-pdf/renderer";
import { RapportinoProfessionalePdf } from "./RapportinoProfessionalePdf";
import { mapManutenzioneToRapportinoPdfData } from "./mapManutenzioneToRapportinoPdfData";
import type { ManutenzioneForPdf } from "./RapportinoDocument";

/**
 * Genera il PDF del rapportino di manutenzione con @react-pdf/renderer
 * usando il template RapportinoProfessionalePdf (layout navy/card).
 * La semestrale viene inclusa come seconda pagina solo se manutenzione.effettuaSemestrale === true.
 */
export async function generateRapportinoPDF(manutenzione: ManutenzioneForPdf): Promise<string | null> {
  try {
    const rapportinoPath = path.join(process.cwd(), "public", "images", "logo-rapportino.png");
    const fallbackPath = path.join(process.cwd(), "public", "images", "logo.png");
    const logoPath = fs.existsSync(rapportinoPath) ? rapportinoPath : fallbackPath;
    const logoPathOrNull = fs.existsSync(logoPath) ? logoPath : null;

    const data = mapManutenzioneToRapportinoPdfData(manutenzione, logoPathOrNull);

    const docElement = React.createElement(RapportinoProfessionalePdf, { data });
    // renderToBuffer types expect DocumentProps; our component renders <Document> at root
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(docElement as any);

    const dirPath = path.join(process.cwd(), "public", "rapportini");
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const fileName = `Rapportino_${manutenzione.id}.pdf`;
    const filePath = path.join(dirPath, fileName);
    fs.writeFileSync(filePath, buffer);
    return `/rapportini/${fileName}`;
  } catch (error) {
    console.error("Errore generazione PDF rapportino (react-pdf):", error);
    return null;
  }
}
