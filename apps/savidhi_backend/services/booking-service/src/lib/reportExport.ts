import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import type { Response } from 'express';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

/**
 * Build an .xlsx Buffer from a list of plain objects + a column spec.
 * The first row is a bold header. Cell values are written as-is, so callers
 * should pre-format dates / currency strings before passing them in.
 */
export async function buildExcel(
  rows: Record<string, unknown>[],
  columns: ExcelColumn[],
  sheetName = 'Report',
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 22 }));
  ws.getRow(1).font = { bold: true };
  for (const row of rows) ws.addRow(row);
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export interface ZipFile {
  /** Filename inside the archive, e.g. "Bhairava Dana Seva - 27 Jan 2026.xlsx" */
  name: string;
  buffer: Buffer;
}

/** Build a zip archive containing the given files. */
export async function buildZip(files: ZipFile[]): Promise<Buffer> {
  const zip = new JSZip();
  for (const f of files) zip.file(f.name, f.buffer);
  return zip.generateAsync({ type: 'nodebuffer' });
}

/**
 * Send a binary buffer as a downloadable file. Sets Content-Type, length, and
 * Content-Disposition so the browser triggers a save dialog.
 *
 * Filenames may contain non-ASCII (Hindi/Sanskrit) characters, which are
 * illegal as raw bytes inside an HTTP header value. We use the RFC 5987
 * extended syntax `filename*=UTF-8''<percent-encoded>` so browsers see the
 * proper unicode name, plus a stripped-ASCII `filename=` fallback for legacy
 * clients.
 */
export function sendFile(
  res: Response,
  buffer: Buffer,
  filename: string,
  mimeType: string,
) {
  const safe = sanitizeFilename(filename);
  const asciiFallback = toAsciiFilename(safe);
  const encoded = encodeURIComponent(safe).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('Content-Disposition', `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`);
  res.end(buffer);
}

/** Strip characters that browsers/filesystems don't like in a filename. */
export function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 200) || 'export';
}

/** Header-safe fallback: replace any non-ASCII char with `_`. */
function toAsciiFilename(name: string): string {
  // eslint-disable-next-line no-control-regex
  const stripped = name.replace(/[^\x20-\x7E]+/g, '_').replace(/_+/g, '_');
  return stripped || 'export';
}

export const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const MIME_ZIP  = 'application/zip';
