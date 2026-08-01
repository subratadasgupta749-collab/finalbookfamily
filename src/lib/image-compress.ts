// Client-side image compression using canvas.
// Target: max 2560px on longest edge, JPEG quality ~0.85.

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
  ext: string;
}

const MAX_EDGE = 2560;
const QUALITY = 0.85;

export async function compressImage(file: File): Promise<CompressedImage> {
  // Prefer createImageBitmap for speed; fall back to <img>.
  let bitmap: ImageBitmap | HTMLImageElement;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    bitmap = await loadImage(file);
  }

  const srcW = "width" in bitmap ? bitmap.width : (bitmap as HTMLImageElement).naturalWidth;
  const srcH = "height" in bitmap ? bitmap.height : (bitmap as HTMLImageElement).naturalHeight;

  let targetW = srcW;
  let targetH = srcH;
  const longest = Math.max(srcW, srcH);
  if (longest > MAX_EDGE) {
    const scale = MAX_EDGE / longest;
    targetW = Math.round(srcW * scale);
    targetH = Math.round(srcH * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, targetW, targetH);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Compression failed"))),
      "image/jpeg",
      QUALITY,
    );
  });

  return {
    blob,
    width: targetW,
    height: targetH,
    sizeBytes: blob.size,
    mimeType: "image/jpeg",
    ext: "jpg",
  };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}
