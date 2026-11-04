import { describe, it, expect } from 'vitest';
import {
  calculateCropBox,
  dataUrlToFile,
  ASPECT_RATIO_VALUES,
} from '../utils/imageCropper';

describe('Image Cropper Utility Functions', () => {
  it('correctly calculates 9:16 crop box dimensions within container bounds', () => {
    const box = calculateCropBox(500, 800, '9:16');
    expect(box.width).toBeLessThanOrEqual(500);
    expect(box.height).toBeLessThanOrEqual(800);
    expect(box.width / box.height).toBeCloseTo(9 / 16, 2);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
  });

  it('correctly calculates 16:9 widescreen crop box dimensions', () => {
    const box = calculateCropBox(800, 500, '16:9');
    expect(box.width).toBeLessThanOrEqual(800);
    expect(box.height).toBeLessThanOrEqual(500);
    expect(box.width / box.height).toBeCloseTo(16 / 9, 2);
  });

  it('correctly calculates 1:1 square crop box dimensions', () => {
    const box = calculateCropBox(600, 600, '1:1');
    expect(box.width).toBe(box.height);
  });

  it('provides valid numeric aspect ratio constants', () => {
    expect(ASPECT_RATIO_VALUES['9:16']).toBeCloseTo(0.5625, 4);
    expect(ASPECT_RATIO_VALUES['16:9']).toBeCloseTo(1.7777, 3);
    expect(ASPECT_RATIO_VALUES['1:1']).toBe(1);
    expect(ASPECT_RATIO_VALUES['4:5']).toBe(0.8);
  });

  it('converts base64 data URL to a valid File object', () => {
    // 1x1 transparent gif data url
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const file = dataUrlToFile(dataUrl, 'test-image.png');
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('test-image.png');
    expect(file.type).toBe('image/png');
    expect(file.size).toBeGreaterThan(0);
  });
});
