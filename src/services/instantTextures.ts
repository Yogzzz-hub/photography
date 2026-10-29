import * as THREE from 'three';

// Cache for procedural instant textures
const proceduralTextureCache = new Map<string, THREE.CanvasTexture>();

interface ProceduralPalette {
  primary: string;
  secondary: string;
  accent: string;
  title: string;
  sub: string;
}

const PALETTES: Record<string, ProceduralPalette> = {
  pho_sample_01: {
    primary: '#1A2A4A',
    secondary: '#D97706',
    accent: '#FDE68A',
    title: 'MARINA BEACH',
    sub: 'Golden Sunrise · Chennai',
  },
  pho_sample_02: {
    primary: '#1E293B',
    secondary: '#0D9488',
    accent: '#99F6E4',
    title: 'SHORE TEMPLE',
    sub: 'Coromandel Waves · Mahabalipuram',
  },
  pho_sample_03: {
    primary: '#2E1065',
    secondary: '#C026D3',
    accent: '#F5D0FE',
    title: 'MYLAPORE FESTIVAL',
    sub: 'Kapaleeshwarar · Chennai',
  },
  pho_sample_04: {
    primary: '#0F172A',
    secondary: '#E11D48',
    accent: '#FECDD3',
    title: 'ELLIOT’S BEACH',
    sub: 'Besant Nagar · Chennai',
  },
  pho_sample_05: {
    primary: '#064E3B',
    secondary: '#0284C7',
    accent: '#BAE6FD',
    title: 'NILGIRI MOUNTAINS',
    sub: 'Toy Train · Ooty',
  },
  pho_sample_06: {
    primary: '#451A03',
    secondary: '#D97706',
    accent: '#FEF3C7',
    title: 'BRIHADISVARA',
    sub: 'Granite Vimana · Thanjavur',
  },
  pho_sample_07: {
    primary: '#312E81',
    secondary: '#B45309',
    accent: '#FDE68A',
    title: 'CHETTINAD HERITAGE',
    sub: 'Teakwood Mansion · Karaikudi',
  },
  pho_sample_08: {
    primary: '#134E4A',
    secondary: '#6366F1',
    accent: '#E0E7FF',
    title: 'KODAIKANAL LAKE',
    sub: 'Highland Mist · Dindigul',
  },
  pho_sample_09: {
    primary: '#18181B',
    secondary: '#71717A',
    accent: '#FAFAFA',
    title: 'KANCHIPURAM SILK',
    sub: 'Heritage Weave · Tamil Nadu',
  },
  pho_sample_10: {
    primary: '#1E1B4B',
    secondary: '#F59E0B',
    accent: '#FEF3C7',
    title: 'FRENCH PROMENADE',
    sub: 'White Town · Pondicherry Coast',
  },
  pho_sample_11: {
    primary: '#082F49',
    secondary: '#06B6D4',
    accent: '#CFFAFE',
    title: 'PAMBAN SEA BRIDGE',
    sub: 'Ocean Crossing · Rameswaram',
  },
  pho_sample_12: {
    primary: '#064E3B',
    secondary: '#10B981',
    accent: '#A7F3D0',
    title: 'SEMMOZHI POONGA',
    sub: 'Cathedral Road · Chennai',
  },
  pho_sample_13: {
    primary: '#581C87',
    secondary: '#F59E0B',
    accent: '#FEF08A',
    title: 'MEENAKSHI AMMAN',
    sub: '1000 Pillars · Madurai',
  },
  pho_sample_14: {
    primary: '#450A0A',
    secondary: '#DC2626',
    accent: '#FECACA',
    title: 'CENTRAL STATION',
    sub: 'Heritage Tower · Chennai',
  },
  pho_sample_15: {
    primary: '#0C4A6E',
    secondary: '#FB7185',
    accent: '#FFE4E6',
    title: 'PULICAT LAGOON',
    sub: 'Flamingo Haven · North Chennai',
  },
  pho_sample_16: {
    primary: '#0F172A',
    secondary: '#94A3B8',
    accent: '#FFFFFF',
    title: 'SAN THOME BASILICA',
    sub: 'Gothic Spire · Mylapore',
  },
};

/**
 * Instantly generates a high-performance, beautiful canvas photographic duotone texture.
 * Runs in under 1ms with ZERO external network round-trips!
 */
export function getInstantProceduralTexture(photoId: string): THREE.CanvasTexture {
  if (proceduralTextureCache.has(photoId)) {
    return proceduralTextureCache.get(photoId)!;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 460;
  canvas.height = 320;
  const ctx = canvas.getContext('2d', { alpha: false });

  if (!ctx) {
    const fallbackTex = new THREE.CanvasTexture(canvas);
    return fallbackTex;
  }

  const p = PALETTES[photoId] || {
    primary: '#080B12',
    secondary: '#E5C07B',
    accent: '#F8FAFC',
    title: 'TAMIL NADU MEMORY',
    sub: 'Vanderbilt Vault',
  };

  // 1. Rich Atmospheric Background Gradient
  const grad = ctx.createLinearGradient(0, 0, 460, 320);
  grad.addColorStop(0, p.primary);
  grad.addColorStop(0.65, p.secondary);
  grad.addColorStop(1, p.primary);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 460, 320);

  // 2. Subtle Radial Vignette
  const rad = ctx.createRadialGradient(230, 160, 40, 230, 160, 260);
  rad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
  rad.addColorStop(0.8, 'rgba(0, 0, 0, 0.35)');
  rad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, 460, 320);

  // 3. Subtle Film Grain Simulation
  ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
  for (let i = 0; i < 40; i++) {
    const rx = Math.random() * 460;
    const ry = Math.random() * 320;
    const rw = 20 + Math.random() * 60;
    ctx.fillRect(rx, ry, rw, 1);
  }

  // 4. Elegant Platinum / Gold Frame Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 2;
  ctx.strokeRect(16, 16, 428, 288);

  // 5. Monogram Watermark Crest
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.font = '600 72px "Cinzel", serif';
  ctx.textAlign = 'center';
  ctx.fillText('TN', 230, 155);

  // 6. Typography Overlay (Luxury Editorial)
  ctx.fillStyle = p.accent;
  ctx.font = '700 17px "Cormorant Garamond", serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '3px';
  ctx.fillText(p.title, 230, 185);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillText(p.sub, 230, 210);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;

  proceduralTextureCache.set(photoId, tex);
  return tex;
}
