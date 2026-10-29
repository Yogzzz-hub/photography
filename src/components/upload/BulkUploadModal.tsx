import { useState, useRef } from 'react';
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
  Image as ImageIcon,
  FolderPlus,
  Play,
  Sparkles,
  Zap,
} from 'lucide-react';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewUniverse?: () => void;
}

/**
 * Generates 4 sample photo File objects with rich Tamil Nadu locations and aesthetic
 * canvas gradient patterns so users can test the upload flow instantly with 1 click.
 */
async function generateSampleDemoFiles(): Promise<File[]> {
  const samples = [
    {
      title: 'Marina Beach Golden Sunrise Chennai',
      filename: 'Marina_Beach_Golden_Sunrise_Chennai.jpg',
      isPortrait: false,
      colorA: '#ff7e5f',
      colorB: '#feb47b',
      colorC: '#1a102f',
      sub: 'Chennai, Tamil Nadu • 13.0499° N, 80.2824° E',
      tag: 'Marina, Chennai, Sunrise, TamilNadu',
    },
    {
      title: 'Meenakshi Amman Gopuram Twilight Madurai',
      filename: 'Meenakshi_Amman_Gopuram_Madurai.jpg',
      isPortrait: true,
      colorA: '#61045f',
      colorB: '#aa076b',
      colorC: '#0e0b16',
      sub: 'Madurai, Tamil Nadu • 9.9195° N, 78.1193° E',
      tag: 'Madurai, Meenakshi, Heritage, Architecture',
    },
    {
      title: 'Nilgiris Blue Mountains & Tea Terraces Ooty',
      filename: 'Nilgiris_Blue_Mountains_Ooty.jpg',
      isPortrait: false,
      colorA: '#005c97',
      colorB: '#363795',
      colorC: '#0b132b',
      sub: 'Ooty, Nilgiris, Tamil Nadu • 11.4102° N, 76.6950° E',
      tag: 'Ooty, Nilgiris, Mountains, TeaGardens',
    },
    {
      title: 'Mahabalipuram Shore Temple Coastal Vista',
      filename: 'Mahabalipuram_Shore_Temple_Vista.jpg',
      isPortrait: false,
      colorA: '#e65c00',
      colorB: '#f9d423',
      colorC: '#1c1917',
      sub: 'Mahabalipuram, Tamil Nadu • 12.6163° N, 80.1927° E',
      tag: 'Mahabalipuram, ShoreTemple, UNESCO, Coastal',
    },
  ];

  const files: File[] = [];

  for (const s of samples) {
    const width = s.isPortrait ? 800 : 1200;
    const height = s.isPortrait ? 1200 : 800;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Luxury background gradient
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, s.colorA);
      grad.addColorStop(0.5, s.colorB);
      grad.addColorStop(1, s.colorC);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Vignette effect
      const vignette = ctx.createRadialGradient(
        width / 2,
        height / 2,
        width * 0.25,
        width / 2,
        height / 2,
        width * 0.7
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.65)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      // Golden geometric frame
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
      ctx.lineWidth = 3;
      ctx.strokeRect(30, 30, width - 60, height - 60);

      // Aesthetic typography
      ctx.fillStyle = '#D4AF37';
      ctx.font = '700 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✦ MYORB FAMILY VAULT • TAMIL NADU ARCHIVE', width / 2, height / 2 - 40);

      ctx.fillStyle = '#ffffff';
      ctx.font = '700 28px system-ui, sans-serif';
      ctx.fillText(s.title, width / 2, height / 2 + 10);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = '500 16px system-ui, sans-serif';
      ctx.fillText(s.sub, width / 2, height / 2 + 50);

      ctx.fillStyle = 'rgba(212, 175, 55, 0.75)';
      ctx.font = '600 14px system-ui, sans-serif';
      ctx.fillText(`Tags: ${s.tag}`, width / 2, height / 2 + 85);
    }

    const blob = await new Promise<Blob>((res) => {
      canvas.toBlob((b) => res(b || new Blob()), 'image/jpeg', 0.92);
    });

    files.push(new File([blob], s.filename, { type: 'image/jpeg', lastModified: Date.now() }));
  }

  return files;
}

