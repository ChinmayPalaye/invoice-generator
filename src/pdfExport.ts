import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { type InvoiceData, calcSubtotal, calcTotal, getUpiUrl } from './types';

// WinAnsi-safe currency symbols for PDF standard fonts
const PDF_CURRENCY_MAP: Record<string, string> = {
  '$': '$',
  '€': 'EUR ',
  '£': 'GBP ',
  '₹': 'Rs.',
  '¥': 'JPY ',
};

function pdfCurrency(amount: number, symbol: string): string {
  const safe = PDF_CURRENCY_MAP[symbol] ?? symbol;
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `${safe}${formatted}`;
}

function fmtDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export async function generatePdf(data: InvoiceData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.5, 842.25]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const black = rgb(0, 0, 0);
  const gray = rgb(0.33, 0.33, 0.33);
  const white = rgb(1, 1, 1);
  const darkBg = rgb(0.18, 0.18, 0.18);

  const W = 595.5;
  const H = 842.25;
  const sym = data.currencySymbol;

  // Helper: draw text
  const text = (
    s: string, x: number, y: number,
    opts?: { size?: number; font?: typeof font; color?: typeof black; maxWidth?: number }
  ) => {
    const sz = opts?.size ?? 10;
    const f = opts?.font ?? font;
    const c = opts?.color ?? black;
    let str = s;
    if (opts?.maxWidth) {
      while (f.widthOfTextAtSize(str, sz) > opts.maxWidth && str.length > 1) {
        str = str.slice(0, -1);
      }
    }
    page.drawText(str, { x, y, size: sz, font: f, color: c });
  };

  // Left accent bar
  page.drawRectangle({ x: 0, y: 0, width: 10, height: H, color: darkBg });

  // Title
  text('I N V O I C E', 36, H - 72, { size: 26, font: fontBold });

  // Meta row labels
  const metaY = H - 142;
  text('I N V O I C E   N U M B E R :', 200, metaY, { size: 7, font: fontBold, color: gray });
  text(data.invoiceNumber, 200, metaY - 12, { size: 10, font: fontBold });

  text('D A T E :', 44, metaY, { size: 7, font: fontBold, color: gray });
  text(fmtDate(data.invoiceDate), 44, metaY - 12, { size: 10, font: fontBold });

  text('D U E   D A T E :', 410, metaY, { size: 7, font: fontBold, color: gray });
  text(fmtDate(data.dueDate), 410, metaY - 12, { size: 10, font: fontBold });

  // Separator
  page.drawRectangle({ x: 36, y: metaY - 22, width: W - 72, height: 1.5, color: black });

  // Bill To
  const addrY = H - 234;
  text('B I L L   T O :', 44, addrY, { size: 8, font: fontBold, color: gray });
  const billLines = [data.billToName, ...data.billToAddress.split('\n')].filter(Boolean);
  billLines.forEach((line, i) => {
    text(line, 44, addrY - 14 - i * 13, { size: 10, maxWidth: 260 });
  });

  // Payable To
  text('P A Y A B L E   T O :', 363, addrY, { size: 8, font: fontBold, color: gray });
  const payLines = [data.payableName, data.payableLocation, data.payablePhone, data.payableEmail].filter(Boolean);
  payLines.forEach((line, i) => {
    text(line, 363, addrY - 14 - i * 13, { size: 10, maxWidth: 200 });
  });

  // Invoice towards
  const towY = H - 352;
  text(`Invoice towards : ${data.invoiceTowards}`, 44, towY, { size: 9, font: fontBold });

  // Table header
  const tableHeaderY = H - 382;
  page.drawRectangle({ x: 36, y: tableHeaderY - 4, width: W - 72, height: 18, color: darkBg });
  const thY = tableHeaderY + 2;
  text('N O .', 44, thY, { size: 7, font: fontBold, color: white });
  text('Q T Y', 80, thY, { size: 7, font: fontBold, color: white });
  text('D E S C R I P T I O N', 120, thY, { size: 7, font: fontBold, color: white });
  text('P R I C E', 380, thY, { size: 7, font: fontBold, color: white });
  text('T O T A L', 480, thY, { size: 7, font: fontBold, color: white });

  // Table rows
  let rowY = tableHeaderY - 22;
  for (const item of data.items) {
    text(item.serialNo, 48, rowY, { size: 9 });
    text(String(item.qty), 84, rowY, { size: 9 });
    text(item.description, 120, rowY, { size: 9, maxWidth: 240 });
    text(pdfCurrency(item.price, sym), 380, rowY, { size: 9 });
    text(pdfCurrency(item.qty * item.price, sym), 480, rowY, { size: 9 });
    rowY -= 20;
  }

  // Subtotal (only if there are extra charges)
  const hasExtras = data.extraCharges.some((c) => c.amount > 0);
  if (hasExtras) {
    rowY -= 8;
    text('s u b t o t a l :', 310, rowY, { size: 8, font: fontBold, color: gray });
    text(pdfCurrency(calcSubtotal(data.items), sym), 480, rowY, { size: 10 });
    rowY -= 16;

    // Extra charge lines
    for (const charge of data.extraCharges) {
      if (charge.amount > 0) {
        text(charge.label || 'Extra charge', 310, rowY, { size: 9, color: gray });
        text(pdfCurrency(charge.amount, sym), 480, rowY, { size: 9 });
        rowY -= 16;
      }
    }
  }

  // Total
  rowY -= 8;
  const total = calcTotal(data.items, data.extraCharges);
  page.drawRectangle({ x: 300, y: rowY + 14, width: W - 336, height: 1.5, color: black });
  text('T O T A L   A M O U N T :', 310, rowY, { size: 9, font: fontBold, color: gray });
  text(`${pdfCurrency(total, sym)}/-`, 470, rowY, {
    size: 13,
    font: fontBold,
  });

  // Account details
  const acctY = Math.min(rowY - 60, 140);
  page.drawRectangle({ x: 36, y: acctY + 16, width: W - 72, height: 0.5, color: rgb(0.8, 0.8, 0.8) });
  text('A C C O U N T   D E T A I L S', 44, acctY, { size: 8, font: fontBold, color: gray });
  text(`Name : ${data.accountName}`, 44, acctY - 16, { size: 9 });
  text(`Account number : ${data.accountNumber}`, 44, acctY - 29, { size: 9 });
  text(`IFSC : ${data.ifsc}`, 44, acctY - 42, { size: 9 });
  text(`Bank Name : ${data.bankName}`, 44, acctY - 55, { size: 9 });

  // Signoff name
  text(data.payableName, 400, acctY - 32, { size: 10, font: fontBold });

  // QR Code for UPI
  if (data.upiId) {
    const upiUrl = getUpiUrl(data);
    try {
      const qrDataUrl = await QRCode.toDataURL(upiUrl, { width: 200, margin: 1 });
      const qrImageBytes = Uint8Array.from(atob(qrDataUrl.split(',')[1]), c => c.charCodeAt(0));
      const qrImage = await pdfDoc.embedPng(qrImageBytes);
      const qrSize = 70;
      page.drawImage(qrImage, {
        x: W - 36 - qrSize,
        y: acctY - 60,
        width: qrSize,
        height: qrSize,
      });
      text('Scan to Pay', W - 36 - qrSize + 10, acctY - 68, { size: 6, font: fontBold, color: gray });
    } catch { /* skip QR on error */ }
  }

  // Footer note
  const footerY = 36;
  const noteW = fontBold.widthOfTextAtSize(data.footerNote, 8);
  text(data.footerNote, (W - noteW) / 2, footerY, { size: 8, font: fontBold, color: gray });

  return pdfDoc.save();
}

export function downloadPdf(bytes: Uint8Array, filename = 'invoice.pdf') {
  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
