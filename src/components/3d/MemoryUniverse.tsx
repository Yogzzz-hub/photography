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
import { AudioPillWidget } from '../audio/AudioPillWidget';
import { AudioSettingsModal } from '../audio/AudioSettingsModal';
import { StoriesViewerModal, INITIAL_24H_STORIES, type VaultStory } from '../media/StoriesViewerModal';
import { VaultGuideModal } from '../layout/VaultGuideModal';
import { UniversePlanetBar } from './UniversePlanetBar';
import { SolarSystemGalaxy } from './SolarSystemGalaxy';
import { SingleSlotUploadModal } from '../upload/SingleSlotUploadModal';
import { CreatePlanetModal } from '../universe/CreatePlanetModal';
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
  Music,
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
  Plus,
  Search,
  X,
  Menu,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  BookOpen,
  Clock,
  Sun,
  Moon,
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
  onOpenProfile?: () => void;
}

export function MemoryUniverse({
  onOpenPhotoDetail,
  onNavigateTab,
  onOpenUpload,
  onOpenLockModal,
  onOpenProfile,
}: MemoryUniverseProps) {
  const {
    photos,
    albums,
    currentMember,
    lockVault,
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
    theme,
    toggleTheme,
    globes,
    activeGlobeId,
    setActiveGlobeId,
  } = useVaultStore();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCssFullscreen, setIsCssFullscreen] = useState(false);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [isExploded, setIsExploded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isMonochrome, setIsMonochrome] = useState(false); // Leica B&W toggle matching myorb.live
  const [isInsideOrb, setIsInsideOrb] = useState(false); // 360 Panorama from inside sphere
  const [isDrawerOpen, setIsDrawerOpen] = useState(false); // Luxury slide-out navigation
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [stories, setStories] = useState<VaultStory[]>(INITIAL_24H_STORIES);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [selectedSlotForUpload, setSelectedSlotForUpload] = useState<number | null>(null);
  const [isCreatePlanetOpen, setIsCreatePlanetOpen] = useState(false);
  const [viewTier, setViewTier] = useState<'galaxy' | 'dome'>('dome');

  // In-Universe 3D Camera Flight Focus (Dive-Inside Memory)
  const [focusedSlotIndex, setFocusedSlotIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  // Synchronize fullscreen state across native browser events and keyboard (Esc / F11)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const doc = document as any;
      const isCurrentlyFullscreen = Boolean(
        doc.fullscreenElement ||
        doc.webkitFullscreenElement ||
        doc.mozFullScreenElement ||
        doc.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
      if (!isCurrentlyFullscreen) {
        setIsCssFullscreen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (['input', 'textarea'].includes(activeTag)) return;
      if (e.key === 'Escape') {
        setIsCssFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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

  // Photos mapped strictly per slot for active globe - ZERO DUPLICATES
  const globePhotosBySlot = useMemo(() => {
    const activePhotos = photos.filter(
      (p) => !p.inTrash && (p.globeId === activeGlobeId || (!p.globeId && activeGlobeId === 'globe_main'))
    );
    const map: Record<number, Photo> = {};
    activePhotos.forEach((p, idx) => {
      const slot =
        typeof p.slotIndex === 'number' && p.slotIndex >= 0 && p.slotIndex < TOTAL_GLOBE_SLOTS
          ? p.slotIndex
          : idx;
      if (!map[slot]) {
        map[slot] = p;
      }
    });
    return map;
  }, [photos, activeGlobeId]);

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
    const doc = document as any;
    const docEl = (containerRef.current || document.documentElement) as any;
    const isCurrentlyFullscreen = Boolean(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );

    if (!isCurrentlyFullscreen && !isCssFullscreen) {
      // 1. Synchronously execute requestFullscreen FIRST to keep the browser user-gesture activation token intact
      try {
        const reqPromise =
          docEl.requestFullscreen?.() ||
          docEl.webkitRequestFullscreen?.() ||
          docEl.mozRequestFullScreen?.() ||
          docEl.msRequestFullscreen?.();

        if (reqPromise && typeof reqPromise.catch === 'function') {
          reqPromise.catch((err: any) => {
            console.warn('Native requestFullscreen denied, engaging cinematic Zen theater mode:', err);
            setIsCssFullscreen(true);
          });
        }
      } catch (err) {
        console.warn('requestFullscreen synchronous exception, engaging cinematic Zen theater mode:', err);
        setIsCssFullscreen(true);
      }
    } else {
      try {
        if (doc.exitFullscreen && doc.fullscreenElement) {
          doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen && doc.webkitFullscreenElement) {
          doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen && doc.mozFullScreenElement) {
          doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen && doc.msFullscreenElement) {
          doc.msExitFullscreen();
        }
      } catch (err) {
        console.warn('exitFullscreen error:', err);
      } finally {
        setIsCssFullscreen(false);
      }
    }

    // Play whoosh audio asynchronously so AudioContext resume doesn't consume the click activation
    setTimeout(() => {
      vaultAudio.playWhoosh();
    }, 15);
  };

  const hoveredPhoto = useMemo(() => {
    return photos.find((p) => p.id === hoveredPhotoId) || null;
  }, [photos, hoveredPhotoId]);

  const isEffectiveFullscreen = isFullscreen || isCssFullscreen;

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 w-screen h-screen bg-[#F6F5F0] dark:bg-[#040508] text-slate-900 dark:text-white overflow-hidden select-none z-0 transition-colors duration-300 ${
        isCssFullscreen ? 'z-[99999] !w-screen !h-screen' : ''
      }`}
      style={{ width: '100vw', height: '100vh' }}
    >
      {/* Bottom Fluid Gradient Blur Mask (matching wndws.space .filter-blur) */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-28 sm:h-36 z-10 backdrop-blur-xl"
        style={{
          maskImage: 'linear-gradient(to top, black 0%, rgba(0,0,0,0.85) 45%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 0%, rgba(0,0,0,0.85) 45%, transparent 100%)',
        }}
      />

      {/* Primary Display Mode: Solar System Galaxy Overview or Planet Photo Dome */}
      {/* 1. Solar System 3D Galaxy Overview */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          viewTier === 'galaxy' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
        }`}
      >
        <SolarSystemGalaxy
          globes={globes}
          activeGlobeId={activeGlobeId}
          photos={photos}
          onSelectPlanet={(globeId) => {
            setActiveGlobeId(globeId);
            setViewTier('dome');
          }}
          onOpenCreatePlanet={() => setIsCreatePlanetOpen(true)}
          theme={theme}
        />
      </div>

      {/* 2. Planet Photo Dome / Alternative 3D Views */}
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          viewTier === 'dome' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
        }`}
      >
        {viewMode3D === 'orb' ? (
          <MyOrbDome
            photos={photos}
            onOpenPhotoDetail={onOpenPhotoDetail}
            onOpenSlotUpload={(slotIdx) => {
              vaultAudio.playWhoosh();
              setSelectedSlotForUpload(slotIdx);
            }}
            isMonochrome={isMonochrome}
            orientationFilter={orientationFilter}
            currentMode={viewMode3D}
            onSelectMode={(mode) => setViewMode3D(mode)}
            onToggleMonochrome={() => setIsMonochrome(!isMonochrome)}
            onSetOrientationFilter={(f) => setOrientationFilter(f)}
            isDrawerOpen={isDrawerOpen}
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
            <color attach="background" args={[theme === 'light' ? '#F6F5F0' : '#040508']} />
            <ambientLight intensity={theme === 'light' ? 1.6 : 1.2} />
            <directionalLight position={[18, 22, 24]} intensity={theme === 'light' ? 1.7 : 1.5} color="#FFFFFF" />
            <directionalLight position={[-18, -15, -12]} intensity={theme === 'light' ? 0.8 : 0.6} color="#E5C07B" />
            <pointLight position={[0, 0, 0]} intensity={1.0} color="#8B5CF6" />

            <Suspense fallback={null}>
              <ParticleStarfield count={1200} />

              {/* Densely Populated 3D Globe Lattice (Zero Duplicates) */}
              <group position={[0, 0, 0]}>
                {Array.from({ length: TOTAL_GLOBE_SLOTS }).map((_, slotIndex) => {
                  const photo = globePhotosBySlot[slotIndex] || null;
                  if (!photo) return null;
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
      </div>

      {/* ULTRA-MINIMAL LUXURY HUD */}

      {/* Cinematic Zen Theater Mode Active Indicator */}
      {isEffectiveFullscreen && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] px-4 py-1.5 rounded-full bg-black/85 backdrop-blur-2xl border border-vault-gold/60 text-vault-gold text-xs font-sans tracking-wide flex items-center gap-2 shadow-glow animate-fade-in pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-vault-gold animate-pulse" />
          <span>Zen Universe Active • Click Minimize or Esc to exit (F11 for borderless)</span>
        </div>
      )}

      {/* Top Header Floating Glass Shell (Protects Brand Monogram & Controls from 3D Orbiting Cards) */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none flex flex-col items-center bg-gradient-to-b from-[#F6F5F0] via-[#F6F5F0]/90 to-transparent dark:from-[#040508] dark:via-[#040508]/90 dark:to-transparent pb-4 backdrop-blur-md">
        <div className="w-full flex items-center justify-between px-4 sm:px-8 lg:px-12 pt-3 sm:pt-4 pb-1.5 pointer-events-auto">
          {/* Top Left: Editorial Brand Monogram (Never clipped on left edge) */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 pl-2 sm:pl-3 select-none">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-serif tracking-[0.2em] sm:tracking-[0.35em] text-sm sm:text-lg font-normal text-slate-900 dark:text-white uppercase">
                  MYORB
                </span>
                <span className="text-[8px] sm:text-[9px] tracking-[0.15em] sm:tracking-[0.25em] uppercase text-vault-gold font-mono border-l border-stone-300 dark:border-white/20 pl-1.5 sm:pl-2">
                  VAULT
                </span>
              </div>
              <span className="hidden sm:block text-[11px] tracking-wider text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                {currentFamily.name?.replace(/Vanderbilt Family Vault/gi, 'MyOrb Memory Vault').replace(/Vanderbilt/gi, 'MyOrb') || 'MyOrb Memory Vault'}
              </span>
            </div>
          </div>

          {/* Top Right: Minimal Luxury Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Quick Upload Button (Directly Accessible in Universe HUD) */}
            {onOpenUpload && (
              <button
                id="universe-upload-btn"
                onClick={() => {
                  vaultAudio.playWhoosh();
                  onOpenUpload();
                }}
                title="Upload Memories to Vault"
                aria-label="Upload Memories"
                className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full flex items-center gap-1.5 bg-vault-gold hover:bg-amber-400 active:bg-amber-500 text-black text-xs font-bold shadow-md hover:shadow-glow transition-all cursor-pointer active:scale-95"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Upload</span>
              </button>
            )}

            {/* Quick Search Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              title="Search Memories"
              className="p-2 sm:p-2.5 rounded-full flex items-center justify-center bg-stone-100 hover:bg-stone-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.1] border border-stone-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white backdrop-blur-xl transition-all cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 sm:w-4 h-4" />
            </button>

            {/* Interactive Master Guide (Desktop) */}
            <button
              onClick={() => {
                vaultAudio.playWhoosh();
                setIsGuideOpen(true);
              }}
              title="Interactive Vault Guide"
              aria-label="Interactive Vault Guide"
              className="hidden sm:flex p-2 sm:p-2.5 rounded-full items-center justify-center bg-stone-100 hover:bg-stone-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.1] border border-stone-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white backdrop-blur-xl transition-all cursor-pointer"
            >
              <BookOpen className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </button>

            {/* Generative Ambient BGM & Hover Sound Pill (Mobile & Desktop) */}
            <div className="flex">
              <AudioPillWidget onOpenSettings={() => setIsAudioModalOpen(true)} />
            </div>

            {/* True Fullscreen Toggle (Desktop) */}
            <button
              onClick={toggleFullscreen}
              title={isEffectiveFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen'}
              className={`hidden sm:flex p-2 sm:p-2.5 rounded-full border text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white backdrop-blur-xl transition-all cursor-pointer ${
                isEffectiveFullscreen
                  ? 'bg-vault-gold text-black border-vault-gold shadow-glow font-bold'
                  : 'bg-stone-100 hover:bg-stone-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.1] border-stone-200/80 dark:border-white/10'
              }`}
            >
              {isEffectiveFullscreen ? (
                <Minimize2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-black" />
              ) : (
                <Maximize2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
              )}
            </button>

            {/* Slide-out Menu Hamburger Toggle */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              title="Open Vault Menu"
              className="p-2 sm:p-2.5 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] border border-stone-200/80 dark:border-white/15 text-slate-900 dark:text-white backdrop-blur-xl transition-all shadow-sm cursor-pointer"
            >
              <Menu className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Cosmic Universe Planet Carousel & Multi-Globe Controls */}
        <div className="pointer-events-auto w-full max-w-7xl mx-auto px-2 sm:px-6">
          <UniversePlanetBar
            onOpenCreatePlanet={() => setIsCreatePlanetOpen(true)}
            onOpenBulkUpload={() => {
              if (onOpenUpload) onOpenUpload();
            }}
            viewTier={viewTier}
            onToggleViewTier={() => {
              vaultAudio.playWhoosh();
              setViewTier((v) => (v === 'galaxy' ? 'dome' : 'galaxy'));
            }}
            onSelectPlanetWithWarp={(id) => {
              setActiveGlobeId(id);
              setViewTier('dome');
            }}
          />
        </div>

        {/* View-Specific Secondary Sub-Bar (Solar System Guidance vs Planet Dome Orientation Filters) */}
        <div className="pointer-events-auto mt-0.5 flex justify-center">
          {viewTier === 'galaxy' ? (
            <div className="flex items-center gap-2 bg-black/80 backdrop-blur-2xl border border-vault-gold/40 rounded-full px-4 py-1.5 shadow-xl text-vault-gold text-xs font-mono select-none animate-in fade-in">
              <Sparkles className="w-3.5 h-3.5 text-vault-gold animate-spin-slow flex-shrink-0" />
              <span className="hidden sm:inline">3D Solar System Overview • Orbiting Memory Planets</span>
              <span className="sm:hidden">Solar System Overview</span>
              <button
                onClick={() => {
                  vaultAudio.playWhoosh();
                  setViewTier('dome');
                }}
                className="ml-1 sm:ml-2 px-3 py-0.5 rounded-full bg-vault-gold hover:bg-amber-400 text-black font-sans font-bold text-[11px] transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1"
              >
                <span>Enter Dome</span>
                <span>➔</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center bg-white/95 dark:bg-[#0a0d17]/90 backdrop-blur-2xl border border-stone-200/80 dark:border-white/15 rounded-full p-1 shadow-md dark:shadow-xl max-w-[94vw] overflow-x-auto no-scrollbar text-slate-900 dark:text-white">
              <button
                onClick={() => {
                  vaultAudio.playWhoosh();
                  setOrientationFilter('all');
                }}
                className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-sans transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  orientationFilter === 'all'
                    ? 'bg-vault-gold text-black font-bold shadow-sm'
                    : 'text-stone-600 dark:text-stone-300 hover:text-black dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/[0.08]'
                }`}
                title="All Memories (Interleaved Mosaic)"
              >
                <span>✦ All</span>
                <span className={`text-[10px] font-mono px-1 py-0.2 rounded font-semibold ${
                  orientationFilter === 'all'
                    ? 'bg-black/10 text-black'
                    : 'bg-stone-100 dark:bg-black/30 text-stone-700 dark:text-stone-300'
                }`}>
                  {photos.filter((p) => !p.inTrash).length}
                </span>
              </button>

              <button
                onClick={() => {
                  vaultAudio.playWhoosh();
                  setOrientationFilter('landscape');
                }}
                className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-sans transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  orientationFilter === 'landscape'
                    ? 'bg-vault-gold text-black font-bold shadow-sm'
                    : 'text-stone-600 dark:text-stone-300 hover:text-black dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/[0.08]'
                }`}
                title="Filter Landscape Widescreen Memories (16:9)"
              >
                <span className="text-sm leading-none">▱</span>
                <span>Landscape</span>
                <span className={`text-[10px] font-mono px-1 py-0.2 rounded font-semibold ${
                  orientationFilter === 'landscape'
                    ? 'bg-black/10 text-black'
                    : 'bg-stone-100 dark:bg-black/30 text-stone-700 dark:text-stone-300'
                }`}>
                  {photos.filter((p) => !p.inTrash && p.width >= p.height && p.orientation !== 'portrait').length}
                </span>
              </button>

              <button
                onClick={() => {
                  vaultAudio.playWhoosh();
                  setOrientationFilter('portrait');
                }}
                className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-sans transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  orientationFilter === 'portrait'
                    ? 'bg-vault-gold text-black font-bold shadow-sm'
                    : 'text-stone-600 dark:text-stone-300 hover:text-black dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/[0.08]'
                }`}
                title="Filter Portrait Vertical Memories (9:16)"
              >
                <span className="text-sm leading-none">▯</span>
                <span>Portrait</span>
                <span className={`text-[10px] font-mono px-1 py-0.2 rounded font-semibold ${
                  orientationFilter === 'portrait'
                    ? 'bg-black/10 text-black'
                    : 'bg-stone-100 dark:bg-black/30 text-stone-700 dark:text-stone-300'
                }`}>
                  {photos.filter((p) => !p.inTrash && (p.height > p.width || p.orientation === 'portrait')).length}
                </span>
              </button>
            </div>
          )}
        </div>
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
        <div className="fixed inset-0 z-[90] overflow-hidden">
          {/* Backdrop */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-stone-900/35 dark:bg-black/75 backdrop-blur-md transition-opacity z-[90]"
          />

          {/* Slide-out Panel */}
          <div className="absolute right-0 top-0 bottom-0 w-full sm:max-w-[330px] sm:w-[330px] bg-[#FAF9F6] dark:bg-[#070912] text-slate-900 dark:text-white backdrop-blur-2xl border-l border-stone-200/90 dark:border-white/10 p-4 sm:p-5 flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-300 z-[95]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200/90 dark:border-white/10 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8.5 h-8.5 rounded-xl bg-vault-gold/15 border border-vault-gold/30 flex items-center justify-center shadow-glow">
                  <Globe className="w-4 h-4 text-vault-gold" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-serif tracking-[0.25em] text-slate-900 dark:text-white text-xs sm:text-sm font-semibold uppercase">
                      MYORB VAULT
                    </h3>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 tracking-wide mt-0.5 font-sans">
                    Private Family Archive
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                title="Close Navigation (Esc)"
                className="p-1.5 rounded-full hover:bg-stone-200/60 dark:hover:bg-white/10 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white transition-all cursor-pointer border border-transparent hover:border-stone-300/80 dark:hover:border-white/10"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Active Kin Profile Card in Drawer */}
            <div
              onClick={() => {
                setIsDrawerOpen(false);
                if (onOpenProfile) onOpenProfile();
                else if (onNavigateTab) onNavigateTab('members');
              }}
              className="mt-2 p-2 rounded-xl bg-white dark:bg-white/[0.04] border border-stone-200/90 dark:border-white/10 flex items-center justify-between cursor-pointer hover:bg-stone-50 dark:hover:bg-white/[0.08] hover:border-amber-400/50 dark:hover:border-vault-gold/40 transition-all group flex-shrink-0 shadow-[0_2px_8px_rgba(40,30,20,0.03)] dark:shadow-none"
              title="Click to manage personal profile, change photo & passwords"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative flex-shrink-0">
                  <img
                    src={currentMember.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80'}
                    alt={currentMember.displayName}
                    className="w-8 h-8 rounded-lg object-cover border border-vault-gold/40 shadow group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-white dark:border-black" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {currentMember.displayName}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="truncate">E2EE Master Key Active</span>
                  </div>
                </div>
              </div>
              <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 dark:bg-vault-gold/15 text-amber-900 dark:text-vault-gold border border-amber-500/25 dark:border-vault-gold/30 ml-2 flex-shrink-0">
                {currentMember.role}
              </span>
            </div>

            {/* Universe Planets Selector in Drawer (Horizontal Compact Bar saves 60px of vertical space) */}
            <div className="mt-1.5 p-1.5 rounded-xl bg-white dark:bg-white/[0.03] border border-stone-200/90 dark:border-white/10 flex flex-col gap-1 flex-shrink-0 shadow-sm">
              <div className="flex items-center justify-between px-1.5 py-0.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                  <Globe className="w-3 h-3 text-vault-gold" />
                  <span>Memory Planets ({globes.length})</span>
                </span>
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    setIsCreatePlanetOpen(true);
                  }}
                  className="text-[10px] font-semibold text-vault-gold hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>New</span>
                </button>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {globes.map((g) => {
                  const isAct = g.id === activeGlobeId;
                  const gCount = photos.filter(
                    (p) => !p.inTrash && (p.globeId === g.id || (!p.globeId && g.id === 'globe_main'))
                  ).length;
                  return (
                    <button
                      key={g.id}
                      onClick={() => {
                        vaultAudio.playWhoosh();
                        setActiveGlobeId(g.id);
                        setIsDrawerOpen(false);
                      }}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition-all cursor-pointer flex-shrink-0 ${
                        isAct
                          ? 'bg-amber-500/15 dark:bg-vault-gold/20 text-amber-950 dark:text-vault-gold font-bold border border-vault-gold/40'
                          : 'text-stone-700 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                      }`}
                      title={`${g.name} (${gCount}/108)`}
                    >
                      <span className="truncate max-w-[110px]">{g.name}</span>
                      <span className="text-[9px] font-mono opacity-60">
                        {gCount}/108
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation Links with Refined Ergonomic Spacing & Full Visibility */}
            <div className="flex-1 min-h-0 overflow-y-auto py-1 space-y-0.5 font-sans pr-1 pb-6 overscroll-contain scrollbar-thin scrollbar-thumb-stone-300 dark:scrollbar-thumb-white/10">
              {[
                { tab: 'universe' as NavigationTab, label: '3D Memory Universe', icon: Globe, count: null },
                { tab: 'library' as NavigationTab, label: 'Photo Library', icon: Grid, count: photos.filter(p => !p.inTrash).length },
                { tab: 'map' as NavigationTab, label: 'Tamil Nadu Memory Map', icon: MapPin, count: '108' },
                { tab: 'albums' as NavigationTab, label: 'Albums & Collections', icon: Folder, count: albums.length },
                { tab: 'storage' as NavigationTab, label: 'Storage Quotas', icon: HardDrive, count: null },
                { tab: 'activity' as NavigationTab, label: 'Audit Trail Ledger', icon: Activity, count: null },
                { tab: 'members' as NavigationTab, label: 'Family & Password Access', icon: Users, count: null },
                { tab: 'backups' as NavigationTab, label: 'Backup & Recovery', icon: Archive, count: null },
              ].map(({ tab, label, icon: Icon, count }) => {
                const isActive = tab === 'universe';
                return (
                  <button
                    key={tab}
                    onClick={() => {
                      setIsDrawerOpen(false);
                      if (onNavigateTab) onNavigateTab(tab);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1 rounded-lg text-xs font-medium transition-all text-left cursor-pointer border ${
                      isActive
                        ? 'bg-amber-500/15 dark:bg-vault-gold/20 text-amber-950 dark:text-vault-gold border-amber-500/35 dark:border-vault-gold/40 font-semibold shadow-sm'
                        : 'text-stone-700 dark:text-stone-300 hover:text-stone-950 dark:hover:text-white hover:bg-stone-200/50 dark:hover:bg-white/[0.06] border-transparent hover:border-stone-200/80 dark:hover:border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-amber-700 dark:text-vault-gold' : 'text-stone-400 dark:text-stone-500'}`} />
                      <span className="truncate">{label}</span>
                    </div>
                    {isActive ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-vault-gold shadow-glow flex-shrink-0" />
                    ) : count !== null ? (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-stone-200/60 dark:bg-white/10 text-stone-600 dark:text-stone-300 flex-shrink-0 font-medium">
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions in Drawer */}
            <div className="border-t border-stone-200/90 dark:border-white/10 pt-1.5 flex flex-col gap-1.5 font-sans flex-shrink-0 pb-3 pb-safe">
              {/* Quick Actions Segmented Row (Audio, Guide, Theme, Fullscreen) */}
              <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-white dark:bg-white/[0.03] border border-stone-200/90 dark:border-white/10 shadow-[0_2px_8px_rgba(40,30,20,0.03)]">
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    setIsAudioModalOpen(true);
                  }}
                  className="flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl hover:bg-stone-100 dark:hover:bg-white/[0.08] text-stone-700 dark:text-stone-300 text-[10px] font-medium transition-all cursor-pointer"
                  title="Open Celestial Audio Studio"
                >
                  <Music className="w-3.5 h-3.5 text-purple-600 dark:text-vault-gold" />
                  <span>Audio</span>
                </button>

                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    setIsGuideOpen(true);
                  }}
                  className="flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl hover:bg-stone-100 dark:hover:bg-white/[0.08] text-stone-700 dark:text-stone-300 text-[10px] font-medium transition-all cursor-pointer"
                  title="Open Interactive Vault Guide"
                >
                  <BookOpen className="w-3.5 h-3.5 text-amber-600 dark:text-vault-gold" />
                  <span>Guide</span>
                </button>

                <button
                  onClick={() => {
                    vaultAudio.playWhoosh();
                    toggleTheme();
                  }}
                  className="flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl hover:bg-stone-100 dark:hover:bg-white/[0.08] text-stone-700 dark:text-stone-300 text-[10px] font-medium transition-all cursor-pointer"
                  title="Toggle Light / Dark Mode"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                  <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
                </button>

                <button
                  onClick={toggleFullscreen}
                  className={`flex flex-col items-center justify-center gap-0.5 py-1 px-1 rounded-xl text-[10px] font-medium transition-all cursor-pointer ${
                    isEffectiveFullscreen
                      ? 'bg-vault-gold text-black font-semibold shadow-sm'
                      : 'hover:bg-stone-100 dark:hover:bg-white/[0.08] text-stone-700 dark:text-stone-300'
                  }`}
                  title="Toggle Fullscreen"
                >
                  {isEffectiveFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-black" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{isEffectiveFullscreen ? 'Exit' : 'Full'}</span>
                </button>
              </div>

              {onOpenUpload && (
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    if (onOpenUpload) onOpenUpload();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-vault-gold to-amber-500 hover:brightness-105 text-black text-xs font-bold tracking-wide shadow-md hover:shadow-glow active:scale-98 transition-all cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Memories</span>
                </button>
              )}

              {onOpenLockModal && (
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    lockVault();
                    onOpenLockModal();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-1.5 rounded-xl bg-white hover:bg-stone-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-stone-700 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white text-xs font-semibold transition-all border border-stone-200/90 dark:border-white/10 active:scale-98 cursor-pointer shadow-sm"
                >
                  <Lock className="w-3.5 h-3.5 text-stone-400" />
                  <span>Lock Vault</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 24-Hour Ephemeral Stories Floating Stack (Positioned with safe clearance from bottom corner badges) */}
      {/* Laptop / Desktop Hover-to-Fan Stack */}
      <div
        className="absolute bottom-6 right-36 sm:right-44 lg:right-48 z-30 hidden sm:flex flex-col items-end group cursor-pointer select-none"
        onClick={() => {
          vaultAudio.playWhoosh();
          setIsStoryViewerOpen(true);
        }}
        title="Explore & Publish 24-Hour Family Stories"
      >
        {/* Stack of fanned cards that expand widely on hover (shown when stories exist) */}
        {stories.length > 0 && (
          <div className="relative w-36 h-24 mb-3 transition-transform duration-300 ease-out group-hover:scale-105">
            {stories.slice(0, 3).map((item, idx) => {
              const rotClass =
                idx === 0
                  ? '-rotate-6 group-hover:-translate-x-8 group-hover:-translate-y-4 group-hover:-rotate-12 group-hover:scale-105'
                  : idx === 1
                  ? 'rotate-0 group-hover:-translate-y-6 group-hover:scale-110 group-hover:z-20'
                  : 'rotate-6 group-hover:translate-x-8 group-hover:-translate-y-4 group-hover:rotate-12 group-hover:scale-105';

              return (
                <div
                  key={item.id}
                  className={`absolute inset-0 rounded-2xl overflow-hidden border border-white/25 group-hover:border-vault-gold/70 shadow-2xl transition-all duration-300 ease-out origin-bottom bg-gradient-to-br from-slate-900 via-slate-800 to-black ${rotClass}`}
                  style={{ zIndex: idx }}
                >
                  <img
                    aria-hidden="true"
                    src={item.imgUrl || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80'}
                    alt=""
                    onError={(e) => {
                      const img = e.currentTarget;
                      img.onerror = null;
                      img.src = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80';
                    }}
                    className="w-full h-full object-cover brightness-95 group-hover:brightness-110 transition-all pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[10px] text-white">
                    <span className="font-semibold truncate max-w-[85px] drop-shadow-md">{item.authorName}</span>
                    <span className="text-[9px] font-mono text-vault-gold bg-black/70 px-1 py-0.2 rounded border border-vault-gold/40">24h</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Floating Pill Label */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/85 backdrop-blur-xl border border-white/15 text-xs text-white/90 shadow-xl group-hover:border-vault-gold/60 group-hover:shadow-[0_0_20px_rgba(229,192,123,0.35)] transition-all">
          <Sparkles className="w-3.5 h-3.5 text-vault-gold animate-pulse" />
          <span className="font-serif italic tracking-wide">24h Stories</span>
          <span className="text-[10px] font-mono bg-vault-gold/20 text-vault-gold font-semibold px-2 py-0.2 rounded-full border border-vault-gold/30">
            {stories.length > 0 ? `${stories.length} Active` : '+ Add'}
          </span>
        </div>
      </div>

      {/* Phone Floating 24h Stories Pill (Mobile-Optimized & Positioned cleanly above bottom dock) */}
      <div
        className="absolute bottom-20 right-3.5 z-40 sm:hidden flex items-center gap-2 p-1.5 pl-2 pr-3.5 rounded-full bg-black/90 backdrop-blur-2xl border border-vault-gold/50 text-white shadow-2xl active:scale-95 transition-all cursor-pointer"
        onClick={() => {
          vaultAudio.playWhoosh();
          setIsStoryViewerOpen(true);
        }}
        title="View 24-Hour Stories"
      >
        <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-vault-gold shadow-md flex-shrink-0">
          <img
            src={stories[0]?.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80'}
            alt="Story"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-1.5 text-xs font-medium leading-none">
            <span className="text-white font-serif italic">24h Stories</span>
            <span className="text-[10px] font-mono bg-vault-gold text-black font-bold px-1.5 rounded-full">
              {stories.length}
            </span>
          </div>
          <span className="text-[9px] font-mono text-amber-200/90 mt-0.5">Tap to view</span>
        </div>
      </div>

      {/* 24-Hour Stories Viewer & Creator Modal */}
      <StoriesViewerModal
        isOpen={isStoryViewerOpen}
        onClose={() => setIsStoryViewerOpen(false)}
        stories={stories}
        onAddStory={(newStory) => setStories([newStory, ...stories])}
        onExplorePhotoDetail={(id) => onOpenPhotoDetail(id)}
      />

      {/* Interactive Master Vault Guide Modal (Phone & Desktop) */}
      <VaultGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onOpenStoryViewer={() => setIsStoryViewerOpen(true)}
      />

      {/* Luxury Celestial Audio & Ambient Studio Customizer Modal */}
      <AudioSettingsModal isOpen={isAudioModalOpen} onClose={() => setIsAudioModalOpen(false)} />

      {/* Bespoke Single Slot Memory Upload Modal */}
      <SingleSlotUploadModal
        isOpen={selectedSlotForUpload !== null}
        slotIndex={selectedSlotForUpload}
        targetGlobeId={activeGlobeId}
        onClose={() => setSelectedSlotForUpload(null)}
      />

      {/* Cosmic Create Planet Modal */}
      <CreatePlanetModal
        isOpen={isCreatePlanetOpen}
        onClose={() => setIsCreatePlanetOpen(false)}
      />
    </div>
  );
}

