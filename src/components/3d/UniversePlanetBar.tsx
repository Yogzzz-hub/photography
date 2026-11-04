import { useState } from 'react';
import { useVaultStore } from '../../stores/useVaultStore';
import { vaultAudio } from '../../services/audioSynthesizer';
import type { MemoryGlobe, CelestialTheme } from '../../types';
import {
  Globe,
  Sparkles,
  Plus,
  UploadCloud,
  User,
  Users,
  Award,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';

interface UniversePlanetBarProps {
  onOpenCreatePlanet: () => void;
  onOpenBulkUpload: () => void;
}

const THEME_ACCENTS: Record<CelestialTheme, { ring: string; text: string; bg: string; dot: string }> = {
  gold: { ring: 'ring-amber-400', text: 'text-amber-300', bg: 'bg-amber-500/15', dot: 'bg-amber-400' },
  amethyst: { ring: 'ring-purple-400', text: 'text-purple-300', bg: 'bg-purple-500/15', dot: 'bg-purple-400' },
  sapphire: { ring: 'ring-sky-400', text: 'text-sky-300', bg: 'bg-sky-500/15', dot: 'bg-sky-400' },
  emerald: { ring: 'ring-emerald-400', text: 'text-emerald-300', bg: 'bg-emerald-500/15', dot: 'bg-emerald-400' },
  rose: { ring: 'ring-rose-400', text: 'text-rose-300', bg: 'bg-rose-500/15', dot: 'bg-rose-400' },
  amber: { ring: 'ring-orange-400', text: 'text-orange-300', bg: 'bg-orange-500/15', dot: 'bg-orange-400' },
};

export function UniversePlanetBar({
  onOpenCreatePlanet,
  onOpenBulkUpload,
}: UniversePlanetBarProps) {
  const { globes, activeGlobeId, setActiveGlobeId, photos, loadCuratedPhotosIntoGlobe } =
    useVaultStore();

  const activeGlobe = globes.find((g) => g.id === activeGlobeId) || globes[0];

  const getGlobePhotoCount = (globeId: string) => {
    return photos.filter(
      (p) => !p.inTrash && (p.globeId === globeId || (!p.globeId && globeId === 'globe_main'))
    ).length;
  };

  const activeCount = getGlobePhotoCount(activeGlobe.id);

  return (
    <div className="w-full flex items-center justify-between gap-2 px-2 sm:px-4 py-1.5 font-sans pointer-events-auto">
      {/* Left: Cosmic Carousel of Memory Globes / Planets */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/40 dark:bg-black/60 backdrop-blur-md border border-white/10 text-slate-300 text-[10px] font-mono uppercase tracking-wider flex-shrink-0">
          <Globe className="w-3.5 h-3.5 text-vault-gold animate-spin-slow" />
          <span className="hidden sm:inline">Universe:</span>
          <span className="font-bold text-vault-gold">{globes.length} Planets</span>
        </div>

        {globes.map((globe) => {
          const isActive = globe.id === activeGlobe.id;
          const count = getGlobePhotoCount(globe.id);
          const accent = THEME_ACCENTS[globe.themeColor] || THEME_ACCENTS.gold;

          return (
            <button
              key={globe.id}
              onClick={() => {
                if (!isActive) {
                  vaultAudio.playWhoosh();
                  setActiveGlobeId(globe.id);
                }
              }}
              title={`${globe.name} (${globe.type.toUpperCase()}) — ${count}/108 Memories`}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all flex-shrink-0 cursor-pointer backdrop-blur-md border ${
                isActive
                  ? `${accent.bg} ${accent.text} border-vault-gold shadow-[0_0_20px_rgba(229,192,123,0.3)] ring-1 ${accent.ring} scale-102 font-bold`
                  : 'bg-white/70 dark:bg-black/40 border-black/10 dark:border-white/10 text-stone-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:border-vault-gold/50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${accent.dot} ${isActive ? 'animate-pulse' : ''}`} />
              <span className="font-serif tracking-tight truncate max-w-[130px] sm:max-w-[180px]">
                {globe.name}
              </span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? 'bg-black/50 text-vault-gold border border-vault-gold/40'
                    : 'bg-black/20 dark:bg-white/10 text-stone-500 dark:text-slate-400'
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
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-vault-gold hover:text-black bg-vault-gold/10 hover:bg-vault-gold border border-vault-gold/30 hover:border-vault-gold transition-all flex-shrink-0 cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="text-[11px]">+ New Planet</span>
        </button>
      </div>

      {/* Right: Planet Quick Fill & Bulk Upload Options */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {activeCount === 0 && (
          <button
            onClick={() => {
              vaultAudio.playWhoosh();
              loadCuratedPhotosIntoGlobe(activeGlobe.id);
            }}
            title="Populate this globe with 108 non-duplicate fine-art heritage photos"
            className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold text-amber-600 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-vault-gold" />
            <span>Load Demo Pack</span>
          </button>
        )}

        <button
          onClick={() => {
            vaultAudio.playWhoosh();
            onOpenBulkUpload();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-vault-gold text-black text-xs font-bold hover:brightness-110 transition-all shadow-md cursor-pointer flex-shrink-0"
        >
          <UploadCloud className="w-3.5 h-3.5 text-black" />
          <span className="hidden sm:inline">Bulk Fill Planet</span>
          <span className="sm:hidden">Bulk</span>
        </button>
      </div>
    </div>
  );
}
