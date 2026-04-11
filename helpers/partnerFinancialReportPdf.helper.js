const PDFDocument = require("pdfkit");

/**
 * Build a monthly partner financial report PDF (bookings, gross, commission, net).
 * Amounts are formatted in EUR (adjust currency in Intl if needed).
 */
function buildPartnerMonthlyFinancialPdfBuffer({
  partnerDisplayName = "Partner",
  partnerEmail = "",
  periodLabel = "",
  periodStart = null,
  periodEnd = null,
  generatedAt = new Date(),
  summary = {
    grossTotal: 0,
    commissionTotal: 0,
    netToPartner: 0,
    refundTotal: 0,
    tipsTotal: 0,
    discountTotal: 0,
  },
  bookingRows = [],
  refundRows = [],
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 36,
      info: {
        Title: `Partner financial report ${periodLabel}`,
        Author: "Mystic",
      },
    });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const money = (n) =>
      new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
      }).format(Number(n) || 0);

    const fmtDateTime = (d) =>
      d
        ? new Intl.DateTimeFormat("de-DE", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(new Date(d))
        : "—";

    // Header
    doc.fontSize(16).text("Monatlicher Umsatz- und Gebührenbericht", { align: "left" });
    doc.moveDown(0.3);
    doc.fontSize(9).fillColor("#444444").text(`Erstellt: ${fmtDateTime(generatedAt)}`, { align: "right" });
    doc.fillColor("#000000");
    doc.moveDown(0.8);
    doc.fontSize(11).text(`Partner: ${partnerDisplayName}`);
    if (partnerEmail) {
      doc.fontSize(10).text(`E-Mail: ${partnerEmail}`);
    }
    doc.fontSize(10).text(`Zeitraum: ${periodLabel}`);
    if (periodStart && periodEnd) {
      doc
        .fontSize(9)
        .fillColor("#555555")
        .text(
          `${fmtDateTime(periodStart)} – ${fmtDateTime(periodEnd)}`
        );
      doc.fillColor("#000000");
    }
    doc.moveDown(1);

    // Summary strip (similar spirit to sample: totals)
    doc.fontSize(10).text("Zusammenfassung", { underline: true });
    doc.moveDown(0.4);
    const boxY = doc.y;
    const colW = (doc.page.width - 72) / 4;
    const metrics = [
      { label: "Brutto-Umsatz (bezahlt)", value: money(summary.grossTotal) },
      { label: "Plattform-Provision", value: money(summary.commissionTotal) },
      { label: "Netto an Partner", value: money(summary.netToPartner) },
      { label: "Rückerstattungen (Zeitraum)", value: money(summary.refundTotal) },
    ];
    metrics.forEach((m, i) => {
      doc
        .fontSize(8)
        .fillColor("#333333")
        .text(m.label, 36 + i * colW, boxY, { width: colW - 8 });
      doc.fontSize(11).fillColor("#000000").text(m.value, 36 + i * colW, boxY + 14, {
        width: colW - 8,
      });
    });
    doc.y = boxY + 38;
    doc.moveDown(1.2);

    doc
      .fontSize(8)
      .fillColor("#666666")
      .text(
        "Hinweis: Steuerliche Aufschlüsselung (USt.) ist nicht gespeichert; bitte Rechnungsbelege Ihrer Zahlungsabwicklung zuordnen.",
        { width: doc.page.width - 72 }
      );
    doc.fillColor("#000000");
    doc.moveDown(1);

    // Bookings table
    doc.fontSize(10).text("Buchungen im Zeitraum", { underline: true });
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const rowH = 16;
    const headers = [
      "Datum",
      "Buchungs-Nr.",
      "Aktivität",
      "Kunde",
      "Pers.",
      "Brutto",
      "Prov. %",
      "Provision",
      "Netto Partner",
      "Zahlart",
      "Status",
    ];
    const widths = [72, 78, 120, 100, 28, 62, 38, 62, 62, 52, 52];
    let x = 36;
    doc.fontSize(7.5).font("Helvetica-Bold");
    headers.forEach((h, i) => {
      doc.text(h, x, tableTop, { width: widths[i], continued: false });
      x += widths[i];
    });
    doc.font("Helvetica");
    let y = tableTop + 14;

    const drawRow = (cells) => {
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = 50;
      }
      x = 36;
      cells.forEach((cell, i) => {
        doc.fontSize(7).text(String(cell), x, y, { width: widths[i] - 2, ellipsis: true });
        x += widths[i];
      });
      y += rowH;
    };

    bookingRows.forEach((r) => {
      drawRow([
        r.dateStr,
        r.bookingRef,
        r.activityTitle,
        r.customerName,
        r.participants,
        money(r.gross),
        r.commissionRatePct != null ? `${r.commissionRatePct}` : "—",
        money(r.commission),
        money(r.netPartner),
        r.paymentMethod || "—",
        r.status || "—",
      ]);
    });

    if (!bookingRows.length) {
      drawRow([
        "—",
        "—",
        "Keine bezahlten Buchungen",
        "—",
        "—",
        money(0),
        "—",
        money(0),
        money(0),
        "—",
        "—",
      ]);
    }

    doc.y = y + 8;
    doc.moveDown(0.5);
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .text(`Summen: Brutto ${money(summary.grossTotal)} | Provision ${money(summary.commissionTotal)} | Netto Partner ${money(summary.netToPartner)}`);
    doc.font("Helvetica");

    if (refundRows && refundRows.length) {
      doc.addPage();
      doc.fontSize(12).text("Rückerstattungen / Stornos im Zeitraum", { underline: true });
      doc.moveDown(0.6);
      let ry = doc.y;
      doc.fontSize(7.5).font("Helvetica-Bold");
      const rh = ["Datum", "Buchungs-Nr.", "Aktivität", "Erstattungsbetrag", "Hinweis"];
      const rw = [80, 90, 200, 90, 200];
      let rx = 36;
      rh.forEach((h, i) => {
        doc.text(h, rx, ry, { width: rw[i] });
        rx += rw[i];
      });
      doc.font("Helvetica");
      ry += 14;
      refundRows.forEach((r) => {
        if (ry > doc.page.height - 60) {
          doc.addPage();
          ry = 50;
        }
        rx = 36;
        [r.dateStr, r.bookingRef, r.activityTitle, money(r.refundAmount), r.note || ""].forEach((cell, i) => {
          doc.fontSize(7).text(String(cell), rx, ry, { width: rw[i] - 2 });
          rx += rw[i];
        });
        ry += 14;
      });
    }

    doc.end();
  });
}

module.exports = { buildPartnerMonthlyFinancialPdfBuffer };
