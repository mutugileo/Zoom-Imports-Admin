/**
 * Shrinks a photo in the browser before it is uploaded.
 *
 * A phone camera writes 4–12MB per shot at 4000px wide. Storing that is one
 * problem; serving it to a customer on Kenyan mobile data is the real one — a
 * vehicle listing with six untouched photos is 40MB of transfer for images
 * displayed at 800px. Compressing at the point of upload fixes both ends at
 * once, and does it on the machine that already has the file open.
 *
 * WebP where the browser can encode it, JPEG otherwise. PNG is deliberately
 * not preserved for photographs — it is lossless and roughly 5× the size for
 * no visible gain on a photograph — but an image WITH TRANSPARENCY is left
 * alone, because flattening a logo onto a white box is a visible loss.
 */

const MAX_EDGE = 1600;      // long edge; comfortably above any display size used
const QUALITY = 0.82;       // visually indistinguishable from source at this size
const SKIP_UNDER = 300 * 1024;

const loadBitmap = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That image could not be read.')); };
    img.src = url;
  });

const canEncode = (type) => {
  const c = document.createElement('canvas');
  c.width = c.height = 1;
  return c.toDataURL(type).startsWith(`data:${type}`);
};

/** PNG and GIF can carry an alpha channel; re-encoding those would flatten it. */
const mayHaveTransparency = (file) => /image\/(png|gif)$/i.test(file.type);

/**
 * @returns {Promise<File>} the compressed file, or the original when
 *          compressing it would not help (already small, transparent, or the
 *          re-encode came out larger — which happens with flat graphics).
 */
export const compressImage = async (file) => {
  if (!file.type.startsWith('image/')) return file;
  if (file.size <= SKIP_UNDER) return file;
  if (mayHaveTransparency(file)) return file;

  let img;
  try {
    img = await loadBitmap(file);
  } catch {
    return file;  // unreadable here is the upload's problem to report, not ours
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  const type = canEncode('image/webp') ? 'image/webp' : 'image/jpeg';
  const blob = await new Promise((res) => canvas.toBlob(res, type, QUALITY));
  if (!blob || blob.size >= file.size) return file;

  const ext = type === 'image/webp' ? 'webp' : 'jpg';
  const base = file.name.replace(/\.[^.]+$/, '');
  return new File([blob], `${base}.${ext}`, { type, lastModified: Date.now() });
};
