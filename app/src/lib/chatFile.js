// Photos and PDFs shared in College chat. They are stored inside Firestore (no paid Storage plan needed),
// so they are kept small. A photo is shrunk; a PDF must be under MAX_CHAT_PDF_MB.
import { compressRoutineImage, makeThumbnail } from './image';
import { isPdfFile, isImageFile } from './paperFile';

export const MAX_CHAT_PDF_MB = 3;
export const CHAT_ACCEPT = 'image/*,.pdf,application/pdf';
const MAX_NAME_LENGTH = 120;

const toDataUrl = file => new Promise((resolve, reject) => {
  const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Could not read this file.')); reader.readAsDataURL(file);
});
const safeName = name => (name || 'file').slice(-MAX_NAME_LENGTH);

export const formatSize = bytes => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

// Returns { kind: 'image' | 'pdf', name, size, data (data: URL), thumb? } or throws an Error with a message to show.
export async function readChatFile(file) {
  if (isPdfFile(file)) {
    if (file.size > MAX_CHAT_PDF_MB * 1024 * 1024) throw new Error(`PDF is larger than ${MAX_CHAT_PDF_MB} MB. Share a smaller file.`);
    return { kind: 'pdf', name: safeName(file.name), size: file.size, data: await toDataUrl(file) };
  }
  if (isImageFile(file)) {
    const [data, thumb] = await Promise.all([compressRoutineImage(file), makeThumbnail(file)]);
    return { kind: 'image', name: safeName(file.name), size: Math.round(data.length * 0.75), data, thumb };
  }
  throw new Error('You can share photos (JPG / PNG) and PDF files.');
}
