import { useState, useMemo } from 'react';
import type { Photo } from '../../types';
import { Heart, MapPin, Calendar, Eye, Layers } from 'lucide-react';

interface Fallback2DGalleryProps {
  photos: Photo[];
  onSelectPhoto: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export function Fallback2DGallery({
  photos,
  onSelectPhoto,
  onToggleFavorite,
}: Fallback2DGalleryProps) {
  const [filter, setFilter] = useState<'all' | 'landscape' | 'portrait'>('all');

  const filteredPhotos = useMemo(() => {
    return photos.filter((p) => {
      const isPortrait = p.height > p.width || p.orientation === 'portrait';
      if (filter === 'landscape' && isPortrait) return false;
      if (filter === 'portrait' && !isPortrait) return false;
      return true;
    });
  }, [photos, filter]);

  const landscapeCount = photos.filter((p) => p.width >= p.height && p.orientation !== 'portrait').length;
  const portraitCount = photos.filter((p) => p.height > p.width || p.orientation === 'portrait').length;

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-900/20 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
          <Eye className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-medium text-slate-200">No Memories Found</h3>
        <p className="text-sm text-slate-400 max-w-sm mt-1">
          Adjust your filters or upload new photos to populate your family gallery.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Aspect Ratio & Orientation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 px-1 sm:px-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-300 font-serif">Vault Gallery</span>
          <span className="text-xs text-slate-500">•</span>
          <span className="text-xs text-slate-400 font-sans">{filteredPhotos.length} Memories</span>
        </div>

        <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md p-1 rounded-2xl border border-white/10 text-xs font-sans max-w-full overflow-x-auto no-scrollbar">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              filter === 'all'
                ? 'bg-vault-gold text-black font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ✦ All ({photos.length})
          </button>
          <button
            onClick={() => setFilter('landscape')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              filter === 'landscape'
                ? 'bg-vault-gold text-black font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>▱ Landscape (16:9)</span>
            <span className="text-[10px] opacity-75 font-mono">({landscapeCount})</span>
          </button>
          <button
            onClick={() => setFilter('portrait')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap ${
              filter === 'portrait'
                ? 'bg-vault-gold text-black font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>▯ Portrait (9:16)</span>
            <span className="text-[10px] opacity-75 font-mono">({portraitCount})</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4 p-1 sm:p-4">
        {filteredPhotos.map((photo) => {
          const isPortrait = photo.height > photo.width || photo.orientation === 'portrait';
          const thumbUrl = photo.decryptedThumbUrl || photo.thumbStoragePath;
          return (
            <div
              key={photo.id}
              onClick={() => onSelectPhoto(photo.id)}
              className="group relative rounded-2xl overflow-hidden glass-panel-interactive cursor-pointer border border-white/5 hover:border-vault-gold/40 flex flex-col justify-between"
            >
              {/* Image Preview Container (Strict 16:9 Landscape vs 9:16 Portrait) */}
              <div className={`relative ${isPortrait ? 'aspect-[9/16]' : 'aspect-[16/9]'} bg-slate-950 overflow-hidden`}>
                <img
                  src={thumbUrl}
                  alt={photo.metadata.title}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Gradient Dark Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Orientation Badge */}
                <span className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-mono bg-black/70 backdrop-blur-md text-slate-300 border border-white/10">
                  {isPortrait ? '▯ 9:16' : '▱ 16:9'}
                </span>

                {/* Favorite Badge (Always accessible on touch devices) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(photo.id);
                  }}
                  className={`absolute top-2 right-2 sm:top-2.5 sm:right-2.5 p-1.5 rounded-full transition-all ${
                    photo.isFavorite
                      ? 'bg-rose-500 text-white shadow-lg opacity-100'
                      : 'bg-black/60 text-slate-300 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:text-white'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${photo.isFavorite ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Photo Info Card Footer */}
              <div className="p-2 sm:p-3">
                <h4 className="text-xs sm:text-sm font-semibold text-slate-100 truncate group-hover:text-vault-gold transition-colors font-serif">
                  {photo.metadata.title}
                </h4>
                <div className="flex items-center gap-1.5 sm:gap-2 mt-1 text-[11px] sm:text-xs text-slate-400 font-sans">
                  <span className="flex items-center gap-1 flex-shrink-0">
                    <Calendar className="w-3 h-3 text-vault-gold" />
                    <span>{photo.metadata.captureDate}</span>
                  </span>
                  {photo.metadata.location?.label && (
                    <span className="flex items-center gap-1 truncate text-slate-500">
                      <MapPin className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                      <span className="truncate">{photo.metadata.location.label}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
