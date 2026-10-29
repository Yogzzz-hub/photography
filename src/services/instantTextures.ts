import * as THREE from 'three';

// Cache for procedural instant textures keyed by `${photoId}_${orientation}`
const proceduralTextureCache = new Map<string, THREE.CanvasTexture>();

interface ProceduralPalette {
  primary: string;
  secondary: string;
  accent: string;
  title: string;
  sub: string;
}

const PALETTES: Record<string, ProceduralPalette> = {
  // Landscapes
  pho_sample_01: { primary: '#0F2027', secondary: '#F59E0B', accent: '#FEF3C7', title: 'MARINA SUNRISE', sub: 'Golden Coastline · Chennai' },
  pho_sample_02: { primary: '#1E293B', secondary: '#0D9488', accent: '#99F6E4', title: 'SHORE TEMPLE', sub: 'Stone Monoliths · Mahabalipuram' },
  pho_sample_03: { primary: '#0F172A', secondary: '#E11D48', accent: '#FECDD3', title: 'ELLIOT’S BEACH', sub: 'Besant Nagar · Chennai' },
  pho_sample_04: { primary: '#064E3B', secondary: '#0284C7', accent: '#BAE6FD', title: 'NILGIRI RAILWAY', sub: 'Mountain Toy Train · Ooty' },
  pho_sample_05: { primary: '#451A03', secondary: '#D97706', accent: '#FEF3C7', title: 'BRIHADISVARA', sub: 'Granite Vimana · Thanjavur' },
  pho_sample_06: { primary: '#312E81', secondary: '#B45309', accent: '#FDE68A', title: 'CHETTINAD MANSION', sub: 'Teak Courtyard · Karaikudi' },
  pho_sample_07: { primary: '#134E4A', secondary: '#6366F1', accent: '#E0E7FF', title: 'KODAIKANAL LAKE', sub: 'Highland Mist · Dindigul' },
  pho_sample_08: { primary: '#082F49', secondary: '#06B6D4', accent: '#CFFAFE', title: 'PAMBAN SEA BRIDGE', sub: 'Ocean Crossing · Rameswaram' },
  pho_sample_09: { primary: '#064E3B', secondary: '#10B981', accent: '#A7F3D0', title: 'SEMMOZHI POONGA', sub: 'Cathedral Road · Chennai' },
  pho_sample_10: { primary: '#450A0A', secondary: '#DC2626', accent: '#FECACA', title: 'CENTRAL STATION', sub: 'Gothic Clock Tower · Chennai' },
  pho_sample_11: { primary: '#0C4A6E', secondary: '#FB7185', accent: '#FFE4E6', title: 'PULICAT LAGOON', sub: 'Flamingo Haven · North Chennai' },
  pho_sample_12: { primary: '#1E1B4B', secondary: '#F59E0B', accent: '#FEF3C7', title: 'DHANUSHKODI POINT', sub: 'Two Oceans Confluence · Rameswaram' },
  pho_sample_13: { primary: '#14532D', secondary: '#3B82F6', accent: '#DBEAFE', title: 'HOGENAKKAL FALLS', sub: 'Kaveri River Gorge · Dharmapuri' },
  pho_sample_14: { primary: '#1C1917', secondary: '#059669', accent: '#A7F3D0', title: 'YERCAUD LAKE', sub: 'Emerald Overlook · Shevaroys' },
  pho_sample_15: { primary: '#022C22', secondary: '#0D9488', accent: '#99F6E4', title: 'PICHAVARAM MANGROVE', sub: 'Canal Labyrinth · Chidambaram' },
  pho_sample_16: { primary: '#064E3B', secondary: '#0284C7', accent: '#BAE6FD', title: 'COURTALLAM FALLS', sub: 'Herbal Cascade · Tenkasi' },
  pho_sample_17: { primary: '#3B0764', secondary: '#E11D48', accent: '#FFE4E6', title: 'KOLLI HILLS GHAT', sub: '70 Hairpin Bends · Namakkal' },
  pho_sample_18: { primary: '#064E3B', secondary: '#84CC16', accent: '#ECFCCB', title: 'VALPARAI TEA SLOPES', sub: 'Anamalai Mist · Coimbatore' },
  pho_sample_19: { primary: '#1C1917', secondary: '#CA8A04', accent: '#FEF08A', title: 'MUDUMALAI RESERVE', sub: 'Wild Elephant Corridor · Nilgiris' },
  pho_sample_20: { primary: '#0C4A6E', secondary: '#F59E0B', accent: '#FEF3C7', title: 'AGNI THEERTHAM', sub: 'Sacred Sunrise Waves · Rameswaram' },
  pho_sample_21: { primary: '#1E293B', secondary: '#06B6D4', accent: '#CFFAFE', title: 'MUTTUKADU BACKWATERS', sub: 'Coastal Regatta · ECR Chennai' },
  pho_sample_22: { primary: '#0F172A', secondary: '#38BDF8', accent: '#E0F2FE', title: 'COVELONG POINT', sub: 'Morning Surf Break · Kovalam' },
  pho_sample_23: { primary: '#1C1917', secondary: '#F97316', accent: '#FFEDD5', title: 'FORT DANSBORG', sub: 'Danish Sea Bastion · Tranquebar' },
  pho_sample_24: { primary: '#262626', secondary: '#EAB308', accent: '#FEF9C3', title: 'GINGEE CITADEL', sub: 'Granite High Fortress · Villupuram' },
  pho_sample_25: { primary: '#064E3B', secondary: '#10B981', accent: '#D1FAE5', title: 'KALRAYAN CANOPY', sub: 'Eastern Ghats Trek · Salem' },
  pho_sample_26: { primary: '#1E1B4B', secondary: '#EC4899', accent: '#FCE7F3', title: 'KANYAKUMARI CAPE', sub: 'Tri-Sea Horizon · Land’s End' },
  pho_sample_27: { primary: '#082F49', secondary: '#14B8A6', accent: '#CCFBF1', title: 'SIRUVANI DAM', sub: 'Sweet Mountain Water · Coimbatore' },

  // Portraits
  pho_sample_28: { primary: '#2E1065', secondary: '#C026D3', accent: '#F5D0FE', title: 'KAPALEESHWARAR', sub: 'Dravidian Gopuram · Mylapore' },
  pho_sample_29: { primary: '#18181B', secondary: '#D97706', accent: '#FEF3C7', title: 'KANCHIPURAM SILK', sub: 'Gold Zari Loom · Heritage Town' },
  pho_sample_30: { primary: '#1E1B4B', secondary: '#F59E0B', accent: '#FEF3C7', title: 'FRENCH PROMENADE', sub: 'Ochre Villa · White Town' },
  pho_sample_31: { primary: '#581C87', secondary: '#F59E0B', accent: '#FEF08A', title: 'MEENAKSHI AMMAN', sub: 'Golden Vimana Spire · Madurai' },
  pho_sample_32: { primary: '#0F172A', secondary: '#94A3B8', accent: '#FFFFFF', title: 'SAN THOME BASILICA', sub: 'Gothic Spire · Mylapore' },
  pho_sample_33: { primary: '#831843', secondary: '#F43F5E', accent: '#FFE4E6', title: 'BHARATANATYAM', sub: 'Temple Classical Dance · Chennai' },
  pho_sample_34: { primary: '#451A03', secondary: '#D97706', accent: '#FEF3C7', title: 'SWAMIMALAI BRONZE', sub: 'Lost-Wax Nataraja · Thanjavur' },
  pho_sample_35: { primary: '#451A03', secondary: '#B45309', accent: '#FDE68A', title: 'FILTER COFFEE', sub: 'Brass Davarah Foam · Mylapore' },
  pho_sample_36: { primary: '#1E293B', secondary: '#F59E0B', accent: '#FEF3C7', title: 'MARATHA PALACE', sub: 'Royal Pillar Arches · Thanjavur' },
  pho_sample_37: { primary: '#064E3B', secondary: '#84CC16', accent: '#ECFCCB', title: 'COONOOR HARVEST', sub: 'Highlands Tea Slope · Nilgiris' },
  pho_sample_38: { primary: '#451A03', secondary: '#F59E0B', accent: '#FEF3C7', title: 'TEMPLE CHARIOT', sub: 'Panguni Teak Carvings · Mylapore' },
  pho_sample_39: { primary: '#064E3B', secondary: '#06B6D4', accent: '#CFFAFE', title: 'MARUNDEESWARAR', sub: 'Lotus Temple Tank · Thiruvanmiyur' },
  pho_sample_40: { primary: '#312E81', secondary: '#EAB308', accent: '#FEF9C3', title: 'KUTHUVILAKKU LAMP', sub: 'Brass Heirloom · Karaikudi' },
  pho_sample_41: { primary: '#022C22', secondary: '#10B981', accent: '#D1FAE5', title: 'OOTY GLASSHOUSE', sub: 'Victorian Tree Ferns · Nilgiris' },
  pho_sample_42: { primary: '#1C1917', secondary: '#F59E0B', accent: '#FEF3C7', title: 'RAMESWARAM PILLARS', sub: '1000 Corridor Arch · Pamban' },
  pho_sample_43: { primary: '#262626', secondary: '#F97316', accent: '#FFEDD5', title: 'KRISHNA’S BUTTERBALL', sub: 'Granite Monolith · Mahabalipuram' },
  pho_sample_44: { primary: '#0F172A', secondary: '#EF4444', accent: '#FEE2E2', title: 'MARINA LIGHTHOUSE', sub: 'Harbor Beacon Spire · Chennai' },
  pho_sample_45: { primary: '#3B0764', secondary: '#D97706', accent: '#FEF3C7', title: 'PARTHASARATHY', sub: 'Pallava Inscriptions · Triplicane' },
  pho_sample_46: { primary: '#18181B', secondary: '#E2E8F0', accent: '#FFFFFF', title: 'RIPON BUILDING', sub: 'Greco-Roman Tower · Chennai' },
  pho_sample_47: { primary: '#134E4A', secondary: '#6366F1', accent: '#E0E7FF', title: 'PILLAR ROCKS', sub: 'Misty Granite Chasm · Kodaikanal' },
  pho_sample_48: { primary: '#451A03', secondary: '#F59E0B', accent: '#FEF3C7', title: 'BOBBLEHEAD DOLL', sub: 'Dancing Terracotta · Thanjavur' },
  pho_sample_49: { primary: '#1E293B', secondary: '#EC4899', accent: '#FCE7F3', title: 'ATHANGUDI TILES', sub: 'Handmade Geometric · Karaikudi' },
  pho_sample_50: { primary: '#701A75', secondary: '#F43F5E', accent: '#FFE4E6', title: 'BOUGAINVILLEA ARCH', sub: 'French Quarter Alley · Pondicherry' },
  pho_sample_51: { primary: '#064E3B', secondary: '#10B981', accent: '#A7F3D0', title: 'PYKARA SHOLA', sub: 'Ancient Tree Ferns · Nilgiris' },
  pho_sample_52: { primary: '#450A0A', secondary: '#DC2626', accent: '#FECACA', title: 'CENTRAL RED BRICK', sub: 'Romanesque Facade · Chennai' },
  pho_sample_53: { primary: '#1C1917', secondary: '#38BDF8', accent: '#E0F2FE', title: 'THIRUVALLUVAR', sub: '133ft Ocean Colossus · Kanyakumari' },
  pho_sample_54: { primary: '#451A03', secondary: '#CA8A04', accent: '#FEF08A', title: 'CARNATIC VEENA', sub: 'Jackwood Resonance · Thanjavur' },
};

