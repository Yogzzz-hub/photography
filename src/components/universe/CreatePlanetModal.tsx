import { useState, useRef } from 'react';
import { useVaultStore } from '../../stores/useVaultStore';
import { vaultAudio, BGM_TRACKS } from '../../services/audioSynthesizer';
import type { GlobeType, CelestialTheme, GlobeBgmTrackId } from '../../types';
import {
  Globe,
  Sparkles,
  X,
  User,
  Users,
  Compass,
  Award,
  Check,
  Music,
  Upload,
  Play,
  Pause,
  FileAudio,
} from 'lucide-react';

interface CreatePlanetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (globeId: string) => void;
}

const THEME_OPTIONS: { id: CelestialTheme; label: string; bgClass: string; borderClass: string; hex: string }[] = [
  { id: 'gold', label: 'Solar Gold', bgClass: 'bg-amber-500/20 text-amber-300', borderClass: 'border-amber-400', hex: '#F59E0B' },
  { id: 'amethyst', label: 'Ethereal Amethyst', bgClass: 'bg-purple-500/20 text-purple-300', borderClass: 'border-purple-400', hex: '#A855F7' },
  { id: 'sapphire', label: 'Cosmic Sapphire', bgClass: 'bg-sky-500/20 text-sky-300', borderClass: 'border-sky-400', hex: '#0EA5E9' },
  { id: 'emerald', label: 'Emerald Nebula', bgClass: 'bg-emerald-500/20 text-emerald-300', borderClass: 'border-emerald-400', hex: '#10B981' },
  { id: 'rose', label: 'Radiant Rose', bgClass: 'bg-rose-500/20 text-rose-300', borderClass: 'border-rose-400', hex: '#F43F5E' },
  { id: 'amber', label: 'Starlight Amber', bgClass: 'bg-orange-500/20 text-orange-300', borderClass: 'border-orange-400', hex: '#F97316' },
];

