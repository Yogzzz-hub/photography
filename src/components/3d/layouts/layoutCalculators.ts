import * as THREE from 'three';
import type { ViewMode3D } from '../../../types';

export interface LayoutTransform {
  position: [number, number, number];
  rotation: [number, number, number];
  normal: [number, number, number];
  scale?: number;
}

/**
 * 1. DENSE 3D SPHERICAL GLOBE / ORB LAYOUT
 * Exactly reproduces the iconic myorb.live sphere from the user's reference screenshot.
 * 108 cards arranged in 9 latitude bands from -58° to +58°, tangent to the sphere.
 */
export function calculateOrbLayout(index: number, _total: number, radius = 10.5): LayoutTransform {
  const rings = [
    { lat: -58, count: 8 },
    { lat: -44, count: 12 },
    { lat: -30, count: 16 },
    { lat: -15, count: 18 },
    { lat: 0, count: 20 },
    { lat: 15, count: 18 },
    { lat: 30, count: 16 },
    { lat: 44, count: 12 },
    { lat: 58, count: 8 },
  ];

  const totalSlots = 108;
  const effectiveIndex = ((index % totalSlots) + totalSlots) % totalSlots;

  let currentSlot = 0;
  let targetRing = rings[0];
  let indexInRing = 0;

  for (const ring of rings) {
    if (effectiveIndex < currentSlot + ring.count) {
      targetRing = ring;
      indexInRing = effectiveIndex - currentSlot;
      break;
    }
    currentSlot += ring.count;
  }

  const latRad = (targetRing.lat * Math.PI) / 180;
  // Interlocking brick offset on alternating rings
  const ringOffset = (targetRing.lat % 2 === 0 ? 0 : 0.5) * ((2 * Math.PI) / targetRing.count);
  const lonRad = (indexInRing * 2 * Math.PI) / targetRing.count + ringOffset;

  const cosLat = Math.cos(latRad);
  const sinLat = Math.sin(latRad);

  const nx = cosLat * Math.sin(lonRad);
  const ny = sinLat;
  const nz = cosLat * Math.cos(lonRad);

  const x = radius * nx;
  const y = radius * ny;
  const z = radius * nz;

  // Orthonormal tangent basis:
  // Normal vector points straight outwards from sphere center
  const normal = new THREE.Vector3(nx, ny, nz).normalize();
  const worldUp = new THREE.Vector3(0, 1, 0);

  // xAxis tangent to the latitude ring (horizontal)
  const xAxis = new THREE.Vector3().crossVectors(worldUp, normal).normalize();
  // yAxis tangent to the meridian (pointing towards North Pole)
  const yAxis = new THREE.Vector3().crossVectors(normal, xAxis).normalize();

  // Make basis matrix and extract Euler angles
  const rotMatrix = new THREE.Matrix4().makeBasis(xAxis, yAxis, normal);
  const euler = new THREE.Euler().setFromRotationMatrix(rotMatrix, 'XYZ');

  return {
    position: [x, y, z],
    rotation: [euler.x, euler.y, euler.z],
    normal: [nx, ny, nz],
    scale: 1.0,
  };
}

/**
 * 2. GALAXY LAYOUT (Logarithmic Spiral with Cosmic Waves)
 */
export function calculateGalaxyLayout(index: number, _total: number): LayoutTransform {
  const arms = 4;
  const armIndex = index % arms;
  const armOffset = (armIndex * 2 * Math.PI) / arms;
  const progress = (index % 54) / 54;
  const distance = 3.5 + progress * 15;
  const angle = armOffset + progress * Math.PI * 5;

  const x = Math.cos(angle) * distance;
  const z = Math.sin(angle) * distance;
  const y = Math.sin(progress * Math.PI * 4 + armIndex) * (1.2 + progress * 1.8);

  return {
    position: [x, y, z],
    rotation: [-0.25, -angle + Math.PI / 2, 0],
    normal: [0, 0.25, 1],
    scale: 1.0,
  };
}

/**
 * 3. INFINITE CURVED WALL (IMAX Panoramic Amphitheater)
 */
export function calculateCurvedWallLayout(index: number, _total: number, radius = 13): LayoutTransform {
  const itemsPerRow = 12;
  const col = index % itemsPerRow;
  const row = Math.floor((index % 60) / itemsPerRow);

  const angleSpan = Math.PI * 1.1; // 198-degree panoramic sweep
  const startAngle = -angleSpan / 2;
  const angleStep = angleSpan / (itemsPerRow - 1 || 1);
  const angle = startAngle + col * angleStep;

  const nx = Math.sin(angle);
  const nz = Math.cos(angle);

  const x = nx * radius;
  const z = nz * radius - 6;
  const y = (row - 2) * -2.8;

  return {
    position: [x, y, z],
    rotation: [0, angle, 0],
    normal: [nx, 0, nz],
    scale: 1.0,
  };
}

/**
 * 4. ASCENDING 3D HELIX SPIRAL
 */
