import { useState, useEffect } from 'react';
import { useVaultStore } from '../../stores/useVaultStore';
import { Play, Pause, X, ChevronLeft, ChevronRight, Calendar, MapPin } from 'lucide-react';

export function SlideshowModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { photos } = useVaultStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const activePhotos = photos.filter((p) => !p.inTrash);

  useEffect(() => {
    if (!isOpen || !isPlaying || activePhotos.length === 0) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activePhotos.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isOpen, isPlaying, activePhotos.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
      if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev + 1) % activePhotos.length);
      }
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : activePhotos.length - 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activePhotos.length, onClose]);

  if (!isOpen || activePhotos.length === 0) return null;

  const currentPhoto = activePhotos[currentIndex];
  const photoUrl =
    currentPhoto.decryptedFullUrl || currentPhoto.decryptedThumbUrl || currentPhoto.thumbStoragePath;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden animate-in fade-in select-none">
      {/* Top Controls Bar */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 flex items-center gap-2 sm:gap-3">
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-2.5 sm:p-3 rounded-full bg-black/60 border border-white/20 text-white hover:bg-black/90 transition-all"
          title={isPlaying ? 'Pause Slideshow (Space)' : 'Play Slideshow (Space)'}
        >
          {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />}
        </button>
        <button
          onClick={onClose}
          className="p-2.5 sm:p-3 rounded-full bg-black/60 border border-white/20 text-white hover:bg-black/90 transition-all"
          title="Exit Slideshow (Esc)"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Prev / Next Chevrons */}
      <button
        onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : activePhotos.length - 1))}
        className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-40 p-2.5 sm:p-4 rounded-full bg-black/50 text-white hover:bg-black/80 transition-all hover:scale-110"
      >
        <ChevronLeft className="w-5 h-5 sm:w-7 sm:h-7" />
      </button>

      <button
        onClick={() => setCurrentIndex((prev) => (prev + 1) % activePhotos.length)}
        className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-40 p-2.5 sm:p-4 rounded-full bg-black/50 text-white hover:bg-black/80 transition-all hover:scale-110"
      >
        <ChevronRight className="w-5 h-5 sm:w-7 sm:h-7" />
      </button>

      {/* Main Slide Image */}
      <div className="relative w-full h-full flex items-center justify-center p-6 md:p-12">
        <img
          key={currentPhoto.id}
          src={photoUrl}
          alt={currentPhoto.metadata.title}
          className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-700"
        />

        {/* Ambient Blurred Glow Backdrop */}
        <div
          className="absolute inset-0 -z-10 opacity-30 blur-3xl scale-110 bg-cover bg-center transition-all duration-1000"
          style={{ backgroundImage: `url(${photoUrl})` }}
        />
      </div>

      {/* Bottom Floating Story Banner */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 w-[90vw] max-w-2xl text-center pointer-events-none">
        <div className="glass-panel px-6 py-4 rounded-2xl border border-white/10 shadow-2xl pointer-events-auto inline-block">
          <h3 className="text-lg md:text-xl font-bold text-white mb-1">
            {currentPhoto.metadata.title}
          </h3>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-300">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              {currentPhoto.metadata.captureDate}
            </span>
            {currentPhoto.metadata.location?.label && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                {currentPhoto.metadata.location.label}
              </span>
            )}
            <span className="text-purple-400 font-mono">
              {currentIndex + 1} / {activePhotos.length}
            </span>
          </div>
          {currentPhoto.metadata.story && (
            <p className="text-xs text-slate-300 mt-2 line-clamp-2 max-w-lg mx-auto italic">
              "{currentPhoto.metadata.story}"
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
