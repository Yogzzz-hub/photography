import { useState, useMemo } from 'react';
import { useVaultStore } from '../../stores/useVaultStore';
import {
  FolderPlus,
  Folder,
  Sparkles,
  X,
  Check,
  Search,
  CheckSquare,
  Square,
  Layers,
  Eye,
  PlusCircle,
} from 'lucide-react';
import type { Album } from '../../types';

export function AlbumsView({ onSelectAlbum }: { onSelectAlbum: (albumId: string) => void }) {
  const {
    albums,
    photos,
    createAlbum,
    assignPhotosToAlbum,
    activeAlbumId,
    setActiveAlbumId,
  } = useVaultStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');
  const [orientationFilter, setOrientationFilter] = useState<'all' | 'landscape' | 'portrait'>('all');

  // Existing album edit / group memories modal
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [editSelectedPhotoIds, setEditSelectedPhotoIds] = useState<Set<string>>(new Set());

  // Non-trashed photos
  const availablePhotos = useMemo(() => {
    return photos.filter((p) => !p.inTrash);
  }, [photos]);

  // Filtered photos for creation picker
  const filteredPhotos = useMemo(() => {
    return availablePhotos.filter((p) => {
      const isPortrait = p.height > p.width || p.orientation === 'portrait';
      if (orientationFilter === 'landscape' && isPortrait) return false;
      if (orientationFilter === 'portrait' && !isPortrait) return false;

      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchesTitle = p.metadata.title.toLowerCase().includes(q);
        const matchesTags = p.metadata.tags.some((t) => t.toLowerCase().includes(q));
        const matchesLocation = p.metadata.location?.label.toLowerCase().includes(q);
        if (!matchesTitle && !matchesTags && !matchesLocation) return false;
      }
      return true;
    });
  }, [availablePhotos, orientationFilter, searchFilter]);

  const toggleSelectPhoto = (id: string) => {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      filteredPhotos.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const handleClearAll = () => {
    setSelectedPhotoIds(new Set());
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await createAlbum(name.trim(), description.trim() || undefined, Array.from(selectedPhotoIds));
    setName('');
    setDescription('');
    setSelectedPhotoIds(new Set());
    setIsCreateOpen(false);
  };

  // Open "Manage / Group Photos" for an existing album
  const handleOpenGroupModal = (e: React.MouseEvent, album: Album) => {
    e.stopPropagation();
    setEditingAlbum(album);
    const existing = new Set(photos.filter((p) => p.albumId === album.id && !p.inTrash).map((p) => p.id));
    setEditSelectedPhotoIds(existing);
  };

  const handleSaveGroupedPhotos = () => {
    if (!editingAlbum) return;
    assignPhotosToAlbum(editingAlbum.id, Array.from(editSelectedPhotoIds));
    setEditingAlbum(null);
  };

  const toggleEditSelectPhoto = (id: string) => {
    setEditSelectedPhotoIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 sm:gap-4 shadow-xl bg-white dark:bg-[#121622]/70 text-slate-900 dark:text-white">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-purple-600/15 border border-purple-500/30 text-purple-600 dark:text-purple-400">
            <Folder className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-serif font-bold text-slate-900 dark:text-white tracking-wide">
              Family Memory Albums
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-sans">
              Curate special journeys, generational roots, and group memories by story.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedPhotoIds(new Set());
            setIsCreateOpen(true);
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold shadow-lg transition-all"
        >
          <FolderPlus className="w-4 h-4" />
          <span>Create New Album</span>
        </button>
      </div>

      {/* Albums Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* All Photos Quick Filter Card */}
        <div
          onClick={() => {
            setActiveAlbumId(null);
            onSelectAlbum('all');
          }}
          className={`glass-panel-interactive rounded-3xl overflow-hidden cursor-pointer border p-6 flex flex-col justify-between min-h-[240px] transition-all bg-white dark:bg-[#121622]/70 text-slate-900 dark:text-white shadow-sm ${
            activeAlbumId === null
              ? 'border-vault-gold/60 bg-amber-50/50 dark:bg-vault-gold/[0.04] shadow-glow'
              : 'border-black/10 dark:border-white/5 hover:border-black/20 dark:hover:border-white/15'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-3.5 rounded-2xl bg-amber-100 dark:bg-vault-gold/15 text-amber-900 dark:text-vault-gold border border-amber-300 dark:border-vault-gold/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-black/5 dark:bg-white/10 text-amber-900 dark:text-vault-gold border border-vault-gold/20">
              {availablePhotos.length} Memories
            </span>
          </div>

          <div>
            <h3 className="text-lg font-serif font-bold text-slate-900 dark:text-white tracking-wide">
              All Memories Mosaic
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-sans">
              Explore the entire family memory cosmos across 108 orbiting coordinates.
            </p>
          </div>

          <div className="pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
            <span>
              {availablePhotos.filter((p) => p.width >= p.height).length} Landscape •{' '}
              {availablePhotos.filter((p) => p.height > p.width).length} Portrait
            </span>
            <span className="text-vault-gold font-semibold flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> View Universe
            </span>
          </div>
        </div>

        {/* Existing Albums */}
        {albums.map((album) => {
          const albumPhotos = availablePhotos.filter((p) => p.albumId === album.id);
          const landscapeCount = albumPhotos.filter((p) => p.width >= p.height).length;
          const portraitCount = albumPhotos.filter((p) => p.height > p.width).length;

          const coverUrl =
            album.coverPhotoUrl ||
            albumPhotos[0]?.decryptedThumbUrl ||
            albumPhotos[0]?.thumbStoragePath ||
            'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=600&q=80';

          const isSelected = activeAlbumId === album.id;

          return (
            <div
              key={album.id}
              onClick={() => {
                setActiveAlbumId(album.id);
                onSelectAlbum(album.id);
              }}
              className={`group relative rounded-3xl overflow-hidden glass-panel-interactive cursor-pointer border transition-all bg-white dark:bg-[#121622]/70 text-slate-900 dark:text-white shadow-sm ${
                isSelected
                  ? 'border-vault-gold/70 shadow-glow bg-amber-50/50 dark:bg-vault-gold/[0.03]'
                  : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
              }`}
            >
              <div className="relative aspect-[16/9] bg-slate-950 overflow-hidden">
                <img
                  src={coverUrl}
                  alt={album.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-black/70 backdrop-blur-md text-white border border-white/15 shadow">
                    {albumPhotos.length} Memories
                  </span>
                </div>
              </div>

              <div className="p-5 flex flex-col justify-between min-h-[140px]">
                <div>
                  <h3 className="text-base font-serif font-bold text-slate-900 dark:text-white group-hover:text-vault-gold transition-colors">
                    {album.name}
                  </h3>
                  {album.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-sans line-clamp-2">
                      {album.description}
                    </p>
                  )}
                </div>

                <div className="pt-3 mt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
                    {landscapeCount} ▱ • {portraitCount} ▯
                  </span>

                  {/* Group / Add Photos Button */}
                  <button
                    onClick={(e) => handleOpenGroupModal(e, album)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-black/5 dark:bg-white/[0.08] hover:bg-black/10 dark:hover:bg-white/[0.15] border border-black/10 dark:border-white/10 text-xs font-semibold text-amber-800 dark:text-vault-gold transition-all cursor-pointer"
                    title="Add or Remove Photos from this Album"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Group Photos</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE ALBUM MODAL WITH DEDICATED PHOTO PICKER / GROUPING */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-black/60 dark:bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-[#0b0e17] border border-black/10 dark:border-white/15 w-full max-w-2xl rounded-3xl p-4 sm:p-6 shadow-2xl relative max-h-[92vh] flex flex-col text-slate-900 dark:text-white">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-black dark:hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-2xl bg-vault-gold/15 text-vault-gold border border-vault-gold/30">
                <FolderPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-slate-900 dark:text-white">Create Memory Album</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Name your collection and select photos from your vault to group together.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 font-sans flex-1 flex flex-col min-h-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-700 dark:text-slate-300 block mb-1">Album Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Marina Beach Dawns & Festivals"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-xs bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white focus:outline-none focus:border-vault-gold"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-700 dark:text-slate-300 block mb-1">Story / Description (Optional)</label>
                  <input
                    type="text"
                    placeholder="Generational archives, journeys, milestones..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 rounded-xl text-xs bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white focus:outline-none focus:border-vault-gold"
                  />
                </div>
              </div>

              {/* PHOTO GROUPING SELECTOR */}
              <div className="flex-1 flex flex-col min-h-0 pt-2 border-t border-black/10 dark:border-white/10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-vault-gold" />
                      Select Photos to Group:
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] bg-vault-gold/20 text-vault-gold font-bold">
                      {selectedPhotoIds.size} Selected
                    </span>
                  </div>

                  {/* Orientation Filter & Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center bg-white/[0.05] p-0.5 rounded-xl border border-white/10 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setOrientationFilter('all')}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          orientationFilter === 'all' ? 'bg-vault-gold text-black font-bold' : 'text-slate-400'
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrientationFilter('landscape')}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          orientationFilter === 'landscape' ? 'bg-vault-gold text-black font-bold' : 'text-slate-400'
                        }`}
                      >
                        ▱ Landscape
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrientationFilter('portrait')}
                        className={`px-2.5 py-1 rounded-lg transition-all ${
                          orientationFilter === 'portrait' ? 'bg-vault-gold text-black font-bold' : 'text-slate-400'
                        }`}
                      >
                        ▯ Portrait
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-[11px] text-vault-gold hover:underline"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-[11px] text-slate-400 hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Search Bar for Photos */}
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search by title, location, or tag..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white focus:outline-none focus:border-vault-gold"
                  />
                </div>

                {/* Scrollable Photo Grid */}
                <div className="flex-1 overflow-y-auto max-h-[300px] rounded-2xl border border-black/10 dark:border-white/10 p-2 bg-slate-100 dark:bg-slate-950/60 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {filteredPhotos.map((photo) => {
                    const isSelected = selectedPhotoIds.has(photo.id);
                    const isPortrait = photo.height > photo.width || photo.orientation === 'portrait';
                    const thumbUrl = photo.decryptedThumbUrl || photo.thumbStoragePath;

                    return (
                      <div
                        key={photo.id}
                        onClick={() => toggleSelectPhoto(photo.id)}
                        className={`relative rounded-xl overflow-hidden cursor-pointer border transition-all flex flex-col group ${
                          isSelected
                            ? 'border-vault-gold shadow-glow bg-amber-100/50 dark:bg-vault-gold/10'
                            : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/30 bg-white dark:bg-white/[0.02]'
                        }`}
                      >
                        <div className={`relative ${isPortrait ? 'aspect-[9/16]' : 'aspect-[16/9]'} bg-slate-200 dark:bg-slate-900 overflow-hidden`}>
                          <img
                            src={thumbUrl}
                            alt={photo.metadata.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute top-1.5 right-1.5">
                            {isSelected ? (
                              <div className="w-5 h-5 rounded-full bg-vault-gold text-black flex items-center justify-center shadow">
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-black/60 border border-white/30 flex items-center justify-center text-transparent group-hover:border-white">
                                <Check className="w-3 h-3" />
                              </div>
                            )}
                          </div>

                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/75 text-slate-300">
                            {isPortrait ? '▯ 9:16' : '▱ 16:9'}
                          </span>
                        </div>

                        <div className="p-1.5">
                          <p className="text-[11px] font-medium text-slate-900 dark:text-white truncate">
                            {photo.metadata.title}
                          </p>
                          <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate">
                            {photo.metadata.captureDate}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
                  {selectedPhotoIds.size} of {availablePhotos.length} memories grouped
                </span>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-initial px-6 py-2.5 rounded-2xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold shadow-lg transition-all"
                  >
                    Create & Group {selectedPhotoIds.size > 0 ? `(${selectedPhotoIds.size})` : ''}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE / GROUP PHOTOS MODAL FOR EXISTING ALBUMS */}
      {editingAlbum && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 bg-black/60 dark:bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-[#0b0e17] border border-black/10 dark:border-white/15 w-full max-w-2xl rounded-3xl p-4 sm:p-6 shadow-2xl relative max-h-[92vh] flex flex-col text-slate-900 dark:text-white">
            <button
              onClick={() => setEditingAlbum(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-black dark:hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-2xl bg-vault-gold/15 text-vault-gold border border-vault-gold/30">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-slate-900 dark:text-white">
                  Group Memories into {editingAlbum.name}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Check memories to include in this album, or uncheck to remove them.
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[380px] rounded-2xl border border-black/10 dark:border-white/10 p-2 bg-slate-100 dark:bg-slate-950/60 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 mt-3">
              {availablePhotos.map((photo) => {
                const isSelected = editSelectedPhotoIds.has(photo.id);
                const isPortrait = photo.height > photo.width || photo.orientation === 'portrait';
                const thumbUrl = photo.decryptedThumbUrl || photo.thumbStoragePath;

                return (
                  <div
                    key={photo.id}
                    onClick={() => toggleEditSelectPhoto(photo.id)}
                    className={`relative rounded-xl overflow-hidden cursor-pointer border transition-all flex flex-col group ${
                      isSelected
                        ? 'border-vault-gold shadow-glow bg-amber-100/50 dark:bg-vault-gold/10'
                        : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/30 bg-white dark:bg-white/[0.02]'
                    }`}
                  >
                    <div className={`relative ${isPortrait ? 'aspect-[9/16]' : 'aspect-[16/9]'} bg-slate-200 dark:bg-slate-900 overflow-hidden`}>
                      <img
                        src={thumbUrl}
                        alt={photo.metadata.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute top-1.5 right-1.5">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-vault-gold text-black flex items-center justify-center shadow">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-black/60 border border-white/30 flex items-center justify-center text-transparent group-hover:border-white">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/75 text-slate-300">
                        {isPortrait ? '▯ 9:16' : '▱ 16:9'}
                      </span>
                    </div>

                    <div className="p-1.5">
                      <p className="text-[11px] font-medium text-slate-900 dark:text-white truncate">
                        {photo.metadata.title}
                      </p>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate">
                        {photo.metadata.captureDate}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 mt-3 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
                {editSelectedPhotoIds.size} memories assigned to this album
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setEditingAlbum(null)}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveGroupedPhotos}
                  className="flex-1 sm:flex-initial px-6 py-2.5 rounded-2xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold shadow-lg transition-all"
                >
                  Save Grouped Memories
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
