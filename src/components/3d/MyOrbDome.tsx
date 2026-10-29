import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Photo, ViewMode3D } from '../../types';
import { vaultAudio } from '../../services/audioSynthesizer';
import { getInstantProceduralDataUrl } from '../../services/instantTextures';
import {
  Globe,
  Columns3,
  Sparkles,
  Layers,
  Compass,
  LayoutGrid,
  Building,
  GitCommit,
  RotateCcw,
  SlidersHorizontal,
  X,
  ExternalLink,
  Calendar,
  MapPin,
  User,
  Play,
  Pause,
  Shuffle,
  Grid,
} from 'lucide-react';

const MODE_CONFIGS: { mode: ViewMode3D; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { mode: 'orb', label: 'Globe', icon: Globe },
  { mode: 'curved_wall', label: 'IMAX Wall', icon: Columns3 },
  { mode: 'galaxy', label: 'Galaxy', icon: Sparkles },
  { mode: 'spiral', label: 'DNA Helix', icon: Layers },
  { mode: 'tunnel', label: 'Tunnel', icon: Compass },
  { mode: 'matrix', label: '3D Matrix', icon: LayoutGrid },
  { mode: 'museum', label: 'Museum', icon: Building },
  { mode: 'constellation', label: 'Constellation', icon: GitCommit },
];

export interface MyOrbDomeProps {
  photos: Photo[];
  onOpenPhotoDetail: (id: string) => void;
  isMonochrome?: boolean;
  orientationFilter: 'all' | 'landscape' | 'portrait';
  currentMode: ViewMode3D;
  onSelectMode: (mode: ViewMode3D) => void;
  onToggleMonochrome?: () => void;
  onSetOrientationFilter?: (filter: 'all' | 'landscape' | 'portrait') => void;
}

interface SphereSlot {
  idx: number;
  offsetX: number;
  offsetY: number;
  sizeX: number;
  sizeY: number;
}

/**
 * Generates the authentic 35x35 staggered brickwork spherical grid (175 slots)
 * exactly matching the mathematics of myorb.live.
 */
function generateSphereGrid(): SphereSlot[] {
  const slots: SphereSlot[] = [];
  let idx = 0;
  for (let col = 0; col < 35; col++) {
    const offsetX = -37 + col * 2;
    const isEvenCol = col % 2 === 0;
    const rows = isEvenCol ? [-4, -2, 0, 2, 4] : [-3, -1, 1, 3, 5];
    for (const offsetY of rows) {
      slots.push({
        idx: idx++,
        offsetX,
        offsetY,
        sizeX: 2,
        sizeY: 2,
      });
    }
  }
  return slots;
}

const SPHERE_SLOTS = generateSphereGrid();

