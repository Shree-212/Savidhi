import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PdfColumn {
  /** Field name on each row. */
  key: string;
  /** Header label rendered at the top of the column. */
  label: string;
}

/**
 * Fetch the Noto Sans Devanagari TTF once from /public, base64-encode it, and
 * cache the result. Subsequent calls return immediately. Without this font
 * jsPDF's default Helvetica renders Hindi/Sanskrit puja names as gibberish.
 */
let devanagariFontPromise: Promise<string> | null = null;
async function loadDevanagariFontBase64(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (!devanagariFontPromise) {
    devanagariFontPromise = (async () => {
      const res = await fetch('/fonts/NotoSansDevanagari-Regular.ttf');
      if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
      const buf = await res.arrayBuffer();
      // Convert binary → base64 via chunked String.fromCharCode (avoids
      // RangeError on large buffers).
      const bytes = new Uint8Array(buf);
      let bin = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      return btoa(bin);
    })().catch((err) => {
      // Reset so a later call can retry.
      devanagariFontPromise = null;
      console.warn('[reportPdf] Devanagari font load failed, falling back to Helvetica:', err);
      throw err;
    });
  }
  try {
    return await devanagariFontPromise;
  } catch {
    return null;
  }
}

/**
 * Build a PDF blob from a list of plain rows + a column spec. Cell values are
 * coerced to strings via `String(value ?? '')` so callers should pre-format
 * dates / currency before passing them in (same convention as `buildExcel`
 * on the backend).
 *
 * Async because the Devanagari font is fetched lazily on first call.
 */
export async function buildPdf(
  title: string,
  rows: Record<string, unknown>[],
  columns: PdfColumn[],
): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  // Register Noto Sans Devanagari so Hindi/Sanskrit text renders correctly.
  // If the font load fails for any reason we silently fall back to Helvetica.
  const fontB64 = await loadDevanagariFontBase64();
  let fontName = 'helvetica';
  if (fontB64) {
    doc.addFileToVFS('NotoSansDevanagari-Regular.ttf', fontB64);
    doc.addFont('NotoSansDevanagari-Regular.ttf', 'NotoSansDevanagari', 'normal');
    fontName = 'NotoSansDevanagari';
    doc.setFont(fontName);
  }

  doc.setFontSize(14);
  doc.text(title, 40, 32);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`, 40, 46);

  autoTable(doc, {
    startY: 56,
    head: [columns.map((c) => c.label)],
    body: rows.map((r) => columns.map((c) => String(r[c.key] ?? ''))),
    headStyles: { fillColor: [232, 129, 58], font: fontName, fontStyle: 'normal' },
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak', font: fontName, fontStyle: 'normal' },
    theme: 'grid',
  });

  return doc.output('blob');
}

/**
 * Trigger a browser download for a Blob. Uses the filename verbatim — caller
 * controls the extension. (Previously we auto-appended `.pdf`, which broke
 * zip downloads by renaming `foo.zip` → `foo.zip.pdf`.)
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** @deprecated Renamed to `downloadBlob` — kept temporarily for callers. */
export const downloadPdfBlob = downloadBlob;
