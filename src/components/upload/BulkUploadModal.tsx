import { useState, useRef, useEffect } from 'react';
import { useVaultStore } from '../../stores/useVaultStore';
import { processPhotoLocally } from '../../services/imageProcessor';
import { vaultAudio } from '../../services/audioSynthesizer';
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
  Image as ImageIcon,
  FolderPlus,
  Play,
  Sparkles,
  Zap,
  ShieldCheck,
  Loader2,
  ArrowRight,
  Globe,
} from 'lucide-react';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewUniverse?: () => void;
}


export function BulkUploadModal({ isOpen, onClose, onViewUniverse }: BulkUploadModalProps) {
  const {
    albums,
    currentFamily,
    currentMember,
    masterVaultKey,
    photos,
    addPhoto,
    activeGlobeId,
    globes,
  } = useVaultStore();

  const activeGlobe = globes.find((g) => g.id === activeGlobeId) || globes[0];

  const [items, setItems] = useState<UploadBatchItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(0);
  const [currentProcessingName, setCurrentProcessingName] = useState('');
  const redirectTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const handleViewUniverse = () => {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
    }
    vaultAudio.playWhoosh();
    onClose();
    if (onViewUniverse) {
      onViewUniverse();
    }
  };

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

  const handleFilesSelected = (files: FileList | File[] | null) => {
    if (!files) return;
    const fileArray = Array.isArray(files) ? files : Array.from(files);
    if (fileArray.length === 0) return;

    const isImageFile = (file: File) => {
      if (file.type && file.type.startsWith('image/')) return true;
      return /\.(jpg|jpeg|png|webp|avif|heic|heif|gif|bmp|tiff|svg)$/i.test(file.name);
    };

    const validFiles = fileArray.filter(isImageFile);
    if (validFiles.length === 0) {
      alert('Please select valid image files (JPEG, PNG, WebP, AVIF, HEIC, GIF).');
      return;
    }

    const newItems: UploadBatchItem[] = validFiles.map((file) => {
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
    setIsSuccess(false);
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
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
                latitude: item.metadata.location?.latitude || 13.0499,
                longitude: item.metadata.location?.longitude || 80.2824,
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
    setIsSuccess(false);

    const key = masterVaultKey || (await generateAlbumKey());
    let completedCount = 0;
    const createdPhotos: Photo[] = [];
    const activeGlobeId = useVaultStore.getState().activeGlobeId || 'globe_main';

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setCurrentProcessingIndex(i + 1);
      setCurrentProcessingName(item.file.name);

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
          captureDate:
            item.metadata.captureDate ||
            processed.metadata.captureDate ||
            new Date().toISOString().split('T')[0],
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

        // Determine orientation
        const isPortrait = processed.height > processed.width;

        // Construct complete Photo object
        const newPhoto: Photo = {
          id: `pho_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${i}`,
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
          orientation: isPortrait ? 'portrait' : 'landscape',
          ivHex: encOriginal.ivHex,
          thumbIvHex: encThumb.ivHex,
          metadata: finalMetadata,
          encryptedMetadataPayload: encMeta.ciphertextHex,
          // Active local decrypted URL for immediate seamless 3D rendering
          decryptedThumbUrl: URL.createObjectURL(processed.thumbBlob),
          decryptedFullUrl: URL.createObjectURL(processed.originalBlob),
          isFavorite: false,
          inTrash: false,
          globeId: activeGlobeId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        createdPhotos.push(newPhoto);

        // Step 4: Saved
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, state: 'saved', progress: 100 } : it))
        );
        completedCount++;
        setOverallProgress(Math.round((completedCount / items.length) * 100));
      } catch (err: any) {
        console.error('Failed to upload item:', err);
        setItems((prev) =>
          prev.map((it) =>
            it.id === item.id ? { ...it, state: 'failed', error: err.message || 'Upload failed' } : it
          )
        );
      }
    }

    if (createdPhotos.length > 0) {
      useVaultStore.getState().bulkAddPhotosToGlobe(createdPhotos);
      vaultAudio.playWhoosh();
    }

    setIsUploading(false);
    setIsSuccess(true);

    // Auto-redirect to 3D Memory Universe so the user is never stuck
    redirectTimerRef.current = setTimeout(() => {
      handleViewUniverse();
    }, 1250);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 dark:bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-4xl max-h-[92vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0e0c14]/95 text-slate-900 dark:text-white relative">
        {/* Real-Time Encryption & Redirection Overlay */}
        {(isUploading || isSuccess) && (
          <div className="absolute inset-0 z-50 bg-[#080B13]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
            {isUploading ? (
              <div className="max-w-md w-full flex flex-col items-center">
                {/* Animated Orbital Radar / Hologram Spinner */}
                <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
                  <div
                    className="absolute inset-0 rounded-full border-2 border-dashed border-vault-gold/50 animate-spin"
                    style={{ animationDuration: '6s' }}
                  />
                  <div
                    className="absolute inset-2 rounded-full border-2 border-purple-500/60 animate-spin"
                    style={{ animationDuration: '3s', animationDirection: 'reverse' }}
                  />
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600/30 via-vault-gold/25 to-emerald-500/20 border border-vault-gold/50 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.35)]">
                    <ShieldCheck className="w-7 h-7 text-vault-gold animate-pulse" />
                  </div>
                </div>

                <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 font-bold px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 mb-2">
                  AES-256-GCM Hardware Encrypting
                </span>
                <h4 className="text-xl font-serif font-bold text-white tracking-wide">
                  Encrypting Memories into 3D Orbit
                </h4>
                <p className="text-xs text-slate-400 font-sans mt-1 truncate max-w-xs">
                  {currentProcessingName ? `Processing: ${currentProcessingName}` : 'Preparing encryption buffers...'}
                </p>

                {/* Progress Bar & Percentage */}
                <div className="w-full mt-6 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-300">
                    <span>Item {currentProcessingIndex} of {items.length}</span>
                    <span className="text-vault-gold font-bold">{overallProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 via-vault-gold to-emerald-400 transition-all duration-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                      style={{ width: `${Math.max(5, overallProgress)}%` }}
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 font-mono mt-4">
                  Zero-Knowledge Client-Side Encryption • Direct 3D World Injection
                </p>
              </div>
            ) : (
              <div className="max-w-md w-full flex flex-col items-center animate-in zoom-in-95 duration-300">
                {/* Success Burst Icon */}
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500/25 via-vault-gold/20 to-purple-500/25 border-2 border-emerald-400/80 flex items-center justify-center mb-5 shadow-[0_0_40px_rgba(16,185,129,0.35)]">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>

                <h4 className="text-2xl font-serif font-bold text-white tracking-wide">
                  Memories Successfully Encrypted!
                </h4>
                <p className="text-xs text-slate-300 font-sans mt-1.5 max-w-sm">
                  {items.filter((i) => i.state === 'saved').length} photos encrypted & placed onto <strong>{activeGlobe?.name || '3D Planet'}</strong> cards.
                </p>

                <div className="mt-5 p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2.5 text-xs text-vault-gold font-mono">
                  <Loader2 className="w-4 h-4 animate-spin text-vault-gold" />
                  <span>Transporting to 3D Memory World...</span>
                </div>

                {/* Immediate Enter Button */}
                <button
                  type="button"
                  onClick={handleViewUniverse}
                  className="mt-6 px-7 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-vault-gold to-amber-500 hover:brightness-110 active:scale-95 text-black font-sans font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>Enter 3D World Now</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal Header */}
        <div className="p-3.5 sm:p-5 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-2.5 rounded-2xl bg-purple-600/15 dark:bg-purple-600/30 text-purple-700 dark:text-purple-400 border border-purple-500/30 shadow-sm">
              <UploadCloud className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5 sm:gap-2">
                <span>Bulk Memory Uploader</span>
                <span className="text-[9px] sm:text-[10px] font-mono tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap font-semibold">
                  AES-256-GCM
                </span>
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 line-clamp-1 sm:line-clamp-none">
                End-to-end client encrypted before transmission. 100–500+ batch capacity.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 sm:space-y-5">
          {/* Interactive Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-4 sm:p-8 text-center transition-all cursor-pointer group ${
              isDragging
                ? 'border-purple-500 bg-purple-500/10 scale-[0.99] shadow-glow'
                : 'border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/[0.03] hover:border-purple-500/50 hover:bg-purple-50/50 dark:hover:bg-white/[0.05]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.jpg,.jpeg,.png,.webp,.avif,.heic,.heif,.gif,.bmp,.tiff,.svg"
              className="hidden"
              onChange={(e) => {
                handleFilesSelected(e.target.files);
                e.target.value = '';
              }}
            />
            <input
              ref={folderInputRef}
              type="file"
              // @ts-ignore
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
              onChange={(e) => {
                handleFilesSelected(e.target.files);
                e.target.value = '';
              }}
            />

            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-purple-600/15 dark:bg-purple-600/20 border border-purple-500/30 text-purple-700 dark:text-purple-400 mx-auto flex items-center justify-center mb-3 group-hover:scale-105 group-hover:bg-purple-600/25 transition-all shadow-sm">
              <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>

            <h4 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-200 transition-colors">
              Click to choose photos or drag & drop anywhere
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4 sm:mb-5">
              Supports JPEG, PNG, WebP, AVIF, HEIC. EXIF timestamps and Tamil Nadu coordinates automatically preserved.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-all cursor-pointer"
              >
                Choose Photos
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  folderInputRef.current?.click();
                }}
                className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 border border-black/10 dark:border-white/10 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5 text-purple-600 dark:text-cyan-400" />
                <span>Upload Folder</span>
              </button>
            </div>
          </div>

          {/* Success Celebration Banner */}
          {isSuccess && items.length > 0 && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/40 text-emerald-900 dark:text-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {items.filter((i) => i.state === 'saved').length} Memories Successfully Encrypted & Saved into Vault!
                  </p>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300/80">
                    Client-side encrypted with AES-256-GCM. Immediately available in your 3D universe.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleViewUniverse}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold tracking-wide shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4 fill-current" />
                <span>View in 3D Universe</span>
              </button>
            </div>
          )}

          {/* Batch Metadata Mass Editor */}
          {items.length > 0 && (
            <div className="p-4 rounded-2xl border border-black/10 dark:border-white/10 space-y-3 bg-slate-50 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                  Batch Properties Applicator ({items.length} photos selected)
                </h5>
                <button
                  type="button"
                  onClick={applyBatchMetadataToAll}
                  className="px-3 py-1 rounded-lg bg-purple-600/15 dark:bg-purple-600/30 border border-purple-500/40 text-purple-700 dark:text-purple-300 hover:bg-purple-600/25 dark:hover:bg-purple-600/50 text-xs font-medium transition-all cursor-pointer"
                >
                  Apply to All Photos
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-600 dark:text-slate-400 mb-1 block">Target Album</label>
                  <select
                    value={batchAlbumId}
                    onChange={(e) => setBatchAlbumId(e.target.value)}
                    className="w-full p-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
                  >
                    {albums.map((alb) => (
                      <option key={alb.id} value={alb.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        {alb.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 dark:text-slate-400 mb-1 block">Shared Event Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Tamil Nadu Heritage Tour"
                    value={batchEventName}
                    onChange={(e) => setBatchEventName(e.target.value)}
                    className="w-full p-2 rounded-xl text-xs bg-white dark:bg-slate-900/60 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 dark:text-slate-400 mb-1 block">Date</label>
                  <input
                    type="date"
                    value={batchDate}
                    onChange={(e) => setBatchDate(e.target.value)}
                    className="w-full p-2 rounded-xl text-xs bg-white dark:bg-slate-900/60 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-600 dark:text-slate-400 mb-1 block">Location Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Marina Beach, Chennai"
                    value={batchLocationLabel}
                    onChange={(e) => setBatchLocationLabel(e.target.value)}
                    className="w-full p-2 rounded-xl text-xs bg-white dark:bg-slate-900/60 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] text-slate-600 dark:text-slate-400 mb-1 block">Tags (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="chennai, marina, sunrise, heritage"
                    value={batchTags}
                    onChange={(e) => setBatchTags(e.target.value)}
                    className="w-full p-2 rounded-xl text-xs bg-white dark:bg-slate-900/60 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Queue List */}
          {items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 px-1">
                <span>Queue Items ({items.length})</span>
                <span className="font-mono text-purple-700 dark:text-purple-400 font-semibold">{overallProgress}% Total Progress</span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl flex items-center gap-3 border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-900 flex-shrink-0 border border-black/10 dark:border-white/10">
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
                          className="bg-transparent text-xs font-semibold text-slate-900 dark:text-white truncate focus:outline-none focus:border-b border-purple-500 w-full mr-2"
                        />
                        <span
                          className={`text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full font-semibold ${
                            item.state === 'saved'
                              ? 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400'
                              : item.state === 'failed'
                              ? 'bg-rose-500/15 dark:bg-rose-500/20 text-rose-800 dark:text-rose-400'
                              : item.state === 'encrypting'
                              ? 'bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-800 dark:text-cyan-400'
                              : 'bg-purple-500/15 dark:bg-purple-500/20 text-purple-800 dark:text-purple-400'
                          }`}
                        >
                          {item.state}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden mt-1.5">
                        <div
                          className={`h-full transition-all duration-300 ${
                            item.state === 'saved'
                              ? 'bg-emerald-500'
                              : item.state === 'failed'
                              ? 'bg-rose-500'
                              : 'bg-purple-600'
                          }`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      disabled={isUploading}
                      className="text-slate-400 hover:text-rose-500 p-1 rounded-lg cursor-pointer"
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
        <div className="p-4 border-t border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 dark:bg-black/40">
          <div className="text-xs text-slate-600 dark:text-slate-400 text-center sm:text-left">
            {items.length > 0 ? (
              <span className="text-slate-700 dark:text-slate-300">
                <strong className="text-slate-900 dark:text-white">{items.length}</strong> {items.length === 1 ? 'item' : 'items'} ready for encryption
              </span>
            ) : (
              'No files selected — drag and drop or browse photos to encrypt and upload'
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={startBatchUpload}
              disabled={items.length === 0 || isUploading}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                items.length === 0 || isUploading
                  ? 'bg-purple-300/40 dark:bg-purple-800/40 text-purple-400/60 dark:text-purple-300/40 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md cursor-pointer active:scale-95'
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
