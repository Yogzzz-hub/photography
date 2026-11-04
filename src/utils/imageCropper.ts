/**
 * Image Cropping & Geometric Transformation Utility
 * Client-side hardware-accelerated canvas cropping, rotation, scaling, and file conversion.
 */

export type AspectRatioOption = '9:16' | '16:9' | '1:1' | '4:5' | 'free';

export interface CropState {
  zoom: number;
  rotation: number; // in degrees (0, 90, 180, 270)
  flipHorizontal: boolean;
  panX: number; // pan in pixels
  panY: number;
  aspectRatio: AspectRatioOption;
}

export const ASPECT_RATIO_VALUES: Record<Exclude<AspectRatioOption, 'free'>, number> = {
  '9:16': 9 / 16,
  '16:9': 16 / 9,
  '1:1': 1,
  '4:5': 4 / 5,
};

/**
 * Calculates crop dimensions for a given container width/height and aspect ratio
 */
export function calculateCropBox(
  containerWidth: number,
  containerHeight: number,
  aspectRatio: AspectRatioOption
): { width: number; height: number; x: number; y: number } {
  const padding = 24;
  const availW = Math.max(100, containerWidth - padding * 2);
  const availH = Math.max(100, containerHeight - padding * 2);

  if (aspectRatio === 'free') {
    const width = Math.min(availW, availH * (16 / 9));
    const height = width * (9 / 16);
    return {
      width,
      height,
      x: (containerWidth - width) / 2,
      y: (containerHeight - height) / 2,
    };
  }

  const ratio = ASPECT_RATIO_VALUES[aspectRatio] || 1;

  let width = availW;
  let height = width / ratio;

  if (height > availH) {
    height = availH;
    width = height * ratio;
  }

  return {
    width,
    height,
    x: (containerWidth - width) / 2,
    y: (containerHeight - height) / 2,
  };
}

/**
 * Converts a data URL to a browser File object
 */
export function dataUrlToFile(dataUrl: string, filename = 'cropped-memory.jpg'): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

/**
 * Performs canvas-based crop, zoom, rotation, and flip on an image element
 */
export function renderCroppedCanvas(
  img: HTMLImageElement,
  cropState: CropState,
  cropBox: { width: number; height: number }
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');

  // Calibrate output resolution based on aspect ratio
  const ratio = cropState.aspectRatio === 'free'
    ? cropBox.width / cropBox.height
    : ASPECT_RATIO_VALUES[cropState.aspectRatio] || 1;

  let outWidth = 1080;
  let outHeight = Math.round(outWidth / ratio);

  if (outHeight > 1920) {
    outHeight = 1920;
    outWidth = Math.round(outHeight * ratio);
  }

  canvas.width = outWidth;
  canvas.height = outHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Center coordinate space in canvas
  ctx.save();
  ctx.translate(outWidth / 2, outHeight / 2);

  // Apply rotation
  ctx.rotate((cropState.rotation * Math.PI) / 180);

  // Apply horizontal flip
  if (cropState.flipHorizontal) {
    ctx.scale(-1, 1);
  }

  // Calculate draw scale
  const scale = cropState.zoom * (outWidth / cropBox.width);

  // Apply pan (scaled to output canvas)
  const panScaleX = outWidth / cropBox.width;
  const panScaleY = outHeight / cropBox.height;
  const drawX = cropState.panX * panScaleX;
  const drawY = cropState.panY * panScaleY;

  // Natural image dimensions
  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;

  // Compute cover scale
  const coverScale = Math.max(cropBox.width / imgW, cropBox.height / imgH);
  const finalW = imgW * coverScale * scale;
  const finalH = imgH * coverScale * scale;

  ctx.drawImage(img, -finalW / 2 + drawX, -finalH / 2 + drawY, finalW, finalH);

  ctx.restore();
  return canvas;
}
