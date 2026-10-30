import { useState, useRef, useMemo, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useVaultStore } from '../../stores/useVaultStore';
import { MyOrbDome } from './MyOrbDome';
import { PhotoCard3D } from './PhotoCard3D';
import { ParticleStarfield } from './ParticleStarfield';
import { getLayoutTransform, type LayoutTransform } from './layouts/layoutCalculators';
import { vaultAudio } from '../../services/audioSynthesizer';
import type { ViewMode3D, Photo } from '../../types';
import type { NavigationTab } from '../layout/Navbar';
import {
  Globe,
  Columns3,
  Sparkles,
  Layers,
  Compass,
  LayoutGrid,
  Building,
  GitCommit,
  Maximize2,
  Minimize2,
  RotateCcw,
  Shuffle,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Zap,
  Eye,
  SlidersHorizontal,
  Grid,
  MapPin,
  Folder,
  HardDrive,
  Activity,
  Users,
  Archive,
  Lock,
  UploadCloud,
  Search,
  X,
  Menu,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
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

const TOTAL_GLOBE_SLOTS = 108; // Dense spherical photo lattice matching myorb.live

interface UniverseCameraControllerProps {
  focusedSlotIndex: number | null;
  targetTransform: LayoutTransform | null;
  isInsideOrb: boolean;
  isAutoRotating: boolean;
  isExploded: boolean;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}

function UniverseCameraController({
  focusedSlotIndex,
  targetTransform,
  isInsideOrb,
  isAutoRotating,
  isExploded,
  controlsRef,
}: UniverseCameraControllerProps) {
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    isTransitioningRef.current = true;
    const timer = setTimeout(() => {
      isTransitioningRef.current = false;
    }, 1200);
    return () => clearTimeout(timer);
  }, [focusedSlotIndex, isInsideOrb]);

  useFrame((state, delta) => {
    if (!controlsRef.current) return;
    const lerpSpeed = Math.min(delta * 4.5, 1);

    if (focusedSlotIndex !== null && targetTransform) {
      // Focus directly onto the target card (2.8 units in front along normal)
      const [tx, ty, tz] = targetTransform.position;
      const [nx, ny, nz] = targetTransform.normal;

      const targetCamPos = new THREE.Vector3(
        tx + nx * 2.8,
        ty + ny * 2.8,
        tz + nz * 2.8
      );
      const targetLookAt = new THREE.Vector3(tx, ty, tz);

      state.camera.position.lerp(targetCamPos, lerpSpeed);
      controlsRef.current.target.lerp(targetLookAt, lerpSpeed);
      controlsRef.current.minDistance = 0.5;
      controlsRef.current.maxDistance = 8.0;
      controlsRef.current.update();
    } else if (isTransitioningRef.current) {
      if (isInsideOrb) {
        state.camera.position.lerp(new THREE.Vector3(0, 0, 0.2), lerpSpeed);
        controlsRef.current.target.lerp(new THREE.Vector3(0, 0, -1), lerpSpeed);
        controlsRef.current.minDistance = 0.05;
        controlsRef.current.maxDistance = 5;
      } else {
        state.camera.position.lerp(new THREE.Vector3(0, 0, 21.5), lerpSpeed);
        controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), lerpSpeed);
        controlsRef.current.minDistance = 1.0;
        controlsRef.current.maxDistance = 35;
      }
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      target={[0, 0, 0]}
      autoRotate={isAutoRotating && !isExploded && focusedSlotIndex === null}
      autoRotateSpeed={0.35}
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={0.7}
      panSpeed={0.5}
      minDistance={focusedSlotIndex !== null ? 0.5 : isInsideOrb ? 0.05 : 1.0}
      maxDistance={focusedSlotIndex !== null ? 8.0 : isInsideOrb ? 5 : 35}
    />
  );
}

interface MemoryUniverseProps {
  onOpenPhotoDetail: (id: string) => void;
  onNavigateTab?: (tab: NavigationTab) => void;
  onOpenUpload?: () => void;
  onOpenLockModal?: () => void;
}

