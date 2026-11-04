import { useVaultStore } from '../../stores/useVaultStore';
import { vaultAudio } from '../../services/audioSynthesizer';
import type { CelestialTheme } from '../../types';
import {
  Globe,
  Sparkles,
  Plus,
  UploadCloud,
  Layers,
  Compass,
} from 'lucide-react';

interface UniversePlanetBarProps {
  onOpenCreatePlanet: () => void;
  onOpenBulkUpload: () => void;
  viewTier: 'galaxy' | 'dome';
  onToggleViewTier: () => void;
  onSelectPlanetWithWarp?: (globeId: string) => void;
}

const THEME_ACCENTS: Record<CelestialTheme, { ring: string; text: string; bg: string; dot: string; hex: string }> = {
  gold: { ring: 'ring-amber-400', text: 'text-amber-300', bg: 'bg-amber-500/15', dot: 'bg-amber-400', hex: '#F59E0B' },
  amethyst: { ring: 'ring-purple-400', text: 'text-purple-300', bg: 'bg-purple-500/15', dot: 'bg-purple-400', hex: '#A855F7' },
  sapphire: { ring: 'ring-sky-400', text: 'text-sky-300', bg: 'bg-sky-500/15', dot: 'bg-sky-400', hex: '#0EA5E9' },
  emerald: { ring: 'ring-emerald-400', text: 'text-emerald-300', bg: 'bg-emerald-500/15', dot: 'bg-emerald-400', hex: '#10B981' },
  rose: { ring: 'ring-rose-400', text: 'text-rose-300', bg: 'bg-rose-500/15', dot: 'bg-rose-400', hex: '#F43F5E' },
  amber: { ring: 'ring-orange-400', text: 'text-orange-300', bg: 'bg-orange-500/15', dot: 'bg-orange-400', hex: '#F97316' },
};

export function UniversePlanetBar({
  onOpenCreatePlanet,
  onOpenBulkUpload,
  viewTier,
  onToggleViewTier,
  onSelectPlanetWithWarp,
}: UniversePlanetBarProps) {
  const { globes, activeGlobeId, setActiveGlobeId, photos } = useVaultStore();

  const activeGlobe = globes.find((g) => g.id === activeGlobeId) || globes[0];

  const getGlobePhotoCount = (globeId: string) => {
    return photos.filter(
      (p) => !p.inTrash && (p.globeId === globeId || (!p.globeId && globeId === 'globe_main'))
    ).length;
  };

  return (
    <div className="w-full flex items-center justify-between gap-3 px-3 sm:px-6 py-2.5 font-sans pointer-events-auto">
      {/* Left: View Mode Toggle (Galaxy Solar System vs Planet Dome) & Planet Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 flex-1 min-w-0">
        {/* Galaxy Solar System Visual Overview Toggle */}
        <button
          onClick={() => {
            vaultAudio.playWhoosh();
            onToggleViewTier();
          }}
          title={viewTier === 'galaxy' ? 'Switch to Planet Memory Dome' : 'Switch to Solar System Galaxy Overview'}
          className={`flex items-center gap-2 px-4 sm:px-4.5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all flex-shrink-0 cursor-pointer backdrop-blur-xl border shadow-md active:scale-95 ${
            viewTier === 'galaxy'
              ? 'bg-gradient-to-r from-amber-400 to-vault-gold text-black border-vault-gold ring-2 ring-vault-gold/40 shadow-glow font-extrabold'
              : 'bg-black/60 hover:bg-black/80 border-vault-gold/40 text-vault-gold hover:border-vault-gold'
          }`}
        >
          <Sparkles className={`w-4 h-4 ${viewTier === 'galaxy' ? 'text-black' : 'text-vault-gold animate-pulse'}`} />
          <span>{viewTier === 'galaxy' ? '🌌 Solar System (Active)' : '🌌 Solar System'}</span>
        </button>

        <div className="h-5 w-[1px] bg-white/20 flex-shrink-0 mx-1 hidden sm:block" />

        {/* Planet Carousel */}
        {globes.map((globe) => {
          const isActive = globe.id === activeGlobe.id && viewTier === 'dome';
          const count = getGlobePhotoCount(globe.id);
          const accent = THEME_ACCENTS[globe.themeColor] || THEME_ACCENTS.gold;
          const planetColor = globe.customColor || accent.hex;

          return (
            <button
              key={globe.id}
              onClick={() => {
                if (onSelectPlanetWithWarp) {
                  onSelectPlanetWithWarp(globe.id);
                } else {
                  vaultAudio.playWhoosh();
                  setActiveGlobeId(globe.id);
                }
              }}
              title={`${globe.name} (${globe.type.toUpperCase()}) — ${count}/108 Memories`}
              className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm transition-all flex-shrink-0 cursor-pointer backdrop-blur-md border ${
                isActive
                  ? 'bg-black/80 text-white border-vault-gold shadow-[0_0_20px_rgba(229,192,123,0.4)] ring-1 ring-vault-gold scale-102 font-bold'
                  : 'bg-white/70 dark:bg-black/50 border-black/10 dark:border-white/10 text-stone-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:border-vault-gold/50'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: planetColor,
                  boxShadow: isActive ? `0 0 10px ${planetColor}` : 'none',
                }}
              />
              <span className="font-serif tracking-tight truncate max-w-[130px] sm:max-w-[180px]">
                {globe.name}
              </span>
              <span
                className={`text-[10px] sm:text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  isActive
                    ? 'bg-black/60 text-vault-gold border border-vault-gold/40'
                    : 'bg-black/20 dark:bg-white/10 text-stone-500 dark:text-slate-300'
                }`}
              >
                {count}/108
              </span>
            </button>
          );
        })}

        {/* Create New Planet Trigger */}
        <button
          onClick={() => {
            vaultAudio.playWhoosh();
            onOpenCreatePlanet();
          }}
          className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold text-vault-gold hover:text-black bg-vault-gold/10 hover:bg-vault-gold border border-vault-gold/30 hover:border-vault-gold transition-all flex-shrink-0 cursor-pointer shadow-sm ml-1"
        >
          <Plus className="w-4 h-4" />
          <span className="whitespace-nowrap">+ New Planet</span>
        </button>
      </div>

      {/* Right: Planet Bulk Upload */}
      <div className="flex items-center gap-2 flex-shrink-0 pl-1">
        <button
          onClick={() => {
            vaultAudio.playWhoosh();
            onOpenBulkUpload();
          }}
          className="flex items-center gap-2 px-4 sm:px-4.5 py-2 sm:py-2.5 rounded-full bg-vault-gold text-black text-xs sm:text-sm font-bold hover:bg-amber-400 active:bg-amber-500 transition-all shadow-md cursor-pointer flex-shrink-0"
        >
          <UploadCloud className="w-4 h-4 text-black" />
          <span className="hidden sm:inline">Bulk Fill Planet</span>
          <span className="sm:hidden">Bulk</span>
        </button>
      </div>
    </div>
  );
}
