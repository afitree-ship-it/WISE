// Google Sheets cells hold at most 50,000 characters; keep a safety margin.
export const MAX_CELL_CHARS = 45000;

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve(img); URL.revokeObjectURL(url); };
    img.onerror = () => { reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้')); URL.revokeObjectURL(url); };
    img.src = url;
  });

/** Centre-crops a photo to a square and encodes it as JPEG (profile pictures stored in Drive). */
export const squarePhoto = async (file: File, size = 600): Promise<string> => {
  if (!file.type.startsWith('image/')) throw new Error('กรุณาเลือกไฟล์รูปภาพ');
  const img = await loadImage(file);
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const side = Math.min(iw, ih);
  const out = Math.min(size, side);
  const canvas = document.createElement('canvas');
  canvas.width = out; canvas.height = out;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out, out);
  ctx.drawImage(img, (iw - side) / 2, (ih - side) / 2, side, side, 0, 0, out, out);
  return canvas.toDataURL('image/jpeg', 0.85);
};

/**
 * Downscales an image and encodes it as a data URL small enough for one sheet cell.
 * `square` pads the image into a transparent square (for favicons).
 */
export const processImage = async (
  file: File,
  opts: { maxW: number; maxH: number; square?: boolean }
): Promise<string> => {
  if (!file.type.startsWith('image/')) throw new Error('กรุณาเลือกไฟล์รูปภาพ');
  const img = await loadImage(file);
  const iw = img.naturalWidth || img.width || opts.maxW;
  const ih = img.naturalHeight || img.height || opts.maxH;

  const attempt = (scale: number) => {
    const ratio = Math.min(opts.maxW / iw, opts.maxH / ih, 1) * scale;
    const w = Math.max(1, Math.round(iw * ratio));
    const h = Math.max(1, Math.round(ih * ratio));
    const canvas = document.createElement('canvas');
    if (opts.square) {
      const side = Math.max(w, h);
      canvas.width = side; canvas.height = side;
    } else {
      canvas.width = w; canvas.height = h;
    }
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    return canvas;
  };

  for (const scale of [1, 0.8, 0.6, 0.45]) {
    const canvas = attempt(scale);
    const png = canvas.toDataURL('image/png');
    if (png.length <= MAX_CELL_CHARS) return png;
    for (const q of [0.92, 0.8, 0.65]) {
      const webp = canvas.toDataURL('image/webp', q);
      if (webp.startsWith('data:image/webp') && webp.length <= MAX_CELL_CHARS) return webp;
    }
  }
  throw new Error('รูปภาพมีรายละเอียดมากเกินไป กรุณาใช้รูปที่เรียบง่ายกว่านี้');
};
