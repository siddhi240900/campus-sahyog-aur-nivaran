// Shrinks a photo in the browser so it can be stored inside Firestore (no paid Storage plan needed).
export function compressImage(file, max = 900, quality = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file.'));
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      const data = c.toDataURL('image/jpeg', quality);
      data.length > 600000 ? reject(new Error('Photo is too large. Try a smaller one.')) : resolve(data);
    };
    img.onerror = () => reject(new Error('Could not read this image.'));
    img.src = url;
  });
}

// Routine photos need to stay readable, so they keep more resolution than complaint photos.
// Quality / size step down until the image fits inside one Firestore document (< ~900 KB).
export function compressRoutineImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image (JPG or PNG).'));
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const LIMIT = 880000;
      for (const max of [1800, 1500, 1250, 1000]) {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
        for (const q of [0.82, 0.72, 0.62, 0.5]) {
          const data = c.toDataURL('image/jpeg', q);
          if (data.length < LIMIT) return resolve(data);
        }
      }
      reject(new Error('This image is too detailed to store. Try a clearer, smaller photo of the routine.'));
    };
    img.onerror = () => reject(new Error('Could not read this image.'));
    img.src = url;
  });
}

// A tiny preview (about 10-20 KB) shown inside a chat bubble; the full photo is loaded only when someone taps it.
export function makeThumbnail(file, max = 260, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Could not read this image.'));
    img.src = url;
  });
}
