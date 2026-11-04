import { useState, useEffect } from 'react';
import {
  vaultAudio,
  BGM_TRACKS,
  type BgmTrackConfig,
} from '../../services/audioSynthesizer';
import { Music, Play, Pause, Sliders } from 'lucide-react';

interface AudioPillWidgetProps {
  onOpenSettings: () => void;
}

export function AudioPillWidget({ onOpenSettings }: AudioPillWidgetProps) {
  const [isBgmActive, setIsBgmActive] = useState(vaultAudio.isBgmActive());
  const [currentTrackId, setCurrentTrackId] = useState<BgmTrackConfig['id']>(vaultAudio.getCurrentTrack());
  const [isMuted, setIsMuted] = useState(vaultAudio.getIsMuted());
  const [customTrackName, setCustomTrackName] = useState<string | null>(vaultAudio.getCustomTrackName());

  useEffect(() => {
    return vaultAudio.subscribe(() => {
      setIsBgmActive(vaultAudio.isBgmActive());
      setCurrentTrackId(vaultAudio.getCurrentTrack());
      setIsMuted(vaultAudio.getIsMuted());
      setCustomTrackName(vaultAudio.getCustomTrackName());
    });
  }, []);

  const currentTrack = BGM_TRACKS.find((t) => t.id === currentTrackId) || BGM_TRACKS[0];

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    vaultAudio.toggleBgm();
  };

  return (
    <div
      onClick={onOpenSettings}
      className="group flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-white/90 dark:bg-black/75 hover:bg-white dark:hover:bg-black/90 border border-black/10 dark:border-white/15 hover:border-vault-gold/60 text-slate-900 dark:text-white backdrop-blur-2xl shadow-md dark:shadow-xl transition-all cursor-pointer select-none active:scale-95"
      title="Customize Background Music & Ambient Soundscapes"
    >
      {/* Animated Soundwave Equalizer or Music Note */}
      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-black/5 dark:bg-white/10 group-hover:bg-vault-gold/20 text-vault-gold transition-colors">
        {isBgmActive && !isMuted ? (
          <div className="flex items-end gap-0.5 h-3">
            <span className="w-0.5 h-2 bg-vault-gold animate-bounce" style={{ animationDuration: '0.6s' }} />
            <span className="w-0.5 h-3.5 bg-vault-gold animate-bounce" style={{ animationDuration: '0.8s', animationDelay: '0.15s' }} />
            <span className="w-0.5 h-2.5 bg-vault-gold animate-bounce" style={{ animationDuration: '0.5s', animationDelay: '0.3s' }} />
          </div>
        ) : (
          <Music className="w-3 h-3 text-slate-400 group-hover:text-vault-gold" />
        )}
      </div>

      {/* Track Name (Visible on tablet/desktop, sleek compact layout on mobile) */}
      <div className="hidden sm:flex flex-col text-left">
        <span className="text-[11px] font-medium text-slate-900 dark:text-white/95 group-hover:text-vault-gold leading-none transition-colors truncate max-w-[85px] 2xl:max-w-[120px]">
          {customTrackName || currentTrack.name}
        </span>
        <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono leading-none mt-0.5">
          {customTrackName ? 'Custom Soundtrack' : (isBgmActive ? 'Ambient Soundscape' : 'BGM Paused')}
        </span>
      </div>

      {/* Quick Play/Pause Button */}
      <button
        onClick={handleTogglePlay}
        className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/15 text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
        title={isBgmActive ? 'Pause BGM' : 'Play BGM'}
      >
        {isBgmActive ? (
          <Pause className="w-3 h-3 fill-current" />
        ) : (
          <Play className="w-3 h-3 fill-current ml-0.5" />
        )}
      </button>

      {/* Sliders settings icon */}
      <Sliders className="w-3 h-3 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 hidden md:block" />
    </div>
  );
}