export function calculateSpiralLayout(index: number, _total: number): LayoutTransform {
  const radius = 8.5;
  const angleStep = 0.35;
  const heightStep = 0.65;

  const angle = index * angleStep;
  const y = ((index % 60) - 30) * heightStep;
  const nx = Math.cos(angle);
  const nz = Math.sin(angle);

  const x = nx * radius;
  const z = nz * radius;

  return {
    position: [x, y, z],
    rotation: [0.08, -angle + Math.PI / 2, 0],
    normal: [nx, 0.1, nz],
    scale: 1.0,
  };
}

/**
 * 5. MEMORY WARP TUNNEL
 */
export function calculateTunnelLayout(index: number, _total: number): LayoutTransform {
  const itemsPerRing = 8;
  const ringIndex = Math.floor((index % 64) / itemsPerRing);
  const posInRing = index % itemsPerRing;

  const radius = 6.2;
  const angle = (posInRing * 2 * Math.PI) / itemsPerRing;
  const zSpacing = 3.8;

  const nx = Math.cos(angle);
  const ny = Math.sin(angle);

  const x = nx * radius;
  const y = ny * radius;
  const z = 10 - ringIndex * zSpacing;

  return {
    position: [x, y, z],
    rotation: [0, Math.atan2(x, z), (angle - Math.PI / 2) * 0.3],
    normal: [-nx, -ny, 0.4],
    scale: 1.0,
  };
}

/**
 * 6. 3D FLOATING MATRIX
 */
export function calculateMatrixLayout(index: number, _total: number): LayoutTransform {
  const cols = 6;
  const rows = 4;
  const col = index % cols;
  const row = Math.floor(index / cols) % rows;
  const depthLayer = Math.floor((index % 48) / (cols * rows));

  const x = (col - (cols - 1) / 2) * 3.4;
  const y = (row - (rows - 1) / 2) * -3.0;
  const z = -depthLayer * 5.0;

  return {
    position: [x, y, z],
    rotation: [0, 0, 0],
    normal: [0, 0, 1],
    scale: 1.0,
  };
}

/**
 * 7. CINEMATIC MUSEUM WALKWAY
 */
export function calculateMuseumLayout(index: number, _total: number): LayoutTransform {
  const isLeft = index % 2 === 0;
  const pairIndex = Math.floor((index % 40) / 2);
  const corridorWidth = 7.0;
  const zStep = 4.2;

  const x = isLeft ? -corridorWidth / 2 : corridorWidth / 2;
  const y = 0;
  const z = 12 - pairIndex * zStep;

  return {
    position: [x, y, z],
    rotation: [0, isLeft ? Math.PI / 5 : -Math.PI / 5, 0],
    normal: [isLeft ? 0.35 : -0.35, 0, 0.9],
    scale: 1.0,
  };
}

/**
 * 8. TIMELINE CONSTELLATION
 */
export function calculateConstellationLayout(index: number, total: number): LayoutTransform {
  const progress = (index % 60) / Math.max(total, 1);
  const length = 28;
  const z = 12 - progress * length;

  const x = Math.sin(progress * Math.PI * 3.5) * 6.8;
  const y = Math.cos(progress * Math.PI * 2.5) * 3.5;

  return {
    position: [x, y, z],
    rotation: [-0.15, Math.sin(progress * Math.PI * 3.5) * 0.45, 0],
    normal: [0, 0, 1],
    scale: 1.0,
  };
}

/**
 * EXPLODED / DISPERSED CELESTIAL GRAVITY STATE
 */
export function calculateExplodedLayout(index: number): LayoutTransform {
  const seed = (index * 9301 + 49297) % 233280;
  const rnd1 = seed / 233280;
  const rnd2 = ((seed * 9301 + 49297) % 233280) / 233280;
  const rnd3 = ((seed * 19301 + 149297) % 233280) / 233280;

  const distance = 18 + rnd1 * 22;
  const theta = rnd2 * Math.PI * 2;
  const phi = Math.acos(2 * rnd3 - 1);

  const nx = Math.sin(phi) * Math.cos(theta);
  const ny = Math.cos(phi);
  const nz = Math.sin(phi) * Math.sin(theta);

  return {
    position: [distance * nx, distance * ny, distance * nz],
    rotation: [rnd1 * Math.PI * 2, rnd2 * Math.PI * 2, rnd3 * Math.PI * 2],
    normal: [nx, ny, nz],
    scale: 0.85,
  };
}

/**
 * Unified Layout Dispatcher
 */
export function getLayoutTransform(
  mode: ViewMode3D,
  index: number,
  total: number,
  isExploded = false
): LayoutTransform {
  if (isExploded) {
    return calculateExplodedLayout(index);
  }

  switch (mode) {
    case 'orb':
      return calculateOrbLayout(index, total);
    case 'galaxy':
      return calculateGalaxyLayout(index, total);
    case 'curved_wall':
      return calculateCurvedWallLayout(index, total);
    case 'spiral':
      return calculateSpiralLayout(index, total);
    case 'tunnel':
      return calculateTunnelLayout(index, total);
    case 'matrix':
      return calculateMatrixLayout(index, total);
    case 'museum':
      return calculateMuseumLayout(index, total);
    case 'constellation':
      return calculateConstellationLayout(index, total);
    default:
      return calculateOrbLayout(index, total);
  }
}
