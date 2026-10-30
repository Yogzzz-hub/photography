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
  ChevronLeft,
  ChevronRight,
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
    if (window.innerWidth < 640) {
      return Math.max(300, Math.min(window.innerWidth * 0.92, 420));
    }
    return Math.max(540, Math.min(window.innerWidth * 0.65, window.innerHeight * 1.05));
  });

  // Rotation State
  const [rotY, setRotY] = useState(0);
  const [rotX, setRotX] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [focusedSlotIdx, setFocusedSlotIdx] = useState<number | null>(null);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);

  // Drag & Inertia Refs
  const isPointerDownRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number; rotY: number; rotX: number } | null>(null);
  const pointerDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingGlobeRef = useRef(false);
  const velocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const animFrameRef = useRef<number | null>(null);

  // Drag-and-Drop Photo Swap State
  const [slotMapping, setSlotMapping] = useState<Record<number, number>>({});
  const [draggedSlot, setDraggedSlot] = useState<number | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);

  // Resize Listener to keep sphere perfectly full-bleed
  useEffect(() => {
    const handleResize = () => {
      const newRadius =
        window.innerWidth < 640
          ? Math.max(300, Math.min(window.innerWidth * 0.92, 420))
          : Math.max(540, Math.min(window.innerWidth * 0.65, window.innerHeight * 1.05));
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

  const focusedPhoto = useMemo(() => {
    if (focusedSlotIdx === null || activePhotos.length === 0) return null;
    const mappedIndex = slotMapping[focusedSlotIdx] !== undefined ? slotMapping[focusedSlotIdx] : focusedSlotIdx;
    return activePhotos[mappedIndex % activePhotos.length] || null;
  }, [focusedSlotIdx, slotMapping, activePhotos]);

  const handleFocusSlot = (slotIdx: number) => {
    vaultAudio.playWhoosh();
    if (focusedSlotIdx === slotIdx) {
      setFocusedSlotIdx(null);
      setIsAutoRotating(true);
      return;
    }
    const targetSlot = SPHERE_SLOTS.find((s) => s.idx === slotIdx);
    if (!targetSlot) return;

    setFocusedSlotIdx(slotIdx);
    setIsAutoRotating(false);

    // Calculate rotation to bring card directly front and center:
    const degPerX = (360 / 35) / 2;
    const degPerY = (360 / 35) / 2;

    const mappedIndex = slotMapping[slotIdx] !== undefined ? slotMapping[slotIdx] : slotIdx;
    const photo = activePhotos[mappedIndex % activePhotos.length];
    const isPortrait = photo ? (photo.height > photo.width || photo.orientation === 'portrait') : false;
    const itemSizeX = isPortrait ? 1.08 : 1.92;
    const itemSizeY = isPortrait ? 1.92 : 1.08;

    const cardRotY = (targetSlot.offsetX + (itemSizeX - 1) / 2) * degPerY;
    const cardRotX = (targetSlot.offsetY - (itemSizeY - 1) / 2) * degPerX;

    setRotY(-cardRotY);
    setRotX(cardRotX);
  };

  const handlePrevSlot = () => {
    vaultAudio.playWhoosh();
    const current = focusedSlotIdx ?? 0;
    const nextIdx = (current - 1 + SPHERE_SLOTS.length) % SPHERE_SLOTS.length;
    handleFocusSlot(nextIdx);
  };

  const handleNextSlot = () => {
    vaultAudio.playWhoosh();
    const current = focusedSlotIdx ?? 0;
    const nextIdx = (current + 1) % SPHERE_SLOTS.length;
    handleFocusSlot(nextIdx);
  };

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
        } else if (isAutoRotating && focusedSlotIdx === null) {
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
  }, [isAutoRotating, focusedSlotIdx]);

  // Pointer Interaction Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    isPointerDownRef.current = true;
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    isDraggingGlobeRef.current = false;
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
    if (pointerDownPosRef.current) {
      const dist = Math.hypot(e.clientX - pointerDownPosRef.current.x, e.clientY - pointerDownPosRef.current.y);
      if (dist > 6) {
        isDraggingGlobeRef.current = true;
      }
    }
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
    // Release drag flag on next tick so card onClick handler can inspect it
    setTimeout(() => {
      isDraggingGlobeRef.current = false;
      pointerDownPosRef.current = null;
    }, 60);
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
    setFocusedSlotIdx(null);
    setIsAutoRotating(true);
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
          '--tile-radius': '12px',
        } as React.CSSProperties
      }
    >
      {/* 3D Perspective Stage (Full Viewport) */}
      <div
        className="sphere-stage"
        onClick={() => {
          if (focusedSlotIdx !== null) {
            vaultAudio.playWhoosh();
            setFocusedSlotIdx(null);
            setIsAutoRotating(true);
          }
        }}
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
            transform: `translateZ(calc(var(--radius) * -1 + ${
              focusedSlotIdx !== null ? 'var(--radius) * 0.58' : '0px'
            })) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
            transition: isPointerDownRef.current ? 'none' : 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {activePhotos.length > 0 &&
            SPHERE_SLOTS.map((slot) => {
              const mappedIndex =
                slotMapping[slot.idx] !== undefined ? slotMapping[slot.idx] : slot.idx;
              const photoIndex = mappedIndex % activePhotos.length;
              const photo = activePhotos[photoIndex];

              const isPortrait = photo.height > photo.width || photo.orientation === 'portrait';

              // Strict 16:9 cinematic widescreen (Landscape) and 9:16 vertical widescreen (Portrait) with zero grid overlap
              const itemSizeX = isPortrait ? 1.08 : 1.92;
              const itemSizeY = isPortrait ? 1.92 : 1.08;

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
                      if (isDraggingGlobeRef.current) return;
                      vaultAudio.playWhoosh();
                      onOpenPhotoDetail(photo.id);
                    }}
                    onMouseEnter={() => {
                      vaultAudio.playHoverChime();
                    }}
                    className={`sphere-item-card group relative ${
                      focusedSlotIdx === slot.idx
                        ? 'ring-2 ring-vault-gold scale-110 shadow-glow z-40'
                        : isDropTarget
                        ? 'ring-2 ring-vault-gold scale-105 shadow-glow'
                        : ''
                    }`}
                    style={{
                      aspectRatio: isPortrait ? '9 / 16' : '16 / 9',
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

      {/* IN-DOME 3D FOCUS CONTROLLER (Dive-Inside Memory) */}
      {focusedSlotIdx !== null && focusedPhoto && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[70] flex flex-col items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto">
          {/* Elegant Floating Memory Badge */}
          <div className="bg-black/85 backdrop-blur-2xl border border-white/15 px-4 py-1.5 rounded-full flex items-center gap-2.5 shadow-2xl">
            <span className="font-serif italic text-white text-sm font-medium tracking-wide">
              {focusedPhoto.metadata.title}
            </span>
            <span className="text-[11px] text-vault-gold font-sans font-medium">
              {focusedPhoto.metadata.captureDate}
            </span>
            {focusedPhoto.metadata.location?.label && (
              <span className="hidden sm:inline text-[11px] text-slate-400 truncate max-w-[180px]">
                · {focusedPhoto.metadata.location.label}
              </span>
            )}
          </div>

          {/* Navigation Action Bar */}
          <div className="bg-[#0b0e17]/90 backdrop-blur-2xl border border-white/15 p-1.5 rounded-full flex items-center gap-1.5 shadow-2xl">
            <button
              onClick={handlePrevSlot}
              className="px-3 py-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white text-xs font-sans flex items-center gap-1 transition-all"
              title="Previous Memory in Dome"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            <button
              onClick={() => {
                vaultAudio.playWhoosh();
                setFocusedSlotIdx(null);
                setIsAutoRotating(true);
              }}
              className="px-4 py-1.5 rounded-full bg-vault-gold text-black font-semibold text-xs font-sans flex items-center gap-1.5 shadow-lg hover:brightness-110 transition-all"
              title="Fly Out to Full Dome Orbit"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Fly Out (Orbit)</span>
            </button>

            <button
              onClick={handleNextSlot}
              className="px-3 py-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white text-xs font-sans flex items-center gap-1 transition-all"
              title="Next Memory in Dome"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onOpenPhotoDetail(focusedPhoto.id)}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-vault-gold transition-all"
              title="Open Vault Artifact Details"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* FLOATING CONTROLS MATCHING MYORB.LIVE (Only shown during Orbit overview) */}
      {focusedSlotIdx === null && (
        <>
          {/* Bottom Left: Play / Pause Auto-Rotate */}
          <button
            onClick={() => {
              vaultAudio.playWhoosh();
              setIsAutoRotating((prev) => !prev);
            }}
            aria-label={isAutoRotating ? 'Pause Orbit' : 'Play Orbit'}
            className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-[70] p-2.5 sm:p-3.5 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 text-white/90 hover:text-white hover:bg-black/80 hover:scale-105 transition-all shadow-2xl"
          >
            {isAutoRotating ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          {/* Bottom Center Floating Luxury Pill */}
          <nav className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-full bg-black/70 backdrop-blur-2xl border border-white/10 shadow-2xl max-w-[85vw] overflow-x-auto">
            {/* Reset View */}
            <button
              onClick={resetView}
              title="Reset Orbit Center"
              className="p-2 sm:p-2.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </button>

            {/* Shuffle Positions */}
            <button
              onClick={handleShuffleGlobe}
              title="Shuffle Memory Positions"
              className="p-2 sm:p-2.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Shuffle className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </button>

            {/* 3D Modes Menu Trigger */}
            <div className="relative">
              <button
                onClick={() => setIsModeMenuOpen((prev) => !prev)}
                title="Switch 3D Display Mode"
                className={`p-2 sm:p-2.5 rounded-full transition-all flex items-center gap-1.5 ${
                  isModeMenuOpen
                    ? 'bg-vault-gold text-black font-bold shadow-glow'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Grid className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              </button>

              {/* 3D Modes Dropdown Popup */}
              {isModeMenuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-[#0c0e17]/95 border border-white/15 rounded-2xl p-2 shadow-2xl backdrop-blur-2xl w-48 flex flex-col gap-1 z-[80] animate-in fade-in zoom-in-95"
                >
                  <span className="text-[10px] font-mono uppercase text-slate-400 px-2 py-1 tracking-wider border-b border-white/10 mb-1">
                    3D Display Modes
                  </span>
                  {MODE_CONFIGS.map(({ mode, label, icon: Icon }) => (
                    <button
                      key={mode}
                      onClick={(e) => {
                        e.stopPropagation();
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
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs font-sans transition-all flex items-center gap-1.5 border-l border-white/10 ml-0.5 sm:ml-1 ${
                  isMonochrome
                    ? 'bg-white text-black font-bold shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <SlidersHorizontal className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                <span>{isMonochrome ? 'B&W' : 'Color'}</span>
              </button>
            )}
          </nav>
        </>
      )}
    </div>
  );
}
