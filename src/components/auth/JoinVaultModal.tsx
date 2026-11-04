import { useState, useEffect } from 'react';
import { useVaultStore } from '../../stores/useVaultStore';
import { vaultAudio } from '../../services/audioSynthesizer';
import { extractAndNormalizeInviteCode } from '../../utils/inviteUtils';
import { Ticket, Sparkles, CheckCircle2, X, Shield, Lock, ArrowRight, UserPlus } from 'lucide-react';

interface JoinVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteCode?: string;
  onSuccess?: () => void;
}

export function JoinVaultModal({ isOpen, onClose, inviteCode = '', onSuccess }: JoinVaultModalProps) {
  const { currentFamily, invitations, acceptInvitation } = useVaultStore();

  const [code, setCode] = useState(inviteCode);
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  // Sync incoming code prop and try to prefill invite details
  useEffect(() => {
    if (inviteCode) {
      const normalized = extractAndNormalizeInviteCode(inviteCode);
      setCode(normalized);

      // Search if there is a matching invitation to prefill name
      const matched = invitations.find((inv) => {
        const invNorm = extractAndNormalizeInviteCode(inv.code || '');
        return invNorm === normalized || (normalized.length >= 6 && invNorm.endsWith(normalized));
      });

      if (matched?.name) {
        setDisplayName(matched.name);
      }
    }
  }, [inviteCode, invitations]);

  if (!isOpen) return null;

  const normalizedCode = extractAndNormalizeInviteCode(code);
  const matchedInvite = invitations.find((inv) => {
    const invNorm = extractAndNormalizeInviteCode(inv.code || '');
    return invNorm === normalizedCode || (normalizedCode.length >= 6 && invNorm.endsWith(normalizedCode));
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!normalizedCode || normalizedCode.length < 4) {
      setErrorMsg('Please enter a valid vault invitation code.');
      return;
    }

    if (!displayName.trim()) {
      setErrorMsg('Please enter your display name to enroll in the vault.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await acceptInvitation(normalizedCode, displayName.trim());
      if (ok) {
        setSuccess(true);
        vaultAudio.playWhoosh();

        // Clear query parameters from URL seamlessly without page reload
        if (typeof window !== 'undefined' && window.history) {
          const cleanPath = window.location.pathname === '/join' ? '/' : window.location.pathname;
          window.history.replaceState({}, '', cleanPath);
        }

        setTimeout(() => {
          setSuccess(false);
          onClose();
          if (onSuccess) onSuccess();
        }, 1300);
      } else {
        setErrorMsg('Invalid or expired invitation code. Please verify and try again.');
      }
    } catch {
      setErrorMsg('An unexpected error occurred while processing the invitation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl animate-in fade-in">
      <div className="bg-[#FAF9F6] dark:bg-[#080B13] border border-stone-200 dark:border-white/15 rounded-3xl max-w-md w-full p-5 sm:p-7 shadow-2xl relative text-stone-900 dark:text-white transition-all font-sans">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-2 rounded-full text-stone-400 hover:text-stone-700 dark:text-slate-400 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/10 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Monogram / Header Badge */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-purple-600/30 to-vault-gold/25 border border-vault-gold/40 text-vault-gold mx-auto flex items-center justify-center mb-3 shadow-glow">
            <Ticket className="w-7 h-7 text-vault-gold" />
          </div>
          <h3 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 dark:text-white tracking-wide">
            Accept Kin Invitation
          </h3>
          <p className="text-xs text-stone-600 dark:text-slate-400 mt-1 max-w-sm mx-auto font-sans leading-relaxed">
            You have been invited to join the private{' '}
            <strong className="text-vault-gold font-semibold">{currentFamily.name}</strong> archive.
          </p>
        </div>

        {/* Matched Kin Role Banner */}
        {matchedInvite && (
          <div className="mb-4 p-3 rounded-2xl bg-vault-gold/10 border border-vault-gold/30 text-xs text-stone-700 dark:text-slate-200 flex items-center gap-3">
            <Shield className="w-4 h-4 text-vault-gold flex-shrink-0" />
            <div>
              <span className="font-semibold block text-stone-900 dark:text-vault-gold">
                Role Authorized: {matchedInvite.role.toUpperCase()}
              </span>
              <span className="text-[11px] text-stone-500 dark:text-slate-400">
                Issued by {matchedInvite.invitedByName || 'Vault Curator'}
              </span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-700 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
            <span>Identity confirmed! Decrypting family memories...</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              Invitation Code
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="MYORB-INV-XXXXXX or paste link"
                value={code}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.includes('code=') || val.includes('http') || val.includes('_') || val.includes('/')) {
                    setCode(extractAndNormalizeInviteCode(val));
                  } else {
                    setCode(val.toUpperCase());
                  }
                }}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData('text');
                  if (pasted) {
                    e.preventDefault();
                    setCode(extractAndNormalizeInviteCode(pasted));
                  }
                }}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs font-mono tracking-wider font-bold text-vault-gold bg-stone-100 dark:bg-black/60 border border-stone-300 dark:border-vault-gold/40 focus:outline-none focus:ring-2 focus:ring-vault-gold/50 uppercase"
                required
              />
            </div>
            <p className="text-[10px] text-stone-500 dark:text-slate-500 mt-1">
              Paste the full invitation link or enter the 6-character code.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-stone-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              Your Kin Display Name
            </label>
            <div className="relative">
              <UserPlus className="w-4 h-4 text-stone-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. Sara Wong or Aunt Clara"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs text-stone-900 dark:text-white bg-stone-100 dark:bg-black/60 border border-stone-300 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-vault-gold/50"
                required
              />
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-stone-600 dark:text-slate-400 hover:bg-stone-200 dark:hover:bg-white/5 transition-all cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || success}
              className="flex-1 py-2.5 rounded-xl bg-vault-gold hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-black" />
              <span>{isSubmitting ? 'Joining Vault...' : 'Accept & Enter Vault'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-black" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
