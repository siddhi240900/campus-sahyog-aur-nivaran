// Reads the text of a (text-based) PDF in the browser, so teachers can upload a question paper
// instead of copying and pasting it. Text PDFs are read directly; scanned PDFs (pictures of pages, which is how most
// previous-year papers are made) are read with OCR. Both libraries load only when a PDF is actually chosen.
const MAX_PDF_MB = 15;
const MAX_PAGES = 30;
const MAX_OCR_PAGES = 10;           // OCR is slow, so scanned papers are read up to this many pages
const OCR_SCALE = 2;                // page render size for OCR: larger is more accurate but slower
const MIN_TEXT_LENGTH = 20;         // fewer characters than this means the PDF has no real text layer
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

// Reads scanned pages: draws each page on a canvas and recognises the text on it (English).
async function ocrPages(pdf, onProgress) {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');
  const lines = [];
  try {
    const pageCount = Math.min(pdf.numPages, MAX_OCR_PAGES);
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
      onProgress?.(`Scanned PDF: reading page ${pageNumber} of ${pageCount}…`);
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: OCR_SCALE });
      const canvas = document.createElement('canvas'); canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      const { data } = await worker.recognize(canvas);
      lines.push(...data.text.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean));
    }
  } finally { await worker.terminate(); }
  return lines.join('\n');
}

// Returns the paper's text. An empty string means the PDF opened fine but no text could be found in it
// (the caller still accepts the file and lets the teacher add topics by hand). Throws only for unusable files.
export async function extractPdfText(file, onProgress) {
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
  if (text.replace(/\s/g, '').length >= MIN_TEXT_LENGTH) return text;

  try { return await ocrPages(pdf, onProgress); }       // scanned paper: read the page pictures
  catch { return ''; }                                  // OCR unavailable (e.g. offline): accept the file, no text
}