export function MemoryUniverse({
  onOpenPhotoDetail,
  onNavigateTab,
  onOpenUpload,
  onOpenLockModal,
}: MemoryUniverseProps) {
  const {
    photos,
    viewMode3D,
    setViewMode3D,
    selectedPhotoId,
    setSelectedPhotoId,
    hoveredPhotoId,
    setHoveredPhotoId,
    activeAlbumId,
    searchQuery,
    setSearchQuery,
    selectedTag,
    onlyFavorites,
    setIsSlideshowActive,
    currentFamily,
    orientationFilter,
    setOrientationFilter,
  } = useVaultStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isExploded, setIsExploded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isMonochrome, setIsMonochrome] = useState(false); // Leica B&W toggle matching myorb.live
  const [isInsideOrb, setIsInsideOrb] = useState(false); // 360 Panorama from inside sphere
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // Luxury slide-out navigation
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // In-Universe 3D Camera Flight Focus (Dive-Inside Memory)
  const [focusedSlotIndex, setFocusedSlotIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Filtered photos based on album, search, and orientation
  const visiblePhotos = useMemo(() => {
    return photos.filter((p) => {
      if (p.inTrash) return false;
      if (activeAlbumId && p.albumId !== activeAlbumId) return false;
      if (onlyFavorites && !p.isFavorite) return false;
      if (selectedTag && !p.metadata.tags.includes(selectedTag)) return false;

      const isPortrait = p.height > p.width || p.orientation === 'portrait';
      if (orientationFilter === 'landscape' && isPortrait) return false;
      if (orientationFilter === 'portrait' && !isPortrait) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = p.metadata.title.toLowerCase().includes(q);
        const matchesStory = p.metadata.story?.toLowerCase().includes(q);
        const matchesTags = p.metadata.tags.some((t) => t.toLowerCase().includes(q));
        const matchesLocation = p.metadata.location?.label.toLowerCase().includes(q);
        if (!matchesTitle && !matchesStory && !matchesTags && !matchesLocation) return false;
      }
      return true;
    });
  }, [photos, activeAlbumId, onlyFavorites, selectedTag, searchQuery, orientationFilter]);

  // Interleave landscape and portrait photos when 'all' is selected for true myorb.live mosaic
  const interleavedPhotos = useMemo(() => {
    if (orientationFilter !== 'all') return visiblePhotos;
    const landscapes = visiblePhotos.filter((p) => p.width >= p.height && p.orientation !== 'portrait');
    const portraits = visiblePhotos.filter((p) => p.height > p.width || p.orientation === 'portrait');
    if (landscapes.length === 0) return portraits;
    if (portraits.length === 0) return landscapes;

    const result: typeof visiblePhotos = [];
    const maxLen = Math.max(landscapes.length, portraits.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < landscapes.length) result.push(landscapes[i]);
      if (i < portraits.length) result.push(portraits[i]);
    }
    return result;
  }, [visiblePhotos, orientationFilter]);

  // Dynamic slot permutation map: allows dragging & dropping photos to swap fixed positions
  const [slotMapping, setSlotMapping] = useState<number[]>(() =>
    Array.from({ length: TOTAL_GLOBE_SLOTS }, (_, i) => i)
  );

  useEffect(() => {
    setSlotMapping(Array.from({ length: TOTAL_GLOBE_SLOTS }, (_, i) => i));
  }, [visiblePhotos.length]);

  const focusedPhoto = useMemo(() => {
    if (focusedSlotIndex === null || interleavedPhotos.length === 0) return null;
    const photoIndex = slotMapping[focusedSlotIndex] % interleavedPhotos.length;
    return interleavedPhotos[photoIndex] || null;
  }, [focusedSlotIndex, slotMapping, interleavedPhotos]);

  const focusedTransform = useMemo(() => {
    if (focusedSlotIndex === null) return null;
    return getLayoutTransform(viewMode3D, focusedSlotIndex, TOTAL_GLOBE_SLOTS, isExploded);
  }, [focusedSlotIndex, viewMode3D, isExploded]);

  const handlePrevMemory = () => {
    vaultAudio.playWhoosh();
    setFocusedSlotIndex((prev) => {
      if (prev === null) return 0;
      return (prev - 1 + TOTAL_GLOBE_SLOTS) % TOTAL_GLOBE_SLOTS;
    });
  };

  const handleNextMemory = () => {
    vaultAudio.playWhoosh();
    setFocusedSlotIndex((prev) => {
      if (prev === null) return 0;
      return (prev + 1) % TOTAL_GLOBE_SLOTS;
    });
  };

  // Centralized texture preloading map so all 108 cards render instantly
  const [textures, setTextures] = useState<Record<string, THREE.Texture>>({});

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    visiblePhotos.forEach((photo) => {
      const url = photo.decryptedThumbUrl || photo.thumbStoragePath;
      if (!url || textures[url]) return;

      loader.load(
        url,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.generateMipmaps = false;
          setTextures((prev) => ({ ...prev, [url]: tex }));
        },
        undefined,
        (err) => console.warn('Texture load fallback:', url, err)
      );
    });
  }, [visiblePhotos]);

  const handleSwapSlots = (sourceSlot: number, targetSlot: number) => {
    setSlotMapping((prev) => {
      const next = [...prev];
      const temp = next[sourceSlot];
      next[sourceSlot] = next[targetSlot];
      next[targetSlot] = temp;
      return next;
    });
  };

  const handleShuffleGlobe = () => {
    vaultAudio.playWhoosh();
    setSlotMapping((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
  };

  const handleToggleExplode = () => {
    vaultAudio.playWhoosh();
    setIsExploded((prev) => !prev);
  };

  const handleToggleInsideOrb = () => {
    vaultAudio.playWhoosh();
    setFocusedSlotIndex(null);
    const nextInside = !isInsideOrb;
    setIsInsideOrb(nextInside);
    if (controlsRef.current) {
      if (nextInside) {
        controlsRef.current.object.position.set(0, 0, 0.2);
        controlsRef.current.target.set(0, 0, -1);
        controlsRef.current.minDistance = 0.05;
        controlsRef.current.maxDistance = 5;
      } else {
        controlsRef.current.object.position.set(0, 0, 21.5);
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.minDistance = 1.0;
        controlsRef.current.maxDistance = 35;
      }
      controlsRef.current.update();
    }
  };

  const handleToggleAudio = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    vaultAudio.setMuted(nextMuted);
  };

  const handleResetCamera = () => {
    vaultAudio.playWhoosh();
    setFocusedSlotIndex(null);
    setIsInsideOrb(false);
    if (controlsRef.current) {
      controlsRef.current.object.position.set(0, 0, 21.5);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.minDistance = 1.0;
      controlsRef.current.maxDistance = 35;
      controlsRef.current.update();
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.warn(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch((err) => console.warn(err));
      setIsFullscreen(false);
    }
  };

  const hoveredPhoto = useMemo(() => {
    return photos.find((p) => p.id === hoveredPhotoId) || null;
  }, [photos, hoveredPhotoId]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-screen h-screen bg-[#040508] overflow-hidden select-none z-0"
      style={{ width: '100vw', height: '100vh' }}
    >
      {/* Primary Display Mode: Authentic myorb.live CSS 3D Dome for 'orb', or WebGL Canvas for other 3D modes */}
      {viewMode3D === 'orb' ? (
        <MyOrbDome
          photos={photos}
          onOpenPhotoDetail={onOpenPhotoDetail}
          isMonochrome={isMonochrome}
          orientationFilter={orientationFilter}
          currentMode={viewMode3D}
          onSelectMode={(mode) => setViewMode3D(mode)}
          onToggleMonochrome={() => setIsMonochrome(!isMonochrome)}
          onSetOrientationFilter={(f) => setOrientationFilter(f)}
        />
      ) : (
        /* 3D WebGL Canvas for alternative universe modes (IMAX Wall, Galaxy, DNA Helix, Tunnel, Matrix, Museum, Constellation) */
        <Canvas
          onPointerMissed={() => {
            if (focusedSlotIndex !== null) {
              vaultAudio.playWhoosh();
              setFocusedSlotIndex(null);
            }
          }}
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
          camera={{ position: [0, 0, 21.5], fov: 55, near: 0.1, far: 1000 }}
          dpr={[1, 2]}
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
            alpha: false,
          }}
        >
          <color attach="background" args={['#040508']} />
          <ambientLight intensity={1.2} />
          <directionalLight position={[18, 22, 24]} intensity={1.5} color="#FFFFFF" />
          <directionalLight position={[-18, -15, -12]} intensity={0.6} color="#E5C07B" />
          <pointLight position={[0, 0, 0]} intensity={1.0} color="#8B5CF6" />

          <Suspense fallback={null}>
            <ParticleStarfield count={1200} />

            {/* Densely Populated 3D Globe Lattice */}
            <group position={[0, 0, 0]}>
              {interleavedPhotos.length > 0 &&
                Array.from({ length: TOTAL_GLOBE_SLOTS }).map((_, slotIndex) => {
                  const photoIndex = slotMapping[slotIndex] % interleavedPhotos.length;
                  const photo = interleavedPhotos[photoIndex];
                  const transform = getLayoutTransform(
                    viewMode3D,
                    slotIndex,
                    TOTAL_GLOBE_SLOTS,
                    isExploded
                  );
                  const url = photo.decryptedThumbUrl || photo.thumbStoragePath;
                  const cardTexture = textures[url] || null;

                  return (
                    <PhotoCard3D
                      key={`${photo.id}_slot_${slotIndex}`}
                      slotIndex={slotIndex}
                      photo={photo}
                      texture={cardTexture}
                      targetTransform={transform}
                      isSelected={focusedSlotIndex === slotIndex}
                      isHovered={hoveredPhotoId === photo.id}
                      isMonochrome={isMonochrome}
                      onSelect={() => {
                        vaultAudio.playWhoosh();
                        onOpenPhotoDetail(photo.id);
                      }}
                      onHover={(id) => setHoveredPhotoId(id)}
                      onSwapSlots={handleSwapSlots}
                    />
                  );
                })}
            </group>
          </Suspense>

          <UniverseCameraController
            focusedSlotIndex={focusedSlotIndex}
            targetTransform={focusedTransform}
            isInsideOrb={isInsideOrb}
            isAutoRotating={isAutoRotating}
            isExploded={isExploded}
            controlsRef={controlsRef}
          />
        </Canvas>
      )}

      {/* ULTRA-MINIMAL LUXURY HUD */}

      {/* Top Left: Editorial Brand Monogram */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 flex items-center gap-2 sm:gap-3">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-serif tracking-[0.2em] sm:tracking-[0.35em] text-sm sm:text-lg font-normal text-white uppercase">
              MYORB
            </span>
            <span className="text-[8px] sm:text-[9px] tracking-[0.15em] sm:tracking-[0.25em] uppercase text-vault-gold font-mono border-l border-white/20 pl-1.5 sm:pl-2">
              VAULT
            </span>
          </div>
          <span className="hidden sm:block text-[11px] tracking-wider text-slate-400 font-sans mt-0.5">
            {currentFamily.name}
          </span>
        </div>
      </div>

      {/* Top Center: Separate Landscape & Portrait Memory Mode (MyOrb Mosaic) */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 hidden md:flex items-center bg-black/60 backdrop-blur-2xl border border-white/10 rounded-full p-1 shadow-2xl">
        <button
          onClick={() => {
            vaultAudio.playWhoosh();
            setOrientationFilter('all');
          }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-sans transition-all flex items-center gap-1.5 ${
            orientationFilter === 'all'
              ? 'bg-vault-gold text-black font-bold shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
          }`}
          title="All Memories (Interleaved Mosaic)"
        >
          <span>✦ All Memories</span>
          <span className="text-[10px] opacity-80 font-mono px-1 py-0.2 rounded bg-black/20">108</span>
        </button>

        <button
          onClick={() => {
            vaultAudio.playWhoosh();
            setOrientationFilter('landscape');
          }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-sans transition-all flex items-center gap-1.5 ${
            orientationFilter === 'landscape'
              ? 'bg-vault-gold text-black font-bold shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
          }`}
          title="Filter Landscape Widescreen Memories"
        >
          <span className="text-sm leading-none">▱</span>
          <span>Landscape</span>
        </button>

        <button
          onClick={() => {
            vaultAudio.playWhoosh();
            setOrientationFilter('portrait');
          }}
          className={`px-3.5 py-1.5 rounded-full text-xs font-sans transition-all flex items-center gap-1.5 ${
            orientationFilter === 'portrait'
              ? 'bg-vault-gold text-black font-bold shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
          }`}
          title="Filter Portrait Vertical Memories"
        >
          <span className="text-sm leading-none">▯</span>
          <span>Portrait</span>
        </button>
      </div>

      {/* Top Right: Minimal Luxury Controls */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-1.5 sm:gap-2.5">
        {/* Quick Search Button */}
        <button
          onClick={() => setIsSearchOpen(true)}
          title="Search Memories"
          className="p-2 sm:p-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white backdrop-blur-xl transition-all"
        >
          <Search className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
        </button>

        {/* Leica B&W / Color Filter Toggle */}
        <button
          onClick={() => setIsMonochrome(!isMonochrome)}
          title={isMonochrome ? 'Switch to Color Mode' : 'Switch to Leica B&W Mode'}
          className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border text-[11px] sm:text-xs font-medium tracking-wide backdrop-blur-xl transition-all flex items-center gap-1.5 ${
            isMonochrome
              ? 'bg-white text-black border-white shadow-lg'
              : 'bg-white/[0.04] text-slate-300 border-white/10 hover:text-white hover:bg-white/[0.08]'
          }`}
        >
          <SlidersHorizontal className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
          <span className="hidden sm:inline">{isMonochrome ? 'Monochrome' : 'Color'}</span>
        </button>

        {/* Audio Ambient Chimes Toggle (hidden on mobile, accessible via drawer) */}
        <button
          onClick={handleToggleAudio}
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          className={`hidden sm:flex p-2.5 rounded-full border text-slate-300 backdrop-blur-xl transition-all ${
            isMuted
              ? 'bg-white/[0.02] border-white/5 text-slate-600'
              : 'bg-white/[0.04] border-white/10 hover:text-white hover:bg-white/[0.08]'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* True Fullscreen Toggle (hidden on mobile) */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          className="hidden sm:flex p-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-slate-300 hover:text-white backdrop-blur-xl transition-all"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Slide-out Menu Hamburger Toggle (Icon matching myorb.live) */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          title="Open Vault Menu"
          className="p-2 sm:p-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-white backdrop-blur-xl transition-all shadow-lg"
        >
          <Menu className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
        </button>
      </div>

      {/* IN-UNIVERSE 3D FOCUS CONTROLLER (Dive-Inside Memory) */}
      {viewMode3D !== 'orb' && focusedSlotIndex !== null && focusedPhoto && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto">
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
              onClick={handlePrevMemory}
              className="px-3 py-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white text-xs font-sans flex items-center gap-1 transition-all"
              title="Previous Memory in Orbit"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            <button
              onClick={() => {
                vaultAudio.playWhoosh();
                setFocusedSlotIndex(null);
              }}
              className="px-4 py-1.5 rounded-full bg-vault-gold text-black font-semibold text-xs font-sans flex items-center gap-1.5 shadow-lg hover:brightness-110 transition-all"
              title="Fly Out to Full Universe Orbit"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Fly Out (Orbit)</span>
            </button>

            <button
              onClick={handleNextMemory}
              className="px-3 py-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white text-xs font-sans flex items-center gap-1 transition-all"
              title="Next Memory in Orbit"
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

      {/* FLOATING BOTTOM DOCK for Alternative 3D Modes (IMAX Wall, Galaxy, Tunnel, etc.) */}
      {viewMode3D !== 'orb' && focusedSlotIndex === null && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-[#0A0D15]/80 backdrop-blur-2xl border border-white/10 p-1.5 rounded-full flex items-center gap-1 shadow-2xl">
            {/* Reset Camera View */}
            <button
              onClick={handleResetCamera}
              title="Reset Center View"
              className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* 3D Layout Selector Modes */}
            <div className="flex items-center gap-0.5 px-1 border-x border-white/10">
              {MODE_CONFIGS.map(({ mode, label, icon: Icon }) => {
                const isActive = viewMode3D === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => {
                      vaultAudio.playWhoosh();
                      setViewMode3D(mode);
                      if (isExploded) setIsExploded(false);
                    }}
                    title={label}
                    className={`p-2 rounded-full transition-all ${
                      isActive
                        ? 'bg-vault-gold text-black shadow-md'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>

            {/* Shuffle Memory Slots */}
            <button
              onClick={handleShuffleGlobe}
              title="Shuffle Memory Positions"
              className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            {/* Cosmic Gravity Explode */}
            <button
              onClick={handleToggleExplode}
              title={isExploded ? 'Reassemble Globe' : 'Disperse Memories (Cosmic Gravity)'}
              className={`p-2.5 rounded-full transition-all ${
                isExploded
                  ? 'bg-rose-500 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Zap className="w-4 h-4" />
            </button>

            {/* Inside the Globe View (360° Skybox) */}
            <button
              onClick={handleToggleInsideOrb}
              title={isInsideOrb ? 'Exit Inside Sphere' : 'Step Inside Globe (360° Panorama)'}
              className={`p-2.5 rounded-full transition-all ${
                isInsideOrb
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              <Compass className="w-4 h-4" />
            </button>

            {/* Orbit Auto-Rotation Toggle */}
            <button
              onClick={() => setIsAutoRotating(!isAutoRotating)}
              title={isAutoRotating ? 'Pause Orbit' : 'Resume Orbit'}
              className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
            >
              {isAutoRotating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>

            {/* Slideshow Trigger */}
            <button
              onClick={() => setIsSlideshowActive(true)}
              title="Start Slideshow"
              className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
            >
              <Play className="w-4 h-4 text-vault-gold fill-current" />
            </button>
          </div>
        </div>
      )}

      {/* QUICK SEARCH OVERLAY MODAL */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-start justify-center pt-24 px-4 animate-in fade-in">
          <div className="bg-[#0A0D15] border border-white/15 rounded-3xl max-w-lg w-full p-4 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-white/10 pb-3">
              <Search className="w-5 h-5 text-vault-gold" />
              <input
                type="text"
                autoFocus
                placeholder="Search stories, locations, dates, tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-white placeholder-slate-500 text-sm outline-none font-sans"
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="pt-3 text-xs text-slate-400 flex items-center justify-between">
              <span>{visiblePhotos.length} matches found</span>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="text-vault-gold hover:underline"
              >
                Clear Filter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SLIDE-OUT LUXURY NAVIGATION DRAWER */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          {/* Slide-out Panel */}
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-[#080B12]/95 backdrop-blur-2xl border-l border-white/10 p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div>
                  <h3 className="font-serif tracking-[0.25em] text-white text-base font-medium uppercase">
                    MYORB VAULT
                  </h3>
                  <p className="text-xs text-vault-gold tracking-wider mt-0.5 font-sans">
                    {currentFamily.name}
                  </p>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <div className="mt-6 flex flex-col gap-1.5 font-sans">
                {[
                  { tab: 'universe' as NavigationTab, label: '3D Memory Universe', icon: Globe },
                  { tab: 'library' as NavigationTab, label: 'Photo Library', icon: Grid },
                  { tab: 'map' as NavigationTab, label: 'Tamil Nadu Memory Map', icon: MapPin },
                  { tab: 'albums' as NavigationTab, label: 'Albums & Collections', icon: Folder },
                  { tab: 'storage' as NavigationTab, label: 'Storage Quotas', icon: HardDrive },
                  { tab: 'activity' as NavigationTab, label: 'Audit Trail Ledger', icon: Activity },
                  { tab: 'members' as NavigationTab, label: 'Family & Password Access', icon: Users },
                  { tab: 'backups' as NavigationTab, label: 'Backup & Recovery', icon: Archive },
                ].map(({ tab, label, icon: Icon }) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setIsDrawerOpen(false);
                      if (onNavigateTab) onNavigateTab(tab);
                    }}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-all text-left"
                  >
                    <Icon className="w-4 h-4 text-vault-gold" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Actions in Drawer */}
            <div className="border-t border-white/10 pt-4 flex flex-col gap-2 font-sans">
              <div className="grid grid-cols-2 gap-2 mb-1">
                <button
                  onClick={handleToggleAudio}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs border border-white/10 transition-all"
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-vault-gold" />}
                  <span>{isMuted ? 'Muted' : 'Audio On'}</span>
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs border border-white/10 transition-all"
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
                </button>
              </div>

              {onOpenUpload && (
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onOpenUpload();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-semibold tracking-wide shadow-lg transition-all"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Memories</span>
                </button>
              )}

              {onOpenLockModal && (
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    onOpenLockModal();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs transition-all border border-white/10"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Lock Vault</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
