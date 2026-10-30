import { useState } from 'react';
import { useVaultStore } from '../../stores/useVaultStore';
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
}

export function Navbar({
  currentTab,
  onSelectTab,
  onOpenUpload,
  onOpenLockModal,
}: NavbarProps) {
  const {
    currentFamily,
    currentMember,
    isVaultUnlocked,
    searchQuery,
    setSearchQuery,
    setIsSlideshowActive,
  } = useVaultStore();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems: { tab: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { tab: 'universe', label: '3D Universe', icon: Globe },
    { tab: 'library', label: 'Photo Library', icon: Grid },
    { tab: 'map', label: 'Memory Map', icon: MapPin },
    { tab: 'albums', label: 'Albums', icon: Folder },
    { tab: 'storage', label: 'Storage', icon: HardDrive },
    { tab: 'activity', label: 'Audit Trail', icon: Activity },
    { tab: 'members', label: 'Family', icon: Users },
    { tab: 'backups', label: 'Backups', icon: Archive },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand Logo & Vault Name */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 cursor-pointer" onClick={() => onSelectTab('universe')}>
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 p-0.5 shadow-glow flex items-center justify-center">
            <div className="w-full h-full bg-vault-void rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 animate-pulse-subtle" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-extrabold text-xs sm:text-base tracking-wider bg-gradient-to-r from-purple-200 via-white to-slate-300 bg-clip-text text-transparent">
                MYORB
              </span>
              <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-purple-950/60 border border-purple-500/30 text-purple-300 hidden sm:inline">
                E2EE
              </span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 truncate max-w-[100px] sm:max-w-xs">
              {currentFamily.name}
            </div>
          </div>
        </div>

        {/* Center Desktop Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map(({ tab, label, icon: Icon }) => {
            const isActive = currentTab === tab;
            return (
              <button
                key={tab}
                onClick={() => onSelectTab(tab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 shadow-glow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Search Bar */}
        <div className="hidden md:flex items-center relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search stories, tags, places..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="glass-input w-full pl-8 pr-3 py-1.5 rounded-xl text-xs"
          />
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Slideshow Button */}
          <button
            onClick={() => setIsSlideshowActive(true)}
            title="Start Fullscreen Slideshow"
            className="glass-panel-interactive p-2 rounded-xl text-slate-300 hover:text-white hidden sm:flex items-center gap-1.5 text-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current text-purple-400" />
            <span className="hidden xl:inline">Slideshow</span>
          </button>

          {/* Bulk Upload Button */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-glow transition-all"
          >
            <UploadCloud className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            <span className="hidden sm:inline">Upload</span>
          </button>

          {/* Cryptographic Key Lock / Unlock Status */}
          <button
            onClick={onOpenLockModal}
            className={`p-1.5 sm:p-2 rounded-xl border text-xs transition-all flex items-center gap-1.5 ${
              isVaultUnlocked
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
            }`}
            title={isVaultUnlocked ? 'Vault Unlocked (AES-256-GCM Active)' : 'Vault Locked'}
          >
            {isVaultUnlocked ? <Unlock className="w-3.5 sm:w-4 h-3.5 sm:h-4" /> : <Lock className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
          </button>

          {/* User Avatar & Profile Quick Trigger */}
          <div
            onClick={() => onSelectTab('members')}
            className="flex items-center gap-2 pl-1 border-l border-white/10 cursor-pointer group"
            title={`${currentMember.displayName} (${currentMember.role}) — Click to manage family & credentials`}
          >
            <div className="relative">
              <img
                src={currentMember.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80'}
                alt={currentMember.displayName}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-cover border border-vault-gold/40 bg-slate-900 group-hover:scale-105 transition-all shadow"
              />
              <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black" />
            </div>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 sm:p-2 rounded-xl glass-panel-interactive text-slate-300 hover:text-white lg:hidden"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden p-4 border-t border-white/10 space-y-2 bg-vault-void/95 backdrop-blur-2xl animate-in slide-in-from-top-2">
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input w-full pl-8 pr-3 py-2 rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {navItems.map(({ tab, label, icon: Icon }) => (
              <button
                key={tab}
                onClick={() => {
                  onSelectTab(tab);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold ${
                  currentTab === tab
                    ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