/**
 * Returns a deterministic, instant 0ms photographic canvas texture.
 * Supports both Landscape (460x320) and Portrait (320x460) with true luxury editorial formatting.
 * Zero external network delay, guaranteed 100% fill across all 108 slots!
 */
export function getInstantProceduralTexture(photoId: string, isPortrait = false): THREE.CanvasTexture {
  const cacheKey = `${photoId}_${isPortrait ? 'portrait' : 'landscape'}`;
  if (proceduralTextureCache.has(cacheKey)) {
    return proceduralTextureCache.get(cacheKey)!;
  }

  const w = isPortrait ? 320 : 460;
  const h = isPortrait ? 460 : 320;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { alpha: false });

  if (!ctx) {
    const fallbackTex = new THREE.CanvasTexture(canvas);
    return fallbackTex;
  }

  // Derive palette
  let p = PALETTES[photoId];
  if (!p) {
    // Deterministic hash based on string ID
    const hash = Array.from(photoId).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const keys = Object.keys(PALETTES);
    p = PALETTES[keys[hash % keys.length]];
  }

  // 1. Rich Atmospheric Background Gradient
  const grad = isPortrait
    ? ctx.createLinearGradient(0, 0, 0, h)
    : ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, p.primary);
  grad.addColorStop(0.5, p.secondary);
  grad.addColorStop(1, p.primary);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // 2. Subtle Radial Vignette
  const cx = w / 2;
  const cy = h / 2;
  const rad = ctx.createRadialGradient(cx, cy, 30, cx, cy, Math.max(w, h) * 0.75);
  rad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
  rad.addColorStop(0.7, 'rgba(0, 0, 0, 0.45)');
  rad.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, w, h);

  // 3. Subtle Film Grain
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  for (let i = 0; i < 45; i++) {
    const rx = Math.random() * w;
    const ry = Math.random() * h;
    const rw = 15 + Math.random() * 45;
    ctx.fillRect(rx, ry, rw, 1);
  }

  // 4. Elegant Platinum / Gold Frame Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  // 5. Monogram Watermark Crest
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.font = `600 ${isPortrait ? '84px' : '72px'} "Cinzel", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TN', cx, cy - 25);

  // 6. Typography Overlay (Luxury Editorial)
  ctx.fillStyle = p.accent;
  ctx.font = `700 ${isPortrait ? '18px' : '17px'} "Cormorant Garamond", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = '3px';
  ctx.fillText(p.title, cx, isPortrait ? cy + 40 : cy + 25);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillText(p.sub, cx, isPortrait ? cy + 65 : cy + 50);

  // 7. Orientation Badge / Date Watermark
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '600 9px "Plus Jakarta Sans", monospace';
  ctx.letterSpacing = '2px';
  ctx.fillText(isPortrait ? '▯ PORTRAIT · VAULT' : '▱ LANDSCAPE · VAULT', cx, h - 24);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;

  proceduralTextureCache.set(cacheKey, tex);
  return tex;
}

const proceduralDataUrlCache = new Map<string, string>();

/**
 * Returns a base64 Data URL for a procedural instant card to serve as a fail-safe
 * fallback for any <img> tag on the globe.
 */
export function getInstantProceduralDataUrl(photoId: string, isPortrait = false): string {
  const cacheKey = `${photoId}_${isPortrait ? 'portrait' : 'landscape'}`;
  if (proceduralDataUrlCache.has(cacheKey)) {
    return proceduralDataUrlCache.get(cacheKey)!;
  }

  const tex = getInstantProceduralTexture(photoId, isPortrait);
  const dataUrl = (tex.image as HTMLCanvasElement).toDataURL('image/jpeg', 0.85);
  proceduralDataUrlCache.set(cacheKey, dataUrl);
  return dataUrl;
}

