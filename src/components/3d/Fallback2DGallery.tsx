import type { Photo } from '../../types';
import { Heart, MapPin, Calendar, Eye } from 'lucide-react';

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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
      {photos.map((photo) => {
        const thumbUrl = photo.decryptedThumbUrl || photo.thumbStoragePath;
        return (
          <div
            key={photo.id}
            onClick={() => onSelectPhoto(photo.id)}
            className="group relative rounded-2xl overflow-hidden glass-panel-interactive cursor-pointer border border-white/5 hover:border-purple-500/40"
          >
            {/* Image Preview Container */}
            <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden">
              <img
                src={thumbUrl}
                alt={photo.metadata.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              {/* Gradient Dark Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Favorite Badge */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(photo.id);
                }}
                className={`absolute top-2.5 right-2.5 p-1.5 rounded-full transition-all ${
                  photo.isFavorite
                    ? 'bg-rose-500/80 text-white shadow-lg'
                    : 'bg-black/50 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-white'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${photo.isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Photo Info Card Footer */}
            <div className="p-3">
              <h4 className="text-sm font-semibold text-slate-100 truncate group-hover:text-purple-300 transition-colors">
                {photo.metadata.title}
              </h4>
              <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-purple-400" />
                  {photo.metadata.captureDate}
                </span>
                {photo.metadata.location?.label && (
                  <span className="flex items-center gap-1 truncate">
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
  );
}
