import { useState } from 'react';
import { useVaultStore } from '../../stores/useVaultStore';
import { FolderPlus, Folder, Image as ImageIcon, Sparkles, X, Plus } from 'lucide-react';

export function AlbumsView({ onSelectAlbum }: { onSelectAlbum: (albumId: string) => void }) {
  const { albums, photos, createAlbum, activeAlbumId, setActiveAlbumId } = useVaultStore();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await createAlbum(name.trim(), description.trim() || undefined);
    setName('');
    setDescription('');
    setIsCreateOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
            <Folder className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Family Memory Albums</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Themed collections, generational archives, and travel chronicles.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-glow transition-all"
        >
          <FolderPlus className="w-4 h-4" />
          <span>New Album</span>
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
          className={`glass-panel-interactive rounded-3xl overflow-hidden cursor-pointer border p-6 flex flex-col justify-between min-h-[220px] transition-all ${
            activeAlbumId === null
              ? 'border-purple-500/60 bg-purple-950/20 shadow-glow'
              : 'border-white/5'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-white/10 text-slate-200">
              {photos.filter((p) => !p.inTrash).length} Photos
            </span>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">All Memories</h3>
            <p className="text-xs text-slate-400 mt-1">
              Entire family memory universe without album restrictions.
            </p>
          </div>
        </div>

        {/* Existing Albums */}
        {albums.map((album) => {
          const albumPhotos = photos.filter((p) => p.albumId === album.id && !p.inTrash);
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
              className={`group relative rounded-3xl overflow-hidden glass-panel-interactive cursor-pointer border transition-all ${
                isSelected ? 'border-purple-500/60 shadow-glow' : 'border-white/5'
              }`}
            >
              <div className="relative aspect-[16/9] bg-slate-950 overflow-hidden">
                <img
                  src={coverUrl}
                  alt={album.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />

                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-black/60 backdrop-blur-md text-white border border-white/10">
                  {albumPhotos.length} Photos
                </span>
              </div>

              <div className="p-5">
                <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                  {album.name}
                </h3>
                {album.description && (
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{album.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Album Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 border border-white/10 shadow-2xl relative">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">Create Memory Album</h3>
            <p className="text-xs text-slate-400 mb-4">
              Organize special occasions, generational timelines, or journeys.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Album Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Summer in Tuscany 2024"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass-input w-full p-2.5 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="A few words about this collection of family moments..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="glass-input w-full p-2.5 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-glow"
                >
                  Create Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
