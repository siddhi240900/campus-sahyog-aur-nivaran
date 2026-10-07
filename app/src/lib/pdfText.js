// Reads the text of a (text-based) PDF in the browser, so teachers can upload a question paper
// instead of copying and pasting it. pdf.js is loaded only when a PDF is actually chosen.
const MAX_PDF_MB = 15;
const MAX_PAGES = 30;
const SAME_LINE_TOLERANCE = 3;      // text items whose baselines differ by less than this belong to one line

export const isPdfFile = file => file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

// Joins pdf.js text items into lines, using their vertical position, so each question stays on its own line.
function pageToLines(items) {
  const lines = []; let lastY = null;
  for (const item of items) {
    if (!('str' in item)) continue;
    const y = item.transform[5];
    if (lastY === null || Math.abs(y - lastY) > SAME_LINE_TOLERANCE) lines.push('');
    lines[lines.length - 1] += item.str + (item.hasEOL ? '\n' : '');
    if (item.str.trim()) lastY = y;
  }
  return lines.map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

export async function extractPdfText(file) {
  if (file.size > MAX_PDF_MB * 1024 * 1024) throw new Error(`This PDF is larger than ${MAX_PDF_MB} MB. Upload a smaller file.`);
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  let pdf;
  try { pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise; }
  catch (error) {
    throw new Error(error?.name === 'PasswordException' ? 'This PDF is password protected.' : 'Could not open this PDF. The file may be damaged.');
  }
  const lines = [];
  for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, MAX_PAGES); pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    lines.push(...pageToLines((await page.getTextContent()).items));
  }
  const text = lines.join('\n');
  if (text.replace(/\s/g, '').length < 20) {
    throw new Error('This PDF has no readable text (it is probably a scanned photo). Type the topics in "Quick topics" instead.');
  }
  return text;
}
