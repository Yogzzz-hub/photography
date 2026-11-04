import { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  ExternalLink,
  Plus,
  Send,
  User,
  MapPin,
  Calendar,
  Volume2,
  Upload,
  UploadCloud,
  Image as ImageIcon,
  Check,
  FolderOpen,
  Camera,
  Trash2,
  Crop,
} from 'lucide-react';
import { vaultAudio } from '../../services/audioSynthesizer';
import { useVaultStore } from '../../stores/useVaultStore';
import { ImageCropperModal } from './ImageCropperModal';

export interface VaultStory {
  id: string;
  authorName: string;
  authorRole: string;
  authorAvatar?: string;
  title: string;
  location: string;
  date: string;
  imgUrl: string;
  quote?: string;
  story?: string;
  createdAt: number; // timestamp
  expiresAt: number; // createdAt + 24 * 3600 * 1000
}

export const INITIAL_24H_STORIES: VaultStory[] = [
  {
    id: 'story_01',
    authorName: 'Elena V.',
    authorRole: 'Curator',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
    title: 'Grand Hallway Vows',
    location: 'Verona Colonnade, Italy',
    date: 'Today',
    imgUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&h=800&q=85',
    quote: '“Architecture is frozen music, and memory is the acoustic hall where it reverberates forever.”',
    story: 'Morning light piercing the classical marble columns as we gathered for the golden jubilee ceremony.',
    createdAt: Date.now() - 2.5 * 3600 * 1000,
    expiresAt: Date.now() + 21.5 * 3600 * 1000,
  },
  {
    id: 'story_02',
    authorName: 'Marcus S.',
    authorRole: 'Archivist',
    authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80',
    title: 'Palazzo Ducale Arcades',
    location: 'Piazza San Marco, Venice',
    date: 'Today',
    imgUrl: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=1200&h=800&q=85',
    quote: '“A window is not merely an aperture; it is a lens through which time remembers itself.”',
    story: 'Afternoon shadows cutting diagonal geometry across the marble porticos facing the Venetian lagoon.',
    createdAt: Date.now() - 5 * 3600 * 1000,
    expiresAt: Date.now() + 19 * 3600 * 1000,
  },
  {
    id: 'story_03',
    authorName: 'Clara C.',
    authorRole: 'Member',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80',
    title: 'Misty Alpine Karst Sanctuary',
    location: 'Dolomite Highlands, Alps',
    date: 'Today',
    imgUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&h=800&q=85',
    quote: '“Between ancient water and weathered stone, quietude finds its sanctuary.”',
    story: 'Drifting silently above mist-shrouded valleys and towering limestone peaks at dawn.',
    createdAt: Date.now() - 8 * 3600 * 1000,
    expiresAt: Date.now() + 16 * 3600 * 1000,
  },
];

interface StoriesViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExplorePhotoDetail?: (id: string) => void;
  stories: VaultStory[];
  onAddStory: (newStory: VaultStory) => void;
}

