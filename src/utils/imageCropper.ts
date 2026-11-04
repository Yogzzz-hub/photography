/**
 * Image Cropping & Geometric Transformation Utility
 * Client-side hardware-accelerated canvas cropping, rotation, scaling, and file conversion.
 */

export type AspectRatioOption = '9:16' | '16:9' | '1:1' | '4:5' | 'free';

export interface CropState {
  zoom: number; // 0.5 to 4
  rotation: number; // in degrees (0, 90, 180, 270)
  flipHorizontal: boolean;
  panX: number; // pan in pixels
  panY: number;
  aspectRatio: AspectRatioOption;
  containerWidth?: number;
  containerHeight?: number;
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
  const padding = 28;
  const availW = Math.max(100, containerWidth - padding * 2);
  const availH = Math.max(100, containerHeight - padding * 2);

  if (aspectRatio === 'free') {
    const width = Math.min(availW, availH * (16 / 9));
    const height = width * (9 / 16);
    return {
      width: Math.round(width),
      height: Math.round(height),
      x: Math.round((containerWidth - width) / 2),
      y: Math.round((containerHeight - height) / 2),
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
    width: Math.round(width),
    height: Math.round(height),
    x: Math.round((containerWidth - width) / 2),
    y: Math.round((containerHeight - height) / 2),
  };
}

/**
 * Computes base scale for an image to cover the crop box at zoom = 1
 */
export function calculateBaseFitScale(
  imgWidth: number,
  imgHeight: number,
  cropBoxWidth: number,
  cropBoxHeight: number,
  rotation = 0
): number {
  if (!imgWidth || !imgHeight) return 1;
  const isSideways = Math.abs(rotation % 180) === 90;
  const effectiveW = isSideways ? imgHeight : imgWidth;
  const effectiveH = isSideways ? imgWidth : imgHeight;
  return Math.max(cropBoxWidth / effectiveW, cropBoxHeight / effectiveH);
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
 * with exact pixel-perfect mathematical parity to the DOM viewport.
 */
export function renderCroppedCanvas(
  img: HTMLImageElement,
  cropState: CropState,
  cropBox: { width: number; height: number; x?: number; y?: number },
  containerSize?: { width: number; height: number }
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');

  // Calibrate output resolution based on aspect ratio
  const ratio = cropState.aspectRatio === 'free'
    ? cropBox.width / cropBox.height
    : ASPECT_RATIO_VALUES[cropState.aspectRatio] || (cropBox.width / cropBox.height);

  let outWidth = 1200;
  let outHeight = Math.round(outWidth / ratio);

  if (outHeight > 2160) {
    outHeight = 2160;
    outWidth = Math.round(outHeight * ratio);
  }

  canvas.width = outWidth;
  canvas.height = outHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Natural image dimensions
  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;

  // Base scale calculation (how image was scaled to cover the crop box in DOM at zoom 1)
  const baseScale = calculateBaseFitScale(imgW, imgH, cropBox.width, cropBox.height, cropState.rotation);

  // Scale factor from container pixels to exported canvas pixels
  const scaleFactor = outWidth / cropBox.width;

  const containerW = containerSize?.width || cropState.containerWidth || cropBox.width;
  const containerH = containerSize?.height || cropState.containerHeight || cropBox.height;

  // Calculate crop box center relative to container
  const cropBoxCenterX = cropBox.x !== undefined ? cropBox.x + cropBox.width / 2 : containerW / 2;
  const cropBoxCenterY = cropBox.y !== undefined ? cropBox.y + cropBox.height / 2 : containerH / 2;

  // Image center in container space
  const imageCenterX = containerW / 2 + cropState.panX;
  const imageCenterY = containerH / 2 + cropState.panY;

  // Relative distance of image center from crop box center
  const relX = imageCenterX - cropBoxCenterX;
  const relY = imageCenterY - cropBoxCenterY;

  ctx.save();

  // Position canvas center + relative offset mapped to high-res canvas scale
  ctx.translate(outWidth / 2 + relX * scaleFactor, outHeight / 2 + relY * scaleFactor);

  // Apply rotation
  ctx.rotate((cropState.rotation * Math.PI) / 180);

  // Apply horizontal flip
  if (cropState.flipHorizontal) {
    ctx.scale(-1, 1);
  }

  // Draw image dimensions
  const totalScale = baseScale * cropState.zoom * scaleFactor;
  const drawW = imgW * totalScale;
  const drawH = imgH * totalScale;

  ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

  ctx.restore();
  return canvas;
}
