import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Photo, PhotoMetadata, ViewMode3D } from '../../types';
import { useVaultStore } from '../../stores/useVaultStore';
import { vaultAudio } from '../../services/audioSynthesizer';
import { getInstantProceduralDataUrl } from '../../services/instantTextures';
import { processPhotoLocally } from '../../services/imageProcessor';
import { encryptBinaryData, encryptJsonMetadata, generateAlbumKey } from '../../crypto/vaultCrypto';
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
  Sun,
  Moon,
  Plus,
  UploadCloud,
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
  onOpenSlotUpload?: (slotIndex: number) => void;
  isMonochrome?: boolean;
  orientationFilter: 'all' | 'landscape' | 'portrait';
  currentMode: ViewMode3D;
  onSelectMode: (mode: ViewMode3D) => void;
  onToggleMonochrome?: () => void;
  onSetOrientationFilter?: (filter: 'all' | 'landscape' | 'portrait') => void;
  isDrawerOpen?: boolean;
}

interface SphereSlot {
  idx: number;
  rotY: number;
  rotX: number;
  lat: number;
  col: number;
}

/**
 * Generates an authentic running-bond geodesic spherical grid.
 * - 'all' (108 slots): 6 balanced rings (-35° to +35°) with running-bond staggered masonry.
 * - 'portrait' (54 slots): 3 balanced rings (-24°, 0°, +24°) with 18 columns each = 54 slots.
 *   Even 20° column spacing eliminates giant canyons and creates large, glorious vertical cards.
 * - 'landscape' (54 slots): 5 balanced rings (9, 12, 12, 12, 9 cols = 54 slots) with 30° equator
 *   spacing and snug widescreen proportions.
 */
function generateSphereGrid(orientation: 'all' | 'landscape' | 'portrait' = 'all'): SphereSlot[] {
  const slots: SphereSlot[] = [];
  let idx = 0;

  let ringConfigs: { lat: number; cols: number; shift: number }[];

  if (orientation === 'portrait') {
    // Dedicated 54-slot Portrait Sphere: 3 rings x 18 cols = 54 slots
    // 24° latitude step provides generous vertical clearance preventing card collisions
    ringConfigs = [
      { lat: -24, cols: 18, shift: 0.0 },
      { lat:   0, cols: 18, shift: 0.5 },
      { lat:  24, cols: 18, shift: 0.0 },
    ];
  } else if (orientation === 'landscape') {
    // Dedicated 54-slot Landscape Sphere: 5 balanced rings (9 + 12 + 12 + 12 + 9 = 54)
    // Snug, widescreen cinematic cards with tight ~12px to 15px gaps
    ringConfigs = [
      { lat: -28, cols:  9, shift: 0.0 },
      { lat: -14, cols: 12, shift: 0.5 },
      { lat:   0, cols: 12, shift: 0.0 },
      { lat:  14, cols: 12, shift: 0.5 },
      { lat:  28, cols:  9, shift: 0.0 },
    ];
  } else {
    // 108 slots for 'all' mosaic: 6 rings x (12, 18, 24, 24, 18, 12) = 108 slots
    ringConfigs = [
      { lat: -35, cols: 12, shift: 0.0 },
      { lat: -21, cols: 18, shift: 0.5 },
      { lat:  -7, cols: 24, shift: 0.0 },
      { lat:   7, cols: 24, shift: 0.5 },
      { lat:  21, cols: 18, shift: 0.0 },
      { lat:  35, cols: 12, shift: 0.5 },
    ];
  }

  for (const ring of ringConfigs) {
    const colStep = 360 / ring.cols;

    for (let c = 0; c < ring.cols; c++) {
      const rotY = Number((c * colStep + ring.shift * colStep).toFixed(2));
      const rotX = ring.lat;

      slots.push({
        idx: idx++,
        rotY,
        rotX,
        lat: ring.lat,
        col: c,
      });
    }
  }

  return slots;
}

const DEFAULT_SPHERE_SLOTS = generateSphereGrid('all');

