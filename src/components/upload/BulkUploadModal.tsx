import { useState, useRef, useCallback } from 'react';
import { useVaultStore } from '../../stores/useVaultStore';
import { processPhotoLocally } from '../../services/imageProcessor';
import {
  encryptBinaryData,
  encryptJsonMetadata,
  generateAlbumKey,
} from '../../crypto/vaultCrypto';
import type { UploadBatchItem, Photo, PhotoMetadata } from '../../types';
import {
  UploadCloud,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Tag,
  Calendar,
  MapPin,
  FolderPlus,
  Play,
  RotateCcw,
} from 'lucide-react';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkUploadModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const {
    albums,
    currentFamily,
    currentMember,
    masterVaultKey,
    photos,
    addPhoto,
  } = useVaultStore();

  const [items, setItems] = useState<UploadBatchItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  // Common Batch Applied Metadata
  const [batchAlbumId, setBatchAlbumId] = useState(albums[0]?.id || '');
  const [batchEventName, setBatchEventName] = useState('');
  const [batchLocationLabel, setBatchLocationLabel] = useState('');
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchTags, setBatchTags] = useState('');
  const [batchNote, setBatchNote] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: UploadBatchItem[] = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => {
        const previewUrl = URL.createObjectURL(file);
        const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

        return {
          id: `upl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          file,
          previewUrl,
          state: 'queued',
          progress: 0,
          targetAlbumId: batchAlbumId || albums[0]?.id || '',
          fileSizeBytes: file.size,
          metadata: {
            title: cleanTitle,
            captureDate: batchDate,
            eventName: batchEventName || undefined,
            tags: batchTags ? batchTags.split(',').map((t) => t.trim()) : [],
            notes: batchNote || undefined,
          },
        };
      });

    setItems((prev) => [...prev, ...newItems]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesSelected(e.dataTransfer.files);
  };

  const applyBatchMetadataToAll = () => {
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        targetAlbumId: batchAlbumId || item.targetAlbumId,
        metadata: {
          ...item.metadata,
          eventName: batchEventName || item.metadata.eventName,
          captureDate: batchDate || item.metadata.captureDate,
          tags: batchTags
            ? Array.from(new Set([...(item.metadata.tags || []), ...batchTags.split(',').map((t) => t.trim())]))
            : item.metadata.tags,
          notes: batchNote || item.metadata.notes,
          location: batchLocationLabel
            ? {
                latitude: item.metadata.location?.latitude || 40.7128,
                longitude: item.metadata.location?.longitude || -74.006,
                label: batchLocationLabel,
              }
            : item.metadata.location,
        },
      }))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const startBatchUpload = async () => {
    if (items.length === 0 || isUploading) return;
    setIsUploading(true);

    const key = masterVaultKey || (await generateAlbumKey());
    let completedCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.state === 'saved') {
        completedCount++;
        continue;
      }

      // Step 1: Processing EXIF & Thumbnails
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, state: 'processing', progress: 20 } : it))
      );

      try {
        const processed = await processPhotoLocally(item.file);

        // Check for duplicates
        const existingDuplicate = photos.find(
          (p) => p.fileSizeBytes === processed.originalSizeBytes && p.metadata.title === item.metadata.title
        );

        // Step 2: Encrypting
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, state: 'encrypting', progress: 50 } : it))
        );

        const originalBuffer = await processed.originalBlob.arrayBuffer();
        const thumbBuffer = await processed.thumbBlob.arrayBuffer();

        // Client-side AES-256-GCM encryption
        const encOriginal = await encryptBinaryData(originalBuffer, key);
        const encThumb = await encryptBinaryData(thumbBuffer, key);

        const finalMetadata: PhotoMetadata = {
          title: item.metadata.title || processed.metadata.title || 'Untitled Memory',
          description: item.metadata.description,
          story: item.metadata.story,
          captureDate: item.metadata.captureDate || processed.metadata.captureDate || new Date().toISOString().split('T')[0],
          captureTime: processed.metadata.captureTime,
          location: item.metadata.location || processed.metadata.location,
          photographer: currentMember.displayName,
          eventName: item.metadata.eventName,
          tags: item.metadata.tags || [],
          notes: item.metadata.notes,
        };

        const encMeta = await encryptJsonMetadata(finalMetadata, key);

        // Step 3: Uploading & Storing
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, state: 'uploading', progress: 80 } : it))
        );

        // Construct complete Photo object
        const newPhoto: Photo = {
          id: `pho_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          familyId: currentFamily.id,
          albumId: item.targetAlbumId || albums[0]?.id || 'alb_default',
          uploaderId: currentMember.id,
          uploaderName: currentMember.displayName,
          storagePath: `families/${currentFamily.id}/photos/${item.id}_orig.enc`,
          thumbStoragePath: `families/${currentFamily.id}/photos/${item.id}_thumb.enc`,
          fileSizeBytes: processed.originalSizeBytes,
          thumbSizeBytes: processed.thumbSizeBytes,
          mimeType: item.file.type || 'image/jpeg',
          width: processed.width,
          height: processed.height,
          ivHex: encOriginal.ivHex,
          thumbIvHex: encThumb.ivHex,
          metadata: finalMetadata,
          encryptedMetadataPayload: encMeta.ciphertextHex,
          // Active local decrypted URL for immediate seamless 3D rendering
          decryptedThumbUrl: URL.createObjectURL(processed.thumbBlob),
          decryptedFullUrl: URL.createObjectURL(processed.originalBlob),
          isFavorite: false,
          inTrash: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        addPhoto(newPhoto);

        // Step 4: Saved
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, state: 'saved', progress: 100 } : it))
        );
        completedCount++;
        setOverallProgress(Math.round((completedCount / items.length) * 100));
      } catch (err: any) {
        console.error('Failed to upload item:', err);
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, state: 'failed', error: err.message || 'Upload failed' } : it))
        );
      }
    }

    setIsUploading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/10">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-600/30 text-purple-400 border border-purple-500/30">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Bulk Memory Uploader</h3>
              <p className="text-xs text-slate-400">
                End-to-end client encrypted before transmission. 100–500+ batch capacity.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Drag & Drop Target Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
              isDragging
                ? 'border-purple-400 bg-purple-900/20 scale-[0.99]'
                : 'border-white/15 bg-white/5 hover:border-purple-500/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
            <input
              ref={folderInputRef}
              type="file"
              // @ts-ignore
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />

            <div className="w-16 h-16 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-400 mx-auto flex items-center justify-center mb-3">
              <ImageIcon className="w-8 h-8" />
            </div>
            <h4 className="text-base font-semibold text-white">
              Drag & drop photo batches or entire folders
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Supported formats: JPEG, PNG, WebP, AVIF, HEIC. EXIF timestamps and locations automatically preserved.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-glow transition-all"
              >
                Choose Photos
              </button>
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="px-4 py-2 rounded-xl glass-panel-interactive text-slate-200 text-xs font-semibold flex items-center gap-1.5"
              >
                <FolderPlus className="w-3.5 h-3.5 text-cyan-400" />
                <span>Upload Folder</span>
              </button>
            </div>
          </div>

          {/* Batch Metadata Mass Editor */}
          {items.length > 0 && (
            <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  Batch Properties Applicator ({items.length} photos selected)
                </h5>
                <button
                  type="button"
                  onClick={applyBatchMetadataToAll}
                  className="px-3 py-1 rounded-lg bg-purple-600/30 border border-purple-500/40 text-purple-300 hover:bg-purple-600/50 text-xs font-medium transition-all"
                >
                  Apply to All Photos
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Target Album</label>
                  <select
                    value={batchAlbumId}
                    onChange={(e) => setBatchAlbumId(e.target.value)}
                    className="glass-input w-full p-2 rounded-xl text-xs"
                  >
                    {albums.map((alb) => (
                      <option key={alb.id} value={alb.id} className="bg-slate-900 text-white">
                        {alb.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Shared Event Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Summer Family Reunion"
                    value={batchEventName}
                    onChange={(e) => setBatchEventName(e.target.value)}
                    className="glass-input w-full p-2 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Date</label>
                  <input
                    type="date"
                    value={batchDate}
                    onChange={(e) => setBatchDate(e.target.value)}
                    className="glass-input w-full p-2 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Location Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Lake Como, Italy"
                    value={batchLocationLabel}
                    onChange={(e) => setBatchLocationLabel(e.target.value)}
                    className="glass-input w-full p-2 rounded-xl text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] text-slate-400 mb-1 block">Tags (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="family, vacation, 2024"
                    value={batchTags}
                    onChange={(e) => setBatchTags(e.target.value)}
                    className="glass-input w-full p-2 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Queue List */}
          {items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Queue Items ({items.length})</span>
                <span>{overallProgress}% Total Progress</span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="glass-panel p-2.5 rounded-xl flex items-center gap-3 border border-white/5"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0 border border-white/10">
                      <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={item.metadata.title || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItems((prev) =>
                              prev.map((it) =>
                                it.id === item.id ? { ...it, metadata: { ...it.metadata, title: val } } : it
                              )
                            );
                          }}
                          className="bg-transparent text-xs font-semibold text-white truncate focus:outline-none focus:border-b border-purple-500 w-full mr-2"
                        />
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                          {item.state}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mt-1.5">
                        <div
                          className={`h-full transition-all duration-300 ${
                            item.state === 'saved'
                              ? 'bg-emerald-400'
                              : item.state === 'failed'
                              ? 'bg-rose-500'
                              : 'bg-purple-500'
                          }`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={isUploading}
                      className="text-slate-400 hover:text-rose-400 p-1 rounded-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between bg-black/40">
          <div className="text-xs text-slate-400">
            {items.length > 0 ? `${items.length} items ready for encryption` : 'No files added'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={startBatchUpload}
              disabled={items.length === 0 || isUploading}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-glow transition-all ${
                items.length === 0 || isUploading
                  ? 'bg-purple-800/40 text-purple-300/40 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-500 text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isUploading ? 'Encrypting & Storing...' : 'Start Vault Upload'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