export function CreatePlanetModal({ isOpen, onClose, onCreated }: CreatePlanetModalProps) {
  const { allMembers, currentMember, createGlobe } = useVaultStore();

  const [name, setName] = useState('');
  const [type, setType] = useState<GlobeType>('individual');
  const [ownerMemberId, setOwnerMemberId] = useState(currentMember.id);
  const [themeColor, setThemeColor] = useState<CelestialTheme>('gold');
  const [customColor, setCustomColor] = useState('#F59E0B');
  const [description, setDescription] = useState('');
  const [bgmTrackId, setBgmTrackId] = useState<GlobeBgmTrackId>('orbit');
  const [bgmTrackName, setBgmTrackName] = useState('Celestial Orbit');
  const [customAudioUrl, setCustomAudioUrl] = useState<string | undefined>(undefined);
  const [customFileName, setCustomFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const audioInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleCustomAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setCustomAudioUrl(url);
    setCustomFileName(file.name);
    setBgmTrackId('custom');
    setBgmTrackName(file.name);
    vaultAudio.playChime(659.25);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    vaultAudio.playWhoosh();

    const selectedOwner = allMembers.find((m) => m.id === ownerMemberId);

    const newGlobe = createGlobe(name.trim(), type, {
      ownerMemberId: type === 'individual' ? ownerMemberId : undefined,
      ownerName: type === 'individual' ? selectedOwner?.displayName : undefined,
      description: description.trim() || undefined,
      themeColor,
      customColor,
      bgmTrackId,
      bgmTrackName,
      bgmTrackUrl: customAudioUrl,
    });

    setTimeout(() => {
      setIsSubmitting(false);
      onClose();
      if (onCreated) onCreated(newGlobe.id);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl animate-in fade-in">
      <div className="bg-[#FAF9F6] dark:bg-[#080B13] border border-stone-300 dark:border-white/15 rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-2xl relative text-stone-900 dark:text-white transition-all font-sans">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-stone-700 dark:text-slate-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-purple-600/30 to-vault-gold/25 border border-vault-gold/40 text-vault-gold mx-auto flex items-center justify-center mb-3 shadow-glow">
            <Globe className="w-7 h-7 text-vault-gold" />
          </div>
          <h3 className="text-xl font-serif font-bold text-stone-900 dark:text-white tracking-wide">
            Birth a Memory Planet
          </h3>
          <p className="text-xs text-stone-600 dark:text-slate-400 mt-1 max-w-sm mx-auto font-sans leading-relaxed">
            Expand the family universe with a dedicated celestial globe for an individual kin, group voyage, or life milestone.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Planet Name */}
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              Planet Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Elena's Heritage Planet, Tokyo 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-xs bg-stone-100 dark:bg-black/60 border border-stone-300 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-vault-gold/50 text-stone-900 dark:text-white font-medium"
            />
          </div>

          {/* Planet Category / Type */}
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              Globe Domain
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('individual')}
                className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  type === 'individual'
                    ? 'border-vault-gold bg-vault-gold/15 text-vault-gold font-bold shadow-sm'
                    : 'border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-white/[0.03] text-stone-700 dark:text-slate-300 hover:border-vault-gold/40'
                }`}
              >
                <User className="w-4 h-4" />
                <span className="text-[11px]">Individual Kin</span>
              </button>

              <button
                type="button"
                onClick={() => setType('group')}
                className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  type === 'group'
                    ? 'border-vault-gold bg-vault-gold/15 text-vault-gold font-bold shadow-sm'
                    : 'border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-white/[0.03] text-stone-700 dark:text-slate-300 hover:border-vault-gold/40'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="text-[11px]">Group Orbit</span>
              </button>

              <button
                type="button"
                onClick={() => setType('milestone')}
                className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                  type === 'milestone'
                    ? 'border-vault-gold bg-vault-gold/15 text-vault-gold font-bold shadow-sm'
                    : 'border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-white/[0.03] text-stone-700 dark:text-slate-300 hover:border-vault-gold/40'
                }`}
              >
                <Award className="w-4 h-4" />
                <span className="text-[11px]">Milestone</span>
              </button>
            </div>
          </div>

          {/* Kin Member Selection if Individual */}
          {type === 'individual' && (
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                Kin Persona Owner
              </label>
              <select
                value={ownerMemberId}
                onChange={(e) => setOwnerMemberId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-xs bg-stone-100 dark:bg-black/60 border border-stone-300 dark:border-white/10 text-stone-900 dark:text-white"
              >
                {allMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName} ({m.role.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Live Visual Celestial Planet Hologram Preview */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-4 relative overflow-hidden backdrop-blur-md">
            <div
              className="w-14 h-14 rounded-full flex-shrink-0 relative flex items-center justify-center transition-all duration-500 shadow-lg"
              style={{
                background: `radial-gradient(circle at 35% 35%, #ffffff 0%, ${customColor} 45%, #050508 100%)`,
                boxShadow: `0 0 25px ${customColor}80, inset 0 0 15px ${customColor}90`,
              }}
            >
              {/* Planetary Orbital Ring Accent */}
              <div
                className="absolute inset-[-4px] rounded-full border border-dashed opacity-70 animate-spin-slow pointer-events-none"
                style={{ borderColor: customColor }}
              />
              <Globe className="w-5 h-5 text-white/80 drop-shadow-md" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] uppercase tracking-widest font-mono text-vault-gold px-1.5 py-0.5 rounded bg-vault-gold/15 border border-vault-gold/30">
                  {type.toUpperCase()}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">108 Memory Slots</span>
              </div>
              <h4 className="text-sm font-serif font-bold text-white truncate mt-0.5">
                {name.trim() || 'Untitled Celestial Planet'}
              </h4>
              <p className="text-[11px] text-slate-400 font-sans truncate">
                Hex Aura: <span className="font-mono text-vault-gold font-semibold uppercase">{customColor}</span>
              </p>
            </div>
          </div>

          {/* Celestial Theme & Custom Color Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-stone-600 dark:text-slate-400 uppercase tracking-wider">
                Celestial Aura & Custom Color
              </label>
              {/* Native Color Picker & Hex Input */}
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={customColor}
                  onChange={(e) => {
                    const hex = e.target.value;
                    setCustomColor(hex);
                  }}
                  className="w-6 h-6 rounded-md cursor-pointer border border-white/20 bg-transparent p-0"
                  title="Pick Any Custom Hex Color"
                />
                <input
                  type="text"
                  maxLength={7}
                  value={customColor}
                  onChange={(e) => {
                    let hex = e.target.value;
                    if (!hex.startsWith('#')) hex = '#' + hex;
                    setCustomColor(hex);
                  }}
                  className="w-20 px-1.5 py-0.5 text-[11px] font-mono text-center rounded bg-stone-100 dark:bg-black/60 border border-stone-300 dark:border-white/15 text-stone-900 dark:text-vault-gold uppercase focus:outline-none"
                  placeholder="#F59E0B"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map((t) => {
                const isSelected = customColor.toLowerCase() === t.hex.toLowerCase();
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setThemeColor(t.id);
                      setCustomColor(t.hex);
                    }}
                    className={`p-2 rounded-xl border flex items-center gap-2 transition-all cursor-pointer text-left ${
                      isSelected
                        ? `${t.borderClass} ${t.bgClass} font-bold shadow-sm ring-1 ${t.borderClass}`
                        : 'border-stone-200 dark:border-white/10 hover:border-stone-400 text-stone-600 dark:text-slate-400'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: t.hex }}
                    />
                    <span className="text-[10px] truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Planet Soundtrack Assignment */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-stone-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-vault-gold" />
                <span>Planet Dedicated Soundtrack</span>
              </label>
              <span className="text-[10px] font-mono text-vault-gold font-medium truncate max-w-[140px]">
                {bgmTrackName}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {BGM_TRACKS.map((track) => {
                const isSelected = bgmTrackId === track.id;
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => {
                      setBgmTrackId(track.id);
                      setBgmTrackName(track.name);
                      setCustomAudioUrl(undefined);
                      setCustomFileName(null);
                      vaultAudio.playChime(587.33);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-vault-gold bg-vault-gold/15 shadow-sm ring-1 ring-vault-gold/50'
                        : 'border-stone-200 dark:border-white/10 hover:border-vault-gold/30 bg-stone-50 dark:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-medium ${isSelected ? 'text-vault-gold font-bold' : 'text-stone-800 dark:text-white'}`}>
                        {track.name}
                      </span>
                      {isSelected && <Check className="w-3 h-3 text-vault-gold flex-shrink-0" />}
                    </div>
                    <span className="text-[9px] text-stone-500 dark:text-slate-400 font-mono mt-0.5">
                      {track.key} • {track.tempo}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Audio File Upload for this Planet */}
            <div className="mt-2">
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.ogg,.m4a"
                onChange={handleCustomAudioUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                className={`w-full p-2 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
                  bgmTrackId === 'custom'
                    ? 'border-vault-gold bg-vault-gold/15 text-vault-gold font-bold shadow-sm'
                    : 'border-dashed border-stone-300 dark:border-white/20 hover:border-vault-gold/50 text-stone-600 dark:text-slate-400 bg-stone-50/50 dark:bg-white/[0.01]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Upload className="w-3.5 h-3.5 flex-shrink-0 text-vault-gold" />
                  <span className="truncate">
                    {customFileName ? `Custom Track: ${customFileName}` : 'Upload Custom Audio (.mp3, .wav, .m4a)'}
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-stone-700 dark:text-slate-300">
                  {customFileName ? 'Uploaded' : 'Browse'}
                </span>
              </button>
            </div>
          </div>

          {/* Actions */}
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
              disabled={isSubmitting || !name.trim()}
              className="px-5 py-2.5 rounded-xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-black" />
              <span>{isSubmitting ? 'Birthing Planet...' : 'Birth Memory Planet'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
