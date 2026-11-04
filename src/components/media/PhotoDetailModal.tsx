import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useVaultStore } from '../../stores/useVaultStore';
import { vaultAudio } from '../../services/audioSynthesizer';
import { getInstantProceduralDataUrl } from '../../services/instantTextures';
import { ImageCropperModal } from './ImageCropperModal';
import type { PhotoMetadata } from '../../types';
import {
  X,
  Heart,
  Calendar,
  MapPin,
  Trash2,
  Download,
  Edit3,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Tag,
  Folder,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  ShieldCheck,
  Crop,
  RotateCw,
  Upload,
  Camera,
  Palette,
} from 'lucide-react';

interface PhotoDetailModalProps {
  photoId: string | null;
  onClose: () => void;
}

export const MOOD_FILTERS: Record<string, { label: string; filter: string; description: string }> = {
  none: { label: 'Original', filter: 'none', description: 'Unfiltered authentic capture' },
  vivid: { label: 'Vivid Glow', filter: 'contrast(1.15) saturate(1.25)', description: 'Punchy vibrant colors & high dynamic range' },
  heritage: { label: 'Warm Heritage', filter: 'sepia(0.35) contrast(1.05) saturate(1.1)', description: 'Classical golden warmth of ancient stone' },
  noir: { label: 'Noir B&W', filter: 'grayscale(100%) contrast(1.2)', description: 'Museum-grade monochrome archival silver print' },
  golden: { label: 'Golden Hour', filter: 'sepia(0.2) saturate(1.35) hue-rotate(-8deg)', description: 'Late afternoon amber sun rays' },
  cool: { label: 'Cool Slate', filter: 'contrast(1.08) saturate(0.85) hue-rotate(12deg)', description: 'Modern cinematic teal & slate' },
};

