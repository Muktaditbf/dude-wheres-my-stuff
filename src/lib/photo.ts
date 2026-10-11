/** Shrinks evidence photos before saving, so phones don't fill up with 12 MB pictures of drawers. */

export const MAX_PHOTO_SIZE = 1280;

export async function compressImage(
  file: Blob,
  maxSize = MAX_PHOTO_SIZE,
  quality = 0.82,
): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // Formats the browser can't decode (e.g. HEIC outside Safari): keep the original if it's small.
    if (file.size <= 4 * 1024 * 1024) return file;
    throw new Error("That photo format isn't supported here. Try a JPEG or PNG.");
  }
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', quality);
  });
}
