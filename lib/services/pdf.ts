import fs from "node:fs/promises";
import path from "node:path";
async function getPdfParse(): Promise<(b: Buffer) => Promise<{ text: string }>> {
  const mod: any = await import("pdf-parse/lib/pdf-parse.js");
  return (mod?.default ?? mod) as (b: Buffer) => Promise<{ text: string }>;
}

export type PdfDoc = {
  id: string; // filename without extension
  sourcePath: string;
  text: string;
};

export async function loadLocalPdfs(dir = path.join(process.cwd(), "pdf")) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const pdfs: PdfDoc[] = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (!e.name.toLowerCase().endsWith(".pdf")) continue;
    const filePath = path.join(dir, e.name);
    const buf = await fs.readFile(filePath);
    const pdfParse = await getPdfParse();
    const parsed = await pdfParse(buf);
    const base = path.parse(e.name).name;
    pdfs.push({ id: base, sourcePath: filePath, text: parsed.text || "" });
  }
  return pdfs;
}

export function chunkText(
  text: string,
  opts: { chunkSize?: number; overlap?: number } = {}
) {
  const chunkSize = opts.chunkSize ?? 1000; // chars
  const overlap = opts.overlap ?? 200; // chars
  const clean = text.replace(/\s+/g, " ").trim();
  const chunks: { content: string; index: number }[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(i + chunkSize, clean.length);
    const slice = clean.slice(i, end);
    chunks.push({ content: slice, index: chunks.length });
    if (end === clean.length) break;
    i = end - overlap;
    if (i < 0) i = 0;
  }
  return chunks;
}
