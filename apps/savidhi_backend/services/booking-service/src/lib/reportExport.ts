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
 */
export function sendFile(
  res: Response,
  buffer: Buffer,
  filename: string,
  mimeType: string,
) {
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Length', buffer.length);
  res.setHeader('Content-Disposition', `attachment; filename="${sanitizeFilename(filename)}"`);
  res.end(buffer);
}

/** Strip characters that browsers/filesystems don't like in a filename. */
export function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 200) || 'export';
}

export const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const MIME_ZIP  = 'application/zip';
