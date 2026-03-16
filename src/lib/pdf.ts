import { PDFDocument, rgb, RGB, StandardFonts } from "pdf-lib";
import fs from 'fs';
import path from 'path';

export async function generateEstrattoContoPDF(amministratore: any, fatture: any[], impianti: any[] = []) {
  try {
    const pdfDoc = await PDFDocument.create();
    // A4 orizzontale: 841.89 x 595.28
    let page = pdfDoc.addPage([841.89, 595.28]);
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const marginX = 40;
    let y = height - 40;

    const drawText = (text: string, x: number, yPos: number, size = 10, bold = false) => {
      page.drawText(text, {
        x,
        y: yPos,
        size,
        font: bold ? fontBold : font,
        color: rgb(0, 0, 0),
      });
    };

    const drawCenteredText = (text: string, centerX: number, yPos: number, size = 10, bold = false) => {
      const fontToUse = bold ? fontBold : font;
      const textWidth = fontToUse.widthOfTextAtSize(text, size);
      const startX = centerX - textWidth / 2;
      page.drawText(text, {
        x: startX,
        y: yPos,
        size,
        font: fontToUse,
        color: rgb(0, 0, 0),
      });
    };

    // Header azienda
    drawText("Nolasco s.r.l.", marginX, y, 14, true);
    y -= 14;
    drawText("Via Giacomo Matteotti, 30 – 90014 Casteldaccia (PA)", marginX, y);
    y -= 12;
    drawText("P.IVA 05688840825 · info@nolasco.it", marginX, y);
    y -= 20;

    // Dati bancari
    drawText("Dati bancari", marginX, y, 11, true);
    y -= 12;
    drawText("Banca d'appoggio  Banco BPM - Filiale di Termini Imerese", marginX, y);
    y -= 12;
    drawText("IBAN  IT 91 C 05034 43640 000000000201", marginX, y);
    y -= 12;
    drawText("Intestatario  Nolasco s.r.l.", marginX, y);
    y -= 12;
    drawText("Causale bonifico  Riportare il numero e la data delle fatture pagate", marginX, y);
    y -= 18;

    const now = new Date();
    drawText(
      `Documento generato il ${now.toLocaleDateString("it-IT")}, ${now.toLocaleTimeString("it-IT")}`,
      marginX,
      y
    );
    y -= 24;

    // Dati amministratore
    drawText("DATI", marginX, y, 11, true);
    y -= 14;
    if (amministratore?.denominazione) {
      drawText(`Amministratore  ${amministratore.denominazione}`, marginX, y);
      y -= 12;
    }
    if (amministratore?.email) {
      drawText(`Email  ${amministratore.email}`, marginX, y);
      y -= 12;
    }
    y -= 8;

    drawText(
      "Per dettagli su IVA applicata ed eventuali ritenute d'acconto fare riferimento alle fatture in vostro possesso.",
      marginX,
      y
    );
    y -= 24;

    // Calcolo totali e fatture da pagare, raggruppate per impianto
    type Row = {
      tipo: string;
      numero: string;
      data: Date | null;
      descrizione: string;
      totale: number;
      ra: number;
      pagato: number;
      daPagare: number;
    };

    type Group = {
      header: string;
      rows: Row[];
      saldoParziale: number;
    };

    const groups = new Map<string, Group>();

    const getOrCreateGroup = (key: string, header: string): Group => {
      if (!groups.has(key)) {
        groups.set(key, { header, rows: [], saldoParziale: 0 });
      }
      return groups.get(key)!;
    };

    for (const f of fatture || []) {
      const totale = typeof f.importoTotale === "number" ? f.importoTotale : 0;
      const ra = typeof f.importoRA === "number" ? f.importoRA : 0;
      let pagato = 0;

      if (f.pagamentiJson) {
        try {
          const payments = JSON.parse(f.pagamentiJson);
          if (Array.isArray(payments)) {
            for (const p of payments) {
              if (p?.status === "paid") {
                pagato += Number(p.amount || 0);
              }
            }
          }
        } catch {}
      }

      const daPagare = Math.max(totale - pagato, 0);
      if (daPagare <= 0.01) continue; // solo fatture effettivamente da pagare

      const tipo = f.tipoDocumento === "proforma" ? "Proforma" : "Fattura";
      const descrizione = f.oggetto || f.note || "";

      // Trova impianto corrispondente cercando il numero impianto nel testo
      const text = `${descrizione || ""}`.toLowerCase();
      let groupKey = "__ALTRO__";
      let groupHeader = "Documenti non associati a impianto";

      for (const imp of impianti || []) {
        if (!imp?.numeroImpianto) continue;
        const code = String(imp.numeroImpianto).toLowerCase();
        if (code && text.includes(code)) {
          groupKey = `impianto_${imp.id}`;
          const headerLine = `Impianto: [${imp.numeroImpianto}] ${imp.indirizzo || ""}${
            imp.comune ? ` - ${imp.comune}` : ""
          }`;
          groupHeader = headerLine.trim();
          break;
        }
      }

      const group = getOrCreateGroup(groupKey, groupHeader);
      const row: Row = {
        tipo,
        numero: f.numero || "",
        data: f.data ? new Date(f.data) : null,
        descrizione,
        totale,
        ra,
        pagato,
        daPagare,
      };
      group.rows.push(row);
      group.saldoParziale += daPagare;
    }

    // Ordina gruppi per intestazione, righe per data/numero
    const orderedGroups = Array.from(groups.values()).sort((a, b) =>
      a.header.localeCompare(b.header)
    );
    orderedGroups.forEach((g) =>
      g.rows.sort((a, b) => {
        if (a.data && b.data && a.data.getTime() !== b.data.getTime()) {
          return a.data.getTime() - b.data.getTime();
        }
        return (a.numero || "").localeCompare(b.numero || "");
      })
    );

    const saldoFinale = orderedGroups.reduce((sum, g) => sum + g.saldoParziale, 0);

    drawText("SALDO FINALE", marginX, y, 11, true);
    drawText(
      `€ ${saldoFinale.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      marginX + 110,
      y,
      11,
      true
    );
    y -= 24;

    // Layout colonne (simile alla tabella HTML d'esempio)
    const cols = {
      numero: { x: marginX, width: 60 },
      data: { x: marginX + 60, width: 70 },
      descr: { x: marginX + 130, width: 270 },
      totale: { x: marginX + 400, width: 70 },
      ra: { x: marginX + 470, width: 60 },
      pagato: { x: marginX + 530, width: 70 },
      daPagare: { x: marginX + 600, width: 80 },
    } as const;

    const drawTableHeader = (yPos: number) => {
      const headerHeight = 22;
      // Sfondo header: rosso scuro, testo bianco, bordi come nell'esempio
      page.drawRectangle({
        x: marginX,
        y: yPos - headerHeight + 4,
        width: width - marginX * 2,
        height: headerHeight,
        color: rgb(0.56, 0.17, 0.17), // #8f2b2b approx
        borderColor: rgb(0.4, 0.1, 0.1),
        borderWidth: 0.5,
      });

      const headerSize = 10;
      const headerY = yPos - 8;
      const headerFont = fontBold;
      const headerColor = rgb(1, 1, 1);

      const drawHeaderCell = (label: string, col: { x: number; width: number }) => {
        const textWidth = headerFont.widthOfTextAtSize(label, headerSize);
        const startX = col.x + (col.width - textWidth) / 2;
        page.drawText(label, {
          x: startX,
          y: headerY,
          size: headerSize,
          font: headerFont,
          color: headerColor,
        });
      };

      drawHeaderCell("# FT", cols.numero);
      drawHeaderCell("DATA", cols.data);
      drawHeaderCell("DESCRIZIONE", cols.descr);
      drawHeaderCell("TOTALE", cols.totale);
      drawHeaderCell("RA", cols.ra);
      drawHeaderCell("PAGATO", cols.pagato);
      drawHeaderCell("DA PAGARE", cols.daPagare);
    };

    const rowFontSize = 10;
    const rowLineHeight = 18;

    const computeRowHeight = (r: Row) => {
      const maxDescrWidth = cols.descr.width - 8; // padding interno
      let descr = r.descrizione || "";
      if (!descr) return rowLineHeight;
      let lineCount = 1;
      let current = "";
      for (const word of descr.split(" ")) {
        const test = current + word + " ";
        const w = font.widthOfTextAtSize(test, rowFontSize);
        if (w > maxDescrWidth && current !== "") {
          lineCount += 1;
          current = word + " ";
        } else {
          current = test;
        }
      }
      return lineCount * rowLineHeight;
    };

    for (const group of orderedGroups) {
      if (group.rows.length === 0) continue;

      // Calcola altezza necessaria per TUTTO il blocco impianto (titolo + header + righe + saldo parziale)
      const blockRowsHeight = group.rows.reduce(
        (sum, r) => sum + computeRowHeight(r),
        0
      );
      const blockHeight =
        18 /* titolo */ + 24 /* header */ + blockRowsHeight + 32 /* saldo parziale */;
      const minY = 60;

      // Se non c'è spazio sufficiente sulla pagina corrente, spostiamo l'intero blocco alla pagina successiva
      if (y - blockHeight < minY) {
        page = pdfDoc.addPage([841.89, 595.28]);
        y = 595.28 - 60;
      }

      // Titolo impianto (rosso come nell'esempio)
      drawText(group.header, marginX, y, 11, true);
      y -= 16;

      drawTableHeader(y);
      y -= 20;

      for (const r of group.rows) {
        const rowHeight = computeRowHeight(r);

        // Sfondo riga con zebra (tr:nth-child(even))
        const rowIndex = group.rows.indexOf(r);
        const isEven = rowIndex % 2 === 0;
        const fillColor = isEven ? rgb(0.95, 0.95, 0.95) : rgb(1, 1, 1);

        page.drawRectangle({
          x: marginX,
          y: y - rowHeight + 4,
          width: width - marginX * 2,
          height: rowHeight,
          color: fillColor,
          borderColor: rgb(0.87, 0.87, 0.87), // #ddd approx
          borderWidth: 0.4,
        });

        // Base verticale del testo leggermente più bassa per centrarlo nella cella
        const textBaseY = y - 6;

        // Centri orizzontali delle colonne (per testo centrato)
        const centerNumero = cols.numero.x + cols.numero.width / 2;
        const centerData = cols.data.x + cols.data.width / 2;
        const centerDescr = cols.descr.x + cols.descr.width / 2;
        const centerTotale = cols.totale.x + cols.totale.width / 2;
        const centerRa = cols.ra.x + cols.ra.width / 2;
        const centerPagato = cols.pagato.x + cols.pagato.width / 2;
        const centerDaPagare = cols.daPagare.x + cols.daPagare.width / 2;

        // Testo nelle celle centrato orizzontalmente
        drawCenteredText(r.numero, centerNumero, textBaseY, rowFontSize);
        drawCenteredText(
          r.data ? r.data.toLocaleDateString("it-IT") : "",
          centerData,
          textBaseY,
          rowFontSize
        );

        // Descrizione con a capo automatico, centrata
        const maxDescrWidth = cols.descr.width - 8;
        let descr = r.descrizione || "";
        if (descr.length > 0) {
          let current = "";
          let lineY = textBaseY;
          for (const word of descr.split(" ")) {
            const test = current + word + " ";
            const w = font.widthOfTextAtSize(test, rowFontSize);
            if (w > maxDescrWidth && current !== "") {
              drawCenteredText(current.trim(), centerDescr, lineY, rowFontSize);
              lineY -= rowLineHeight;
              current = word + " ";
            } else {
              current = test;
            }
          }
          if (current.trim().length > 0) {
            drawCenteredText(current.trim(), centerDescr, lineY, rowFontSize);
          }
        }

        const drawCurrencyRight = (
          val: number,
          centerX: number
        ) => {
          const txt = `€ ${val.toLocaleString("it-IT", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;
          drawCenteredText(txt, centerX, textBaseY, rowFontSize);
        };

        drawCurrencyRight(r.totale, centerTotale);
        if (r.ra !== 0) {
          drawCurrencyRight(r.ra, centerRa);
        }
        if (r.pagato !== 0) {
          drawCurrencyRight(r.pagato, centerPagato);
        }
        drawCurrencyRight(r.daPagare, centerDaPagare);

        y -= rowHeight;
      }

      // Saldo parziale per impianto
      if (y < 60) {
        page = pdfDoc.addPage([841.89, 595.28]);
        y = 595.28 - 80;
      }
      y -= 4;
      page.drawRectangle({
        x: width - marginX - 160,
        y: y - 20,
        width: 160,
        height: 20,
        color: rgb(1, 1, 1),
      });
      drawText("SALDO PARZIALE", width - marginX - 150, y - 6, 10, true);
      const saldoTxt = `€ ${group.saldoParziale.toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
      const saldoTw = fontBold.widthOfTextAtSize(saldoTxt, 12);
      page.drawText(saldoTxt, {
        x: width - marginX - 10 - saldoTw,
        y: y - 8,
        size: 12,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      y -= 28;
    }

    const pdfBytes = await pdfDoc.save();

    const dirPath = path.join(process.cwd(), "public", "uploads", "estratti");
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const safeName =
      amministratore?.denominazione
        ?.toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .slice(0, 40) || "amministratore";

    const fileName = `estratto_conto_${safeName}_${now
      .toISOString()
      .slice(0, 10)}.pdf`;
    const filePath = path.join(dirPath, fileName);

    fs.writeFileSync(filePath, pdfBytes);

    return `/uploads/estratti/${fileName}`;
  } catch (error) {
    console.error("Errore generazione estratto conto PDF:", error);
    return null;
  }
}

export async function generateInterventoPDF(intervento: any) {
  try {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Pre-calcola il numero totale di pagine (1 pagina base + 1 per ogni foto)
    let fotoPaths: string[] = [];
    try {
      fotoPaths = JSON.parse(intervento.foto || "[]");
    } catch(e) {}
    const totalPages = 1 + fotoPaths.length;
    let pageNum = 1;

    const drawFooter = (currentPage: any, pNum: number) => {
      const footerText = `Rapportino ${intervento.numeroRapportino ? `N. ${intervento.numeroRapportino}` : ''} - Pagina ${pNum} di ${totalPages}`;
      const textWidth = font.widthOfTextAtSize(footerText, 10);
      currentPage.drawText(footerText, {
        x: (width - textWidth) / 2,
        y: 20,
        size: 10,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      });
    };

    // Try to load logo
    try {
      const logoPath = path.join(process.cwd(), 'public', 'images', 'logo.png');
      if (fs.existsSync(logoPath)) {
        const logoImageBytes = fs.readFileSync(logoPath);
        const logoImage = await pdfDoc.embedPng(logoImageBytes);
        
        const maxLogoWidth = 140;
        const maxLogoHeight = 50;

        let scaleFactor = maxLogoWidth / logoImage.width;
        if (logoImage.height * scaleFactor > maxLogoHeight) {
          scaleFactor = maxLogoHeight / logoImage.height;
        }

        const logoDims = logoImage.scale(scaleFactor);
        
        page.drawImage(logoImage, {
          x: width - logoDims.width - 50,
          y: height - logoDims.height - 40,
          width: logoDims.width,
          height: logoDims.height,
        });
      }
    } catch (e) {
      console.log('Error loading logo for PDF', e);
    }

    const titleText = `Rapporto di Intervento ${intervento.numeroRapportino ? `N. ${intervento.numeroRapportino}` : ''}`;
    page.drawText(titleText, {
      x: 50,
      y: height - 80,
      size: 20,
      font: fontBold,
      color: rgb(0, 0, 0),
    });

    const drawLine = (y: number, currentPage: any = page) => {
      currentPage.drawLine({
        start: { x: 50, y },
        end: { x: width - 50, y },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
      });
    };

    drawLine(height - 100);

    const printLabelValue = (label: string, value: string, yPos: number, xStart = 50) => {
      page.drawText(label, { x: xStart, y: yPos, size: 10, font: fontBold });
      page.drawText(value, { x: xStart + 80, y: yPos, size: 10, font: font });
    };

    const dataFormatted = new Date(intervento.dataIntervento).toLocaleDateString('it-IT');
    
    let yOffset = height - 120;
    
    const drawSectionHeader = (title: string, yPos: number) => {
      page.drawRectangle({
        x: 50,
        y: yPos - 12,
        width: width - 100,
        height: 20,
        color: rgb(0.95, 0.95, 0.95),
      });
      page.drawText(title, { x: 60, y: yPos - 8, size: 12, font: fontBold });
      return yPos - 35;
    };

    yOffset = drawSectionHeader('INFORMAZIONI GENERALI', yOffset);
    printLabelValue('Data:', dataFormatted, yOffset);
    printLabelValue('Orario:', `${intervento.oraInizio} - ${intervento.oraFine}`, yOffset - 20);
    printLabelValue('Tecnico:', intervento.tecnico?.name || '', yOffset - 40);
    yOffset -= 70;

    yOffset = drawSectionHeader('DETTAGLI IMPIANTO', yOffset);
    printLabelValue('Num. Impianto:', intervento.impianto?.numeroImpianto || '', yOffset);
    printLabelValue('Cliente:', intervento.impianto?.cliente?.denominazione || '', yOffset - 20);
    printLabelValue('Indirizzo:', `${intervento.impianto?.indirizzo}, ${intervento.impianto?.comune} (${intervento.impianto?.provincia || ''})`, yOffset - 40);
    yOffset -= 70;

    yOffset = drawSectionHeader('DETTAGLI INTERVENTO', yOffset);

    const drawMultilineText = (label: string, text: string | null | undefined, currentY: number) => {
      page.drawText(label, { x: 50, y: currentY, size: 10, font: fontBold });
      currentY -= 15;
      
      if (!text) {
        page.drawText('Nessuna nota.', { x: 50, y: currentY, size: 10, font: font });
        return currentY - 20;
      }

      const words = text.split(' ');
      let currentLine = '';
      for (const word of words) {
        const testLine = currentLine + word + ' ';
        const textWidth = font.widthOfTextAtSize(testLine, 10);
        if (textWidth > (width - 100)) {
          page.drawText(currentLine, { x: 50, y: currentY, size: 10, font: font });
          currentY -= 15;
          currentLine = word + ' ';
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine.trim().length > 0) {
        page.drawText(currentLine, { x: 50, y: currentY, size: 10, font: font });
        currentY -= 15;
      }
      return currentY - 15;
    };

    yOffset = drawMultilineText('Descrizione Intervento:', intervento.descrizione, yOffset);
    yOffset = drawMultilineText('Parti Installate / Sostituite:', intervento.partiSostituite, yOffset);
    yOffset = drawMultilineText('Materiale da Ordinare:', intervento.materialeOrdinare, yOffset);

    if (fotoPaths.length > 0) {
      page.drawText(`Sono state allegate n. ${fotoPaths.length} foto all'intervento (vedi pagine successive).`, { x: 50, y: yOffset, size: 10, font: font, color: rgb(0.3, 0.3, 0.3) });
    }
    yOffset -= 20;

    drawLine(yOffset + 10);
    yOffset -= 20;

    page.drawText('Cliente Firmatario:', { x: 50, y: yOffset, size: 10, font: fontBold });
    page.drawText(intervento.clienteFirmatario || '', { x: 150, y: yOffset, size: 10, font: font });

    yOffset -= 40;
    
    // Riquadri per le firme
    page.drawText('Firma Tecnico', { x: 80, y: yOffset, size: 10, font: fontBold });
    page.drawText('Firma Cliente Firmatario', { x: 350, y: yOffset, size: 10, font: fontBold });
    
    page.drawRectangle({
      x: 50,
      y: yOffset - 90,
      width: 200,
      height: 80,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    });

    page.drawRectangle({
      x: 320,
      y: yOffset - 90,
      width: 200,
      height: 80,
      borderColor: rgb(0.8, 0.8, 0.8),
      borderWidth: 1,
    });
    
    yOffset -= 90;

    const embedSignature = async (base64Str: string, xPos: number, yPos: number) => {
      try {
        if (base64Str && base64Str.startsWith('data:image/png;base64,')) {
          const base64Data = base64Str.replace('data:image/png;base64,', '');
          const imageBytes = Buffer.from(base64Data, 'base64');
          const image = await pdfDoc.embedPng(imageBytes);
          const scale = Math.min(180 / image.width, 60 / image.height);
          const dims = image.scale(scale);
          
          const xOffset = xPos + (200 - dims.width) / 2;
          const yImage = yPos + (80 - dims.height) / 2;

          page.drawImage(image, {
            x: xOffset,
            y: yImage,
            width: dims.width,
            height: dims.height,
          });
        }
      } catch (e) {
        console.log('Error embedding signature', e);
      }
    };

    if (intervento.firmaTecnico) {
      await embedSignature(intervento.firmaTecnico, 50, yOffset);
    }
    if (intervento.firmaCliente) {
      await embedSignature(intervento.firmaCliente, 320, yOffset);
    }

    // Disegna footer prima pagina
    drawFooter(page, pageNum);

    // Aggiungi foto su nuove pagine
    for (let i = 0; i < fotoPaths.length; i++) {
      pageNum++;
      const imgPathStr = fotoPaths[i];
      let imgBuffer: Buffer | null = null;
      let isPng = false;

      try {
        if (imgPathStr.startsWith('data:image')) {
          const matches = imgPathStr.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            isPng = matches[1].includes('png');
            imgBuffer = Buffer.from(matches[2], 'base64');
          }
        } else if (imgPathStr.startsWith('/uploads')) {
          const absolutePath = path.join(process.cwd(), 'public', imgPathStr);
          if (fs.existsSync(absolutePath)) {
            isPng = absolutePath.toLowerCase().endsWith('.png');
            imgBuffer = fs.readFileSync(absolutePath);
          }
        }
      } catch (err) {
        console.error("Errore caricamento foto per PDF:", err);
      }

      if (imgBuffer) {
        try {
          const photoPage = pdfDoc.addPage([595.28, 841.89]);
          let embeddedImage;
          if (isPng) {
            embeddedImage = await pdfDoc.embedPng(imgBuffer);
          } else {
            embeddedImage = await pdfDoc.embedJpg(imgBuffer);
          }

          const photoTitle = `Foto allegata ${i + 1}`;
          photoPage.drawText(photoTitle, { x: 50, y: height - 50, size: 14, font: fontBold });
          drawLine(height - 70, photoPage);

          // Calcola scale per far stare la foto nella pagina (margine 50px per lato, top 80, bottom 50)
          const maxWidth = width - 100;
          const maxHeight = height - 150;
          
          let scale = maxWidth / embeddedImage.width;
          if (embeddedImage.height * scale > maxHeight) {
            scale = maxHeight / embeddedImage.height;
          }

          const imgDims = embeddedImage.scale(scale);

          photoPage.drawImage(embeddedImage, {
            x: (width - imgDims.width) / 2,
            y: height - 90 - imgDims.height,
            width: imgDims.width,
            height: imgDims.height,
          });

          drawFooter(photoPage, pageNum);
        } catch (imgError) {
          console.error("Errore embed immagine:", imgError);
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    
    const dirPath = path.join(process.cwd(), 'public', 'rapportini');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    const fileName = `Intervento_${intervento.id}.pdf`;
    const filePath = path.join(dirPath, fileName);
    
    fs.writeFileSync(filePath, pdfBytes);
    
    return `/rapportini/${fileName}`;

  } catch (error) {
    console.error("Errore generazione PDF intervento:", error);
    return null;
  }
}

export async function generatePresenzePDF(presenzeList: any[], mese: number, anno: number) {
  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const presenzeByTecnico: Record<string, any[]> = {};
    for (const p of presenzeList) {
      if (!presenzeByTecnico[p.tecnicoId]) {
        presenzeByTecnico[p.tecnicoId] = [];
      }
      presenzeByTecnico[p.tecnicoId].push(p);
    }
    
    const mesi = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
    const nomeMese = mesi[mese - 1];

    const keys = Object.keys(presenzeByTecnico);
    if (keys.length === 0) {
      const page = pdfDoc.addPage([595.28, 841.89]);
      page.drawText("Nessuna presenza trovata nel periodo selezionato.", { x: 50, y: 800, size: 12, font });
    }

    for (const tecnicoId of keys) {
      const pList = presenzeByTecnico[tecnicoId];
      const tecnicoName = pList[0].tecnico.name;

      const page = pdfDoc.addPage([595.28, 841.89]);
      const { width, height } = page.getSize();
      
      let tOrd = 0, tPerm = 0, tMal = 0, tStr = 0, tFes = 0, tFer = 0;
      
      let yOffset = height - 50;

      try {
        const logoPath = path.join(process.cwd(), 'public', 'images', 'logo.png');
        if (fs.existsSync(logoPath)) {
          const logoImageBytes = fs.readFileSync(logoPath);
          const logoImage = await pdfDoc.embedPng(logoImageBytes);
          const maxLogoWidth = 100;
          const maxLogoHeight = 40;
          let scaleFactor = maxLogoWidth / logoImage.width;
          if (logoImage.height * scaleFactor > maxLogoHeight) {
            scaleFactor = maxLogoHeight / logoImage.height;
          }
          const logoDims = logoImage.scale(scaleFactor);
          
          page.drawImage(logoImage, {
            x: width - logoDims.width - 50,
            y: height - logoDims.height - 40,
            width: logoDims.width,
            height: logoDims.height,
          });
        }
      } catch (e) {
        console.log('Error loading logo for PDF', e);
      }

      page.drawText(`Riepilogo Presenze - ${tecnicoName}`, { x: 50, y: yOffset, size: 18, font: fontBold });
      page.drawText(`Mese: ${nomeMese} ${anno}`, { x: 50, y: yOffset - 20, size: 12, font });

      yOffset -= 70;

      const colX = [50, 150, 220, 290, 360, 430, 500];
      const headers = ["Data", "Ordinario", "Permesso", "Malattia", "Straord.", "Festivo", "Ferie"];
      
      // Header table background
      page.drawRectangle({ x: 45, y: yOffset - 15, width: 505, height: 25, color: rgb(0.2, 0.25, 0.4) });
      
      headers.forEach((h, i) => {
        page.drawText(h, { x: colX[i], y: yOffset - 6, size: 9, font: fontBold, color: rgb(1, 1, 1) });
      });

      yOffset -= 25;

      const formatDate = (date: Date) => {
        const d = new Date(date);
        const giorni = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
        const mesi = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
        return `${giorni[d.getDay()]} ${d.getDate()} ${mesi[d.getMonth()]}`;
      };

      let rowCount = 0;
      for (const p of pList) {
        tOrd += p.oreOrdinario || 0;
        tPerm += p.orePermesso || 0;
        tMal += p.oreMalattia || 0;
        tStr += p.oreStraordinario || 0;
        tFes += p.oreFestivo || 0;
        tFer += p.oreFerie || 0;

        const dataGiorno = formatDate(p.data);
        const formatHours = (hours: number | null) => hours && hours > 0 ? String(hours) : "";

        // Alternating row background
        if (rowCount % 2 === 0) {
          page.drawRectangle({ x: 45, y: yOffset - 12, width: 505, height: 18, color: rgb(0.96, 0.97, 0.98) });
        }

        const isWeekendOrFestivo = p.oreFestivo && p.oreFestivo > 0;
        const textColor = isWeekendOrFestivo ? rgb(0.8, 0.2, 0.2) : rgb(0.2, 0.2, 0.2);

        page.drawText(dataGiorno, { x: colX[0], y: yOffset - 6, size: 9, font, color: textColor });
        page.drawText(formatHours(p.oreOrdinario), { x: colX[1], y: yOffset - 6, size: 9, font, color: textColor });
        page.drawText(formatHours(p.orePermesso), { x: colX[2], y: yOffset - 6, size: 9, font, color: textColor });
        page.drawText(formatHours(p.oreMalattia), { x: colX[3], y: yOffset - 6, size: 9, font, color: textColor });
        page.drawText(formatHours(p.oreStraordinario), { x: colX[4], y: yOffset - 6, size: 9, font, color: textColor });
        page.drawText(formatHours(p.oreFestivo), { x: colX[5], y: yOffset - 6, size: 9, font, color: textColor });
        page.drawText(formatHours(p.oreFerie), { x: colX[6], y: yOffset - 6, size: 9, font, color: textColor });

        page.drawLine({ start: { x: 45, y: yOffset - 12 }, end: { x: 550, y: yOffset - 12 }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });
        
        yOffset -= 18;
        rowCount++;
      }

      yOffset -= 30;

      page.drawRectangle({ x: 45, y: yOffset - 55, width: 505, height: 60, color: rgb(0.97, 0.98, 1), borderColor: rgb(0.8, 0.85, 0.9), borderWidth: 1 });
      page.drawText("TOTALI MENSILI", { x: 55, y: yOffset - 25, size: 10, font: fontBold });
      
      const totVals = [
        `Ordinario: ${tOrd}`,
        `Permesso: ${tPerm}`,
        `Malattia: ${tMal}`,
        `Straordinario: ${tStr}`,
        `Festivo: ${tFes}`,
        `Ferie: ${tFer}`
      ];
      
      let totX = 160;
      totVals.slice(0, 3).forEach(v => {
        page.drawText(v, { x: totX, y: yOffset - 15, size: 10, font: fontBold });
        totX += 110;
      });
      totX = 160;
      totVals.slice(3, 6).forEach(v => {
        page.drawText(v, { x: totX, y: yOffset - 35, size: 10, font: fontBold });
        totX += 110;
      });

    }

    const pdfBytes = await pdfDoc.save();
    
    const dirPath = path.join(process.cwd(), 'public', 'rapportini');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    const fileName = `Presenze_${mese}_${anno}_${Date.now()}.pdf`;
    const filePath = path.join(dirPath, fileName);
    
    fs.writeFileSync(filePath, pdfBytes);
    
    return `/rapportini/${fileName}`;

  } catch (error) {
    console.error("Errore generazione PDF presenze:", error);
    return null;
  }
}

