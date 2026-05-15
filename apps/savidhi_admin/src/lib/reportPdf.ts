import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PdfColumn {
  /** Field name on each row. */
  key: string;
  /** Header label rendered at the top of the column. */
  label: string;
}

/**
 * Build a PDF blob from a list of plain rows + a column spec. Cell values are
 * coerced to strings via `String(value ?? '')` so callers should pre-format
 * dates / currency before passing them in (same convention as `buildExcel`
 * on the backend).
 */
export function buildPdf(
  title: string,
  rows: Record<string, unknown>[],
  columns: PdfColumn[],
): Blob {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text(title, 40, 32);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 40, 46);

  autoTable(doc, {
    startY: 56,
    head: [columns.map((c) => c.label)],
    body: rows.map((r) => columns.map((c) => String(r[c.key] ?? ''))),
    headStyles: { fillColor: [232, 129, 58] },
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
    theme: 'grid',
  });

  return doc.output('blob');
}

/** Trigger a browser download for a Blob. */
export function downloadPdfBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
