
import { useState, useEffect, useRef } from 'react';
import {
  vaultAudio,
  BGM_TRACKS,
  type HoverSoundProfile,
  type BgmTrackConfig,
} from '../../services/audioSynthesizer';
import { useVaultStore } from '../../stores/useVaultStore';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Music,
  Radio,
  Sparkles,
  X,
  Volume1,
  Check,
  Disc3,
  Music2,
  Camera,
  BellRing,
  Upload,
  FileAudio,
  Trash2,
  Globe,
} from 'lucide-react';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HOVER_OPTIONS: {
  id: HoverSoundProfile;
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  { id: 'marimba', name: 'Warm Marimba', desc: 'Acoustic resonant wood harmonics', icon: Disc3, color: 'text-amber-400' },
  { id: 'glass', name: 'Crystal Glass', desc: 'Ethereal singing bowl chime', icon: Sparkles, color: 'text-cyan-400' },
  { id: 'harp', name: 'Plucked Harp', desc: 'Celtic acoustic plucked strings', icon: Music2, color: 'text-violet-400' },
  { id: 'click', name: 'Leica Click', desc: 'Precision mechanical camera shutter', icon: Camera, color: 'text-rose-400' },
  { id: 'celestial', name: 'Celestial Bell', desc: 'Cosmic harmonic shimmer', icon: BellRing, color: 'text-yellow-300' },
  { id: 'off', name: 'Silent / Off', desc: 'No sound on memory hover', icon: VolumeX, color: 'text-slate-400' },
];

