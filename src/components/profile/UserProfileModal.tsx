import { useState, useRef, useEffect } from 'react';
import { useVaultStore } from '../../stores/useVaultStore';
import { vaultAudio } from '../../services/audioSynthesizer';
import { PasswordGeneratorModal } from '../security/PasswordGeneratorModal';
import {
  User,
  Camera,
  X,
  Check,
  Shield,
  Key,
  Mail,
  MapPin,
  Phone,
  FileText,
  Crown,
  Sparkles,
  Upload,
  RefreshCw,
  UserCheck,
  Lock,
} from 'lucide-react';

// 12 Curated Artistic Avatar Presets for Luxury Kin Profiles
export const CURATED_AVATAR_PRESETS = [
  {
    id: 'avatar-1',
    label: 'Parisian Muse',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'avatar-2',
    label: 'Nordic Explorer',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'avatar-3',
    label: 'Golden Hour Glow',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'avatar-4',
    label: 'Cinematic Noir',
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'avatar-5',
    label: 'Classical Sculpture',
    url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'avatar-6',
    label: 'Colonnade Muse',
    url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'avatar-7',
    label: 'Architect Minimalist',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'avatar-8',
    label: 'Tuscan Traveler',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'avatar-9',
    label: 'Velvet Studio',
    url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'avatar-10',
    label: 'Ethereal Soul',
    url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'avatar-11',
    label: 'Alpine Wanderer',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'avatar-12',
    label: 'Modern Kinship',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80',
  },
];

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPasswordModal?: () => void;
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const {
    currentMember,
    allMembers,
    updateMemberProfile,
    switchActiveMember,
    changeMemberPassword,
  } = useVaultStore();

  const [displayName, setDisplayName] = useState(currentMember.displayName);
  const [avatarUrl, setAvatarUrl] = useState(currentMember.avatarUrl || '');
  const [bio, setBio] = useState(currentMember.bio || 'Curator of private family memory archives & classical journeys.');
  const [phone, setPhone] = useState(currentMember.phone || '+1 (555) 234-5678');
  const [location, setLocation] = useState(currentMember.location || 'Verona, Italy');

  const [isSaved, setIsSaved] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'avatar' | 'security'>('profile');

  // Local password change state inside modal
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync state whenever currentMember changes
  useEffect(() => {
    setDisplayName(currentMember.displayName);
    setAvatarUrl(currentMember.avatarUrl || '');
    setBio(currentMember.bio || 'Curator of private family memory archives & classical journeys.');
    setPhone(currentMember.phone || '+1 (555) 234-5678');
    setLocation(currentMember.location || 'Verona, Italy');
  }, [currentMember]);

  if (!isOpen) return null;

  // Handle local image file upload for profile photo
  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setAvatarUrl(dataUrl);
        updateMemberProfile(currentMember.id, { avatarUrl: dataUrl });
        vaultAudio.playWhoosh();
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPresetAvatar = (url: string) => {
    setAvatarUrl(url);
    updateMemberProfile(currentMember.id, { avatarUrl: url });
    vaultAudio.playWhoosh();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateMemberProfile(currentMember.id, {
      displayName: displayName.trim() || currentMember.displayName,
      avatarUrl: avatarUrl.trim() || currentMember.avatarUrl,
      bio: bio.trim(),
      phone: phone.trim(),
      location: location.trim(),
    });
    vaultAudio.playWhoosh();
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1200);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (newPassword.length < 8) {
      setPasswordFeedback({ type: 'error', message: 'Password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    const ok = await changeMemberPassword(currentMember.id, newPassword);
    if (ok) {
      setPasswordFeedback({ type: 'success', message: 'Security password successfully updated!' });
      setNewPassword('');
      setConfirmPassword('');
      vaultAudio.playWhoosh();
      setTimeout(() => setPasswordFeedback(null), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2.5 sm:p-4 bg-black/60 dark:bg-black/85 backdrop-blur-xl animate-in fade-in">
      <div className="bg-white dark:bg-[#080B13] text-slate-900 dark:text-white border border-black/10 dark:border-white/15 rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]">
        {/* Decorative Top Cover Banner */}
        <div className="relative h-20 sm:h-24 bg-gradient-to-r from-amber-400/20 via-purple-500/15 to-indigo-500/20 dark:from-amber-600/25 dark:via-purple-600/20 dark:to-indigo-700/25 border-b border-black/10 dark:border-white/10 px-4 sm:px-6 py-3 flex items-start justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300">
            <User className="w-4 h-4 text-vault-gold" />
            <span className="text-xs font-serif font-semibold tracking-wider uppercase">Vault Kin Identity</span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Profile"
            className="p-1.5 sm:p-2 rounded-full bg-white/80 hover:bg-white dark:bg-black/50 dark:hover:bg-black/80 text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white transition-all cursor-pointer border border-black/10 dark:border-white/15 shadow-sm"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Floating Identity & Avatar Row */}
        <div className="px-4 sm:px-6 pt-0 pb-3 flex items-end justify-between -mt-10 sm:-mt-12 flex-shrink-0">
          <div className="flex items-end gap-3.5 sm:gap-4 min-w-0">
            <div className="relative group flex-shrink-0">
              <img
                src={avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'}
                alt={displayName}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';
                }}
                className="w-20 h-20 sm:w-24 sm:h-24 aspect-square rounded-2xl sm:rounded-3xl object-cover border-4 border-white dark:border-[#080B13] ring-2 ring-vault-gold/60 shadow-xl bg-slate-100 dark:bg-slate-900 group-hover:brightness-90 transition-all"
              />

              {/* Native Upload Trigger via Camera Badge */}
              <label
                htmlFor="user-profile-avatar-upload"
                title="Upload Photo from Device"
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-2xl sm:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
              >
                <Camera className="w-5 h-5 text-vault-gold mb-0.5" />
                <span className="text-[10px] font-sans font-semibold">Change</span>
              </label>

              {/* Hidden file input */}
              <input
                id="user-profile-avatar-upload"
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handlePhotoFileUpload}
                className="sr-only"
              />

              {currentMember.role === 'owner' && (
                <div className="absolute -top-1 -right-1 p-1 bg-amber-400 rounded-full text-slate-950 shadow-md">
                  <Crown className="w-3 h-3" />
                </div>
              )}
            </div>

            <div className="mb-0.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-bold font-serif text-slate-900 dark:text-white truncate">
                  {displayName}
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/10 dark:bg-vault-gold/15 border border-amber-500/30 dark:border-vault-gold/30 text-amber-900 dark:text-vault-gold font-bold">
                  {currentMember.role}
                </span>
                <div className="hidden sm:flex items-center gap-1 text-[10px] text-emerald-800 dark:text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>E2EE Active</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-sans truncate mt-0.5">{currentMember.email}</p>
            </div>
          </div>
        </div>

        {/* Persona Switcher Bar (Test All Family Roles - Zero Side Scrolling) */}
        <div className="px-4 sm:px-6 py-2 bg-stone-100/70 dark:bg-white/[0.02] border-y border-stone-200/80 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400 font-medium whitespace-nowrap">
            <UserCheck className="w-3.5 h-3.5 text-amber-600 dark:text-vault-gold" />
            <span>Switch Kin Member:</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {allMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => {
                  switchActiveMember(member.id);
                  vaultAudio.playWhoosh();
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer ${
                  currentMember.id === member.id
                    ? 'bg-vault-gold text-black font-bold shadow-sm'
                    : 'bg-white dark:bg-white/5 border border-stone-200/80 dark:border-transparent text-stone-700 dark:text-stone-300 hover:bg-stone-200/50 dark:hover:bg-white/10'
                }`}
              >
                {member.displayName.split(' ')[0]} ({member.role})
              </button>
            ))}
          </div>
        </div>

        {/* Modal Navigation Tabs: Profile Info / Avatar Gallery / Security Passwords */}
        <div className="px-4 sm:px-6 pt-2.5 flex items-center gap-2 border-b border-stone-200/80 dark:border-white/10 flex-shrink-0">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 px-2 text-xs font-semibold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'profile'
                ? 'border-amber-600 text-amber-900 dark:border-vault-gold dark:text-vault-gold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile Details</span>
          </button>

          <button
            onClick={() => setActiveTab('avatar')}
            className={`pb-2.5 px-2 text-xs font-semibold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'avatar'
                ? 'border-amber-600 text-amber-900 dark:border-vault-gold dark:text-vault-gold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Artistic Avatars ({CURATED_AVATAR_PRESETS.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`pb-2.5 px-2 text-xs font-semibold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'security'
                ? 'border-amber-600 text-amber-900 dark:border-vault-gold dark:text-vault-gold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Security & Passwords</span>
          </button>
        </div>

        {/* Tab 1: Profile Details Form */}
        {activeTab === 'profile' && (
          <>
            <form id="profile-details-form" onSubmit={handleSaveProfile} className="p-4 sm:p-6 overflow-y-auto space-y-4 no-scrollbar flex-1 min-h-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Display Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your Full Name"
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-600"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Vault Kin Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={currentMember.email}
                      disabled
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.02] cursor-not-allowed border border-slate-300 dark:border-white/5"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Location / Residence
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Verona, Italy"
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Emergency Kin Contact
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Bio / Family Note
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell your kin about your role in the vault..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-amber-600 resize-none"
                  />
                </div>
              </div>

              {/* Profile Photo Quick Controls */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white block">Custom Photo or Image URL</span>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
                    Upload any photo from your phone or enter an HTTPS image link.
                  </span>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label
                    htmlFor="user-profile-avatar-upload"
                    className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveTab('avatar')}
                    className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white text-xs font-medium transition-all cursor-pointer"
                  >
                    Browse Avatars
                  </button>
                </div>
              </div>
            </form>

            {/* Dedicated Fixed Action Footer (Never clipped, always accessible) */}
            <div className="flex-shrink-0 px-4 sm:px-6 py-3.5 border-t border-stone-200/80 dark:border-white/10 bg-[#FAF9F6] dark:bg-[#080B13] flex items-center justify-between gap-3 z-10 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
              <span className="text-[11px] text-stone-500 dark:text-stone-400 font-sans hidden sm:inline">
                Updates sync client-side with AES-256-GCM
              </span>
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="profile-details-form"
                  className="px-5 py-2 rounded-xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  {isSaved ? <Check className="w-4 h-4 text-black" /> : null}
                  <span>{isSaved ? 'Saved Successfully!' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Tab 2: Curated Artistic Avatar Presets */}
        {activeTab === 'avatar' && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 no-scrollbar flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-serif">Curated Kin Avatar Gallery</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Select an artistic portrait or upload your personal memory photo.
                </p>
              </div>
              <label
                htmlFor="user-profile-avatar-upload"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-vault-gold text-black text-xs font-bold hover:bg-amber-400 transition-all cursor-pointer shadow"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Upload From Device</span>
              </label>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {CURATED_AVATAR_PRESETS.map((preset) => {
                const isSelected = avatarUrl === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPresetAvatar(preset.url)}
                    className={`relative group rounded-2xl overflow-hidden border-2 transition-all p-1 flex flex-col items-center bg-slate-50 dark:bg-slate-900/80 cursor-pointer ${
                      isSelected ? 'border-vault-gold shadow-glow scale-[1.02]' : 'border-slate-200 dark:border-white/10 hover:border-amber-400 dark:hover:border-white/40'
                    }`}
                  >
                    <img
                      src={preset.url}
                      alt={preset.label}
                      className="w-full h-20 sm:h-24 rounded-xl object-cover"
                    />
                    <span className="text-[10px] font-sans font-medium text-slate-700 dark:text-slate-300 truncate w-full text-center mt-1">
                      {preset.label}
                    </span>
                    {isSelected && (
                      <div className="absolute top-2 right-2 p-1 rounded-full bg-vault-gold text-black shadow">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Security & Passwords */}
        {activeTab === 'security' && (
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 no-scrollbar flex-1">
            {/* Status overview */}
            <div className="p-3.5 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-vault-gold/15 text-amber-700 dark:text-vault-gold border border-vault-gold/30">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">Client Cryptographic Security</h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Passphrase hashes never leave your browser unencrypted.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/15 dark:bg-purple-600/30 hover:bg-purple-600/25 dark:hover:bg-purple-600/50 border border-purple-500/30 dark:border-purple-500/40 text-purple-700 dark:text-purple-200 text-xs font-bold transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-vault-gold" />
                <span>Password Generator</span>
              </button>
            </div>

            {/* Change Password Form */}
            <form onSubmit={handleSavePassword} className="space-y-3.5 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-vault-gold flex items-center gap-2">
                <Key className="w-3.5 h-3.5 text-amber-700 dark:text-vault-gold" />
                <span>Change Your Password</span>
              </h4>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  New Password or Diceware Passphrase
                </label>
                <input
                  type="password"
                  placeholder="At least 8 characters..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2.5 rounded-xl text-xs bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white focus:outline-none focus:border-vault-gold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  placeholder="Repeat new password..."
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-2.5 rounded-xl text-xs bg-slate-50 dark:bg-black/40 border border-slate-300 dark:border-white/15 text-slate-900 dark:text-white focus:outline-none focus:border-vault-gold"
                />
              </div>

              {passwordFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                    passwordFeedback.type === 'success'
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-500/15 border border-rose-500/30 text-rose-800 dark:text-rose-300'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{passwordFeedback.message}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="text-xs text-amber-700 dark:text-vault-gold hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Need an uncrackable password?</span>
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold transition-all cursor-pointer shadow"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Standalone Cryptographic Password Generator Modal */}
      <PasswordGeneratorModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onApplyPassword={(pwd: string) => {
          setNewPassword(pwd);
          setConfirmPassword(pwd);
          setActiveTab('security');
          setIsPasswordModalOpen(false);
          vaultAudio.playWhoosh();
        }}
      />
    </div>
  );
}
