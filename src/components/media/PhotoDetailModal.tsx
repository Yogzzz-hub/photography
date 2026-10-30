import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useVaultStore } from '../../stores/useVaultStore';
import { vaultAudio } from '../../services/audioSynthesizer';
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
} from 'lucide-react';

interface PhotoDetailModalProps {
  photoId: string | null;
  onClose: () => void;
}

export function PhotoDetailModal({ photoId, onClose }: PhotoDetailModalProps) {
  const {
    photos,
    albums,
    currentMember,
    updatePhotoMetadata,
    toggleFavorite,
    moveToTrash,
  } = useVaultStore();

  const photo = photos.find((p) => p.id === photoId);
  const [isEditing, setIsEditing] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  // Form State for editing
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [captureDate, setCaptureDate] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [targetAlbumId, setTargetAlbumId] = useState('');

  useEffect(() => {
    if (photo) {
      setTitle(photo.metadata.title);
      setStory(photo.metadata.story || '');
      setCaptureDate(photo.metadata.captureDate);
      setLocationLabel(photo.metadata.location?.label || '');
      setTagsInput(photo.metadata.tags.join(', '));
      setTargetAlbumId(photo.albumId);
      setIsEditing(false);
    }
  }, [photo]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (!isEditing && photoId) {
        const currentIndex = photos.findIndex((p) => p.id === photoId);
        if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) {
          useVaultStore.getState().setSelectedPhotoId(photos[currentIndex + 1].id);
        } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
          useVaultStore.getState().setSelectedPhotoId(photos[currentIndex - 1].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [photoId, photos, isEditing, onClose]);

  const currentAlbum = photo ? albums.find((a) => a.id === photo.albumId) : null;
  const currentIndex = photo ? photos.findIndex((p) => p.id === photo.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < photos.length - 1;

  const handleSave = async () => {
    if (!photo) return;
    const updatedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    await updatePhotoMetadata(photo.id, {
      title,
      story,
      captureDate,
      tags: updatedTags,
      location: locationLabel
        ? {
            latitude: photo.metadata.location?.latitude || 0,
            longitude: photo.metadata.location?.longitude || 0,
            label: locationLabel,
          }
        : undefined,
    });

    if (targetAlbumId && targetAlbumId !== photo.albumId) {
      useVaultStore.getState().setPhotoAlbum(photo.id, targetAlbumId);
    }

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

  return (
    <AnimatePresence>
      {photo && (
        <motion.div
          key="photo-detail-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-2xl select-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {/* Navigation Previous Button */}
          {hasPrev && (
            <motion.button
              key="prev-button"
              initial={{ opacity: 0, x: -16, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -10, scale: 0.9 }}
              whileHover={{ scale: 1.12, backgroundColor: 'rgba(255, 255, 255, 0.16)' }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', damping: 22, stiffness: 320 }}
              onClick={() => useVaultStore.getState().setSelectedPhotoId(photos[currentIndex - 1].id)}
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-50 p-3 sm:p-3.5 rounded-full glass-panel text-white hover:border-vault-gold/50 shadow-2xl hidden md:flex items-center justify-center cursor-pointer"
              title="Previous Photo (←)"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </motion.button>
          )}

          {/* Navigation Next Button */}
          {hasNext && (
            <motion.button
              key="next-button"
              initial={{ opacity: 0, x: 16, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.9 }}
              whileHover={{ scale: 1.12, backgroundColor: 'rgba(255, 255, 255, 0.16)' }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', damping: 22, stiffness: 320 }}
              onClick={() => useVaultStore.getState().setSelectedPhotoId(photos[currentIndex + 1].id)}
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-50 p-3 sm:p-3.5 rounded-full glass-panel text-white hover:border-vault-gold/50 shadow-2xl hidden md:flex items-center justify-center cursor-pointer"
              title="Next Photo (→)"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </motion.button>
          )}

          <motion.div
            key="photo-modal-card"
            initial={{ opacity: 0, scale: 0.88, y: 22 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 14 }}
            transition={{
              type: 'spring',
              damping: 28,
              stiffness: 320,
              mass: 0.85,
            }}
            className="glass-panel w-full max-w-6xl max-h-[94vh] rounded-3xl overflow-hidden flex flex-col lg:flex-row shadow-2xl border border-white/10 relative"
          >
            {/* Close Button */}
            <motion.button
              whileHover={{ scale: 1.12, rotate: 90 }}
              whileTap={{ scale: 0.92 }}
              onClick={onClose}
              title="Close Photo Detail (Esc)"
              aria-label="Close Photo Detail"
              className="absolute top-3 right-3 sm:top-4 sm:right-4 z-40 p-2 sm:p-2.5 rounded-full bg-black/75 text-slate-300 hover:text-white hover:bg-black/90 transition-colors border border-white/15 shadow-lg cursor-pointer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </motion.button>

            {/* Left / Center: High-Fidelity Photo Viewer */}
            <div className="relative flex-1 bg-black/70 flex items-center justify-center overflow-hidden min-h-[180px] sm:min-h-[300px] lg:min-h-[600px] max-h-[35vh] sm:max-h-[44vh] lg:max-h-full">
              <AnimatePresence mode="wait">
                <motion.img
                  key={photo.id}
                  src={photo.decryptedFullUrl || photo.decryptedThumbUrl || photo.thumbStoragePath}
                  alt={photo.metadata.title}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: isZoomed ? 1.5 : 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{
                    opacity: { duration: 0.22, ease: 'easeOut' },
                    scale: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
                  }}
                  className={`max-w-full max-h-full object-contain ${
                    isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
                  }`}
                  onClick={() => setIsZoomed(!isZoomed)}
                />
              </AnimatePresence>

              {/* Quick Floating Overlay Toolbar */}
              <div className="absolute bottom-2.5 left-2.5 sm:bottom-4 sm:left-4 flex items-center gap-1.5 sm:gap-2 z-30">
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => toggleFavorite(photo.id)}
                  className={`p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer ${
                    photo.isFavorite
                      ? 'bg-rose-600 text-white shadow-lg'
                      : 'glass-panel-interactive text-slate-300 hover:text-white'
                  }`}
                  title="Toggle Favorite"
                >
                  <Heart className={`w-3.5 sm:w-4 h-3.5 sm:h-4 ${photo.isFavorite ? 'fill-current' : ''}`} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={handleDownload}
                  className="glass-panel-interactive p-2 sm:p-2.5 rounded-xl text-slate-300 hover:text-white cursor-pointer"
                  title="Download Decrypted Original"
                >
                  <Download className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setIsZoomed(!isZoomed)}
                  className="glass-panel-interactive p-2 sm:p-2.5 rounded-xl text-slate-300 hover:text-white cursor-pointer"
                  title={isZoomed ? 'Zoom Out' : 'Zoom In'}
                >
                  <Maximize2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                </motion.button>
              </div>
            </div>

            {/* Right: Memory Story & Metadata Panel */}
            <div className="w-full lg:w-96 p-3.5 sm:p-6 overflow-y-auto flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-white/10 bg-vault-card/70 max-h-[55vh] lg:max-h-none">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`meta-${photo.id}`}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="space-y-5"
                >
                  {/* Header info */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Family Memory Story</span>
                      </span>
                      {!isEditing && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="text-xs text-slate-400 hover:text-purple-300 flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>

                    {isEditing ? (
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="glass-input w-full p-2.5 rounded-xl text-base font-bold text-white mb-2"
                      />
                    ) : (
                      <h2 className="text-xl font-bold text-white leading-snug">{photo.metadata.title}</h2>
                    )}

                    <div className="text-xs text-slate-400 mt-1 flex items-center flex-wrap gap-2">
                      <span>By {photo.uploaderName}</span>
                      <span>•</span>
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <Folder className="w-3.5 h-3.5 text-vault-gold" />
                          <select
                            value={targetAlbumId}
                            onChange={(e) => setTargetAlbumId(e.target.value)}
                            className="glass-input p-1 rounded-lg text-xs bg-slate-900 border border-white/20 text-vault-gold cursor-pointer"
                          >
                            {albums.map((alb) => (
                              <option key={alb.id} value={alb.id}>
                                {alb.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Folder className="w-3.5 h-3.5 text-vault-gold" />
                          <span>Album: {currentAlbum?.name || 'General'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date & Location Badges */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <Calendar className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      {isEditing ? (
                        <input
                          type="date"
                          value={captureDate}
                          onChange={(e) => setCaptureDate(e.target.value)}
                          className="glass-input p-1.5 rounded-lg text-xs"
                        />
                      ) : (
                        <span>{photo.metadata.captureDate}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-cyan-300">
                      <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      {isEditing ? (
                        <input
                          type="text"
                          placeholder="Location label"
                          value={locationLabel}
                          onChange={(e) => setLocationLabel(e.target.value)}
                          className="glass-input p-1.5 rounded-lg text-xs w-full"
                        />
                      ) : (
                        <span>{photo.metadata.location?.label || 'No location specified'}</span>
                      )}
                    </div>
                  </div>

                  {/* Story / Detailed Memory Notes */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-300 mb-1.5">The Memory Story</h4>
                    {isEditing ? (
                      <textarea
                        rows={4}
                        value={story}
                        onChange={(e) => setStory(e.target.value)}
                        placeholder="Tell the story behind this memory for future generations..."
                        className="glass-input w-full p-2.5 rounded-xl text-xs text-slate-200"
                      />
                    ) : (
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-white/5 p-3 rounded-xl border border-white/5">
                        {photo.metadata.story ||
                          photo.metadata.notes ||
                          'No written narrative recorded yet. Tap edit to preserve the story.'}
                      </p>
                    )}
                  </div>

                  {/* Tags */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-purple-400" />
                      <span>Tags</span>
                    </h4>
                    {isEditing ? (
                      <input
                        type="text"
                        placeholder="reunion, summer, lake"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                        className="glass-input w-full p-2 rounded-xl text-xs"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {photo.metadata.tags.length > 0 ? (
                          photo.metadata.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded-lg bg-purple-900/30 border border-purple-500/20 text-[11px] text-purple-300 font-medium"
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

              {/* Action Footer */}
              <div className="pt-6 mt-6 border-t border-white/10 flex items-center justify-between">
                {isEditing ? (
                  <div className="flex items-center gap-2 w-full">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-glow flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Save Memory</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Move to Trash</span>
                    </button>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {(photo.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB • E2EE
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
