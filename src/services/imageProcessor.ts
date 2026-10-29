import exifr from 'exifr';
import { calculateSha256 } from '../crypto/vaultCrypto';
import type { PhotoMetadata, EncryptedLocation } from '../types';

export interface ProcessedImageResult {
  originalBlob: Blob;
  thumbBlob: Blob;
  width: number;
  height: number;
  thumbWidth: number;
  thumbHeight: number;
  originalSizeBytes: number;
  thumbSizeBytes: number;
  sha256: string;
  metadata: Partial<PhotoMetadata>;
}

/**
 * Parses EXIF metadata from photo file (Date, GPS, Camera info) without sending anything to cloud.
 */
export async function extractExifMetadata(file: File | Blob): Promise<{
  captureDate?: string;
  captureTime?: string;
  location?: EncryptedLocation;
  cameraInfo?: string;
}> {
  try {
    const exif = await exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: true,
      reviveValues: true,
    });

    if (!exif) return {};

    let captureDate: string | undefined;
    let captureTime: string | undefined;

    const rawDate = exif.DateTimeOriginal || exif.CreateDate || exif.ModifyDate;
    if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
      const pad = (n: number) => n.toString().padStart(2, '0');
      captureDate = `${rawDate.getFullYear()}-${pad(rawDate.getMonth() + 1)}-${pad(rawDate.getDate())}`;
      captureTime = `${pad(rawDate.getHours())}:${pad(rawDate.getMinutes())}`;
    }

    let location: EncryptedLocation | undefined;
    if (exif.latitude !== undefined && exif.longitude !== undefined) {
      location = {
        latitude: Number(exif.latitude.toFixed(6)),
        longitude: Number(exif.longitude.toFixed(6)),
        label: `Captured Location (${exif.latitude > 0 ? 'N' : 'S'}${Math.abs(exif.latitude).toFixed(2)}°, ${exif.longitude > 0 ? 'E' : 'W'}${Math.abs(exif.longitude).toFixed(2)}°)`,
        isApproximate: false,
      };
    }

    const cameraInfo = [exif.Make, exif.Model].filter(Boolean).join(' ');

    return {
      captureDate,
      captureTime,
      location,
      cameraInfo: cameraInfo || undefined,
    };
  } catch (err) {
    console.warn('EXIF parsing skipped or not present:', err);
    return {};
  }
}

/**
 * Creates an optimized client-side thumbnail canvas and exports as lightweight WebP/JPEG blob.
 * Fail-safe: if image decoding fails or format is unsupported (e.g. HEIC/RAW),
 * generates a sleek procedural memory canvas so uploads never fail.
 */
export async function createOptimizedThumbnail(
  file: File | Blob,
  maxDimension = 480,
  quality = 0.85
): Promise<{
  thumbBlob: Blob;
  originalWidth: number;
  originalHeight: number;
  thumbWidth: number;
  thumbHeight: number;
}> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    const createProceduralFallback = () => {
      URL.revokeObjectURL(objectUrl);
      const originalWidth = 1200;
      const originalHeight = 800;
      const thumbWidth = maxDimension;
      const thumbHeight = Math.round((maxDimension * originalHeight) / originalWidth);

      const canvas = document.createElement('canvas');
      canvas.width = thumbWidth;
      canvas.height = thumbHeight;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // Luxury Obsidian Glass Gradient
        const grad = ctx.createLinearGradient(0, 0, thumbWidth, thumbHeight);
        grad.addColorStop(0, '#13111C');
        grad.addColorStop(0.5, '#1e1b4b');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, thumbWidth, thumbHeight);

        // Subtle gold ambient glow in center
        const radial = ctx.createRadialGradient(
          thumbWidth / 2,
          thumbHeight / 2,
          20,
          thumbWidth / 2,
          thumbHeight / 2,
          thumbWidth * 0.45
        );
        radial.addColorStop(0, 'rgba(212, 175, 55, 0.22)');
        radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = radial;
        ctx.fillRect(0, 0, thumbWidth, thumbHeight);

        // Thin golden inner border
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, thumbWidth - 20, thumbHeight - 20);

        // Memory badge text
        ctx.fillStyle = '#D4AF37';
        ctx.font = '600 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✦ ENCRYPTED MEMORY VAULT', thumbWidth / 2, thumbHeight / 2 - 10);

        const displayName = file instanceof File ? file.name.slice(0, 24) : 'Private Memory';
        ctx.fillStyle = '#ffffff';
        ctx.font = '500 11px system-ui, sans-serif';
        ctx.fillText(displayName, thumbWidth / 2, thumbHeight / 2 + 14);
      }

      canvas.toBlob(
        (blob) => {
          const finalBlob = blob || new Blob(['placeholder'], { type: 'image/jpeg' });
          resolve({
            thumbBlob: finalBlob,
            originalWidth,
            originalHeight,
            thumbWidth,
            thumbHeight,
          });
        },
        'image/jpeg',
        0.85
      );
    };

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const originalWidth = img.naturalWidth || img.width || 1200;
      const originalHeight = img.naturalHeight || img.height || 800;

      let thumbWidth = originalWidth;
      let thumbHeight = originalHeight;

      if (thumbWidth > thumbHeight) {
        if (thumbWidth > maxDimension) {
          thumbHeight = Math.round((thumbHeight * maxDimension) / thumbWidth);
          thumbWidth = maxDimension;
        }
      } else {
        if (thumbHeight > maxDimension) {
          thumbWidth = Math.round((thumbWidth * maxDimension) / thumbHeight);
          thumbHeight = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, thumbWidth);
      canvas.height = Math.max(1, thumbHeight);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        createProceduralFallback();
        return;
      }

      // Smooth resampling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, thumbWidth, thumbHeight);

      // Try WebP first, fallback to JPEG, then PNG
      canvas.toBlob(
        (webpBlob) => {
          if (webpBlob) {
            resolve({
              thumbBlob: webpBlob,
              originalWidth,
              originalHeight,
              thumbWidth,
              thumbHeight,
            });
            return;
          }

          canvas.toBlob(
            (jpegBlob) => {
              if (jpegBlob) {
                resolve({
                  thumbBlob: jpegBlob,
                  originalWidth,
                  originalHeight,
                  thumbWidth,
                  thumbHeight,
                });
                return;
              }
              createProceduralFallback();
            },
            'image/jpeg',
            0.85
          );
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      createProceduralFallback();
    };

    img.src = objectUrl;
  });
}

/**
 * Full client-side pipeline: EXIF metadata extraction + Thumbnail generation + Checksum hash.
 */
export async function processPhotoLocally(file: File): Promise<ProcessedImageResult> {
  const [exif, thumbData, buffer] = await Promise.all([
    extractExifMetadata(file),
    createOptimizedThumbnail(file),
    file.arrayBuffer(),
  ]);

  const sha256 = await calculateSha256(buffer);

  const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

  const metadata: Partial<PhotoMetadata> = {
    title: cleanTitle,
    captureDate: exif.captureDate || new Date(file.lastModified || Date.now()).toISOString().split('T')[0],
    captureTime: exif.captureTime,
    location: exif.location,
    notes: exif.cameraInfo ? `Captured with ${exif.cameraInfo}` : undefined,
    tags: [],
  };

  return {
    originalBlob: file,
    thumbBlob: thumbData.thumbBlob,
    width: thumbData.originalWidth,
    height: thumbData.originalHeight,
    thumbWidth: thumbData.thumbWidth,
    thumbHeight: thumbData.thumbHeight,
    originalSizeBytes: file.size,
    thumbSizeBytes: thumbData.thumbBlob.size,
    sha256,
    metadata,
  };
}