export function PhotoDetailModal({ photoId, onClose }: PhotoDetailModalProps) {
  const {
    photos,
    albums,
    currentMember,
    updatePhoto,
    updatePhotoMetadata,
    toggleFavorite,
    moveToTrash,
  } = useVaultStore();

  const photo = photos.find((p) => p.id === photoId);
  const [isEditing, setIsEditing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; startPanX: number; startPanY: number }>({
    x: 0,
    y: 0,
    startPanX: 0,
    startPanY: 0,
  });
  const [savedBanner, setSavedBanner] = useState(false);

  // Form State for editing
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [captureDate, setCaptureDate] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [targetAlbumId, setTargetAlbumId] = useState('');
  const [moodFilter, setMoodFilter] = useState('none');

  // Interactive Image Cropper & Replacement State
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropperTargetUrl, setCropperTargetUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize form state when switching active photo
  useEffect(() => {
    if (photo) {
      setTitle(photo.metadata.title);
      setStory(photo.metadata.story || photo.metadata.notes || '');
      setCaptureDate(photo.metadata.captureDate);
      setLocationLabel(photo.metadata.location?.label || '');
      setTagsInput(photo.metadata.tags.join(', '));
      setTargetAlbumId(photo.albumId);
      setMoodFilter(photo.metadata.mood || 'none');
      setIsEditing(false);
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
      setSavedBanner(false);
    }
  }, [photo?.id]);

  // Keyboard navigation & zoom controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCropperOpen) {
          setIsCropperOpen(false);
          return;
        }
        vaultAudio.playWhoosh();
        onClose();
      }
      if (!isEditing && !isCropperOpen) {
        if (photoId) {
          const currentIndex = photos.findIndex((p) => p.id === photoId);
          if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) {
            vaultAudio.playWhoosh();
            setZoomLevel(1);
            setPanOffset({ x: 0, y: 0 });
            useVaultStore.getState().setSelectedPhotoId(photos[currentIndex + 1].id);
          } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
            vaultAudio.playWhoosh();
            setZoomLevel(1);
            setPanOffset({ x: 0, y: 0 });
            useVaultStore.getState().setSelectedPhotoId(photos[currentIndex - 1].id);
          }
        }
        // Zoom shortcuts: + / = to zoom in, - to zoom out, 0 to reset
        if (e.key === '+' || e.key === '=') {
          vaultAudio.playWhoosh();
          setZoomLevel((z) => Math.min(4, Number((z + 0.25).toFixed(2))));
        } else if (e.key === '-' || e.key === '_') {
          vaultAudio.playWhoosh();
          setZoomLevel((z) => {
            const next = Math.max(1, Number((z - 0.25).toFixed(2)));
            if (next === 1) setPanOffset({ x: 0, y: 0 });
            return next;
          });
        } else if (e.key === '0') {
          vaultAudio.playWhoosh();
          setZoomLevel(1);
          setPanOffset({ x: 0, y: 0 });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photoId, photos, isEditing, isCropperOpen, onClose]);

  const currentAlbum = photo ? albums.find((a) => a.id === photo.albumId) : null;
  const currentIndex = photo ? photos.findIndex((p) => p.id === photo.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < photos.length - 1;

  const handlePrev = () => {
    if (!hasPrev) return;
    vaultAudio.playWhoosh();
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    useVaultStore.getState().setSelectedPhotoId(photos[currentIndex - 1].id);
  };

  const handleNext = () => {
    if (!hasNext) return;
    vaultAudio.playWhoosh();
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    useVaultStore.getState().setSelectedPhotoId(photos[currentIndex + 1].id);
  };

  // High-Precision Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * -0.0015;
    setZoomLevel((prev) => {
      const next = Math.min(4, Math.max(1, Number((prev + zoomDelta).toFixed(2))));
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  // Pointer Drag Panning for High-Res Exploration
  const handlePointerDown = (e: React.PointerEvent) => {
    if (zoomLevel <= 1) return;
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startPanX: panOffset.x,
      startPanY: panOffset.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning || zoomLevel <= 1) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    const maxPan = 550 * (zoomLevel - 1);
    setPanOffset({
      x: Math.max(-maxPan, Math.min(maxPan, panStartRef.current.startPanX + dx)),
      y: Math.max(-maxPan, Math.min(maxPan, panStartRef.current.startPanY + dy)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isPanning) return;
    setIsPanning(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if capture lost
    }
  };

  // Click & Double-click zoom toggle
  const handleImageClick = () => {
    const moved =
      Math.abs(panOffset.x - panStartRef.current.startPanX) +
      Math.abs(panOffset.y - panStartRef.current.startPanY);
    if (moved > 6) return; // Drag occurred, cancel click

    vaultAudio.playWhoosh();
    if (zoomLevel > 1) {
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
    } else {
      setZoomLevel(2.2);
    }
  };

  // Launch interactive image cropper
  const handleOpenCropper = () => {
    if (!photo) return;
    vaultAudio.playWhoosh();
    const activeUrl = photo.decryptedFullUrl || photo.decryptedThumbUrl || photo.thumbStoragePath || photo.storagePath;
    setCropperTargetUrl(activeUrl);
    setIsCropperOpen(true);
  };

  // Apply crop result
  const handleApplyCrop = (croppedDataUrl: string) => {
    if (!photo) return;
    const img = new Image();
    img.onload = () => {
      const isPortrait = img.height > img.width;
      updatePhoto(photo.id, {
        decryptedFullUrl: croppedDataUrl,
        decryptedThumbUrl: croppedDataUrl,
        storagePath: croppedDataUrl,
        thumbStoragePath: croppedDataUrl,
        width: img.width,
        height: img.height,
        orientation: isPortrait ? 'portrait' : 'landscape',
      });
      vaultAudio.playChime(659.25);
      setIsCropperOpen(false);
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 2400);
    };
    img.src = croppedDataUrl;
  };

  // Quick Rotate 90° clockwise using canvas
  const handleRotate90 = () => {
    if (!photo) return;
    vaultAudio.playWhoosh();
    const currentUrl = photo.decryptedFullUrl || photo.decryptedThumbUrl || photo.thumbStoragePath || photo.storagePath;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      const rotatedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const isNowPortrait = canvas.height > canvas.width;
      updatePhoto(photo.id, {
        decryptedFullUrl: rotatedDataUrl,
        decryptedThumbUrl: rotatedDataUrl,
        storagePath: rotatedDataUrl,
        thumbStoragePath: rotatedDataUrl,
        width: canvas.width,
        height: canvas.height,
        orientation: isNowPortrait ? 'portrait' : 'landscape',
      });
      vaultAudio.playChime(659.25);
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 2000);
    };
    img.src = currentUrl;
  };

  // Replace photo image via local file selection
  const handleReplacePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !photo) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        vaultAudio.playSnap();
        setCropperTargetUrl(dataUrl);
        setIsCropperOpen(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!photo) return;
    vaultAudio.playChime(659.25);
    const updatedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    await updatePhotoMetadata(photo.id, {
      title: title.trim() || photo.metadata.title,
      story: story.trim(),
      captureDate: captureDate || photo.metadata.captureDate,
      tags: updatedTags,
      mood: moodFilter,
      location: locationLabel
        ? {
            latitude: photo.metadata.location?.latitude || 0,
            longitude: photo.metadata.location?.longitude || 0,
            label: locationLabel.trim(),
          }
        : undefined,
    });

    if (targetAlbumId && targetAlbumId !== photo.albumId) {
      useVaultStore.getState().setPhotoAlbum(photo.id, targetAlbumId);
    }

    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2600);
    setIsEditing(false);
  };

  const handleDownload = () => {
    if (!photo) return;
    const url = photo.decryptedFullUrl || photo.decryptedThumbUrl || photo.thumbStoragePath;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${photo.metadata.title.replace(/\s+/g, '_')}_myorb.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDelete = () => {
    if (!photo) return;
    if (confirm('Move this memory to Family Trash? It can be restored within 30 days.')) {
      moveToTrash(photo.id);
      onClose();
    }
  };

  const activeMood = MOOD_FILTERS[moodFilter || photo?.metadata.mood || 'none'] || MOOD_FILTERS.none;

  return (
    <AnimatePresence>
      {photo && (
        <motion.div
          key="photo-detail-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 bg-black/85 backdrop-blur-2xl select-none overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              vaultAudio.playWhoosh();
              onClose();
            }
          }}
        >
          {/* Main Modal Card */}
          <motion.div
            key="photo-modal-card"
            initial={{ opacity: 0, scale: 0.92, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{
              type: 'spring',
              damping: 26,
              stiffness: 360,
              mass: 0.7,
            }}
            className="w-full max-w-5xl h-[90vh] max-h-[840px] rounded-3xl overflow-hidden flex flex-col shadow-[0_25px_80px_rgba(0,0,0,0.95)] border border-white/15 relative my-auto bg-[#0A0D16] text-white"
          >
            {/* Dedicated Top Gallery Header Bar - Close button NEVER overlaps the photo */}
            <div className="flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3 border-b border-white/10 flex-shrink-0 z-30 bg-[#0A0D16]/98 backdrop-blur-md">
              {/* Left: Memory Breadcrumb & Index Pill */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider bg-vault-gold/15 text-vault-gold border border-vault-gold/30 flex-shrink-0">
                  {currentIndex >= 0 ? `${currentIndex + 1} / ${photos.length}` : 'Memory'}
                </span>
                <div className="flex items-center gap-1.5 min-w-0 text-xs text-slate-400">
                  <Folder className="w-3.5 h-3.5 text-vault-gold flex-shrink-0" />
                  <span className="truncate font-medium text-slate-300">
                    {currentAlbum?.name || 'General Vault'}
                  </span>
                  <span className="hidden sm:inline text-slate-500">•</span>
                  <span className="hidden sm:inline truncate max-w-[240px] text-white font-medium">
                    {photo.metadata.title}
                  </span>
                </div>
              </div>

              {/* Right: Gallery Controls + Dedicated Safe Close Button */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {/* Desktop Keyboard Hints */}
                <div className="hidden md:flex items-center gap-1 text-[10px] text-slate-400 font-mono px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                  <span>←</span>
                  <span>→</span>
                  <span>keys</span>
                </div>

                {/* Mobile Prev / Next Buttons in Header */}
                <div className="flex md:hidden items-center gap-0.5">
                  <button
                    disabled={!hasPrev}
                    onClick={handlePrev}
                    className="p-1.5 rounded-lg text-slate-300 disabled:opacity-25 disabled:pointer-events-none hover:bg-white/10 transition-colors"
                    title="Previous Photo"
                    aria-label="Previous Photo"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={!hasNext}
                    onClick={handleNext}
                    className="p-1.5 rounded-lg text-slate-300 disabled:opacity-25 disabled:pointer-events-none hover:bg-white/10 transition-colors"
                    title="Next Photo"
                    aria-label="Next Photo"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Safe Close Button */}
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    vaultAudio.playWhoosh();
                    onClose();
                  }}
                  title="Close Gallery (Esc)"
                  aria-label="Close Photo Detail"
                  className="p-1.5 sm:p-2 rounded-full hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/15 shadow-sm"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </motion.button>
              </div>
            </div>

            {/* Split Content: Left High-Fidelity Photo Viewer & Right Memory Narrative */}
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
              {/* Left Photo Viewer Area (Museum Theater Framing - Solid Opaque stops 3D card bleed) */}
              <div className="relative flex-1 bg-[#05070B] flex items-center justify-center overflow-hidden min-h-[200px] h-[36vh] sm:h-[42vh] lg:h-auto lg:min-h-0 p-3 sm:p-6 lg:p-8 select-none">
                {/* Desktop Floating Previous Navigation Arrow */}
                {hasPrev && (
                  <motion.button
                    whileHover={{ scale: 1.12, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                    whileTap={{ scale: 0.92 }}
                    onClick={handlePrev}
                    className="absolute left-3 lg:left-5 top-1/2 -translate-y-1/2 z-20 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 shadow-2xl hidden md:flex items-center justify-center cursor-pointer transition-all"
                    title="Previous Photo (←)"
                    aria-label="Previous Photo"
                  >
                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                  </motion.button>
                )}

                {/* Desktop Floating Next Navigation Arrow */}
                {hasNext && (
                  <motion.button
                    whileHover={{ scale: 1.12, backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                    whileTap={{ scale: 0.92 }}
                    onClick={handleNext}
                    className="absolute right-3 lg:right-5 top-1/2 -translate-y-1/2 z-20 p-2.5 sm:p-3 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 shadow-2xl hidden md:flex items-center justify-center cursor-pointer transition-all"
                    title="Next Photo (→)"
                    aria-label="Next Photo"
                  >
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                  </motion.button>
                )}

                {/* Floating Precision Zoom HUD */}
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-1 z-20 p-1 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/15 shadow-2xl">
                  <button
                    disabled={zoomLevel <= 1}
                    onClick={() => {
                      vaultAudio.playWhoosh();
                      setZoomLevel((z) => {
                        const next = Math.max(1, Number((z - 0.25).toFixed(2)));
                        if (next === 1) setPanOffset({ x: 0, y: 0 });
                        return next;
                      });
                    }}
                    className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      vaultAudio.playWhoosh();
                      if (zoomLevel === 1) setZoomLevel(2);
                      else if (zoomLevel < 3) setZoomLevel(3);
                      else {
                        setZoomLevel(1);
                        setPanOffset({ x: 0, y: 0 });
                      }
                    }}
                    className="px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold text-vault-gold hover:bg-white/10 transition-colors cursor-pointer"
                    title="Click to cycle zoom levels"
                  >
                    {Math.round(zoomLevel * 100)}%
                  </button>

                  <button
                    disabled={zoomLevel >= 4}
                    onClick={() => {
                      vaultAudio.playWhoosh();
                      setZoomLevel((z) => Math.min(4, Number((z + 0.25).toFixed(2))));
                    }}
                    className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                    title="Zoom In (+)"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>

                  {zoomLevel > 1 && (
                    <button
                      onClick={() => {
                        vaultAudio.playWhoosh();
                        setZoomLevel(1);
                        setPanOffset({ x: 0, y: 0 });
                      }}
                      className="px-2 py-0.5 rounded-lg text-[10px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 border-l border-white/10 transition-colors cursor-pointer"
                      title="Reset to Fit (0)"
                    >
                      Fit
                    </button>
                  )}
                </div>

                {/* Interactive High-Fidelity Image Canvas with Pan & Zoom */}
                <div
                  onWheel={handleWheel}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none"
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={photo.id}
                      initial={{ opacity: 0, scale: 0.94, filter: 'blur(3px)' }}
                      animate={{ opacity: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, scale: 1.03, filter: 'blur(2px)' }}
                      transition={{
                        opacity: { duration: 0.24, ease: 'easeOut' },
                        filter: { duration: 0.2, ease: 'easeOut' },
                      }}
                      style={{
                        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                        transformOrigin: 'center center',
                        transition: isPanning ? 'none' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                      className="relative max-w-full max-h-full flex items-center justify-center select-none"
                    >
                      <img
                        src={photo.decryptedFullUrl || photo.decryptedThumbUrl || photo.thumbStoragePath}
                        alt={photo.metadata.title}
                        draggable={false}
                        style={{
                          filter: activeMood.filter,
                        }}
                        onError={(e) => {
                          const fallbackUrl = getInstantProceduralDataUrl(
                            photo.id,
                            photo.height > photo.width || photo.orientation === 'portrait'
                          );
                          if (e.currentTarget.src !== fallbackUrl) {
                            e.currentTarget.src = fallbackUrl;
                          }
                        }}
                        className={`max-w-full max-h-[72vh] object-contain rounded-2xl shadow-2xl border border-white/10 select-none ${
                          zoomLevel > 1
                            ? isPanning
                              ? 'cursor-grabbing shadow-[0_0_50px_rgba(229,192,123,0.35)]'
                              : 'cursor-grab shadow-[0_0_50px_rgba(229,192,123,0.35)]'
                            : 'cursor-zoom-in'
                        }`}
                        onClick={handleImageClick}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Quick Floating Overlay Toolbar on the Photo Canvas */}
                <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 flex items-center gap-1 sm:gap-1.5 z-20 p-1.5 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/15 shadow-2xl">
                  {/* Favorite */}
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      vaultAudio.playSnap();
                      toggleFavorite(photo.id);
                    }}
                    className={`p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer ${
                      photo.isFavorite
                        ? 'bg-rose-600 text-white shadow-lg'
                        : 'hover:bg-white/10 text-slate-300 hover:text-white'
                    }`}
                    title="Toggle Favorite"
                    aria-label="Toggle Favorite"
                  >
                    <Heart className={`w-3.5 sm:w-4 h-3.5 sm:h-4 ${photo.isFavorite ? 'fill-current' : ''}`} />
                  </motion.button>

                  {/* Crop Photo Viewfinder */}
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={handleOpenCropper}
                    className="p-2 sm:p-2.5 rounded-xl text-vault-gold hover:text-amber-300 hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1"
                    title="Crop & Refine Photo Viewfinder"
                    aria-label="Crop Photo"
                  >
                    <Crop className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                    <span className="text-[11px] font-semibold hidden sm:inline">Crop</span>
                  </motion.button>

                  {/* Rotate 90° Clockwise */}
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={handleRotate90}
                    className="p-2 sm:p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Rotate Photo 90° Clockwise"
                    aria-label="Rotate Photo 90°"
                  >
                    <RotateCw className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                  </motion.button>

                  {/* Replace Photo File */}
                  <label
                    htmlFor="detail-modal-replace-photo"
                    className="p-2 sm:p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1"
                    title="Upload New Photo File"
                    aria-label="Replace Photo"
                  >
                    <Camera className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                    <span className="text-[11px] font-semibold hidden sm:inline">Replace</span>
                  </label>

                  {/* Download */}
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      vaultAudio.playSnap();
                      handleDownload();
                    }}
                    className="p-2 sm:p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Download Decrypted Original"
                    aria-label="Download Decrypted Original"
                  >
                    <Download className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                  </motion.button>

                  {/* Zoom */}
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      vaultAudio.playWhoosh();
                      if (zoomLevel > 1) {
                        setZoomLevel(1);
                        setPanOffset({ x: 0, y: 0 });
                      } else {
                        setZoomLevel(2.2);
                      }
                    }}
                    className={`p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer ${
                      zoomLevel > 1
                        ? 'bg-vault-gold text-black shadow-glow font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                    title={zoomLevel > 1 ? `Zoomed ${Math.round(zoomLevel * 100)}% - Click to Reset` : 'Zoom In (or double-click photo)'}
                    aria-label={zoomLevel > 1 ? 'Reset Zoom' : 'Zoom In'}
                  >
                    {zoomLevel > 1 ? (
                      <Minimize2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-black" />
                    ) : (
                      <Maximize2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                    )}
                  </motion.button>
                </div>

                {/* Hidden File Input for Native Photo Replacement */}
                <input
                  id="detail-modal-replace-photo"
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/heic"
                  onChange={handleReplacePhotoFile}
                  className="sr-only"
                  aria-label="Replace Photo File"
                />
              </div>

              {/* Right Memory Story & Metadata Panel: Fixed footer, scrollable narrative */}
              <div className="w-full lg:w-[390px] xl:w-[430px] flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-white/10 bg-[#0D101A] text-white min-h-0 h-full flex-1 overflow-hidden">
                {/* Scrollable Story & Details Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 no-scrollbar min-h-0">
                  {/* Saved Confirmation Toast Banner */}
                  {savedBanner && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-semibold flex items-center gap-2 shadow-sm"
                    >
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>Memory & Photo Updated Successfully!</span>
                    </motion.div>
                  )}

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`meta-${photo.id}`}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                      className="space-y-4"
                    >
                      {/* Header info */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                            <span>Family Memory Story</span>
                          </span>
                          {!isEditing ? (
                            <button
                              onClick={() => {
                                vaultAudio.playWhoosh();
                                setIsEditing(true);
                              }}
                              className="text-xs text-vault-gold hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-3 rounded-lg bg-vault-gold/15 hover:bg-vault-gold/25 border border-vault-gold/30 font-semibold"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit Memory & Photo</span>
                            </button>
                          ) : (
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-vault-gold border border-amber-500/30 font-bold">
                              Editing Mode Active
                            </span>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="space-y-1 mb-2">
                            <label className="block text-[11px] font-semibold text-slate-300">
                              Memory Title *
                            </label>
                            <input
                              type="text"
                              required
                              value={title}
                              onChange={(e) => setTitle(e.target.value)}
                              placeholder="Title of this memory..."
                              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/15 text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-vault-gold shadow-inner"
                            />
                          </div>
                        ) : (
                          <h2 className="text-xl sm:text-2xl font-serif font-bold text-white leading-snug tracking-tight mb-2">
                            {photo.metadata.title}
                          </h2>
                        )}

                        <div className="text-xs text-slate-400 flex items-center flex-wrap gap-2">
                          <span>By {photo.uploaderName?.replace(/Elena Vanderbilt/gi, 'Vault Curator') || 'Vault Curator'}</span>
                          <span>•</span>
                          {isEditing ? (
                            <div className="flex items-center gap-1.5">
                              <Folder className="w-3.5 h-3.5 text-vault-gold" />
                              <select
                                value={targetAlbumId}
                                onChange={(e) => setTargetAlbumId(e.target.value)}
                                className="p-1.5 rounded-lg text-xs bg-[#141824] border border-white/20 text-vault-gold cursor-pointer"
                              >
                                {albums.map((alb) => (
                                  <option key={alb.id} value={alb.id} className="bg-slate-900 text-white">
                                    {alb.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Folder className="w-3.5 h-3.5 text-vault-gold" />
                              <span className="text-slate-300">Album: {currentAlbum?.name || 'General'}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Photo Image Editing & Crop Suite (Active in Edit Mode) */}
                      {isEditing && (
                        <div className="p-3.5 rounded-2xl bg-vault-gold/10 border border-vault-gold/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-vault-gold flex items-center gap-1.5">
                              <Crop className="w-3.5 h-3.5" />
                              <span>Photo Image & Crop Tools</span>
                            </span>
                            <span className="text-[10px] font-mono text-amber-200/80">
                              {photo.width} × {photo.height}
                            </span>
                          </div>

                          {/* Quick Photo Actions */}
                          <div className="grid grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={handleOpenCropper}
                              className="px-2.5 py-2 rounded-xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
                              title="Crop & Re-frame Photo"
                            >
                              <Crop className="w-3.5 h-3.5" />
                              <span>Crop Photo</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleRotate90}
                              className="px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center justify-center gap-1.5 border border-white/15 transition-all cursor-pointer"
                              title="Rotate 90 degrees"
                            >
                              <RotateCw className="w-3.5 h-3.5 text-vault-gold" />
                              <span>Rotate 90°</span>
                            </button>

                            <label
                              htmlFor="detail-modal-replace-photo"
                              className="px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium flex items-center justify-center gap-1.5 border border-white/15 transition-all cursor-pointer"
                              title="Upload new image to replace photo"
                            >
                              <Upload className="w-3.5 h-3.5 text-vault-gold" />
                              <span>Replace</span>
                            </label>
                          </div>

                          {/* Color Mood / Visual Presets */}
                          <div className="space-y-1.5 pt-1 border-t border-vault-gold/20">
                            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                              <span className="flex items-center gap-1">
                                <Palette className="w-3 h-3 text-purple-400" />
                                <span>Photo Mood Grading:</span>
                              </span>
                              <span className="text-[10px] font-mono text-purple-300">
                                {activeMood.label}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {Object.entries(MOOD_FILTERS).map(([key, item]) => {
                                const isSelected = moodFilter === key;
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => {
                                      vaultAudio.playSnap();
                                      setMoodFilter(key);
                                    }}
                                    className={`px-2 py-1.5 rounded-xl text-[10px] font-medium transition-all truncate cursor-pointer ${
                                      isSelected
                                        ? 'bg-purple-600 text-white font-bold shadow-sm'
                                        : 'bg-black/40 hover:bg-white/10 text-slate-300 border border-white/10'
                                    }`}
                                  >
                                    {item.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Date & Location Badges */}
                      <div className="space-y-2.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 shadow-sm">
                        <div className="flex items-center gap-2.5 text-xs text-slate-300">
                          <Calendar className="w-4 h-4 text-purple-400 flex-shrink-0" />
                          {isEditing ? (
                            <input
                              type="date"
                              value={captureDate}
                              onChange={(e) => setCaptureDate(e.target.value)}
                              className="px-2.5 py-1.5 rounded-xl text-xs bg-white/[0.05] border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-vault-gold"
                            />
                          ) : (
                            <span className="font-medium">{photo.metadata.captureDate}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 text-xs text-cyan-300">
                          <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                          {isEditing ? (
                            <input
                              type="text"
                              placeholder="Location label (e.g. Marina Beach, Chennai)"
                              value={locationLabel}
                              onChange={(e) => setLocationLabel(e.target.value)}
                              className="px-2.5 py-1.5 rounded-xl text-xs w-full bg-white/[0.05] border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-vault-gold"
                            />
                          ) : (
                            <span className="font-medium">{photo.metadata.location?.label || 'No location specified'}</span>
                          )}
                        </div>
                      </div>

                      {/* Story / Detailed Memory Notes */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <span>The Memory Story</span>
                        </h4>
                        {isEditing ? (
                          <textarea
                            rows={4}
                            value={story}
                            onChange={(e) => setStory(e.target.value)}
                            placeholder="Tell the story behind this memory for future generations..."
                            className="w-full p-3.5 rounded-xl text-xs bg-white/[0.05] border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-vault-gold shadow-inner leading-relaxed"
                          />
                        ) : (
                          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed whitespace-pre-wrap bg-white/[0.03] p-4 rounded-2xl border border-white/10 shadow-sm">
                            {photo.metadata.story ||
                              photo.metadata.notes ||
                              'No written narrative recorded yet. Tap edit to preserve the story.'}
                          </p>
                        )}
                      </div>

                      {/* Tags */}
                      <div className="space-y-2 pb-2">
                        <h4 className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-purple-400" />
                          <span>Tags</span>
                        </h4>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="triplicane, temple, stone, chola"
                            value={tagsInput}
                            onChange={(e) => setTagsInput(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs bg-white/[0.05] border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-vault-gold"
                          />
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {photo.metadata.tags.length > 0 ? (
                              photo.metadata.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2.5 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-[11px] sm:text-xs text-purple-300 font-medium"
                                >
                                  #{tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-500">No tags added</span>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Dedicated Action Footer: Fixed, unclipped, always visible with ample padding */}
                <div className="flex-shrink-0 px-6 sm:px-8 py-4 sm:py-5 pb-5 sm:pb-6 border-t border-white/10 bg-[#090C14]/98 backdrop-blur-md flex items-center justify-between gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] z-20 min-h-[64px]">
                  {isEditing ? (
                    <div className="flex items-center gap-2.5 w-full">
                      <button
                        onClick={() => {
                          vaultAudio.playWhoosh();
                          setIsEditing(false);
                        }}
                        className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-stone-300 hover:text-white hover:bg-white/10 transition-all cursor-pointer border border-transparent hover:border-white/10"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-vault-gold to-amber-500 hover:brightness-105 active:scale-98 text-black text-xs font-bold shadow-lg hover:shadow-[0_0_20px_rgba(229,192,123,0.4)] flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <Check className="w-4 h-4" />
                        <span>Save Memory & Photo</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => {
                          vaultAudio.playSnap();
                          handleDelete();
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-500/30 border border-rose-500/30 transition-all cursor-pointer shadow-sm select-none"
                        title="Move this memory to Family Trash"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Move to Trash</span>
                      </motion.button>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-stone-300 font-mono">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span>{(photo.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB • E2EE</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Dedicated Interactive Image Cropper Modal */}
          <ImageCropperModal
            isOpen={isCropperOpen}
            imageUrl={cropperTargetUrl}
            onClose={() => setIsCropperOpen(false)}
            onApplyCrop={handleApplyCrop}
            initialAspectRatio={
              photo.orientation === 'landscape'
                ? '16:9'
                : photo.orientation === 'portrait'
                ? '9:16'
                : photo.width > photo.height
                ? '16:9'
                : '9:16'
            }
            title={`Crop & Refine Photo: ${photo.metadata.title}`}
            postButtonLabel="Apply Crop to Memory"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
