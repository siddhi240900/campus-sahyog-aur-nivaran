// PaperPulse attachments: a question paper can be attached as a PDF or as photos and is simply SHOWN to students.
// Nothing is scanned or converted to text. Files are stored inside Firestore (no paid Storage plan needed),
// so they are kept within the limits below.
import { compressRoutineImage } from './image';

export const MAX_PDF_MB = 5;                 // one PDF
export const MAX_FILES = 5;                  // PDFs / photos per paper
export const MAX_TOTAL_CHARS = 8_000_000;    // all attachments of one paper together (encoded size)
const MAX_VIEW_PAGES = 40;

export const isPdfFile = file => file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
export const isImageFile = file => file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic)$/i.test(file.name);

const toDataUrl = file => new Promise((resolve, reject) => {
  const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => reject(new Error('Could not read this file.')); r.readAsDataURL(file);
});

// Returns { name, type, data } where data is a data: URL. Photos are shrunk so they stay readable but small.
export async function readPaperFile(file) {
  if (isPdfFile(file)) {
    if (file.size > MAX_PDF_MB * 1024 * 1024) throw new Error(`"${file.name}" is larger than ${MAX_PDF_MB} MB. Upload a smaller PDF or photos of the pages.`);
    return { name: file.name, type: 'application/pdf', data: await toDataUrl(file) };
  }
  if (isImageFile(file)) return { name: file.name, type: 'image/jpeg', data: await compressRoutineImage(file) };
  throw new Error('Choose a PDF or a photo (JPG / PNG) of the question paper.');
}

export function dataUrlToBlob(url) {
  const [head, body] = url.split(',');
  const type = /data:([^;]+)/.exec(head)?.[1] || 'application/octet-stream';
  const bin = atob(body); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

// Draws every page of a PDF as a picture inside `container` (works on phones, where PDFs cannot be shown in a frame).
export async function renderPdfPages(blob, container, isCancelled) {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
  const width = container.clientWidth || 600; const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pages = Math.min(pdf.numPages, MAX_VIEW_PAGES);
  for (let n = 1; n <= pages; n++) {
    if (isCancelled()) return pdf.numPages;
    const page = await pdf.getPage(n); const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: (width / base.width) * dpr });
    const canvas = document.createElement('canvas'); canvas.width = Math.floor(viewport.width); canvas.height = Math.floor(viewport.height);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    if (isCancelled()) return pdf.numPages;
    container.appendChild(canvas);
  }
  return pdf.numPages;
}
