import { describe, it, expect } from 'vitest';
import {
  calculateOrbLayout,
  calculateCurvedWallLayout,
  calculateSpiralLayout,
  getLayoutTransform,
} from '../components/3d/layouts/layoutCalculators';
import type { ViewMode3D } from '../types';

describe('3D Memory Universe Layout Calculators', () => {
  const modes: ViewMode3D[] = [
    'orb',
    'galaxy',
    'curved_wall',
    'spiral',
    'tunnel',
    'matrix',
    'museum',
    'constellation',
  ];

  it('generates valid non-NaN 3D coordinates and normals for all 8 modes', () => {
    const totalPhotos = 108;
    for (const mode of modes) {
      for (let i = 0; i < totalPhotos; i++) {
        const transform = getLayoutTransform(mode, i, totalPhotos);
        expect(transform.position).toHaveLength(3);
        expect(transform.normal).toHaveLength(3);

        transform.position.forEach((coord) => {
          expect(Number.isFinite(coord)).toBe(true);
          expect(Number.isNaN(coord)).toBe(false);
        });

        transform.normal.forEach((n) => {
          expect(Number.isFinite(n)).toBe(true);
          expect(Number.isNaN(n)).toBe(false);
        });
      }
    }
  });

  it('Orb layout distributes points across spherical radius', () => {
    const radius = 10.5;
    const total = 108;
    for (let i = 0; i < total; i++) {
      const { position } = calculateOrbLayout(i, total, radius);
      const [x, y, z] = position;
      const calculatedRadius = Math.sqrt(x * x + y * y + z * z);
      expect(calculatedRadius).toBeCloseTo(radius, 2);
    }
  });

  it('Curved Wall places cards within bounded depth', () => {
    const total = 32;
    for (let i = 0; i < total; i++) {
      const { position } = calculateCurvedWallLayout(i, total);
      expect(position[2]).toBeLessThanOrEqual(15);
      expect(position[2]).toBeGreaterThanOrEqual(-25);
    }
  });

  it('Spiral layout advances along the Y axis monotonically within ring', () => {
    const total = 20;
    const yCoordinates: number[] = [];
    for (let i = 0; i < total; i++) {
      const { position } = calculateSpiralLayout(i, total);
      yCoordinates.push(position[1]);
    }

    for (let i = 1; i < yCoordinates.length; i++) {
      expect(yCoordinates[i]).toBeGreaterThan(yCoordinates[i - 1]);
    }
  });
});
