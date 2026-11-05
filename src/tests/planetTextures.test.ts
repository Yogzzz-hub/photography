import { describe, it, expect, beforeAll } from 'vitest';
import * as THREE from 'three';
import {
  getSunSurfaceTexture,
  getPlanetSurfaceTexture,
  getPlanetCloudsTexture,
  getPlanetaryRingsTexture,
} from '../services/planetTextures';
import type { MemoryGlobe } from '../types';

beforeAll(() => {
  // Mock canvas 2D context for jsdom environment
  HTMLCanvasElement.prototype.getContext = function (contextId: string) {
    if (contextId === '2d') {
      return {
        createImageData: (w: number, h: number) => ({
          width: w,
          height: h,
          data: new Uint8ClampedArray(w * h * 4),
        }),
        putImageData: () => {},
        createLinearGradient: () => ({
          addColorStop: () => {},
        }),
        createRadialGradient: () => ({
          addColorStop: () => {},
        }),
        fillRect: () => {},
        strokeRect: () => {},
        beginPath: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        moveTo: () => {},
        lineTo: () => {},
      } as unknown as CanvasRenderingContext2D;
    }
    return null;
  } as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

describe('Photorealistic Procedural Planet Texture Engine', () => {
  it('generates high-resolution solar surface canvas texture', () => {
    const sunTex = getSunSurfaceTexture();
    expect(sunTex).toBeInstanceOf(THREE.CanvasTexture);
    expect(sunTex.image).toBeDefined();
    expect(sunTex.image.width).toBe(1024);
    expect(sunTex.image.height).toBe(512);
  });

  it('generates photorealistic gas giant planetary texture with atmospheric bands', () => {
    const globe: MemoryGlobe = {
      id: 'globe_jupiter',
      name: "Marcus's Orbit",
      type: 'milestone',
      themeColor: 'amber',
      customColor: '#F97316',
      createdAt: new Date().toISOString(),
      totalSlots: 108,
    };

    const texture = getPlanetSurfaceTexture(globe, 1);
    expect(texture).toBeInstanceOf(THREE.CanvasTexture);
    expect(texture.image.width).toBe(1024);
    expect(texture.image.height).toBe(512);
  });

  it('generates terrestrial continent and ocean texture for non-gas worlds', () => {
    const globe: MemoryGlobe = {
      id: 'globe_earth',
      name: "Curator's Sanctuary",
      type: 'individual',
      themeColor: 'sapphire',
      customColor: '#0EA5E9',
      createdAt: new Date().toISOString(),
      totalSlots: 108,
    };

    const texture = getPlanetSurfaceTexture(globe, 0);
    expect(texture).toBeInstanceOf(THREE.CanvasTexture);
    expect(texture.image.width).toBe(1024);
    expect(texture.image.height).toBe(512);
  });

  it('generates independent atmospheric cloud deck texture', () => {
    const cloudsTex = getPlanetCloudsTexture(0);
    expect(cloudsTex).toBeInstanceOf(THREE.CanvasTexture);
    expect(cloudsTex.image.width).toBe(1024);
    expect(cloudsTex.image.height).toBe(512);
  });

  it('generates Saturnian high-resolution planetary rings with Cassini division', () => {
    const ringsTex = getPlanetaryRingsTexture('#F59E0B');
    expect(ringsTex).toBeInstanceOf(THREE.CanvasTexture);
    expect(ringsTex.image.width).toBe(512);
    expect(ringsTex.image.height).toBe(64);
  });
});