export function AudioSettingsModal({ isOpen, onClose }: AudioSettingsModalProps) {
  const [isBgmActive, setIsBgmActive] = useState(vaultAudio.isBgmActive());
  const [currentTrack, setCurrentTrack] = useState<BgmTrackConfig['id']>(vaultAudio.getCurrentTrack());
  const [hoverProfile, setHoverProfile] = useState<HoverSoundProfile>(vaultAudio.getHoverProfile());
  const [bgmVolume, setBgmVolume] = useState(vaultAudio.getBgmVolume());
  const [sfxVolume, setSfxVolume] = useState(vaultAudio.getSfxVolume());
  const [isMuted, setIsMuted] = useState(vaultAudio.getIsMuted());
  const [customTrackName, setCustomTrackName] = useState<string | null>(vaultAudio.getCustomTrackName());
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    globes,
    activeGlobeId,
    setActiveGlobeId,
    updateGlobeBgm,
    recordAuditEvent,
  } = useVaultStore();

  const [selectedGlobeId, setSelectedGlobeId] = useState(activeGlobeId);

  // Keep selectedGlobeId synced with activeGlobeId
  useEffect(() => {
    setSelectedGlobeId(activeGlobeId);
  }, [activeGlobeId]);

  const targetGlobe = globes.find((g) => g.id === selectedGlobeId) || globes[0];

  useEffect(() => {
    return vaultAudio.subscribe(() => {
      setIsBgmActive(vaultAudio.isBgmActive());
      setCurrentTrack(vaultAudio.getCurrentTrack());
      setHoverProfile(vaultAudio.getHoverProfile());
      setBgmVolume(vaultAudio.getBgmVolume());
      setSfxVolume(vaultAudio.getSfxVolume());
      setIsMuted(vaultAudio.getIsMuted());
      setCustomTrackName(vaultAudio.getCustomTrackName());
    });
  }, []);

  if (!isOpen) return null;

  const handleToggleBgm = () => {
    vaultAudio.toggleBgm();
  };

  const handleSelectTrack = (trackId: BgmTrackConfig['id']) => {
    const track = BGM_TRACKS.find((t) => t.id === trackId);
    if (track && targetGlobe) {
      updateGlobeBgm(targetGlobe.id, trackId, track.name, undefined);
    }
    vaultAudio.selectBgmTrack(trackId);
    if (!isBgmActive) {
      vaultAudio.startBgm(trackId);
    }
  };

  const handleSelectHover = (profile: HoverSoundProfile) => {
    vaultAudio.setHoverProfile(profile);
    vaultAudio.playHoverChime(523.25); // Instant preview feedback
  };

  const handleCustomAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.webm'];
    const isAudio = file.type.startsWith('audio/') || validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!isAudio) {
      alert('Please select an audio file (.mp3, .wav, .m4a, .ogg, or .flac).');
      return;
    }

    const url = URL.createObjectURL(file);
    if (targetGlobe) {
      updateGlobeBgm(targetGlobe.id, 'custom', file.name, url);
    }
    vaultAudio.loadCustomTrack(url, file.name, true);

    if (e.target) {
      e.target.value = '';
    }

    recordAuditEvent({
      action: 'create',
      resourceType: 'security',
      resourceId: 'custom_bgm_track',
      status: 'success',
      resourceName: file.name,
      details: { info: `Loaded custom memory soundtrack for planet ${targetGlobe?.name}: ${file.name}` },
    });
  };

  const handleDropAudio = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    if (targetGlobe) {
      updateGlobeBgm(targetGlobe.id, 'custom', file.name, url);
    }
    vaultAudio.loadCustomTrack(url, file.name, true);

    recordAuditEvent({
      action: 'create',
      resourceType: 'security',
      resourceId: 'custom_bgm_track',
      status: 'success',
      resourceName: file.name,
      details: { info: `Loaded custom memory soundtrack via drag & drop for ${targetGlobe?.name}: ${file.name}` },
    });
  };

  const handleClearCustomAudio = () => {
    if (targetGlobe) {
      updateGlobeBgm(targetGlobe.id, 'orbit', 'Celestial Orbit', undefined);
    }
    vaultAudio.clearCustomTrack();
    vaultAudio.selectBgmTrack('orbit');
    recordAuditEvent({
      action: 'audio.custom_remove',
      resourceType: 'security',
      resourceId: 'custom_bgm_track',
      resourceName: customTrackName || 'Custom Audio',
      status: 'success',
      details: { info: `Removed custom memory soundtrack from ${targetGlobe?.name}` },
    });
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[88vh] h-[88vh] sm:h-auto sm:max-h-[85vh] bg-white dark:bg-[#090C14] text-slate-900 dark:text-white border border-black/10 dark:border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Top Header */}
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 px-5 sm:px-7 py-4 flex-shrink-0 bg-white/95 dark:bg-[#090C14]/95 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-vault-gold/15 border border-vault-gold/30 text-amber-700 dark:text-vault-gold">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-slate-900 dark:text-white tracking-wide">
                Celestial Audio & Ambient Studio
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-sans mt-0.5">
                Generative background music, custom soundtracks & interactive soundscapes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            title="Close Audio Settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-7 space-y-5 no-scrollbar">

        {/* Planet Target Selector Pill Bar */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-vault-gold/10 border border-vault-gold/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-vault-gold/20 flex items-center justify-center text-vault-gold flex-shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-serif font-bold text-slate-900 dark:text-white">
                  Soundtrack For: <span className="text-amber-600 dark:text-vault-gold">{targetGlobe?.name}</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-vault-gold/15 border border-vault-gold/30 text-amber-900 dark:text-vault-gold">
                  {targetGlobe?.bgmTrackName || 'Celestial Orbit'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                Each planet in the universe plays its own soundtrack when you enter its orbit.
              </p>
            </div>
          </div>

          {/* Quick Planet Selector Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-full">
            {globes.map((globe) => {
              const isSelected = globe.id === selectedGlobeId;
              return (
                <button
                  key={globe.id}
                  type="button"
                  onClick={() => {
                    setSelectedGlobeId(globe.id);
                    if (activeGlobeId !== globe.id) {
                      setActiveGlobeId(globe.id);
                    }
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-vault-gold text-black font-bold shadow-sm'
                      : 'bg-white/80 dark:bg-white/5 border border-stone-300 dark:border-white/10 text-stone-700 dark:text-stone-300 hover:border-vault-gold/40'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: globe.customColor || '#F59E0B' }}
                  />
                  <span className="truncate max-w-[105px]">{globe.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Master Mute & Status Bar */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-black/5 dark:bg-white/[0.03] border border-black/10 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => vaultAudio.setMuted(!isMuted)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
              }`}
              title={isMuted ? 'Unmute All Audio' : 'Mute All Audio'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span>{isMuted ? 'All Audio Muted' : 'Audio Engine Active'}</span>
                {isBgmActive && !isMuted && (
                  <span className="flex items-end gap-0.5 h-2.5 ml-1">
                    <span className="w-0.5 h-2 bg-emerald-500 animate-bounce" style={{ animationDuration: '0.6s' }} />
                    <span className="w-0.5 h-3 bg-emerald-500 animate-bounce" style={{ animationDuration: '0.8s', animationDelay: '0.15s' }} />
                    <span className="w-0.5 h-1.5 bg-emerald-500 animate-bounce" style={{ animationDuration: '0.5s', animationDelay: '0.3s' }} />
                  </span>
                )}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                {isBgmActive ? 'Playing ambient soundscape' : 'Ready · Tap Play BGM'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => vaultAudio.testAudioTone()}
              className="px-2.5 py-1.5 rounded-full text-[11px] font-medium bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              title="Test speaker output with a warm chord"
            >
              Test Speaker
            </button>

            <button
              onClick={handleToggleBgm}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all shadow-md cursor-pointer ${
                isBgmActive
                  ? 'bg-vault-gold text-black hover:brightness-110'
                  : 'bg-black/10 dark:bg-white/10 text-slate-800 dark:text-white hover:bg-black/20 dark:hover:bg-white/20'
              }`}
            >
              {isBgmActive ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause BGM</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  <span>Play BGM</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* SECTION 1: Background Music (BGM) Soundscape Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-amber-700 dark:text-vault-gold flex items-center gap-1.5 font-semibold">
              <Radio className="w-3.5 h-3.5" />
              <span>Ambient BGM Soundscapes</span>
            </span>
            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
              Volume: {Math.round(bgmVolume * 100)}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {BGM_TRACKS.map((track) => {
              const isSelected =
                !targetGlobe?.bgmTrackUrl &&
                (targetGlobe?.bgmTrackId
                  ? targetGlobe.bgmTrackId === track.id
                  : currentTrack === track.id) &&
                !customTrackName;
              const isCurrentPlaying = (currentTrack === track.id) && isBgmActive && !customTrackName;

              return (
                <div
                  key={track.id}
                  onClick={() => handleSelectTrack(track.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-vault-gold/15 border-vault-gold/70 shadow-sm text-slate-900 dark:text-white'
                      : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/25 hover:bg-black/5 dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white tracking-wide">
                          {track.name}
                        </span>
                        {isCurrentPlaying && (
                          <div className="flex items-end gap-0.5 h-3">
                            <span className="w-0.5 h-2 bg-vault-gold animate-bounce" />
                            <span className="w-0.5 h-3 bg-vault-gold animate-bounce delay-75" />
                            <span className="w-0.5 h-1.5 bg-vault-gold animate-bounce delay-150" />
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">
                        {track.tagline}
                      </p>
                    </div>

                    <div className="flex items-center">
                      {isSelected ? (
                        <div className="p-1 rounded-full bg-vault-gold text-black">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <Play className="w-3.5 h-3.5 text-slate-400 hover:text-slate-900 dark:hover:text-white" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-black/5 dark:border-white/5 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>{track.keyCenter}</span>
                    <span>•</span>
                    <span>{track.tempo}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Audio Upload Row with Native Label Binding, Drag & Drop */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDropAudio}
            className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isDragOver
                ? 'bg-purple-500/15 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                : 'bg-stone-50 dark:bg-white/[0.02] border-stone-200 dark:border-white/10'
            }`}
          >
            <div className="flex items-center gap-3 overflow-hidden min-w-0">
              <div className="p-2.5 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex-shrink-0">
                <FileAudio className="w-5 h-5" />
              </div>
              <div className="overflow-hidden min-w-0">
                <span className="text-xs font-bold block text-slate-900 dark:text-white truncate">
                  {customTrackName ? customTrackName : 'Custom Soundtrack'}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">
                  {customTrackName ? 'Custom Audio Active · Playing in Orbit' : 'Load your own MP3, WAV or M4A music'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
              {/* Native Hidden File Input linked by id to label */}
              <input
                id="custom-audio-upload-input"
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
                onChange={handleCustomAudioUpload}
                className="sr-only"
                aria-label="Upload custom soundtrack"
              />

              {/* Direct Native Label Trigger - Works 100% reliably on all mobile and desktop browsers */}
              <label
                htmlFor="custom-audio-upload-input"
                onClick={() => vaultAudio.playWhoosh()}
                className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer select-none"
                title="Select MP3, WAV, or M4A audio file"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{customTrackName ? 'Change' : 'Upload'}</span>
              </label>

              {/* Instant Demo Soundtrack Button */}
              <button
                type="button"
                onClick={() => {
                  vaultAudio.playWhoosh();
                  vaultAudio.loadCustomDemo();
                }}
                className="px-3 py-2 rounded-xl bg-stone-200/80 hover:bg-stone-300 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 text-xs font-medium flex items-center gap-1 transition-all active:scale-95 cursor-pointer select-none"
                title="Try Generative Demo Soundtrack"
              >
                <span>Try Demo</span>
              </button>

              {customTrackName && (
                <button
                  type="button"
                  onClick={handleClearCustomAudio}
                  title="Remove Custom Track"
                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Dedicated BGM Volume Control Card */}
          <div className="p-4 sm:p-5 pb-5 rounded-2xl bg-black/5 dark:bg-white/[0.04] border border-black/10 dark:border-white/10 flex flex-col gap-2.5 mt-2 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-vault-gold" />
                <span>Background Soundtrack Volume</span>
              </span>
              <span className="font-mono text-[11px] text-vault-gold font-bold">
                {Math.round(bgmVolume * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-3 py-1.5 min-h-[32px]">
              <Volume1 className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={bgmVolume}
                onChange={(e) => vaultAudio.setBgmVolume(parseFloat(e.target.value))}
                className="w-full accent-vault-gold cursor-pointer h-2 bg-black/10 dark:bg-white/15 rounded-lg appearance-none"
              />
              <Volume2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </div>
          </div>
        </div>

        {/* SECTION 2: Professional Hover Sound Profile */}
        <div className="space-y-3 pt-2 border-t border-black/10 dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-1.5 font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Interactive Hover Sound</span>
            </span>
            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-mono">
              SFX: {Math.round(sfxVolume * 100)}%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {HOVER_OPTIONS.map((opt) => {
              const isSelected = hoverProfile === opt.id;
              const Icon = opt.icon;

              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelectHover(opt.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-purple-500/15 border-purple-500/60 shadow-sm text-slate-900 dark:text-white'
                      : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`p-1.5 rounded-lg bg-black/5 dark:bg-white/5 ${opt.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 stroke-[3]" />}
                  </div>
                  <div className="mt-1.5">
                    <span className="text-xs font-semibold block text-slate-900 dark:text-white">{opt.name}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{opt.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* SFX Volume Slider & Test Button */}
          <div className="flex items-center gap-3 py-1.5 min-h-[32px]">
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={sfxVolume}
              onChange={(e) => vaultAudio.setSfxVolume(parseFloat(e.target.value))}
              className="w-full accent-purple-600 dark:accent-purple-400 cursor-pointer h-2 bg-black/10 dark:bg-white/15 rounded-lg appearance-none"
            />
            <button
              onClick={() => vaultAudio.playHoverChime(523.25)}
              className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-800 dark:text-white text-[11px] font-medium transition-colors flex-shrink-0 cursor-pointer"
            >
              Test SFX
            </button>
          </div>
        </div>
        </div>

        {/* Fixed Bottom Action Footer */}
        <div className="px-5 sm:px-7 py-3.5 border-t border-black/10 dark:border-white/10 flex items-center justify-between flex-shrink-0 bg-stone-50/95 dark:bg-[#090C14]/95 backdrop-blur-md">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
            {isMuted ? 'Muted' : 'Audio Active'} • {Math.round(bgmVolume * 100)}% BGM
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-vault-gold text-black font-semibold text-xs hover:brightness-110 shadow-lg cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
}