export function MyOrbDome({
  photos,
  onOpenPhotoDetail,
  onOpenSlotUpload,
  isMonochrome = false,
  orientationFilter,
  currentMode,
  onSelectMode,
  onToggleMonochrome,
  onSetOrientationFilter,
  isDrawerOpen = false,
}: MyOrbDomeProps) {
  // Dynamic slot ring lattice: adapts between 108 slots (all) and 54 slots (portrait/landscape)
  const currentSlots = useMemo(() => {
    return generateSphereGrid(orientationFilter);
  }, [orientationFilter]);

  // Screen and Sphere Dimensions - Responsive edge-to-edge with prominent, large card presence
  const [radius, setRadius] = useState<number>(() => {
    if (typeof window === 'undefined') return 880;
    if (window.innerWidth < 640) {
      return Math.max(480, Math.min(window.innerHeight * 0.68, 580));
    }
    return Math.max(700, Math.min(window.innerWidth * 0.66, window.innerHeight * 1.08));
  });

  // Responsive dynamic radius on resize
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 640;
      const targetRadius = isMobile
        ? Math.max(480, Math.min(window.innerHeight * 0.68, 580))
        : Math.max(700, Math.min(window.innerWidth * 0.66, window.innerHeight * 1.08));
      setRadius(targetRadius);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 3D Perspective Stage Ref
  const stageRef = useRef<HTMLDivElement>(null);

  // Non-passive wheel zoom listener (eliminates Chrome preventDefault passive listener warnings)
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setRadius((prev) => {
        const next = prev - e.deltaY * 0.8;
        return Math.max(460, Math.min(1400, next));
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

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


  const { activeGlobeId, globes } = useVaultStore();
  const activeGlobe = globes.find((g) => g.id === activeGlobeId) || globes[0];

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

  // Map each slot to its photo without ANY duplicates or modulo wrapping
  const globePhotosBySlot = useMemo(() => {
    const map: Record<number, Photo> = {};
    const unslotted: Photo[] = [];

    // Filter photos belonging to this active globe
    const globePhotos = visiblePhotos.filter(
      (p) => p.globeId === activeGlobe.id || (!p.globeId && activeGlobe.id === 'globe_main')
    );

    const slotCount = currentSlots.length;

    if (orientationFilter === 'all') {
      globePhotos.forEach((photo) => {
        if (
          typeof photo.slotIndex === 'number' &&
          photo.slotIndex >= 0 &&
          photo.slotIndex < slotCount &&
          !map[photo.slotIndex]
        ) {
          map[photo.slotIndex] = photo;
        } else {
          unslotted.push(photo);
        }
      });

      // Fill remaining vacant slots with unslotted photos in order (one per slot, ZERO duplicates!)
      let unslottedIdx = 0;
      for (let s = 0; s < slotCount && unslottedIdx < unslotted.length; s++) {
        if (!map[s]) {
          map[s] = unslotted[unslottedIdx++];
        }
      }
    } else {
      // In dedicated Portrait or Landscape view:
      // Map photos continuously across the active 54 slots so the sphere is dense with zero empty holes
      globePhotos.forEach((photo, idx) => {
        if (idx < slotCount) {
          map[idx] = photo;
        }
      });
    }

    return map;
  }, [visiblePhotos, activeGlobe.id, currentSlots.length, orientationFilter]);

  const focusedPhoto = useMemo(() => {
    if (focusedSlotIdx === null) return null;
    const mappedIndex =
      slotMapping[focusedSlotIdx] !== undefined ? slotMapping[focusedSlotIdx] : focusedSlotIdx;
    return globePhotosBySlot[mappedIndex] || null;
  }, [focusedSlotIdx, slotMapping, globePhotosBySlot]);

  // Direct desktop drag-and-drop onto empty slot
  const handleFileDropOnSlot = async (file: File, slotIdx: number) => {
    try {
      vaultAudio.playWhoosh();
      const processed = await processPhotoLocally(file);
      const key = useVaultStore.getState().masterVaultKey || (await generateAlbumKey());
      const originalBuffer = await processed.originalBlob.arrayBuffer();
      const thumbBuffer = await processed.thumbBlob.arrayBuffer();
      const encOriginal = await encryptBinaryData(originalBuffer, key);
      const encThumb = await encryptBinaryData(thumbBuffer, key);
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

      const finalMeta: PhotoMetadata = {
        title: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
        captureDate: new Date().toISOString().split('T')[0],
        photographer: useVaultStore.getState().currentMember.displayName,
        tags: ['uploaded', 'globe'],
      };

      const encMeta = await encryptJsonMetadata(finalMeta, key);
      const isPortrait = processed.height > processed.width;
      const originalUrl = URL.createObjectURL(processed.originalBlob);
      const thumbUrl = URL.createObjectURL(processed.thumbBlob);

      const newPhoto: Photo = {
        id: `pho_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        familyId: useVaultStore.getState().currentFamily.id,
        albumId: 'alb_heritage',
        globeId: activeGlobe.id,
        slotIndex: slotIdx,
        uploaderId: useVaultStore.getState().currentMember.id,
        uploaderName: useVaultStore.getState().currentMember.displayName,
        storagePath: originalUrl,
        thumbStoragePath: thumbUrl,
        decryptedFullUrl: originalUrl,
        decryptedThumbUrl: thumbUrl,
        fileSizeBytes: processed.originalSizeBytes,
        thumbSizeBytes: processed.thumbSizeBytes,
        mimeType: file.type || 'image/jpeg',
        width: processed.width,
        height: processed.height,
        orientation: isPortrait ? 'portrait' : 'landscape',
        ivHex: encOriginal.ivHex,
        thumbIvHex: encThumb.ivHex,
        metadata: finalMeta,
        encryptedMetadataPayload: encMeta.ciphertextHex,
        isFavorite: false,
        inTrash: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      useVaultStore.getState().addPhotoToSlot(newPhoto, slotIdx, activeGlobe.id);
    } catch (err) {
      console.error('Failed to process dropped image on slot:', err);
    }
  };

  const handleFocusSlot = (slotIdx: number) => {
    vaultAudio.playWhoosh();
    if (focusedSlotIdx === slotIdx) {
      setFocusedSlotIdx(null);
      setIsAutoRotating(true);
      return;
    }
    const targetSlot = currentSlots.find((s) => s.idx === slotIdx);
    if (!targetSlot) return;

    setFocusedSlotIdx(slotIdx);
    setIsAutoRotating(false);

    // Directly rotate the sphere to bring card front and center:
    setRotY(-targetSlot.rotY);
    setRotX(targetSlot.rotX);
  };

  const handlePrevSlot = () => {
    vaultAudio.playWhoosh();
    const current = focusedSlotIdx ?? 0;
    const nextIdx = (current - 1 + currentSlots.length) % currentSlots.length;
    handleFocusSlot(nextIdx);
  };

  const handleNextSlot = () => {
    vaultAudio.playWhoosh();
    const current = focusedSlotIdx ?? 0;
    const nextIdx = (current + 1) % currentSlots.length;
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
          setRotX((prev) => Math.max(-78, Math.min(78, prev + velocityRef.current.vy)));
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
    const newRotX = Math.max(-78, Math.min(78, pointerStartRef.current.rotX - dy * rotSensitivity));

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
    const slots = Array.from({ length: currentSlots.length }, (_, i) => i);
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
        ref={stageRef}
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
      >
        {/* Rotating 3D Sphere Core */}
        <div
          className="sphere-rotator"
          style={{
            transform: `translateY(${typeof window !== 'undefined' && window.innerWidth < 640 ? '16px' : '0px'}) translateZ(calc(var(--radius) * -1 + ${
              focusedSlotIdx !== null ? 'var(--radius) * 0.58' : '0px'
            })) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
            transition: isPointerDownRef.current ? 'none' : 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {currentSlots.map((slot) => {
            const mappedIndex =
              slotMapping[slot.idx] !== undefined ? slotMapping[slot.idx] : slot.idx;
            const photo = globePhotosBySlot[mappedIndex] || null;

            const isDropTarget = dragOverSlot === slot.idx;
            const isBeingDragged = draggedSlot === slot.idx;
            const isPortrait = photo
              ? photo.height > photo.width || photo.orientation === 'portrait'
              : orientationFilter === 'portrait'
              ? true
              : orientationFilter === 'landscape'
              ? false
              : slot.lat % 2 !== 0;

            let itemWidth: string;
            let itemHeight: string;

            if (orientationFilter === 'all') {
              // Geodesic 108-slot mosaic: calibrated heights strictly stay below 14° latitude step (0.244R)
              itemWidth = isPortrait
                ? 'calc(var(--radius) * 0.145)'
                : 'calc(var(--radius) * 0.240)';
              itemHeight = isPortrait
                ? 'calc(var(--radius) * 0.210)'
                : 'calc(var(--radius) * 0.145)';
            } else if (orientationFilter === 'portrait') {
              // Dedicated 54-slot Portrait Sphere: 3 rings, 18 cols with 24° step (0.419R)
              // Height 0.360R gives generous ~0.059R (~50px) vertical clearance, eliminating collision
              itemWidth = 'calc(var(--radius) * 0.220)';
              itemHeight = 'calc(var(--radius) * 0.360)';
            } else {
              // Dedicated 54-slot Landscape Sphere: 5 rings, 14° step (0.244R)
              // Height 0.200R gives ~0.044R clearance with elegant 16:9 widescreen framing
              itemWidth = 'calc(var(--radius) * 0.360)';
              itemHeight = 'calc(var(--radius) * 0.200)';
            }

            return (
              <div
                key={`slot_${slot.idx}`}
                className="sphere-item"
                style={
                  {
                    width: itemWidth,
                    height: itemHeight,
                    transform: `rotateY(${slot.rotY}deg) rotateX(${slot.rotX}deg) translateZ(var(--radius))`,
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
                  setDragOverSlot(null);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFileDropOnSlot(e.dataTransfer.files[0], slot.idx);
                  } else if (draggedSlot !== null) {
                    handleSwapSlots(draggedSlot, slot.idx);
                  }
                  setDraggedSlot(null);
                }}
              >
                {photo ? (
                  /* Filled Memory Card */
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
                      useVaultStore.getState().setHoveredPhotoId(photo.id);
                    }}
                    onMouseLeave={() => {
                      useVaultStore.getState().setHoveredPhotoId(null);
                    }}
                    className={`sphere-item-card group relative w-full h-full rounded-[var(--tile-radius)] overflow-hidden cursor-pointer transition-all duration-300 active:scale-95 active:brightness-110 ${
                      focusedSlotIdx === slot.idx
                        ? 'ring-2 ring-vault-gold shadow-glow z-40'
                        : isDropTarget
                        ? 'ring-2 ring-vault-gold shadow-glow'
                        : 'hover:border-vault-gold/80 hover:shadow-[0_0_25px_rgba(229,192,123,0.45),0_16px_40px_rgba(0,0,0,0.95)]'
                    }`}
                    style={{
                      filter: isMonochrome ? 'grayscale(100%) contrast(1.15)' : 'none',
                      backgroundImage: `url(${getInstantProceduralDataUrl(photo.id, isPortrait)})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    {/* Live Image Texture */}
                    <img
                      src={photo.decryptedThumbUrl || photo.thumbStoragePath}
                      alt={photo.metadata.title}
                      loading="eager"
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

                    {/* Obsidian & Atelier Glass Gradient Overlays - Distinct rows, ZERO text collisions */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none flex flex-col justify-end p-2 sm:p-2.5 gap-0.5 sm:gap-1 overflow-hidden z-20">
                      <div
                        className="text-white text-[11px] sm:text-xs font-serif font-bold leading-tight truncate drop-shadow-md w-full block"
                        title={photo.metadata.title}
                      >
                        {photo.metadata.title}
                      </div>
                      {photo.metadata.location?.label && (
                        <div className="text-[9px] sm:text-[10px] text-vault-gold flex items-center gap-1 drop-shadow-md font-sans leading-tight min-w-0 w-full">
                          <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0 text-vault-gold" />
                          <span className="truncate" title={photo.metadata.location.label}>
                            {photo.metadata.location.label}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Subtle Golden Inner Border */}
                    <div className="absolute inset-0 border border-black/10 dark:border-white/10 group-hover:border-vault-gold/60 rounded-[var(--tile-radius)] pointer-events-none transition-colors duration-300" />
                  </div>
                ) : (
                  /* Elegant Empty Memory Placeholder Card */
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isDraggingGlobeRef.current) return;
                      vaultAudio.playWhoosh();
                      onOpenSlotUpload?.(slot.idx);
                    }}
                    onMouseEnter={() => {
                      vaultAudio.playHoverChime();
                    }}
                    title={`Slot #${slot.idx + 1} — Click or drop image to add memory`}
                    className={`sphere-item-card group relative w-full h-full rounded-[var(--tile-radius)] overflow-hidden cursor-pointer transition-all duration-300 border border-dashed flex flex-col items-center justify-center p-2 text-center select-none backdrop-blur-md ${
                      focusedSlotIdx === slot.idx
                        ? 'border-vault-gold bg-vault-gold/25 shadow-glow ring-2 ring-vault-gold z-40'
                        : isDropTarget
                        ? 'border-vault-gold bg-vault-gold/30 shadow-glow scale-105'
                        : 'border-vault-gold/40 hover:border-vault-gold/90 bg-stone-900/35 dark:bg-vault-gold/[0.04] hover:bg-vault-gold/[0.12] hover:shadow-[0_0_20px_rgba(229,192,123,0.3)] shadow-[inset_0_0_15px_rgba(229,192,123,0.05)]'
                    }`}
                  >
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-vault-gold/15 border border-vault-gold/40 flex items-center justify-center text-vault-gold group-hover:scale-110 group-hover:bg-vault-gold group-hover:text-black transition-all shadow-sm mb-1">
                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform group-hover:rotate-90 duration-300" />
                    </div>
                    <span className="text-[8px] sm:text-[9px] font-mono text-stone-400 dark:text-slate-400 group-hover:text-vault-gold font-bold">
                      #{slot.idx + 1}
                    </span>
                    <span className="text-[7px] sm:text-[8px] text-vault-gold/90 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider font-bold">
                      + Add Photo
                    </span>
                  </div>
                )}
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

      {/* FLOATING CONTROLS MATCHING MYORB.LIVE (Only shown during Orbit overview and when drawer is closed) */}
      {focusedSlotIdx === null && !isDrawerOpen && (
        <>

          {/* Bottom Center Floating Luxury Pill (Mobile-Optimized & Centered) */}
          <nav className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-full bg-white/85 dark:bg-black/75 backdrop-blur-2xl border border-black/10 dark:border-white/10 shadow-2xl max-w-[94vw] overflow-x-auto pb-safe">
            {/* Play / Pause Toggle (Always accessible in dock) */}
            <button
              onClick={() => {
                vaultAudio.playWhoosh();
                setIsAutoRotating((prev) => !prev);
              }}
              aria-label={isAutoRotating ? 'Pause Orbit' : 'Play Orbit'}
              title={isAutoRotating ? 'Pause Orbit' : 'Play Orbit'}
              className="p-2 sm:p-2.5 rounded-full text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              {isAutoRotating ? <Pause className="w-3.5 sm:w-4 h-3.5 sm:h-4 fill-current" /> : <Play className="w-3.5 sm:w-4 h-3.5 sm:h-4 fill-current ml-0.5" />}
            </button>

            {/* Reset View */}
            <button
              onClick={resetView}
              title="Reset Orbit Center"
              className="p-2 sm:p-2.5 rounded-full text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </button>

            {/* Shuffle Positions */}
            <button
              onClick={handleShuffleGlobe}
              title="Shuffle Memory Positions"
              className="p-2 sm:p-2.5 rounded-full text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
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
                    : 'text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                <Grid className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              </button>

              {/* 3D Modes Dropdown Popup */}
              {isModeMenuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-[#0c0e17]/95 border border-black/10 dark:border-white/15 rounded-2xl p-2 shadow-2xl backdrop-blur-2xl w-48 flex flex-col gap-1 z-[80] animate-in fade-in zoom-in-95"
                >
                  <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 px-2 py-1 tracking-wider border-b border-black/10 dark:border-white/10 mb-1">
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
                          : 'text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Light / Dark Mode Toggle Button */}
            <button
              onClick={() => {
                vaultAudio.playWhoosh();
                useVaultStore.getState().toggleTheme();
              }}
              title={useVaultStore.getState().theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Light / Dark Mode"
              className="p-2 sm:p-2.5 rounded-full text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              {useVaultStore.getState().theme === 'dark' ? (
                <Sun className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-amber-400 hover:text-amber-300 transition-colors" />
              ) : (
                <Moon className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-indigo-600 hover:text-indigo-700 transition-colors" />
              )}
            </button>

            {/* Leica B&W Toggle */}
            {onToggleMonochrome && (
              <button
                onClick={onToggleMonochrome}
                title={isMonochrome ? 'Switch to Color' : 'Switch to Monochrome Leica'}
                className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs font-sans transition-all flex items-center gap-1.5 border-l border-black/10 dark:border-white/10 ml-0.5 sm:ml-1 ${
                  isMonochrome
                    ? 'bg-black text-white dark:bg-white dark:text-black font-bold shadow-md'
                    : 'text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
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
