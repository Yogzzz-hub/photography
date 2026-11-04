import { useState, useEffect } from 'react';
import { useVaultStore } from '../../stores/useVaultStore';
import {
  vaultAudio,
  BGM_TRACKS,
  type HoverSoundProfile,
  type BgmTrackConfig,
} from '../../services/audioSynthesizer';
import {
  bufferToHex,
  generateRandomBytes,
  encryptJsonMetadata,
} from '../../crypto/vaultCrypto';
import type { ViewMode3D } from '../../types';
import {
  BookOpen,
  X,
  Compass,
  Sparkles,
  Music,
  Sun,
  Moon,
  ShieldCheck,
  Clock,
  ChevronRight,
  ChevronLeft,
  Smartphone,
  Laptop,
  Check,
  Play,
  Pause,
  Volume2,
  Key,
  Lock,
  Unlock,
  Copy,
  RefreshCw,
  Target,
  RotateCcw,
  Sliders,
  Send,
  Radio,
  Layers,
  Camera,
  BellRing,
  Music2,
  Disc3,
  ExternalLink,
} from 'lucide-react';

interface VaultGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSpotlightTour?: () => void;
  onOpenStoryViewer?: () => void;
}

export function VaultGuideModal({
  isOpen,
  onClose,
  onStartSpotlightTour,
  onOpenStoryViewer,
}: VaultGuideModalProps) {
  const {
    photos,
    viewMode3D,
    setViewMode3D,
    orientationFilter,
    setOrientationFilter,
    theme,
    setTheme,
    toggleTheme,
    currentFamily,
    currentMember,
    isVaultUnlocked,
    lockVault,
  } = useVaultStore();

  const [activeTab, setActiveTab] = useState(0);

  // Tab 1: 3D Universe interactive state
  const [testModeFeedback, setTestModeFeedback] = useState<string | null>(null);

  // Tab 3: 24h Stories interactive state
  const [isFannedOut, setIsFannedOut] = useState(false);
  const [storyCountdownSeconds, setStoryCountdownSeconds] = useState(23 * 3600 + 59 * 60 + 48);
  const [quickStoryInput, setQuickStoryInput] = useState('');
  const [publishedStorySuccess, setPublishedStorySuccess] = useState(false);

  // Tab 4: Audio Studio interactive state
  const [isBgmPlaying, setIsBgmPlaying] = useState(vaultAudio.isBgmActive());
  const [currentTrackId, setCurrentTrackId] = useState<BgmTrackConfig['id']>(vaultAudio.getCurrentTrack());
  const [audioVolume, setAudioVolume] = useState(vaultAudio.getBgmVolume());
  const [activeHoverTone, setActiveHoverTone] = useState<HoverSoundProfile>(vaultAudio.getHoverProfile());

  // Tab 6: Cryptography interactive state
  const [generatedKeyHex, setGeneratedKeyHex] = useState('');
  const [testPlaintext, setTestPlaintext] = useState('Private Family Memory · Verona 2024');
  const [encryptedPayload, setEncryptedPayload] = useState<{ ciphertextHex: string; ivHex: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Real vault photo counts (Zero mock data)
  const totalPhotos = photos.filter((p) => !p.inTrash).length;
  const landscapePhotos = photos.filter((p) => !p.inTrash && p.width >= p.height).length;
  const portraitPhotos = photos.filter((p) => !p.inTrash && p.height > p.width).length;

  // Real representative sample photos from active vault
  const sampleLandscape = photos.find((p) => !p.inTrash && p.width >= p.height) || photos[0];
  const samplePortrait = photos.find((p) => !p.inTrash && p.height > p.width) || photos[1] || photos[0];

  // Live countdown ticker for 24h story simulator
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setStoryCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 24 * 3600));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Sync audio engine listener
  useEffect(() => {
    if (!isOpen) return;
    return vaultAudio.subscribe(() => {
      setIsBgmPlaying(vaultAudio.isBgmActive());
      setCurrentTrackId(vaultAudio.getCurrentTrack());
      setAudioVolume(vaultAudio.getBgmVolume());
      setActiveHoverTone(vaultAudio.getHoverProfile());
    });
  }, [isOpen]);

  // Generate initial test cryptographic key on mount
  useEffect(() => {
    if (isOpen && !generatedKeyHex) {
      handleGenerateNewKey();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerateNewKey = () => {
    const bytes = generateRandomBytes(32);
    const hex = bufferToHex(bytes);
    setGeneratedKeyHex(hex);
    handleEncryptText(testPlaintext, hex);
  };

  const handleEncryptText = async (text: string, keyHex?: string) => {
    try {
      const activeHex = keyHex || generatedKeyHex;
      if (!activeHex) return;
      const rawKey = await window.crypto.subtle.importKey(
        'raw',
        generateRandomBytes(32) as any,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );
      const enc = await encryptJsonMetadata({ memory: text, timestamp: Date.now() }, rawKey);
      setEncryptedPayload({
        ciphertextHex: enc.ciphertextHex.slice(0, 48) + '...',
        ivHex: enc.ivHex,
      });
    } catch (_) {}
  };

  const handleCopyKey = () => {
    if (!generatedKeyHex) return;
    navigator.clipboard?.writeText(generatedKeyHex);
    setCopiedKey(true);
    vaultAudio.playWhoosh();
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const formatCountdown = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  };

  const GUIDE_SECTIONS = [
    {
      id: 'orbit',
      title: '3D Memory Universe',
      shortLabel: 'Cosmos',
      icon: Compass,
      color: 'text-amber-500 dark:text-amber-400',
      summary: 'Explore family memories arranged in a dense, interactive 3D cosmos with dynamic perspective.',
    },
    {
      id: 'orientations',
      title: 'Landscape & Portrait Mosaics',
      shortLabel: 'Mosaics',
      icon: Sparkles,
      color: 'text-cyan-600 dark:text-cyan-400',
      summary: 'Seamlessly isolate widescreen 16:9 memories or vertical 9:16 phone portraits without black bars.',
    },
    {
      id: 'stories',
      title: '24-Hour Family Stories',
      shortLabel: 'Stories',
      icon: Clock,
      color: 'text-rose-500 dark:text-rose-400',
      summary: 'Share ephemeral moments that stay active for exactly 24 hours before naturally expiring.',
    },
    {
      id: 'audio',
      title: 'Celestial Audio Studio',
      shortLabel: 'Audio',
      icon: Music,
      color: 'text-purple-600 dark:text-purple-400',
      summary: 'Rich generative ambient soundscapes, tactile interactive instruments, and custom music tracks.',
    },
    {
      id: 'themes',
      title: 'Atelier Visual Themes',
      shortLabel: 'Themes',
      icon: Sun,
      color: 'text-amber-600 dark:text-yellow-400',
      summary: 'Obsidian Void dark mode with glowing glass tiles or Atelier Alabaster light mode with porcelain cards.',
    },
    {
      id: 'security',
      title: 'Zero-Knowledge Cryptography',
      shortLabel: 'Security',
      icon: ShieldCheck,
      color: 'text-emerald-600 dark:text-emerald-400',
      summary: 'Hardware-accelerated AES-256-GCM encryption performed completely client-side in your browser.',
    },
  ];

  const current = GUIDE_SECTIONS[activeTab];
  const Icon = current.icon;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[88vh] sm:max-h-[90vh] bg-white dark:bg-[#070912] text-slate-900 dark:text-white border border-black/10 dark:border-white/15 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col gap-3 sm:gap-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-vault-gold p-0.5 shadow-glow flex items-center justify-center">
              <div className="w-full h-full bg-[#080B13] rounded-[14px] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-vault-gold" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-serif font-bold text-slate-900 dark:text-white tracking-wide">
                  MyOrb Interactive Vault Guide
                </h2>
                <span className="hidden sm:inline-block text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-vault-gold/20 text-vault-gold font-bold border border-vault-gold/30">
                  Interactive Studio
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                Hands-on live interactive walkthrough for phone and desktop
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onStartSpotlightTour && (
              <button
                onClick={() => {
                  vaultAudio.playWhoosh();
                  onClose();
                  onStartSpotlightTour();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-vault-gold/15 hover:bg-vault-gold/25 border border-vault-gold/40 text-vault-gold text-xs font-semibold transition-all cursor-pointer"
                title="Start interactive on-screen spotlight tour"
              >
                <Target className="w-3.5 h-3.5" />
                <span>Live Tour</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
              title="Close Guide (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 6-Section Adaptive Control Bar (Zero Side-Scrolling: 3 cols on mobile, 6 cols on desktop) */}
        <div className="flex-shrink-0 space-y-2">
          {/* Top Segmented Progress Line */}
          <div className="grid grid-cols-6 gap-1 px-0.5">
            {GUIDE_SECTIONS.map((sec, idx) => (
              <div
                key={`progress_${sec.id}`}
                onClick={() => {
                  vaultAudio.playWhoosh();
                  setActiveTab(idx);
                }}
                title={sec.title}
                className={`h-1 rounded-full cursor-pointer transition-all duration-300 ${
                  idx === activeTab
                    ? 'bg-vault-gold shadow-sm'
                    : idx < activeTab
                    ? 'bg-amber-500/40 dark:bg-vault-gold/40'
                    : 'bg-stone-200 dark:bg-white/10'
                }`}
              />
            ))}
          </div>

          {/* 6 Adaptive Section Buttons: Fits 100% of screens with NO side scrolling */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 sm:gap-1.5">
            {GUIDE_SECTIONS.map((sec, idx) => {
              const SecIcon = sec.icon;
              const isActive = activeTab === idx;
              return (
                <button
                  key={sec.id}
                  onClick={() => {
                    vaultAudio.playWhoosh();
                    setActiveTab(idx);
                  }}
                  className={`px-2 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 text-center ${
                    isActive
                      ? 'bg-vault-gold text-black font-bold shadow-md ring-1 ring-vault-gold'
                      : 'bg-black/5 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/[0.08] border border-black/5 dark:border-white/5'
                  }`}
                  title={sec.title}
                >
                  <SecIcon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-black' : sec.color}`} />
                  <span className="truncate">{sec.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ACTIVE SECTION INTERACTIVE PLAYGROUND CONTAINER */}
        <div className="p-4 sm:p-5 rounded-3xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* Section Heading & Overview */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 ${current.color}`}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-serif font-bold text-slate-900 dark:text-white">
                  {current.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed font-sans">
                  {current.summary}
                </p>
              </div>
            </div>
          </div>

          {/* TAB 1 PLAYGROUND: 3D Memory Universe */}
          {activeTab === 0 && (
            <div className="space-y-3 font-sans">
              <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-vault-gold" />
                    <span>Interactive 3D Layout Mode Switcher</span>
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-amber-800 dark:text-vault-gold">Live Mode: {viewMode3D.toUpperCase()}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {(
                    [
                      { mode: 'orb', label: 'Spherical Orb' },
                      { mode: 'curved_wall', label: 'IMAX Wall' },
                      { mode: 'galaxy', label: 'Galactic Spiral' },
                      { mode: 'tunnel', label: 'Memory Tunnel' },
                      { mode: 'constellation', label: 'Constellation' },
                    ] as const
                  ).map(({ mode, label }) => (
                    <button
                      key={mode}
                      onClick={() => {
                        vaultAudio.playWhoosh();
                        setViewMode3D(mode);
                        setTestModeFeedback(`Switched live universe layout to ${label}!`);
                        setTimeout(() => setTestModeFeedback(null), 3000);
                      }}
                      className={`p-2 rounded-xl text-xs font-medium transition-all text-center cursor-pointer ${
                        viewMode3D === mode
                          ? 'bg-vault-gold text-black font-bold shadow-md'
                          : 'bg-black/5 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/[0.08]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {testModeFeedback && (
                  <div className="text-[11px] text-emerald-500 font-mono flex items-center gap-1.5 animate-in fade-in">
                    <Check className="w-3.5 h-3.5" />
                    <span>{testModeFeedback}</span>
                  </div>
                )}
              </div>

              {/* Phone vs Laptop Interactive Guidance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                    <Smartphone className="w-3.5 h-3.5 text-vault-gold" />
                    <span>Phone Experience (Touch Controls)</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                    Swipe with one finger to spin the cosmos. Tap any card directly to dive inside and view in crystal-clear full resolution.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-800 dark:text-purple-300">
                    <Laptop className="w-3.5 h-3.5 text-purple-400" />
                    <span>Laptop Experience (Mouse & Trackpad)</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                    Click and drag horizontally or vertically to orbit the sphere. Scroll the mouse wheel to smoothly zoom in or out.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2 PLAYGROUND: Landscape & Portrait Mosaics */}
          {activeTab === 1 && (
            <div className="space-y-3 font-sans">
              <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Live Vault Aspect Ratio Filter</span>
                  </span>
                  <span className="text-[11px] font-mono font-semibold text-cyan-800 dark:text-cyan-400">
                    Total: {totalPhotos} Authentic Photos
                  </span>
                </div>

                {/* Live Real-Count Orientation Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      vaultAudio.playWhoosh();
                      setOrientationFilter('all');
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      orientationFilter === 'all'
                        ? 'bg-vault-gold text-black shadow-md font-bold'
                        : 'bg-black/5 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/[0.08]'
                    }`}
                  >
                    <span>✦ All</span>
                    <span className="font-mono text-[10px] bg-black/10 dark:bg-black/30 px-1.5 py-0.2 rounded">
                      {totalPhotos}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      vaultAudio.playWhoosh();
                      setOrientationFilter('landscape');
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      orientationFilter === 'landscape'
                        ? 'bg-vault-gold text-black shadow-md font-bold'
                        : 'bg-black/5 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/[0.08]'
                    }`}
                  >
                    <span>▱ Landscape (16:9)</span>
                    <span className="font-mono text-[10px] bg-black/10 dark:bg-black/30 px-1.5 py-0.2 rounded">
                      {landscapePhotos}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      vaultAudio.playWhoosh();
                      setOrientationFilter('portrait');
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      orientationFilter === 'portrait'
                        ? 'bg-vault-gold text-black shadow-md font-bold'
                        : 'bg-black/5 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/[0.08]'
                    }`}
                  >
                    <span>▯ Portrait (9:16)</span>
                    <span className="font-mono text-[10px] bg-black/10 dark:bg-black/30 px-1.5 py-0.2 rounded">
                      {portraitPhotos}
                    </span>
                  </button>
                </div>

                {/* Real Photo Aspect Ratio Visual Comparison */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div
                    className={`p-2.5 rounded-xl border transition-all ${
                      orientationFilter === 'landscape' || orientationFilter === 'all'
                        ? 'border-vault-gold/60 bg-vault-gold/10'
                        : 'border-white/5 opacity-40'
                    }`}
                  >
                    <div className="relative aspect-video rounded-lg overflow-hidden mb-2 bg-slate-900">
                      <img
                        src={sampleLandscape?.storagePath || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80'}
                        alt=""
                        aria-hidden="true"
                        onError={(e) => {
                          const img = e.currentTarget;
                          img.onerror = null;
                          img.src = 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80';
                        }}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 font-mono text-[9px] text-white">
                        16:9 Widescreen
                      </span>
                    </div>
                    <div className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate">
                      {sampleLandscape?.metadata.title}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {sampleLandscape?.width} × {sampleLandscape?.height} px
                    </div>
                  </div>

                  <div
                    className={`p-2.5 rounded-xl border transition-all ${
                      orientationFilter === 'portrait' || orientationFilter === 'all'
                        ? 'border-vault-gold/60 bg-vault-gold/10'
                        : 'border-white/5 opacity-40'
                    }`}
                  >
                    <div className="relative aspect-[9/16] max-h-36 mx-auto rounded-lg overflow-hidden mb-2 bg-slate-900">
                      <img
                        src={samplePortrait?.storagePath || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'}
                        alt=""
                        aria-hidden="true"
                        onError={(e) => {
                          const img = e.currentTarget;
                          img.onerror = null;
                          img.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80';
                        }}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 font-mono text-[9px] text-white">
                        9:16 Mobile
                      </span>
                    </div>
                    <div className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate">
                      {samplePortrait?.metadata.title}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {samplePortrait?.width} × {samplePortrait?.height} px
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3 PLAYGROUND: 24-Hour Family Stories (Interactive Card Fan & Live Simulator) */}
          {activeTab === 2 && (
            <div className="space-y-3 font-sans">
              <div className="p-4 rounded-2xl bg-black/5 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-white">
                    <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                    <span>Interactive 3D Fanned Story Stack</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-rose-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    <span>Auto-Expiring: {formatCountdown(storyCountdownSeconds)}</span>
                  </div>
                </div>

                {/* 3D Fanned Stack with Hover & Touch Simulation */}
                <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-4">
                  {/* The Interactive Fanned Cards Container */}
                  <div
                    onMouseEnter={() => setIsFannedOut(true)}
                    onMouseLeave={() => setIsFannedOut(false)}
                    className="relative w-44 h-28 cursor-pointer select-none transition-transform duration-300"
                    title="Hover or tap to fan out cards"
                  >
                    {[
                      { id: 'c1', title: 'Grand Hallway Vows', author: 'Elena V.', rot: -8, tx: -32, ty: -10, img: sampleLandscape?.storagePath || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80' },
                      { id: 'c2', title: 'Palazzo Arcades', author: 'Marcus S.', rot: 0, tx: 0, ty: -18, img: samplePortrait?.storagePath || 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=800&q=80' },
                      { id: 'c3', title: 'Karst Horizon', author: 'Clara C.', rot: 8, tx: 32, ty: -10, img: photos[2]?.storagePath || sampleLandscape?.storagePath || 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80' },
                    ].map((card, idx) => {
                      const transformStyle = isFannedOut
                        ? `translateX(${card.tx}px) translateY(${card.ty}px) rotate(${card.rot * 1.5}deg) scale(1.08)`
                        : `rotate(${card.rot}deg)`;

                      return (
                        <div
                          key={card.id}
                          style={{
                            transform: transformStyle,
                            zIndex: idx + 1,
                            transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          }}
                          className="absolute inset-0 rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-slate-950"
                        >
                          <img
                            src={card.img}
                            alt=""
                            aria-hidden="true"
                            onError={(e) => {
                              const img = e.currentTarget;
                              img.onerror = null;
                              img.src = 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80';
                            }}
                            className="w-full h-full object-cover brightness-95 pointer-events-none"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                          <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[10px] text-white">
                            <span className="font-semibold truncate max-w-[90px]">{card.author}</span>
                            <span className="text-[9px] font-mono text-vault-gold bg-black/70 px-1 rounded">24h</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Fan-Out Simulator Button & Story Viewer Trigger - Sleek Capsule Controls */}
                  <div className="flex flex-col items-center sm:items-start gap-1.5">
                    <button
                      onClick={() => {
                        vaultAudio.playWhoosh();
                        setIsFannedOut(!isFannedOut);
                      }}
                      className="px-3 py-1 rounded-full text-xs font-medium bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer border border-black/5 dark:border-white/10"
                    >
                      <Layers className="w-3.5 h-3.5 text-vault-gold" />
                      <span>{isFannedOut ? 'Collapse' : 'Fan Cards'}</span>
                    </button>

                    {onOpenStoryViewer && (
                      <button
                        onClick={() => {
                          vaultAudio.playWhoosh();
                          onClose();
                          onOpenStoryViewer();
                        }}
                        className="px-3 py-1 rounded-full bg-vault-gold hover:bg-amber-400 text-black text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open Stories ↗</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Add Story Live Simulation */}
                <div className="pt-2 border-t border-black/10 dark:border-white/10">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                    Live 24h Story Creator Simulation:
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Share a thought for today's 24-hour memory..."
                      value={quickStoryInput}
                      onChange={(e) => setQuickStoryInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-vault-gold"
                    />
                    <button
                      onClick={() => {
                        if (!quickStoryInput.trim()) return;
                        vaultAudio.playWhoosh();
                        setPublishedStorySuccess(true);
                        setQuickStoryInput('');
                        setTimeout(() => setPublishedStorySuccess(false), 3000);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                    >
                      <Send className="w-3 h-3" />
                      <span>Publish</span>
                    </button>
                  </div>
                  {publishedStorySuccess && (
                    <div className="text-[11px] text-emerald-400 font-mono mt-1.5 flex items-center gap-1 animate-in fade-in">
                      <Check className="w-3.5 h-3.5" />
                      <span>Story published live! Visible to all family members for the next 24 hours.</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4 PLAYGROUND: Celestial Audio Studio */}
          {activeTab === 3 && (
            <div className="space-y-3 font-sans">
              <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-purple-400" />
                    <span>Playable Ambient BGM Soundscapes</span>
                  </span>
                  <button
                    onClick={() => vaultAudio.toggleBgm()}
                    className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isBgmPlaying
                        ? 'bg-vault-gold text-black shadow-md font-bold'
                        : 'bg-black/5 dark:bg-white/10 text-slate-800 dark:text-slate-200 border border-black/10 dark:border-white/10'
                    }`}
                  >
                    {isBgmPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
                    <span>{isBgmPlaying ? 'Pause Audio' : 'Play Soundscape'}</span>
                  </button>
                </div>

                {/* Ambient Track Selector Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {BGM_TRACKS.map((t) => {
                    const isSelected = currentTrackId === t.id && isBgmPlaying;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          vaultAudio.startBgm(t.id);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-vault-gold/20 border-vault-gold text-amber-900 dark:text-vault-gold font-bold shadow-sm'
                            : 'bg-black/5 dark:bg-white/[0.04] border-black/10 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/[0.08]'
                        }`}
                      >
                        <div className="text-xs font-bold">{t.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{t.tempo}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Tactile Hover Sound Board */}
                <div className="pt-2 border-t border-black/10 dark:border-white/10 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    Interactive Memory Hover Sounds (Tap to Test Sound):
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {[
                      { id: 'marimba' as HoverSoundProfile, name: 'Marimba', icon: Disc3 },
                      { id: 'glass' as HoverSoundProfile, name: 'Crystal Glass', icon: Sparkles },
                      { id: 'harp' as HoverSoundProfile, name: 'Plucked Harp', icon: Music2 },
                      { id: 'click' as HoverSoundProfile, name: 'Leica Click', icon: Camera },
                      { id: 'celestial' as HoverSoundProfile, name: 'Celestial Bell', icon: BellRing },
                    ].map(({ id, name, icon: IconComponent }) => (
                      <button
                        key={id}
                        onClick={() => {
                          vaultAudio.setHoverProfile(id);
                          vaultAudio.playHoverChime(523.25);
                        }}
                        className={`p-2 rounded-xl flex items-center justify-center gap-1.5 text-xs font-medium border transition-all cursor-pointer ${
                          activeHoverTone === id
                            ? 'bg-purple-500/20 border-purple-500 text-purple-900 dark:text-purple-200 font-bold shadow-sm'
                            : 'bg-black/5 dark:bg-white/[0.04] border-black/10 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/[0.08]'
                        }`}
                      >
                        <IconComponent className="w-3.5 h-3.5 text-vault-gold" />
                        <span>{name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Volume Slider */}
                <div className="flex items-center gap-3 pt-1">
                  <Volume2 className="w-4 h-4 text-slate-400" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={audioVolume}
                    onChange={(e) => vaultAudio.setBgmVolume(parseFloat(e.target.value))}
                    className="flex-1 accent-vault-gold h-1 bg-black/10 dark:bg-white/20 rounded-lg cursor-pointer"
                  />
                  <span className="text-[11px] font-mono text-slate-500 w-10 text-right">
                    {Math.round(audioVolume * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5 PLAYGROUND: Atelier Visual Themes */}
          {activeTab === 4 && (
            <div className="space-y-3 font-sans">
              <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-semibold text-slate-900 dark:text-white">
                  <span>Live App Theme Switcher</span>
                  <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border self-start sm:self-auto whitespace-nowrap ${
                    theme === 'light'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-vault-gold/15 text-vault-gold border-vault-gold/40'
                  }`}>
                    {theme === 'light' ? '● LIGHT MODE' : '● DARK MODE'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => {
                      vaultAudio.playWhoosh();
                      setTheme('dark');
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      theme === 'dark'
                        ? 'bg-black/90 border-vault-gold shadow-[0_0_20px_rgba(229,192,123,0.3)] text-white'
                        : 'bg-slate-900 border-slate-700 hover:border-slate-500 text-slate-100 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <Moon className="w-4 h-4 text-amber-400" />
                        <span className="text-white">Obsidian Void</span>
                      </div>
                      {theme === 'dark' ? (
                        <span className="text-[10px] font-mono bg-vault-gold text-black font-bold px-2 py-0.5 rounded-full">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                          Select
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      Deep space OLED void (<code className="text-amber-300">#040508</code>) with luminous amber gold memory cards, ambient stars, and blur gradients.
                    </p>
                  </div>

                  <div
                    onClick={() => {
                      vaultAudio.playWhoosh();
                      setTheme('light');
                    }}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      theme === 'light'
                        ? 'bg-white border-amber-500 shadow-md text-slate-900'
                        : 'bg-white/[0.05] border-white/10 hover:border-white/25 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <Sun className="w-4 h-4 text-amber-600" />
                        <span className={theme === 'light' ? 'text-slate-900' : 'text-white'}>Atelier Alabaster</span>
                      </div>
                      {theme === 'light' ? (
                        <span className="text-[10px] font-mono bg-amber-600 text-white font-bold px-2 py-0.5 rounded-full">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono bg-white/10 text-slate-300 px-2 py-0.5 rounded-full border border-white/15">
                          Select
                        </span>
                      )}
                    </div>
                    <p className={`text-xs leading-relaxed font-sans ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                      Porcelain stone gallery aesthetic (<code className={theme === 'light' ? 'text-amber-800 font-semibold' : 'text-amber-300'}>#FAF9F6</code>) with warm drop shadows, crisp dark typography, and golden accents.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6 PLAYGROUND: Zero-Knowledge Cryptography */}
          {activeTab === 5 && (
            <div className="space-y-3 font-sans">
              <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Live Web Crypto 256-Bit Key Generator</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
                    AES-256-GCM
                  </span>
                </div>

                {/* Generated Key Display - Clear Contrast in Both Light & Dark */}
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-black/60 border border-slate-300 dark:border-white/10 flex items-center justify-between gap-2">
                  <div className="font-mono text-[11px] text-emerald-800 dark:text-emerald-400 truncate tracking-wider font-semibold">
                    {generatedKeyHex || 'Generating cryptographic key...'}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={handleCopyKey}
                      className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                      title="Copy Key to Clipboard"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={handleGenerateNewKey}
                      className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                      title="Regenerate Random 256-Bit Key"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Live Real-time Text Encryption Tester */}
                <div className="pt-2 border-t border-black/10 dark:border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-medium">
                    <span className="text-slate-600 dark:text-slate-400">Live Hardware-Accelerated Encryption Test:</span>
                    <span className="text-amber-800 dark:text-vault-gold font-semibold">256 Bits of Entropy</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={testPlaintext}
                      onChange={(e) => {
                        setTestPlaintext(e.target.value);
                        handleEncryptText(e.target.value);
                      }}
                      className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                      placeholder="Type secret family text..."
                    />
                    <button
                      onClick={() => handleEncryptText(testPlaintext)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shadow-sm active:scale-95 transition-all flex-shrink-0"
                    >
                      Encrypt
                    </button>
                  </div>

                  {encryptedPayload && (
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-black/60 border border-emerald-600/30 dark:border-emerald-500/30 text-[10px] font-mono text-emerald-900 dark:text-emerald-300 space-y-1">
                      <div className="truncate font-semibold">Ciphertext: {encryptedPayload.ciphertextHex}</div>
                      <div className="text-slate-600 dark:text-slate-400 font-sans">IV Vector: {encryptedPayload.ivHex} <span className="font-mono text-emerald-700 dark:text-emerald-400 font-medium">(Client-Side Encrypted)</span></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Controls - Sleek Capsule Controls that Never Wrap */}
        <div className="pt-2 border-t border-black/10 dark:border-white/10 flex items-center justify-between flex-shrink-0 gap-2">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span className="font-bold text-slate-800 dark:text-slate-200">{activeTab + 1}</span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-500">{GUIDE_SECTIONS.length}</span>
            <span className="hidden sm:inline text-slate-400">•</span>
            <span className="hidden sm:inline text-amber-700 dark:text-vault-gold font-semibold truncate max-w-[180px]">{current.title}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {activeTab > 0 && (
              <button
                onClick={() => {
                  vaultAudio.playWhoosh();
                  setActiveTab((prev) => prev - 1);
                }}
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-black/10 dark:hover:bg-white/20 transition-all cursor-pointer flex items-center gap-1"
                title="Previous Section"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>
            )}

            {activeTab < GUIDE_SECTIONS.length - 1 ? (
              <button
                onClick={() => {
                  vaultAudio.playWhoosh();
                  setActiveTab((prev) => prev + 1);
                }}
                className="px-3.5 py-1 sm:px-4 sm:py-1.5 rounded-full bg-vault-gold hover:bg-amber-400 text-black font-semibold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                title="Next Section"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => {
                  vaultAudio.playWhoosh();
                  onClose();
                }}
                className="px-3.5 py-1 sm:px-4 sm:py-1.5 rounded-full bg-vault-gold hover:bg-amber-400 text-black font-semibold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1"
                title="Enter Live Vault"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Done</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
