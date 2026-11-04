import { useState } from 'react';
import { useVaultStore } from '../../stores/useVaultStore';
import { vaultAudio } from '../../services/audioSynthesizer';
import { AudioPillWidget } from '../audio/AudioPillWidget';
import { AudioSettingsModal } from '../audio/AudioSettingsModal';
import {
  Globe,
  Grid,
  MapPin,
  Folder,
  HardDrive,
  Activity,
  Users,
  Archive,
  UploadCloud,
  Play,
  Lock,
  Unlock,
  Search,
  Menu,
  X,
  Sparkles,
  Sun,
  Moon,
  ChevronRight,
  Shield,
} from 'lucide-react';

export type NavigationTab =
  | 'universe'
  | 'library'
  | 'map'
  | 'albums'
  | 'storage'
  | 'activity'
  | 'members'
  | 'backups';

interface NavbarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenUpload: () => void;
  onOpenLockModal: () => void;
  onOpenProfile?: () => void;
}

export function Navbar({
  currentTab,
  onSelectTab,
  onOpenUpload,
  onOpenLockModal,
  onOpenProfile,
}: NavbarProps) {
  const {
    currentFamily,
    currentMember,
    isVaultUnlocked,
    searchQuery,
    setSearchQuery,
    setIsSlideshowActive,
    theme,
    toggleTheme,
    lockVault,
  } = useVaultStore();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const navItems: {
    tab: NavigationTab;
    label: string;
    drawerLabel: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { tab: 'universe', label: 'Universe', drawerLabel: '3D Memory Universe', icon: Globe },
    { tab: 'library', label: 'Library', drawerLabel: 'Photo Library', icon: Grid },
    { tab: 'map', label: 'Map', drawerLabel: 'Tamil Nadu Memory Map', icon: MapPin },
    { tab: 'albums', label: 'Albums', drawerLabel: 'Albums & Collections', icon: Folder },
    { tab: 'storage', label: 'Storage', drawerLabel: 'Storage Quotas', icon: HardDrive },
    { tab: 'activity', label: 'Ledger', drawerLabel: 'Audit Trail Ledger', icon: Activity },
    { tab: 'members', label: 'Kin Access', drawerLabel: 'Family & Passwords', icon: Users },
    { tab: 'backups', label: 'Backups', drawerLabel: 'Backup & Recovery', icon: Archive },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-black/10 dark:border-white/10 select-none bg-white/95 dark:bg-black/80 backdrop-blur-2xl text-slate-900 dark:text-white">
      <div className="w-full px-3 sm:px-4 lg:px-5 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-2 lg:gap-3">
        {/* Brand Logo & Vault Name */}
        <div
          className="flex items-center gap-2 sm:gap-3 flex-shrink-0 cursor-pointer group"
          onClick={() => onSelectTab('universe')}
        >
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-amber-400 via-vault-gold to-purple-600 p-0.5 shadow-glow flex items-center justify-center group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-amber-50 dark:bg-[#080B13] rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-vault-gold animate-pulse-subtle" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-extrabold text-xs sm:text-base tracking-wider bg-gradient-to-r from-amber-700 via-slate-900 to-slate-700 dark:from-amber-200 dark:via-white dark:to-slate-200 bg-clip-text text-transparent">
                MYORB
              </span>
              <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-amber-100 dark:bg-vault-gold/15 border border-amber-300 dark:border-vault-gold/30 text-amber-900 dark:text-vault-gold font-bold">
                VAULT
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[110px] sm:max-w-xs font-sans">
              {currentFamily.name}
            </div>
          </div>
        </div>

        {/* Center Desktop Navigation Tabs (Luxury Capsule Design - Never Wraps) */}
        <nav className="hidden xl:flex items-center gap-0.5 bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 rounded-2xl p-0.5 shadow-inner backdrop-blur-md">
          {navItems.map(({ tab, label, drawerLabel, icon: Icon }) => {
            const isActive = currentTab === tab;
            return (
              <button
                key={tab}
                onClick={() => onSelectTab(tab)}
                title={drawerLabel}
                className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] 2xl:text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-vault-gold text-black font-bold shadow-md'
                    : 'text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.08]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-black' : 'text-vault-gold/90'}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Compact Expandable Search Bar (Desktop) */}
        <div className="hidden xl:flex items-center relative">
          {isSearchExpanded || searchQuery ? (
            <div className="flex items-center relative w-40 2xl:w-48 animate-in fade-in duration-200">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => {
                  if (!searchQuery) setIsSearchExpanded(false);
                }}
                className="w-full pl-7 pr-6 py-1 rounded-xl text-xs bg-black/5 dark:bg-black/40 border border-black/10 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-vault-gold/50"
              />
              <button
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchExpanded(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black dark:hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSearchExpanded(true)}
              title="Search memories..."
              className="p-2 rounded-xl bg-black/5 dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/[0.09] border border-black/10 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white transition-all cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Quick Theme Toggle (Light / Dark) */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
            className="p-2 rounded-xl bg-black/5 dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/[0.09] border border-black/10 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-amber-500" />
            ) : (
              <Moon className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-indigo-500" />
            )}
          </button>

          {/* Ambient BGM & Hover Sound Pill */}
          <AudioPillWidget onOpenSettings={() => setIsAudioModalOpen(true)} />

          {/* Slideshow Button (Desktop only) */}
          <button
            onClick={() => setIsSlideshowActive(true)}
            title="Start Fullscreen Slideshow"
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/[0.04] hover:bg-black/10 dark:hover:bg-white/[0.09] border border-black/10 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white text-xs font-medium transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current text-vault-gold" />
            <span>Slideshow</span>
          </button>

          {/* Bulk Upload Button (Visible on all devices - icon on mobile, label on desktop) */}
          <button
            onClick={() => {
              vaultAudio.playWhoosh();
              onOpenUpload();
            }}
            className="flex items-center gap-1.5 p-2 sm:px-3.5 sm:py-1.5 rounded-xl bg-vault-gold hover:bg-amber-400 active:bg-amber-500 text-black text-xs font-bold shadow-md transition-all cursor-pointer active:scale-95"
            title="Upload Memories to Vault"
            aria-label="Upload Memories"
          >
            <UploadCloud className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Upload</span>
          </button>

          {/* Cryptographic Key Lock / Unlock Status */}
          <button
            onClick={onOpenLockModal}
            className={`p-1.5 sm:p-2 rounded-xl border text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
              isVaultUnlocked
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
            }`}
            title={isVaultUnlocked ? 'Vault Unlocked (AES-256-GCM Active)' : 'Vault Locked'}
          >
            {isVaultUnlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          </button>

          {/* User Avatar & Profile Quick Trigger */}
          <div
            onClick={() => {
              if (onOpenProfile) onOpenProfile();
              else onSelectTab('members');
            }}
            className="flex items-center gap-2 pl-1 border-l border-black/10 dark:border-white/10 cursor-pointer group"
            title={`${currentMember.displayName} (${currentMember.role}) — Click to view profile & change avatar`}
          >
            <div className="relative">
              <img
                src={currentMember.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80'}
                alt={currentMember.displayName}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-cover border border-vault-gold/40 bg-slate-200 dark:bg-slate-900 group-hover:scale-105 transition-all shadow"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black dark:border-black" />
            </div>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 sm:p-2 rounded-xl bg-black/5 dark:bg-white/[0.05] hover:bg-black/10 dark:hover:bg-white/[0.1] border border-black/10 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:text-black dark:hover:text-white xl:hidden transition-all cursor-pointer"
            aria-label="Open Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] xl:hidden flex flex-col animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-md transition-opacity"
          />

          {/* Drawer Header with Close Button */}
          <div className="relative z-10 bg-white dark:bg-[#07090F] border-b border-black/10 dark:border-white/15 px-4 h-14 sm:h-16 flex items-center justify-between text-slate-900 dark:text-white">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => {
                onSelectTab('universe');
                setIsMobileMenuOpen(false);
              }}
            >
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-400 to-vault-gold p-0.5 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-black" />
              </div>
              <span className="font-serif font-bold text-sm tracking-widest uppercase text-slate-900 dark:text-white">
                MYORB VAULT
              </span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="relative z-10 bg-[#FAF9F6] dark:bg-[#080B13]/98 text-slate-900 dark:text-white p-4 sm:p-5 shadow-2xl backdrop-blur-2xl space-y-4 overflow-y-auto flex-1 max-w-lg w-full mx-auto font-sans">
            {/* Active Kin Member Card in Mobile Menu */}
            <div
              onClick={() => {
                setIsMobileMenuOpen(false);
                if (onOpenProfile) onOpenProfile();
                else onSelectTab('members');
              }}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-white/[0.04] border border-black/10 dark:border-white/10 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.08] transition-all shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <img
                    src={currentMember.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80'}
                    alt={currentMember.displayName}
                    className="w-10 h-10 rounded-xl object-cover border border-vault-gold/40 shadow"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>{currentMember.displayName}</span>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-100 dark:bg-vault-gold/20 text-amber-900 dark:text-vault-gold font-bold">
                      {currentMember.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                    <span>E2EE Master Key Active</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-vault-gold" />
            </div>

            {/* Mobile Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-vault-gold absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search stories, tags, places..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 rounded-2xl text-xs bg-white dark:bg-black/40 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-vault-gold"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-black dark:hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Navigation Grid (2-columns) */}
            <div className="grid grid-cols-2 gap-2">
              {navItems.map(({ tab, drawerLabel, icon: Icon }) => {
                const isActive = currentTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => {
                      onSelectTab(tab);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-2xl text-xs font-semibold transition-all text-left ${
                      isActive
                        ? 'bg-vault-gold text-black shadow-md font-bold'
                        : 'bg-white dark:bg-white/[0.03] text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-black/5 dark:border-white/5'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-vault-gold'}`} />
                    <span className="truncate">{drawerLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile Drawer Bottom Actions */}
            <div className="pt-2 border-t border-black/10 dark:border-white/10 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsSlideshowActive(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/[0.08]"
                >
                  <Play className="w-3.5 h-3.5 text-vault-gold fill-current" />
                  <span>Slideshow</span>
                </button>
                <button
                  onClick={() => {
                    onOpenUpload();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold shadow-md transition-all"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  lockVault();
                  onOpenLockModal();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-200 dark:bg-black/40 hover:bg-slate-300 dark:hover:bg-black/60 text-slate-700 dark:text-slate-300 text-xs font-medium border border-black/10 dark:border-white/10"
              >
                <Lock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Lock Vault Session</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audio Studio Modal */}
      <AudioSettingsModal isOpen={isAudioModalOpen} onClose={() => setIsAudioModalOpen(false)} />
    </header>
  );
}