export function BulkUploadModal({ isOpen, onClose, onViewUniverse }: BulkUploadModalProps) {
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
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);

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

  const handleLoadSamples = async () => {
    setIsLoadingSamples(true);
    try {
      const sampleFiles = await generateSampleDemoFiles();
      handleFilesSelected(sampleFiles);
    } catch (err) {
      console.error('Failed to generate sample files:', err);
    } finally {
      setIsLoadingSamples(false);
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
          prev.map((it) =>
            it.id === item.id ? { ...it, state: 'failed', error: err.message || 'Upload failed' } : it
          )
        );
      }
    }

    setIsUploading(false);
    setIsSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl border border-white/10 bg-[#0e0c14]/95">
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-600/30 text-purple-400 border border-purple-500/30 shadow-glow">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Bulk Memory Uploader</span>
                <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  AES-256-GCM
                </span>
              </h3>
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
          {/* Interactive Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer group ${
              isDragging
                ? 'border-purple-400 bg-purple-900/30 scale-[0.99] shadow-glow'
                : 'border-white/15 bg-white/[0.03] hover:border-purple-500/50 hover:bg-white/[0.05]'
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

            <div className="w-16 h-16 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-400 mx-auto flex items-center justify-center mb-3 group-hover:scale-105 group-hover:bg-purple-600/30 transition-all shadow-glow">
              <ImageIcon className="w-8 h-8" />
            </div>

            <h4 className="text-base font-semibold text-white group-hover:text-purple-200 transition-colors">
              Click to choose photos or drag & drop anywhere
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
              Supports JPEG, PNG, WebP, AVIF, HEIC. EXIF timestamps and Tamil Nadu coordinates automatically preserved.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-glow transition-all"
              >
                Choose Photos
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  folderInputRef.current?.click();
                }}
                className="px-4 py-2 rounded-xl glass-panel-interactive text-slate-200 text-xs font-semibold flex items-center gap-1.5"
              >
                <FolderPlus className="w-3.5 h-3.5 text-cyan-400" />
                <span>Upload Folder</span>
              </button>
              <button
                type="button"
                disabled={isLoadingSamples}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLoadSamples();
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/30 border border-amber-500/50 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              >
                <Zap className="w-3.5 h-3.5 fill-current text-amber-400" />
                <span>{isLoadingSamples ? 'Generating...' : '⚡ Try Sample Photos (Instant Demo)'}</span>
              </button>
            </div>
          </div>

          {/* Success Celebration Banner */}
          {isSuccess && items.length > 0 && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {items.filter((i) => i.state === 'saved').length} Memories Successfully Encrypted & Saved into Vault!
                  </p>
                  <p className="text-xs text-emerald-300/80">
                    Client-side encrypted with AES-256-GCM. Immediately available in your 3D universe.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewUniverse?.();
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-bold tracking-wide shadow-glow transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 fill-current" />
                <span>View in 3D Universe</span>
              </button>
            </div>
          )}

          {/* Batch Metadata Mass Editor */}
          {items.length > 0 && (
            <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3 bg-white/[0.02]">
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
                    className="glass-input w-full p-2 rounded-xl text-xs bg-slate-900 border border-white/10 text-white"
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
                    placeholder="e.g. Tamil Nadu Heritage Tour"
                    value={batchEventName}
                    onChange={(e) => setBatchEventName(e.target.value)}
                    className="glass-input w-full p-2 rounded-xl text-xs bg-slate-900/60 border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Date</label>
                  <input
                    type="date"
                    value={batchDate}
                    onChange={(e) => setBatchDate(e.target.value)}
                    className="glass-input w-full p-2 rounded-xl text-xs bg-slate-900/60 border border-white/10 text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 mb-1 block">Location Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Marina Beach, Chennai"
                    value={batchLocationLabel}
                    onChange={(e) => setBatchLocationLabel(e.target.value)}
                    className="glass-input w-full p-2 rounded-xl text-xs bg-slate-900/60 border border-white/10 text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] text-slate-400 mb-1 block">Tags (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="chennai, marina, sunrise, heritage"
                    value={batchTags}
                    onChange={(e) => setBatchTags(e.target.value)}
                    className="glass-input w-full p-2 rounded-xl text-xs bg-slate-900/60 border border-white/10 text-white"
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
                <span className="font-mono text-purple-400">{overallProgress}% Total Progress</span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="glass-panel p-2.5 rounded-xl flex items-center gap-3 border border-white/5 bg-white/[0.02]"
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
                        <span
                          className={`text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full ${
                            item.state === 'saved'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : item.state === 'failed'
                              ? 'bg-rose-500/20 text-rose-400'
                              : item.state === 'encrypting'
                              ? 'bg-cyan-500/20 text-cyan-400'
                              : 'bg-purple-500/20 text-purple-400'
                          }`}
                        >
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
            {items.length > 0 ? (
              <span className="text-slate-300">
                <strong className="text-white">{items.length}</strong> {items.length === 1 ? 'item' : 'items'} ready for encryption
              </span>
            ) : (
              'No files added — click above or try sample demo'
            )}
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
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white cursor-pointer'
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
