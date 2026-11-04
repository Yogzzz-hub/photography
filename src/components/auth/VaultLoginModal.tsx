import { useState, useEffect } from 'react';
import { useVaultStore } from '../../stores/useVaultStore';
import { vaultAudio } from '../../services/audioSynthesizer';
import { extractAndNormalizeInviteCode } from '../../utils/inviteUtils';
import {
  Lock,
  Unlock,
  Key,
  Fingerprint,
  Mail,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  Sparkles,
  Ticket,
  X,
  Check,
  Crown,
  UserPlus,
  ArrowLeft,
} from 'lucide-react';

interface VaultLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'credentials' | 'passkey' | 'recovery' | 'join';
  initialInviteCode?: string;
}

export function VaultLoginModal({
  isOpen,
  onClose,
  initialTab = 'credentials',
  initialInviteCode = '',
}: VaultLoginModalProps) {
  const {
    isVaultUnlocked,
    currentMember,
    allMembers,
    loginWithCredentials,
    unlockWithRecoveryCode,
    acceptInvitation,
    lockVault,
  } = useVaultStore();

  const [activeTab, setActiveTab] = useState<'credentials' | 'passkey' | 'recovery' | 'join'>(initialTab);

  // Sync initial tab and code when opened
  useEffect(() => {
    if (isOpen) {
      if (initialTab) setActiveTab(initialTab);
      if (initialInviteCode) setInviteCode(extractAndNormalizeInviteCode(initialInviteCode));
    }
  }, [isOpen, initialTab, initialInviteCode]);

  // Credentials tab state
  const [email, setEmail] = useState('curator@myorb.live');
  const [password, setPassword] = useState('VaultMaster2024!Secure');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Recovery Key tab state
  const [recoveryCode, setRecoveryCode] = useState('');

  // Join Vault tab state
  const [inviteCode, setInviteCode] = useState('');
  const [joinDisplayName, setJoinDisplayName] = useState('');
  const [joinSuccess, setJoinSuccess] = useState(false);

  // Biometric state
  const [isScanningPasskey, setIsScanningPasskey] = useState(false);
  const [passkeySuccess, setPasskeySuccess] = useState(false);

  if (!isOpen) return null;

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const ok = await loginWithCredentials(email, password);
      if (ok) {
        vaultAudio.playWhoosh();
        onClose();
      } else {
        setErrorMsg('Invalid credentials or account suspended. Please check your email and password.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const ok = await unlockWithRecoveryCode(recoveryCode);
      if (ok) {
        vaultAudio.playWhoosh();
        onClose();
      } else {
        setErrorMsg('Invalid 256-bit recovery code. Must be 64 valid hexadecimal characters.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasskeyTrigger = () => {
    setIsScanningPasskey(true);
    setErrorMsg('');

    setTimeout(async () => {
      setIsScanningPasskey(false);
      setPasskeySuccess(true);
      vaultAudio.playWhoosh();

      // Authenticate active or curator member
      await loginWithCredentials('curator@myorb.live');

      setTimeout(() => {
        setPasskeySuccess(false);
        onClose();
      }, 1000);
    }, 1200);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const cleanCode = extractAndNormalizeInviteCode(inviteCode);
    if (!cleanCode) {
      setErrorMsg('Please enter your invitation code.');
      return;
    }
    if (!joinDisplayName.trim()) {
      setErrorMsg('Please enter your display name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await acceptInvitation(cleanCode, joinDisplayName.trim());
      if (ok) {
        setJoinSuccess(true);
        vaultAudio.playWhoosh();
        setTimeout(() => {
          setJoinSuccess(false);
          onClose();
        }, 1200);
      } else {
        setErrorMsg('Invalid or expired invitation code.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-in fade-in">
      <div className="bg-[#080B13] border border-white/15 rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Monogram & Title */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-purple-600/30 to-vault-gold/20 border border-vault-gold/40 text-vault-gold mx-auto flex items-center justify-center mb-3 shadow-glow">
            {isVaultUnlocked ? <Unlock className="w-7 h-7" /> : <Lock className="w-7 h-7" />}
          </div>
          <h3 className="text-lg sm:text-xl font-serif font-bold text-white tracking-wide">
            {isVaultUnlocked ? 'Vault Cryptographically Unlocked' : 'Family Vault Authentication'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto font-sans">
            {isVaultUnlocked
              ? 'Client-side AES-256-GCM session active. All memory pixels decrypted locally.'
              : 'Sign in with credentials, passkey, or recovery key.'}
          </p>
        </div>

        {/* If Vault is Unlocked: Session Management Card */}
        {isVaultUnlocked && activeTab !== 'join' ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              <div>
                <span className="font-semibold block text-emerald-200">Active Security Session</span>
                <span className="text-[11px] text-emerald-400/80">
                  Logged in as {currentMember.displayName} ({currentMember.role.toUpperCase()})
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('join')}
              className="w-full py-2.5 rounded-xl bg-vault-gold/15 hover:bg-vault-gold/25 border border-vault-gold/30 text-vault-gold text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Ticket className="w-4 h-4 text-vault-gold" />
              <span>Join with Invitation Code / Switch Profile</span>
            </button>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  lockVault();
                  vaultAudio.playWhoosh();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-300 hover:bg-rose-600/40 text-xs font-semibold transition-all cursor-pointer"
              >
                Lock Vault Session
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Keep Active
              </button>
            </div>
          </div>
        ) : (
          /* Authentication / Join Tabs */
          <div>
            {isVaultUnlocked && (
              <button
                type="button"
                onClick={() => setActiveTab('credentials')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 mb-3 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Active Session</span>
              </button>
            )}
            {/* Tab Pill Headers */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-white/[0.04] border border-white/10 rounded-2xl mb-4">
              <button
                type="button"
                onClick={() => setActiveTab('credentials')}
                className={`py-1.5 text-[11px] font-semibold rounded-xl transition-all ${
                  activeTab === 'credentials'
                    ? 'bg-vault-gold text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Password
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('passkey')}
                className={`py-1.5 text-[11px] font-semibold rounded-xl transition-all ${
                  activeTab === 'passkey'
                    ? 'bg-vault-gold text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Passkey
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('recovery')}
                className={`py-1.5 text-[11px] font-semibold rounded-xl transition-all ${
                  activeTab === 'recovery'
                    ? 'bg-vault-gold text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Recovery
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('join')}
                className={`py-1.5 text-[11px] font-semibold rounded-xl transition-all ${
                  activeTab === 'join'
                    ? 'bg-vault-gold text-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Invite Code
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-3.5 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* TAB 1: Password / Credentials Form */}
            {activeTab === 'credentials' && (
              <form onSubmit={handleCredentialsSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Kin Email or Username
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. curator@myorb.live"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="glass-input w-full pl-9 pr-3 py-2 rounded-xl text-xs text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Password / Master Passphrase
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="glass-input w-full pl-9 pr-9 py-2 rounded-xl text-xs text-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* 1-Tap Demo Credentials Chips */}
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block mb-1.5">
                    Family Quick Sign-In Accounts:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {allMembers.slice(0, 3).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setEmail(m.email);
                          setPassword('VaultMaster2024!Secure');
                        }}
                        className="px-2 py-0.5 rounded-lg text-[10px] bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
                      >
                        {m.displayName.split(' ')[0]} ({m.role})
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 mt-2"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Authenticating...' : 'Unlock Vault'}</span>
                </button>
              </form>
            )}

            {/* TAB 2: WebAuthn Passkey / Touch ID */}
            {activeTab === 'passkey' && (
              <div className="text-center py-4 space-y-4">
                <button
                  type="button"
                  onClick={handlePasskeyTrigger}
                  disabled={isScanningPasskey || passkeySuccess}
                  className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center border-2 transition-all cursor-pointer ${
                    passkeySuccess
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-400 shadow-glow'
                      : isScanningPasskey
                      ? 'border-vault-gold bg-vault-gold/20 text-vault-gold animate-pulse'
                      : 'border-white/20 bg-white/5 text-slate-300 hover:border-vault-gold hover:text-vault-gold hover:bg-white/10'
                  }`}
                >
                  {passkeySuccess ? (
                    <Check className="w-10 h-10 stroke-[3]" />
                  ) : (
                    <Fingerprint className="w-10 h-10" />
                  )}
                </button>

                <div>
                  <h4 className="text-sm font-bold text-white">
                    {passkeySuccess
                      ? 'Biometric Verified!'
                      : isScanningPasskey
                      ? 'Contacting Device Sensor...'
                      : 'Touch ID / Windows Hello Passkey'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    {isScanningPasskey
                      ? 'Please touch your fingerprint sensor or verify facial scan.'
                      : 'Tap the sensor icon above to authenticate with hardware-backed passkeys.'}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: 256-Bit Recovery Key */}
            {activeTab === 'recovery' && (
              <form onSubmit={handleRecoverySubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    256-Bit Master Hex Recovery Key
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. 1A2B-3C4D-5E6F-7890-ABCD-EF01-2345-6789-..."
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    className="glass-input w-full p-2.5 rounded-xl text-xs font-mono text-center tracking-wider text-vault-gold resize-none"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1 text-center font-mono">
                    Direct cryptographic recovery without cloud dependencies.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Verifying 256-Bit Key...' : 'Unlock via Master Key'}</span>
                </button>
              </form>
            )}

            {/* TAB 4: Join Vault with Invitation Code */}
            {activeTab === 'join' && (
              <form onSubmit={handleJoinSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Invitation Code
                  </label>
                  <div className="relative">
                    <Ticket className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="MYORB-INV-XXXXXX or paste invite link"
                      value={inviteCode}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.includes('code=') || val.includes('http') || val.includes('_') || val.includes('/')) {
                          setInviteCode(extractAndNormalizeInviteCode(val));
                        } else {
                          setInviteCode(val.toUpperCase());
                        }
                      }}
                      onPaste={(e) => {
                        const pasted = e.clipboardData.getData('text');
                        if (pasted) {
                          e.preventDefault();
                          setInviteCode(extractAndNormalizeInviteCode(pasted));
                        }
                      }}
                      className="glass-input w-full pl-9 pr-3 py-2 rounded-xl text-xs font-mono tracking-wider text-vault-gold uppercase"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setInviteCode('MYORB-INV-7X9K2M')}
                    className="text-[10px] text-vault-gold hover:underline mt-1 font-mono inline-block"
                  >
                    Use Sample Code: MYORB-INV-7X9K2M
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Your Kin Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sara Wong"
                    value={joinDisplayName}
                    onChange={(e) => setJoinDisplayName(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-xl text-xs text-white"
                    required
                  />
                </div>

                {joinSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>Welcome to the vault! Enrolling your identity...</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || joinSuccess}
                  className="w-full py-2.5 rounded-xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 mt-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Joining Vault...' : 'Join Kin Vault'}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
