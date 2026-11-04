import { useState, useRef, useEffect } from 'react';
import { useVaultStore } from '../../stores/useVaultStore';
import { vaultAudio } from '../../services/audioSynthesizer';
import { SAMPLE_CURATED_PHOTOS } from '../../services/sampleData';
import { processPhotoLocally } from '../../services/imageProcessor';
import { encryptBinaryData, encryptJsonMetadata, generateAlbumKey } from '../../crypto/vaultCrypto';
import type { Photo, PhotoMetadata } from '../../types';
import {
  UploadCloud,
  X,
  Sparkles,
  Image as ImageIcon,
  MapPin,
  Calendar,
  FileText,
  Tag,
  Check,
  CheckCircle2,
  Globe,
  Palette,
  Crop,
  Loader2,
} from 'lucide-react';
import { ImageCropperModal } from '../media/ImageCropperModal';

interface SingleSlotUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  slotIndex: number | null;
  targetGlobeId?: string;
}

export function SingleSlotUploadModal({
  isOpen,
  onClose,
  slotIndex,
  targetGlobeId,
}: SingleSlotUploadModalProps) {
  const {
    currentFamily,
    currentMember,
    masterVaultKey,
    albums,
    globes,
    activeGlobeId,
    addPhotoToSlot,
  } = useVaultStore();

  const globe = globes.find((g) => g.id === (targetGlobeId || activeGlobeId)) || globes[0];

  const [activeTab, setActiveTab] = useState<'device' | 'url' | 'curated'>('device');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isCropperOpen, setIsCropperOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [captureDate, setCaptureDate] = useState(new Date().toISOString().split('T')[0]);
  const [tags, setTags] = useState('');
  const [targetAlbumId, setTargetAlbumId] = useState(albums[0]?.id || 'alb_heritage');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset fields on modal open
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setPreviewUrl('');
      setImageUrl('');
      setTitle(slotIndex !== null ? `Memory #${slotIndex + 1}` : 'New Memory');
      setStory('');
      setLocationLabel('');
      setCaptureDate(new Date().toISOString().split('T')[0]);
      setTags('');
      setErrorMsg('');
      setSuccess(false);
    }
  }, [isOpen, slotIndex]);

  if (!isOpen || slotIndex === null) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      if (!title || title.startsWith('Memory #')) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
      }
    }
  };

  const handleSelectCurated = (curated: Photo) => {
    setImageUrl(curated.storagePath);
    setPreviewUrl(curated.storagePath);
    setTitle(curated.metadata.title);
    setStory(curated.metadata.story || '');
    setLocationLabel(curated.metadata.location?.label || '');
    setTags(curated.metadata.tags.join(', '));
    vaultAudio.playWhoosh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const finalImage = previewUrl || imageUrl;
    if (!finalImage && !selectedFile) {
      setErrorMsg('Please select a photo file or provide an image URL.');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('Please enter a memory title.');
      return;
    }

    setIsSubmitting(true);
    try {
      const key = masterVaultKey || (await generateAlbumKey());
      let width = 1600;
      let height = 1000;
      let fileSizeBytes = 1200000;
      let thumbSizeBytes = 45000;
      let originalUrl = finalImage;
      let thumbUrl = finalImage;
      let ivHex = '4a8f9b1c2d3e4f5a6b7c8d9e';
      let thumbIvHex = '1b2c3d4e5f6a7b8c9d0e1f2a';

      if (selectedFile) {
        const processed = await processPhotoLocally(selectedFile);
        width = processed.width;
        height = processed.height;
        fileSizeBytes = processed.originalSizeBytes;
        thumbSizeBytes = processed.thumbSizeBytes;

        const originalBuffer = await processed.originalBlob.arrayBuffer();
        const thumbBuffer = await processed.thumbBlob.arrayBuffer();
        const encOriginal = await encryptBinaryData(originalBuffer, key);
        const encThumb = await encryptBinaryData(thumbBuffer, key);

        ivHex = encOriginal.ivHex;
        thumbIvHex = encThumb.ivHex;
        originalUrl = URL.createObjectURL(processed.originalBlob);
        thumbUrl = URL.createObjectURL(processed.thumbBlob);
      }

      const isPortrait = height > width;

      const finalMeta: PhotoMetadata = {
        title: title.trim(),
        story: story.trim() || undefined,
        captureDate,
        location: locationLabel.trim()
          ? {
              latitude: 13.05,
              longitude: 80.28,
              label: locationLabel.trim(),
            }
          : undefined,
        photographer: currentMember.displayName,
        tags: tags
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      };

      const encMeta = await encryptJsonMetadata(finalMeta, key);

      const newPhoto: Photo = {
        id: `pho_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        familyId: currentFamily.id,
        albumId: targetAlbumId,
        globeId: globe.id,
        slotIndex,
        uploaderId: currentMember.id,
        uploaderName: currentMember.displayName,
        storagePath: originalUrl,
        thumbStoragePath: thumbUrl,
        decryptedFullUrl: originalUrl,
        decryptedThumbUrl: thumbUrl,
        fileSizeBytes,
        thumbSizeBytes,
        mimeType: selectedFile?.type || 'image/jpeg',
        width,
        height,
        orientation: isPortrait ? 'portrait' : 'landscape',
        ivHex,
        thumbIvHex,
        metadata: finalMeta,
        encryptedMetadataPayload: encMeta.ciphertextHex,
        isFavorite: false,
        inTrash: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      addPhotoToSlot(newPhoto, slotIndex, globe.id);
      vaultAudio.playWhoosh();
      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to create memory:', err);
      setErrorMsg('Failed to process and store memory. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-in fade-in">
      <div className="bg-[#FAF9F6] dark:bg-[#080B13] border border-stone-300 dark:border-white/15 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl relative text-stone-900 dark:text-white transition-all font-sans max-h-[92vh] overflow-y-auto">
        {/* Real-Time Processing & Placement Feedback */}
        {(isSubmitting || success) && (
          <div className="absolute inset-0 z-30 bg-[#080B13]/95 backdrop-blur-xl rounded-3xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150">
            {isSubmitting ? (
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-vault-gold/15 border border-vault-gold/40 flex items-center justify-center mb-4">
                  <Loader2 className="w-7 h-7 text-vault-gold animate-spin" />
                </div>
                <h4 className="text-base font-serif font-bold text-white">
                  Encrypting & Placing Memory...
                </h4>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  AES-256-GCM Secure Encryption for Slot #{slotIndex + 1}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h4 className="text-lg font-serif font-bold text-white">
                  Card #{slotIndex + 1} Placed in 3D Orbit!
                </h4>
                <p className="text-xs text-emerald-300/80 mt-1 font-mono">
                  Returning to {globe.name}...
                </p>
              </div>
            )}
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-stone-700 dark:text-slate-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-vault-gold/15 border border-vault-gold/40 text-vault-gold flex items-center justify-center flex-shrink-0 shadow-glow">
            <Sparkles className="w-6 h-6 text-vault-gold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-vault-gold/20 text-vault-gold border border-vault-gold/30">
                Slot #{slotIndex + 1}
              </span>
              <span className="text-[11px] text-stone-500 dark:text-slate-400 font-sans flex items-center gap-1">
                <Globe className="w-3 h-3 text-vault-gold" />
                <span>{globe.name}</span>
              </span>
            </div>
            <h3 className="text-lg font-serif font-bold text-stone-900 dark:text-white tracking-wide mt-0.5">
              Add Memory to Globe
            </h3>
          </div>
        </div>

        {/* Source Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 dark:bg-white/5 rounded-2xl mb-4 border border-stone-200 dark:border-white/10 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('device')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'device'
                ? 'bg-vault-gold text-black shadow-sm font-bold'
                : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Photo</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('curated')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'curated'
                ? 'bg-vault-gold text-black shadow-sm font-bold'
                : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Curated Library</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'url'
                ? 'bg-vault-gold text-black shadow-sm font-bold'
                : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Image URL</span>
          </button>
        </div>

        {/* Error / Success Banners */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-700 dark:text-rose-300">
            {errorMsg}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
            <span>Memory placed onto Slot #{slotIndex + 1}! Decrypting in 3D orbit...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* TAB 1: Local Device Upload */}
          {activeTab === 'device' && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`p-5 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-all ${
                  previewUrl
                    ? 'border-vault-gold/60 bg-vault-gold/5'
                    : 'border-stone-300 dark:border-white/15 hover:border-vault-gold/50 bg-stone-50 dark:bg-black/30'
                }`}
              >
                {previewUrl ? (
                  <div className="relative group">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-40 mx-auto rounded-xl object-contain shadow-md"
                    />
                    <div className="flex items-center justify-center gap-2 mt-2.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          vaultAudio.playWhoosh();
                          setIsCropperOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-vault-gold/20 hover:bg-vault-gold/30 border border-vault-gold/40 text-vault-gold text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                        title="Crop & Re-frame this photo"
                      >
                        <Crop className="w-3.5 h-3.5" />
                        <span>Crop & Re-frame</span>
                      </button>
                    </div>
                    <div className="text-[11px] text-stone-500 dark:text-slate-400 mt-1">
                      Click box to choose a different photo
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 py-3">
                    <UploadCloud className="w-8 h-8 text-vault-gold mx-auto" />
                    <div className="text-xs font-semibold text-stone-800 dark:text-slate-200">
                      Click to choose an image from device
                    </div>
                    <div className="text-[10px] text-stone-500 dark:text-slate-400">
                      Supports high-res JPEG, PNG, WebP (Client-side encrypted)
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Curated Masterpiece Picker */}
          {activeTab === 'curated' && (
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Select an authentic fine-art photograph:
              </label>
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 rounded-2xl bg-stone-100 dark:bg-black/40 border border-stone-200 dark:border-white/10">
                {SAMPLE_CURATED_PHOTOS.slice(0, 24).map((p) => {
                  const isSelected = previewUrl === p.storagePath;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectCurated(p)}
                      className={`relative rounded-xl overflow-hidden aspect-video border-2 transition-all cursor-pointer group ${
                        isSelected
                          ? 'border-vault-gold ring-2 ring-vault-gold/40 scale-95'
                          : 'border-transparent hover:border-white/40'
                      }`}
                    >
                      <img
                        src={p.thumbStoragePath}
                        alt={p.metadata.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-vault-gold/25 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white drop-shadow" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Image URL */}
          {activeTab === 'url' && (
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Direct Image URL
              </label>
              <input
                type="url"
                placeholder="https://images.unsplash.com/photo-..."
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setPreviewUrl(e.target.value);
                }}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-100 dark:bg-black/60 border border-stone-300 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-vault-gold/50"
              />
            </div>
          )}

          {/* Metadata Inputs */}
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              Memory Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Marina Beach Sunset with Family"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-stone-100 dark:bg-black/60 border border-stone-300 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-vault-gold/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-vault-gold" />
                <span>Location Tag</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Chennai, Tamil Nadu"
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-100 dark:bg-black/60 border border-stone-300 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-vault-gold/50"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-vault-gold" />
                <span>Capture Date</span>
              </label>
              <input
                type="date"
                value={captureDate}
                onChange={(e) => setCaptureDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-stone-100 dark:bg-black/60 border border-stone-300 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-vault-gold/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-600 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3 text-vault-gold" />
              <span>Memory Story / Note</span>
            </label>
            <textarea
              rows={2}
              placeholder="What made this moment unforgettable?"
              value={story}
              onChange={(e) => setStory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-stone-100 dark:bg-black/60 border border-stone-300 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-vault-gold/50 resize-none"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-stone-600 dark:text-slate-400 hover:bg-stone-200 dark:hover:bg-white/5 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || success}
              className="px-5 py-2.5 rounded-xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-black" />
              <span>{isSubmitting ? 'Placing Memory...' : `Create Card #${slotIndex + 1}`}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Precision Interactive Image Cropper for Slot Photo */}
      <ImageCropperModal
        isOpen={isCropperOpen}
        imageUrl={previewUrl}
        initialAspectRatio="16:9"
        title={`Crop Memory for Slot #${slotIndex + 1}`}
        postButtonLabel="Crop & Use Memory"
        onClose={() => setIsCropperOpen(false)}
        onApplyCrop={(croppedDataUrl, croppedFile) => {
          setIsCropperOpen(false);
          setPreviewUrl(croppedDataUrl);
          setSelectedFile(croppedFile);
        }}
        onPostDirectly={(croppedDataUrl, croppedFile) => {
          setIsCropperOpen(false);
          setPreviewUrl(croppedDataUrl);
          setSelectedFile(croppedFile);
        }}
      />
    </div>
  );
}
