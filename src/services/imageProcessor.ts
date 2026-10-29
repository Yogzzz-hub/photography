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
 * Creates an optimized client-side thumbnail canvas and exports as lightweight WebP blob.
 */
export async function createOptimizedThumbnail(
  file: File | Blob,
  maxDimension = 480,
  quality = 0.82
): Promise<{
  thumbBlob: Blob;
  originalWidth: number;
  originalHeight: number;
  thumbWidth: number;
  thumbHeight: number;
}> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const originalWidth = img.naturalWidth || img.width;
      const originalHeight = img.naturalHeight || img.height;

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
      canvas.width = thumbWidth;
      canvas.height = thumbHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get 2D canvas context'));
        return;
      }

      // Smooth bicubic resampling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, thumbWidth, thumbHeight);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas toBlob failed'));
            return;
          }
          resolve({
            thumbBlob: blob,
            originalWidth,
            originalHeight,
            thumbWidth,
            thumbHeight,
          });
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for thumbnail creation'));
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
