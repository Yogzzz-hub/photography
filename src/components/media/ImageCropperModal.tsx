import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Crop as CropIcon,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FlipHorizontal,
  Check,
  Send,
  Sparkles,
  Maximize2,
  RefreshCcw,
} from 'lucide-react';
import { vaultAudio } from '../../services/audioSynthesizer';
import {
  type AspectRatioOption,
  type CropState,
  calculateCropBox,
  calculateBaseFitScale,
  renderCroppedCanvas,
  dataUrlToFile,
} from '../../utils/imageCropper';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onApplyCrop: (croppedDataUrl: string, croppedFile: File) => void;
  onPostDirectly?: (croppedDataUrl: string, croppedFile: File) => void;
  initialAspectRatio?: AspectRatioOption;
  title?: string;
  postButtonLabel?: string;
}

export function ImageCropperModal({
  isOpen,
  imageUrl,
  onClose,
  onApplyCrop,
  onPostDirectly,
  initialAspectRatio = '9:16',
  title = 'Crop & Refine Memory',
  postButtonLabel = 'Crop & Post Now',
}: ImageCropperModalProps) {
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>(initialAspectRatio);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number }>({
    x: 0,
    y: 0,
    panX: 0,
    panY: 0,
  });

  // Container dimensions
  const [containerSize, setContainerSize] = useState({ width: 480, height: 420 });

  useEffect(() => {
    if (!isOpen) return;
    setZoom(1);
    setRotation(0);
    setFlipHorizontal(false);
    setPan({ x: 0, y: 0 });
    setAspectRatio(initialAspectRatio);
  }, [isOpen, initialAspectRatio, imageUrl]);

  // Track container size
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth || 480,
          height: containerRef.current.clientHeight || 420,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isOpen]);

  const cropBox = calculateCropBox(containerSize.width, containerSize.height, aspectRatio);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (naturalWidth && naturalHeight) {
      setNaturalDimensions({ width: naturalWidth, height: naturalHeight });
    }
  };

  // Base scale calculation so image fits crop box at zoom = 1 without mega-pixel distortion
  const baseScale = naturalDimensions.width && naturalDimensions.height
    ? calculateBaseFitScale(naturalDimensions.width, naturalDimensions.height, cropBox.width, cropBox.height, rotation)
    : 1;

  const displayedWidth = naturalDimensions.width ? naturalDimensions.width * baseScale : undefined;
  const displayedHeight = naturalDimensions.height ? naturalDimensions.height * baseScale : undefined;

  // Pointer drag listeners for panning image
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    const isSideways = Math.abs(rotation % 180) === 90;
    const effW = (isSideways ? (displayedHeight || cropBox.height) : (displayedWidth || cropBox.width)) * zoom;
    const effH = (isSideways ? (displayedWidth || cropBox.width) : (displayedHeight || cropBox.height)) * zoom;

    const maxPanX = Math.max(cropBox.width * 1.5, effW * 0.9);
    const maxPanY = Math.max(cropBox.height * 1.5, effH * 0.9);

    setPan({
      x: Math.max(-maxPanX, Math.min(maxPanX, dragStartRef.current.panX + dx)),
      y: Math.max(-maxPanY, Math.min(maxPanY, dragStartRef.current.panY + dy)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if pointer capture lost
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const zoomDelta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(4, Math.max(0.8, Number((prev + zoomDelta).toFixed(3)))));
  };

  // Double click toggles between 1x and 2x zoom
  const handleDoubleClick = () => {
    vaultAudio.playSnap();
    setZoom((prev) => (prev > 1.25 ? 1 : 2));
  };

  // Perform canvas crop with exact 1:1 parity to DOM viewport
  const getCroppedOutput = useCallback((): { dataUrl: string; file: File } | null => {
    const img = imageRef.current;
    if (!img) return null;

    const cropState: CropState = {
      zoom,
      rotation,
      flipHorizontal,
      panX: pan.x,
      panY: pan.y,
      aspectRatio,
      containerWidth: containerSize.width,
      containerHeight: containerSize.height,
    };

    const canvas = renderCroppedCanvas(img, cropState, cropBox, containerSize);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const file = dataUrlToFile(dataUrl, `memory-cropped-${Date.now()}.jpg`);
    return { dataUrl, file };
  }, [zoom, rotation, flipHorizontal, pan, aspectRatio, cropBox, containerSize]);

  const handleApply = () => {
    vaultAudio.playSnap();
    const result = getCroppedOutput();
    if (result) {
      onApplyCrop(result.dataUrl, result.file);
      onClose();
    }
  };

  const handlePostDirectly = () => {
    vaultAudio.playChime(659.25);
    const result = getCroppedOutput();
    if (result && onPostDirectly) {
      onPostDirectly(result.dataUrl, result.file);
      onClose();
    }
  };

  const handleRotate = () => {
    vaultAudio.playWhoosh();
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleFlip = () => {
    vaultAudio.playSnap();
    setFlipHorizontal((prev) => !prev);
  };

  const handleReset = () => {
    vaultAudio.playWhoosh();
    setZoom(1);
    setRotation(0);
    setFlipHorizontal(false);
    setPan({ x: 0, y: 0 });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-2.5 sm:p-5 bg-black/85 backdrop-blur-2xl animate-in fade-in select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[#090C14] text-white border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-black/40 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-vault-gold/15 text-vault-gold border border-vault-gold/30 flex items-center justify-center">
              <CropIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-sm sm:text-base font-bold text-white leading-tight">
                {title}
              </h3>
              <p className="text-[11px] text-slate-400 font-sans">
                Drag to pan • Mouse wheel or slider to zoom • Double-click for 2x
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Cancel Cropping (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aspect Ratio Toolbar */}
        <div className="px-5 py-2.5 bg-black/60 border-b border-white/10 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
          <span className="text-[11px] font-mono uppercase text-slate-400 font-semibold flex items-center gap-1.5 flex-shrink-0">
            <Maximize2 className="w-3 h-3 text-vault-gold" />
            <span>Ratio:</span>
          </span>
          <div className="flex items-center gap-1.5">
            {[
              { id: '9:16' as AspectRatioOption, label: '9:16 Story / Portrait' },
              { id: '16:9' as AspectRatioOption, label: '16:9 Widescreen' },
              { id: '1:1' as AspectRatioOption, label: '1:1 Square' },
              { id: '4:5' as AspectRatioOption, label: '4:5 Editorial' },
              { id: 'free' as AspectRatioOption, label: 'Free' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  vaultAudio.playWhoosh();
                  setAspectRatio(preset.id);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                  aspectRatio === preset.id
                    ? 'bg-vault-gold text-black font-bold shadow-md'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Viewport Canvas */}
        <div
          ref={containerRef}
          className="relative w-full h-[320px] sm:h-[400px] bg-[#05060A] overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
        >
          {/* Transforming Image */}
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Crop Target"
            crossOrigin="anonymous"
            draggable={false}
            onLoad={handleImageLoad}
            className="absolute pointer-events-none select-none max-w-none transition-transform duration-75"
            style={{
              width: displayedWidth ? `${displayedWidth}px` : 'auto',
              height: displayedHeight ? `${displayedHeight}px` : 'auto',
              transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scaleX(${
                flipHorizontal ? -1 : 1
              }) scale(${zoom})`,
              transformOrigin: 'center center',
            }}
          />

          {/* Dark Vignette Mask Outside Crop Box */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.7) 100%)`,
            }}
          />

          {/* Precision Golden Crop Window & Rule-of-Thirds Grid */}
          <div
            className="absolute border-2 border-vault-gold/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] pointer-events-none transition-all duration-200"
            style={{
              width: `${cropBox.width}px`,
              height: `${cropBox.height}px`,
              left: `${cropBox.x}px`,
              top: `${cropBox.y}px`,
              borderRadius: aspectRatio === '1:1' ? '16px' : '12px',
            }}
          >
            {/* Rule of Thirds Grid Lines */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
              <div className="border-r border-b border-white/40" />
              <div className="border-r border-b border-white/40" />
              <div className="border-b border-white/40" />
              <div className="border-r border-b border-white/40" />
              <div className="border-r border-b border-white/40" />
              <div className="border-b border-white/40" />
              <div className="border-r border-white/40" />
              <div className="border-r border-white/40" />
              <div />
            </div>

            {/* Corner Precision Grips */}
            <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 border-t-2 border-l-2 border-vault-gold" />
            <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 border-t-2 border-r-2 border-vault-gold" />
            <div className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 border-b-2 border-l-2 border-vault-gold" />
            <div className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 border-b-2 border-r-2 border-vault-gold" />
          </div>
        </div>

        {/* Interactive Controls & Fine-Tuning Bar */}
        <div className="px-5 py-3 bg-[#0D111C] border-t border-white/10 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          {/* Zoom Controls */}
          <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
            <button
              onClick={() => setZoom((z) => Math.max(0.8, Number((z - 0.2).toFixed(2))))}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="0.8"
              max="4"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full accent-vault-gold h-1.5 bg-white/20 rounded-lg cursor-pointer"
            />
            <button
              onClick={() => setZoom((z) => Math.min(4, Number((z + 0.2).toFixed(2))))}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs text-vault-gold w-12 text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Transform Quick Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleRotate}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Rotate 90° Clockwise"
            >
              <RotateCw className="w-3.5 h-3.5 text-vault-gold" />
              <span className="hidden sm:inline">Rotate</span>
            </button>

            <button
              onClick={handleFlip}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Flip Horizontally"
            >
              <FlipHorizontal className="w-3.5 h-3.5 text-vault-gold" />
              <span className="hidden sm:inline">Flip</span>
            </button>

            <button
              onClick={handleReset}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Reset Zoom & Pan"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-white/10 bg-[#090C14] flex items-center justify-between gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleApply}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Apply cropped image to your draft"
            >
              <Check className="w-3.5 h-3.5 text-vault-gold" />
              <span>Crop & Apply</span>
            </button>

            {onPostDirectly && (
              <button
                onClick={handlePostDirectly}
                className="px-5 py-2 rounded-xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg active:scale-95"
                title="Crop and publish memory immediately"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{postButtonLabel}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