export function StoriesViewerModal({
  isOpen,
  onClose,
  onExplorePhotoDetail,
  stories,
  onAddStory,
}: StoriesViewerModalProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isAddingStory, setIsAddingStory] = useState(false);

  // New Story Form State
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newStoryText, setNewStoryText] = useState('');
  const [newImgUrl, setNewImgUrl] = useState('');
  const [previewFilename, setPreviewFilename] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showVaultPicker, setShowVaultPicker] = useState(false);

  // Interactive Image Cropper State
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [cropTargetUrl, setCropTargetUrl] = useState('');
  const [isCroppingActiveStory, setIsCroppingActiveStory] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { recordAuditEvent, currentMember, photos } = useVaultStore();

  const currentStory = stories[activeIdx] || stories[0];

  // Auto-advance timer (5 seconds per story)
  useEffect(() => {
    if (!isOpen || isPaused || isAddingStory || stories.length === 0) return;

    const intervalMs = 50;
    const step = (intervalMs / 5000) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isOpen, isPaused, activeIdx, isAddingStory, stories.length]);

  if (!isOpen) return null;

  const handleNext = () => {
    vaultAudio.playWhoosh();
    setProgress(0);
    setActiveIdx((prev) => (prev + 1) % stories.length);
  };

  const handlePrev = () => {
    vaultAudio.playWhoosh();
    setProgress(0);
    setActiveIdx((prev) => (prev - 1 + stories.length) % stories.length);
  };

  const calculateHoursLeft = (expiresAt: number) => {
    const diffMs = expiresAt - Date.now();
    if (diffMs <= 0) return 'Expired';
    const hours = Math.floor(diffMs / (3600 * 1000));
    const mins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
    return `${hours}h ${mins}m left`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewFilename(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setNewImgUrl(result);
        vaultAudio.playSnap();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setPreviewFilename(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setNewImgUrl(result);
        vaultAudio.playSnap();
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePublishStory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const defaultImages = [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&h=800&q=85',
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&h=800&q=85',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&h=800&q=85',
    ];

    const storyObj: VaultStory = {
      id: `story_${Date.now()}`,
      authorName: currentMember?.displayName || 'Family Member',
      authorRole: currentMember?.role || 'Member',
      authorAvatar: currentMember?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
      title: newTitle.trim(),
      location: newLocation.trim() || 'Family Sanctuary',
      date: 'Just now',
      imgUrl: newImgUrl.trim() || defaultImages[Math.floor(Math.random() * defaultImages.length)],
      story: newStoryText.trim() || 'A precious family memory captured for 24 hours.',
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 3600 * 1000,
    };

    onAddStory(storyObj);
    recordAuditEvent({
      action: 'create',
      resourceType: 'photo',
      resourceId: storyObj.id,
      status: 'success',
      resourceName: storyObj.title,
      details: { info: `Published 24-hour family story: ${storyObj.title}` },
    });

    vaultAudio.playChime(659.25);
    setIsAddingStory(false);
    setNewTitle('');
    setNewLocation('');
    setNewStoryText('');
    setNewImgUrl('');
    setPreviewFilename('');
    setShowVaultPicker(false);
    setActiveIdx(stories.length); // jump to newly added story
    setProgress(0);
  };

  const publishStoryWithImage = (imageUrl: string, customTitle?: string) => {
    const titleToUse = customTitle || newTitle.trim() || 'Precious Family Memory';
    const storyObj: VaultStory = {
      id: `story_${Date.now()}`,
      authorName: currentMember?.displayName || 'Family Member',
      authorRole: currentMember?.role || 'Member',
      authorAvatar: currentMember?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
      title: titleToUse,
      location: newLocation.trim() || 'Family Sanctuary',
      date: 'Just now',
      imgUrl: imageUrl,
      story: newStoryText.trim() || 'A precious family memory captured for 24 hours.',
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 3600 * 1000,
    };

    onAddStory(storyObj);
    recordAuditEvent({
      action: 'create',
      resourceType: 'photo',
      resourceId: storyObj.id,
      status: 'success',
      resourceName: storyObj.title,
      details: { info: `Published 24-hour family story with crop: ${storyObj.title}` },
    });

    vaultAudio.playChime(659.25);
    setIsAddingStory(false);
    setNewTitle('');
    setNewLocation('');
    setNewStoryText('');
    setNewImgUrl('');
    setPreviewFilename('');
    setShowVaultPicker(false);
    setActiveIdx(stories.length);
    setProgress(0);
  };

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-2 sm:p-6 select-none animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[#090C14] text-white border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[95vh]"
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Story Body View */}
        {!isAddingStory ? (
          <div className="relative flex flex-col md:flex-row h-[78vh] sm:h-[520px]">
            {/* Visual Media Half with Ken Burns Ambient Scale */}
            <div className="relative w-full md:w-3/5 h-64 sm:h-full bg-black overflow-hidden flex items-center justify-center">
              {/* Top Story Progress Bars (Instagram / Snap style) */}
              <div className="absolute top-0 left-0 right-0 z-30 flex items-center gap-1.5 p-3 sm:p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent">
                {stories.map((s, idx) => (
                  <div
                    key={s.id}
                    className="flex-1 h-1 sm:h-1.5 rounded-full bg-white/20 overflow-hidden cursor-pointer"
                    onClick={() => {
                      setActiveIdx(idx);
                      setProgress(0);
                    }}
                  >
                    <div
                      className="h-full bg-vault-gold transition-all duration-75"
                      style={{
                        width: idx < activeIdx ? '100%' : idx === activeIdx ? `${progress}%` : '0%',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Author Identity Header Pill inside Media Viewer */}
              <div className="absolute top-7 left-3 sm:left-4 z-30 flex items-center gap-2.5 bg-black/65 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 drop-shadow-xl select-none">
                <div className="relative">
                  <img
                    src={currentStory.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80'}
                    alt={currentStory.authorName}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80';
                    }}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-vault-gold/80"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-black" />
                </div>

                <div className="flex flex-col min-w-0 pr-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-white truncate max-w-[110px] sm:max-w-[140px]">{currentStory.authorName}</span>
                    <span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-vault-gold/20 text-vault-gold border border-vault-gold/30">
                      {currentStory.authorRole}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-amber-200/90 font-mono">
                    <Clock className="w-2.5 h-2.5 text-vault-gold" />
                    <span>{calculateHoursLeft(currentStory.expiresAt)}</span>
                  </div>
                </div>
              </div>

              {/* Mobile Quick Action Buttons in Media View */}
              <div className="absolute top-7 right-3 z-30 flex md:hidden items-center gap-1.5">
                <button
                  onClick={() => {
                    vaultAudio.playWhoosh();
                    setIsAddingStory(true);
                  }}
                  className="px-2.5 py-1 rounded-full bg-vault-gold text-black font-semibold text-xs flex items-center gap-1 shadow-md hover:brightness-110"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Story</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-1 rounded-full bg-black/60 text-white/90 hover:text-white border border-white/20"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <img
                src={currentStory.imgUrl}
                alt={currentStory.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&h=800&q=85';
                }}
                className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

              {/* Navigation Click Zones for Mobile / Quick Tap */}
              <div
                className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer"
                onClick={handlePrev}
                title="Previous Story"
              />
              <div
                className="absolute inset-y-0 right-0 w-1/3 z-20 cursor-pointer"
                onClick={handleNext}
                title="Next Story"
              />

              {/* Floating Bilateral Nav Chevrons */}
              <button
                onClick={handlePrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-25 p-2 rounded-full bg-black/50 text-white/80 hover:text-white hover:bg-black/80 transition-all cursor-pointer backdrop-blur-sm"
                title="Previous Story"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-25 p-2 rounded-full bg-black/50 text-white/80 hover:text-white hover:bg-black/80 transition-all cursor-pointer backdrop-blur-sm"
                title="Next Story"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Story Editorial Details Half */}
            <div className="w-full md:w-2/5 p-4 sm:p-6 flex flex-col justify-between bg-white dark:bg-[#0E121D] text-slate-900 dark:text-white border-t md:border-t-0 md:border-l border-black/10 dark:border-white/10 overflow-y-auto">
              <div className="space-y-3">
                {/* Dedicated Desktop Header Row: Badge on Left, Controls on Right — NEVER overlaps! */}
                <div className="hidden md:flex items-center justify-between pb-2.5 border-b border-black/10 dark:border-white/10">
                  <div className="flex items-center gap-1.5 text-amber-700 dark:text-vault-gold text-[11px] font-mono uppercase tracking-widest font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>24h Ephemeral Story</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        vaultAudio.playWhoosh();
                        setIsAddingStory(true);
                      }}
                      className="px-3 py-1 rounded-full bg-vault-gold text-black font-semibold text-xs flex items-center gap-1 shadow-sm hover:brightness-110 transition-all cursor-pointer"
                      title="Add a 24-Hour Story"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Story</span>
                    </button>

                    <button
                      onClick={onClose}
                      className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/15 text-slate-500 dark:text-white/80 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                      title="Close Story Viewer"
                    >
                      <X className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>

                <div className="md:hidden flex items-center gap-1.5 text-amber-700 dark:text-vault-gold text-[11px] font-mono uppercase tracking-widest font-semibold pt-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>24h Ephemeral Story</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-serif text-slate-900 dark:text-white font-normal leading-snug">
                  {currentStory.title}
                </h3>

                <div className="flex items-center flex-wrap gap-2 text-xs text-amber-800 dark:text-amber-200/80 font-serif italic">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-600 dark:text-vault-gold" />
                    <span>{currentStory.location}</span>
                  </span>
                  <span>•</span>
                  <span>{currentStory.date}</span>
                </div>

                {currentStory.quote && (
                  <blockquote className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic border-l-2 border-vault-gold/70 pl-3 py-1 my-3 bg-black/[0.02] dark:bg-white/[0.02] rounded-r-xl">
                    {currentStory.quote}
                  </blockquote>
                )}

                {currentStory.story && (
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                    {currentStory.story}
                  </p>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 mt-4 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>{activeIdx + 1} of {stories.length}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      vaultAudio.playWhoosh();
                      setCropTargetUrl(currentStory.imgUrl);
                      setIsCroppingActiveStory(true);
                      setIsCropperOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-black/10 dark:border-white/15 shadow-sm"
                    title="Crop and re-frame this story photo"
                  >
                    <Crop className="w-3.5 h-3.5 text-vault-gold" />
                    <span>Crop Photo</span>
                  </button>

                  {onExplorePhotoDetail && (
                    <button
                      onClick={() => {
                        onClose();
                        onExplorePhotoDetail(currentStory.id);
                      }}
                      className="px-4 py-2 rounded-full bg-vault-gold text-black font-semibold text-xs flex items-center gap-1.5 hover:brightness-110 shadow-lg cursor-pointer"
                    >
                      <span>View In Vault</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Add 24h Story Creation Panel (Clean Header, Multiple Upload Options) */
          <div className="p-5 sm:p-7 flex flex-col gap-4 bg-white dark:bg-[#0E121D] text-slate-900 dark:text-white overflow-y-auto max-h-[90vh]">
            {/* Header: Dedicated, 100% clean, no ghost text */}
            <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-vault-gold/15 text-vault-gold border border-vault-gold/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-serif text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                    Create 24-Hour Family Story
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Ephemeral moments shared with your family for 24 hours
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  vaultAudio.playWhoosh();
                  setIsAddingStory(false);
                }}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-black dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                title="Cancel Story Creation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePublishStory} className="space-y-4 font-sans">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Story Caption / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunset over Marina Beach with Grandma"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.05] border border-slate-300 dark:border-white/15 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-vault-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Location Tag
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chennai, Tamil Nadu"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.05] border border-slate-300 dark:border-white/15 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-vault-gold"
                />
              </div>

              {/* PHOTO UPLOAD & SELECTION SUITE */}
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Story Photo (Upload from Device or Select from Vault)
                </label>

                {/* Hidden Native File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="story-photo-file-input"
                />

                {/* Primary Upload Options Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Button 1: Upload from Phone Camera / Device with Native Label Binding */}
                  <label
                    htmlFor="story-photo-file-input"
                    onClick={() => vaultAudio.playWhoosh()}
                    className="p-3 rounded-2xl bg-vault-gold/15 hover:bg-vault-gold/25 active:bg-vault-gold/30 border border-vault-gold/40 text-slate-900 dark:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 select-none"
                  >
                    <Upload className="w-4 h-4 text-vault-gold flex-shrink-0" />
                    <span>Upload from Device / Camera</span>
                  </label>

                  {/* Button 2: Pick from Existing Vault Memories */}
                  <button
                    type="button"
                    onClick={() => {
                      vaultAudio.playWhoosh();
                      setShowVaultPicker(!showVaultPicker);
                    }}
                    className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 ${
                      showVaultPicker
                        ? 'bg-purple-600 text-white border-purple-500 shadow-md'
                        : 'bg-black/5 dark:bg-white/[0.05] hover:bg-black/10 dark:hover:bg-white/[0.09] border-black/10 dark:border-white/15 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <FolderOpen className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <span>{showVaultPicker ? 'Hide Vault Picker' : `Pick Vault Photo (${photos.length})`}</span>
                  </button>
                </div>

                {/* Drag-and-Drop Zone (If no photo selected yet) */}
                {!newImgUrl && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                        fileInputRef.current.click();
                      }
                    }}
                    className={`p-5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer ${
                      isDragOver
                        ? 'bg-vault-gold/20 border-vault-gold scale-[1.01]'
                        : 'bg-black/[0.02] dark:bg-white/[0.02] border-black/15 dark:border-white/15 hover:border-vault-gold/60 hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <UploadCloud className="w-7 h-7 text-vault-gold animate-bounce" />
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Drag & drop your story photo here, or click to browse
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      Supports JPG, PNG, WEBP, HEIC from phone gallery or camera
                    </div>
                  </div>
                )}

                {/* Vault Photos Grid Selector (When toggled) */}
                {showVaultPicker && (
                  <div className="p-3 rounded-2xl bg-black/[0.04] dark:bg-black/40 border border-black/10 dark:border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300 px-1">
                      <span>Select a photo from your decrypted vault:</span>
                      <span className="text-vault-gold">{photos.length} Available</span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1 no-scrollbar">
                      {photos.slice(0, 36).map((p) => {
                        const url = p.decryptedThumbUrl || p.thumbStoragePath;
                        const isSelected = newImgUrl === url || newImgUrl === p.decryptedFullUrl;
                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              vaultAudio.playSnap();
                              setNewImgUrl(p.decryptedFullUrl || url);
                              setPreviewFilename(p.metadata.title);
                              if (!newTitle) setNewTitle(p.metadata.title);
                              if (!newLocation && p.metadata.location?.label) {
                                setNewLocation(p.metadata.location.label.split(',')[0]);
                              }
                              setShowVaultPicker(false);
                            }}
                            className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all hover:scale-105 ${
                              isSelected ? 'border-vault-gold ring-2 ring-vault-gold shadow-lg' : 'border-transparent hover:border-vault-gold/50'
                            }`}
                            title={p.metadata.title}
                          >
                            <img src={url} alt={p.metadata.title} className="w-full h-full object-cover" />
                            {isSelected && (
                              <div className="absolute inset-0 bg-vault-gold/30 flex items-center justify-center">
                                <Check className="w-4 h-4 text-black font-bold" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Selected Photo Preview Card */}
                {newImgUrl && (
                  <div className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      <div className="w-14 h-14 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 flex-shrink-0 bg-black">
                        <img src={newImgUrl} alt="Story Preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="overflow-hidden min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                          {previewFilename || 'Custom Photo Selected'}
                        </span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                          <Check className="w-3 h-3" />
                          <span>Photo Ready for 24h Story</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          vaultAudio.playWhoosh();
                          setCropTargetUrl(newImgUrl);
                          setIsCroppingActiveStory(false);
                          setIsCropperOpen(true);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-vault-gold/20 hover:bg-vault-gold/30 border border-vault-gold/40 text-vault-gold text-xs font-semibold flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                        title="Crop photo to 9:16 vertical ratio"
                      >
                        <Crop className="w-3.5 h-3.5" />
                        <span>Crop (9:16)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          vaultAudio.playSnap();
                          setNewImgUrl('');
                          setPreviewFilename('');
                        }}
                        className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition-all cursor-pointer"
                        title="Remove this photo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Optional Web URL Input (Collapsed fallback) */}
                <details className="text-[11px] text-slate-500 dark:text-slate-400 group">
                  <summary className="cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 transition-colors select-none">
                    Or paste an image web URL
                  </summary>
                  <div className="pt-2">
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={newImgUrl.startsWith('data:') ? '' : newImgUrl}
                      onChange={(e) => {
                        setNewImgUrl(e.target.value);
                        setPreviewFilename('Web Image Link');
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.05] border border-slate-300 dark:border-white/15 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-vault-gold"
                    />
                  </div>
                </details>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Story Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Share a short note about this moment..."
                  value={newStoryText}
                  onChange={(e) => setNewStoryText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.05] border border-slate-300 dark:border-white/15 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-vault-gold resize-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-vault-gold flex-shrink-0" />
                <span>This story will be visible to all family members and automatically expire in 24 hours.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    vaultAudio.playWhoosh();
                    setIsAddingStory(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-xs text-slate-700 dark:text-white cursor-pointer"
                >
                  Cancel
                </button>
                {newImgUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      vaultAudio.playWhoosh();
                      setCropTargetUrl(newImgUrl);
                      setIsCroppingActiveStory(false);
                      setIsCropperOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-vault-gold/20 hover:bg-vault-gold/30 border border-vault-gold/40 text-vault-gold font-semibold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all"
                    title="Crop image before posting"
                  >
                    <Crop className="w-3.5 h-3.5" />
                    <span>Crop & Post</span>
                  </button>
                )}
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-vault-gold hover:bg-amber-400 text-black font-semibold text-xs flex items-center gap-1.5 shadow-lg cursor-pointer transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Publish 24h Story</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Interactive Precision Image Cropper */}
      <ImageCropperModal
        isOpen={isCropperOpen}
        imageUrl={cropTargetUrl}
        initialAspectRatio="9:16"
        title={isCroppingActiveStory ? 'Crop Story Photo' : 'Crop & Refine 24h Story'}
        postButtonLabel={isCroppingActiveStory ? 'Apply to Story' : 'Crop & Publish Now'}
        onClose={() => {
          setIsCropperOpen(false);
          setIsCroppingActiveStory(false);
        }}
        onApplyCrop={(croppedDataUrl) => {
          setIsCropperOpen(false);
          if (isCroppingActiveStory) {
            currentStory.imgUrl = croppedDataUrl;
          } else {
            setNewImgUrl(croppedDataUrl);
          }
          setIsCroppingActiveStory(false);
        }}
        onPostDirectly={(croppedDataUrl) => {
          setIsCropperOpen(false);
          if (isCroppingActiveStory) {
            currentStory.imgUrl = croppedDataUrl;
          } else {
            publishStoryWithImage(croppedDataUrl);
          }
          setIsCroppingActiveStory(false);
        }}
      />
    </div>
  );
}