export function MyOrbDome({
  photos,
  onOpenPhotoDetail,
  isMonochrome = false,
  orientationFilter,
  currentMode,
  onSelectMode,
  onToggleMonochrome,
  onSetOrientationFilter,
}: MyOrbDomeProps) {
  // Screen and Sphere Dimensions - Responsive edge-to-edge
  const [radius, setRadius] = useState<number>(() => {
    if (typeof window === 'undefined') return 920;
    return Math.max(540, Math.min(window.innerWidth * 0.65, window.innerHeight * 1.05));
  });

  // Rotation State
  const [rotY, setRotY] = useState(0);
  const [rotX, setRotX] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [enlargedPhoto, setEnlargedPhoto] = useState<Photo | null>(null);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);

  // Drag & Inertia Refs
  const isPointerDownRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number; rotY: number; rotX: number } | null>(null);
  const velocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const animFrameRef = useRef<number | null>(null);

  // Drag-and-Drop Photo Swap State
  const [slotMapping, setSlotMapping] = useState<Record<number, number>>({});
  const [draggedSlot, setDraggedSlot] = useState<number | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);

  // Resize Listener to keep sphere perfectly full-bleed
  useEffect(() => {
    const handleResize = () => {
      const newRadius = Math.max(540, Math.min(window.innerWidth * 0.65, window.innerHeight * 1.05));
      setRadius(newRadius);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filtered Photos
  const visiblePhotos = useMemo(() => {
    if (!photos || photos.length === 0) return [];
    return photos.filter((p) => {
      if (p.inTrash) return false;
      const isPortrait = p.height > p.width || p.orientation === 'portrait';
      if (orientationFilter === 'landscape' && isPortrait) return false;
      if (orientationFilter === 'portrait' && !isPortrait) return false;
      return true;
    });
  }, [photos, orientationFilter]);

  // Interleave portrait and landscape for organic mosaic
  const activePhotos = useMemo(() => {
    if (visiblePhotos.length === 0) return [];
    if (orientationFilter !== 'all') return visiblePhotos;

    const landscapes = visiblePhotos.filter((p) => p.width >= p.height && p.orientation !== 'portrait');
    const portraits = visiblePhotos.filter((p) => p.height > p.width || p.orientation === 'portrait');
    if (landscapes.length === 0) return portraits;
    if (portraits.length === 0) return landscapes;

    const result: Photo[] = [];
    const maxLen = Math.max(landscapes.length, portraits.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < landscapes.length) result.push(landscapes[i]);
      if (i < portraits.length) result.push(portraits[i]);
    }
    return result;
  }, [visiblePhotos, orientationFilter]);

  // Inertial momentum animation loop (60-120 FPS)
  useEffect(() => {
    const loop = () => {
      if (!isPointerDownRef.current) {
        // Apply inertia friction
        velocityRef.current.vx *= 0.94;
        velocityRef.current.vy *= 0.94;

        const speed = Math.hypot(velocityRef.current.vx, velocityRef.current.vy);
        if (speed > 0.04) {
          setRotY((prev) => prev + velocityRef.current.vx);
          setRotX((prev) => Math.max(-62, Math.min(62, prev + velocityRef.current.vy)));
        } else if (isAutoRotating && !enlargedPhoto) {
          // Celestial continuous auto-rotation
          setRotY((prev) => prev + 0.055);
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isAutoRotating, enlargedPhoto]);

  // Pointer Interaction Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isPointerDownRef.current = true;
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rotY,
      rotX,
    };
    velocityRef.current = { vx: 0, vy: 0 };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPointerDownRef.current || !pointerStartRef.current) return;
    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;

    const rotSensitivity = 0.22;
    const newRotY = pointerStartRef.current.rotY + dx * rotSensitivity;
    const newRotX = Math.max(-62, Math.min(62, pointerStartRef.current.rotX - dy * rotSensitivity));

    setRotY(newRotY);
    setRotX(newRotX);

    velocityRef.current = {
      vx: dx * 0.08,
      vy: -dy * 0.08,
    };
    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rotY: newRotY,
      rotX: newRotX,
    };
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
    pointerStartRef.current = null;
  };

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setRadius((prev) => {
      const next = prev - e.deltaY * 0.8;
      return Math.max(500, Math.min(1400, next));
    });
  };

  // Slot Swapping via Drag & Drop
  const handleSwapSlots = (fromSlot: number, toSlot: number) => {
    if (fromSlot === toSlot) return;
    vaultAudio.playWhoosh();
    setSlotMapping((prev) => {
      const fromMapped = prev[fromSlot] !== undefined ? prev[fromSlot] : fromSlot;
      const toMapped = prev[toSlot] !== undefined ? prev[toSlot] : toSlot;
      return {
        ...prev,
        [fromSlot]: toMapped,
        [toSlot]: fromMapped,
      };
    });
  };

  const handleShuffleGlobe = () => {
    vaultAudio.playWhoosh();
    const newMapping: Record<number, number> = {};
    const slots = Array.from({ length: SPHERE_SLOTS.length }, (_, i) => i);
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    slots.forEach((target, original) => {
      newMapping[original] = target;
    });
    setSlotMapping(newMapping);
  };

  const resetView = () => {
    vaultAudio.playWhoosh();
    setRotY(0);
    setRotX(0);
    velocityRef.current = { vx: 0, vy: 0 };
  };

  return (
    <div
      className="sphere-root relative w-full h-full overflow-hidden bg-transparent select-none"
      style={
        {
          '--radius': `${radius}px`,
          '--tile-radius': '28px',
        } as React.CSSProperties
      }
    >
      {/* 3D Perspective Stage (Full Viewport) */}
      <div
        className="sphere-stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        {/* Rotating 3D Sphere Core */}
        <div
          className="sphere-rotator"
          style={{
            transform: `translateZ(calc(var(--radius) * -1)) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
          }}
        >
          {activePhotos.length > 0 &&
            SPHERE_SLOTS.map((slot) => {
              const mappedIndex =
                slotMapping[slot.idx] !== undefined ? slotMapping[slot.idx] : slot.idx;
              const photoIndex = mappedIndex % activePhotos.length;
              const photo = activePhotos[photoIndex];

              const itemSizeX = slot.sizeX;
              const itemSizeY = slot.sizeY;

              const isDropTarget = dragOverSlot === slot.idx;
              const isBeingDragged = draggedSlot === slot.idx;

              return (
                <div
                  key={`slot_${slot.idx}`}
                  className="sphere-item"
                  style={
                    {
                      '--offset-x': slot.offsetX,
                      '--offset-y': slot.offsetY,
                      '--item-size-x': itemSizeX,
                      '--item-size-y': itemSizeY,
                      width: `calc(var(--item-width) * ${itemSizeX})`,
                      height: `calc(var(--item-height) * ${itemSizeY})`,
                      transform: `rotateY(calc(var(--rot-y) * (${slot.offsetX} + (${itemSizeX} - 1) / 2))) rotateX(calc(var(--rot-x) * (${slot.offsetY} - (${itemSizeY} - 1) / 2))) translateZ(var(--radius))`,
                      opacity: isBeingDragged ? 0.35 : 1,
                    } as React.CSSProperties
                  }
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverSlot(slot.idx);
                  }}
                  onDragLeave={() => {
                    if (dragOverSlot === slot.idx) setDragOverSlot(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedSlot !== null) {
                      handleSwapSlots(draggedSlot, slot.idx);
                    }
                    setDraggedSlot(null);
                    setDragOverSlot(null);
                  }}
                >
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', slot.idx.toString());
                      setDraggedSlot(slot.idx);
                    }}
                    onDragEnd={() => {
                      setDraggedSlot(null);
                      setDragOverSlot(null);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      vaultAudio.playHoverChime();
                      setEnlargedPhoto(photo);
                    }}
                    onMouseEnter={() => {
                      vaultAudio.playHoverChime();
                    }}
                    className={`sphere-item-card group relative ${
                      isDropTarget
                        ? 'ring-2 ring-vault-gold scale-105 shadow-glow'
                        : ''
                    }`}
                    style={{
                      filter: isMonochrome ? 'grayscale(100%) contrast(1.15)' : 'none',
                    }}
                  >
                    {/* Live Image Texture */}
                    <img
                      src={photo.decryptedThumbUrl || photo.thumbStoragePath}
                      alt={photo.metadata.title}
                      loading="lazy"
                      onError={(e) => {
                        const fallbackUrl = getInstantProceduralDataUrl(
                          photo.id,
                          photo.height > photo.width || photo.orientation === 'portrait'
                        );
                        if (e.currentTarget.src !== fallbackUrl) {
                          e.currentTarget.src = fallbackUrl;
                        }
                      }}
                      className="w-full h-full object-cover pointer-events-none transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Obsidian Glass Gradient Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none flex flex-col justify-end p-3">
                      <span className="text-white text-xs font-semibold truncate tracking-wide drop-shadow-md">
                        {photo.metadata.title}
                      </span>
                      {photo.metadata.location?.label && (
                        <span className="text-[10px] text-vault-gold truncate flex items-center gap-1 drop-shadow-md mt-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          <span>{photo.metadata.location.label}</span>
                        </span>
                      )}
                    </div>

                    {/* Subtle Golden Inner Border */}
                    <div className="absolute inset-0 border border-white/10 group-hover:border-vault-gold/60 rounded-[var(--tile-radius)] pointer-events-none transition-colors duration-300" />
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Focused Memory Lightbox (Matching myorb.live) */}
      {enlargedPhoto && (
        <div
          onClick={() => setEnlargedPhoto(null)}
          className="absolute inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-[#0c0e17]/95 border border-vault-gold/40 rounded-3xl p-6 shadow-2xl overflow-hidden cursor-default flex flex-col md:flex-row gap-6 animate-in zoom-in-95 duration-300"
          >
            {/* Close Button */}
            <button
              onClick={() => setEnlargedPhoto(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors z-20"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Photo Preview Container */}
            <div className="w-full md:w-1/2 aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 shadow-lg relative bg-slate-900 flex-shrink-0">
              <img
                src={enlargedPhoto.decryptedFullUrl || enlargedPhoto.decryptedThumbUrl || enlargedPhoto.thumbStoragePath}
                alt={enlargedPhoto.metadata.title}
                className="w-full h-full object-cover"
                style={{
                  filter: isMonochrome ? 'grayscale(100%) contrast(1.15)' : 'none',
                }}
              />
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
                AES-256-GCM
              </div>
            </div>

            {/* Photo Metadata & Actions */}
            <div className="flex-1 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-vault-gold">
                  ✦ VAULT MEMORY ARTIFACT
                </span>
                <h3 className="text-xl font-bold text-white tracking-wide mt-1">
                  {enlargedPhoto.metadata.title}
                </h3>

                {enlargedPhoto.metadata.story && (
                  <p className="text-xs text-slate-300 mt-2 line-clamp-3 italic">
                    "{enlargedPhoto.metadata.story}"
                  </p>
                )}

                <div className="mt-4 space-y-2 text-xs text-slate-300">
                  {enlargedPhoto.metadata.location?.label && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-vault-gold" />
                      <span>{enlargedPhoto.metadata.location.label}</span>
                    </div>
                  )}

                  {enlargedPhoto.metadata.captureDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-purple-400" />
                      <span>{enlargedPhoto.metadata.captureDate}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Archived by {enlargedPhoto.uploaderName}</span>
                  </div>

                  {enlargedPhoto.metadata.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {enlargedPhoto.metadata.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-300"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                <button
                  onClick={() => {
                    const id = enlargedPhoto.id;
                    setEnlargedPhoto(null);
                    onOpenPhotoDetail(id);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold tracking-wide transition-all shadow-glow flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Inspect & Decrypt</span>
                </button>
                <button
                  onClick={() => setEnlargedPhoto(null)}
                  className="px-4 py-2.5 rounded-xl glass-panel text-slate-300 hover:text-white text-xs font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING CONTROLS MATCHING MYORB.LIVE */}

      {/* Bottom Left: Play / Pause Auto-Rotate */}
      <button
        onClick={() => {
          vaultAudio.playWhoosh();
          setIsAutoRotating((prev) => !prev);
        }}
        aria-label={isAutoRotating ? 'Pause Orbit' : 'Play Orbit'}
        className="absolute bottom-6 left-6 z-30 p-3.5 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 text-white/90 hover:text-white hover:bg-black/70 hover:scale-105 transition-all shadow-2xl"
      >
        {isAutoRotating ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>

      {/* Bottom Center Floating Luxury Pill */}
      <nav className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 p-1.5 rounded-full bg-black/60 backdrop-blur-2xl border border-white/10 shadow-2xl">
        {/* Reset View */}
        <button
          onClick={resetView}
          title="Reset Orbit Center"
          className="p-2.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Shuffle Positions */}
        <button
          onClick={handleShuffleGlobe}
          title="Shuffle Memory Positions"
          className="p-2.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Shuffle className="w-4 h-4" />
        </button>

        {/* 3D Modes Menu Trigger */}
        <div className="relative">
          <button
            onClick={() => setIsModeMenuOpen((prev) => !prev)}
            title="Switch 3D Display Mode"
            className={`p-2.5 rounded-full transition-all flex items-center gap-1.5 ${
              isModeMenuOpen
                ? 'bg-vault-gold text-black font-bold shadow-glow'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>

          {/* 3D Modes Dropdown Popup */}
          {isModeMenuOpen && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-[#0c0e17]/95 border border-white/15 rounded-2xl p-2 shadow-2xl backdrop-blur-2xl w-48 flex flex-col gap-1 z-40 animate-in fade-in zoom-in-95">
              <span className="text-[10px] font-mono uppercase text-slate-400 px-2 py-1 tracking-wider border-b border-white/10 mb-1">
                3D Display Modes
              </span>
              {MODE_CONFIGS.map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => {
                    vaultAudio.playWhoosh();
                    onSelectMode(mode);
                    setIsModeMenuOpen(false);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all text-left ${
                    currentMode === mode
                      ? 'bg-vault-gold text-black font-bold shadow-md'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Leica B&W Toggle */}
        {onToggleMonochrome && (
          <button
            onClick={onToggleMonochrome}
            title={isMonochrome ? 'Switch to Color' : 'Switch to Monochrome Leica'}
            className={`px-3 py-1.5 rounded-full text-xs font-sans transition-all flex items-center gap-1.5 border-l border-white/10 ml-1 ${
              isMonochrome
                ? 'bg-white text-black font-bold shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{isMonochrome ? 'B&W' : 'Color'}</span>
          </button>
        )}
      </nav>
    </div>
  );
}
