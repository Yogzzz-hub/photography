import { useState } from 'react';
import { useVaultStore } from '../../stores/useVaultStore';
import { Lock, Unlock, Key, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';

export function LockUnlockModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { isVaultUnlocked, unlockWithRecoveryCode, unlockWithMasterKey, lockVault } = useVaultStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const success = await unlockWithRecoveryCode(code);
      if (success) {
        onClose();
      } else {
        setError('Invalid recovery key or passphrase format. Please verify your 256-bit key.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative text-center">
        <div className="w-16 h-16 rounded-full bg-purple-600/20 border border-purple-500/30 text-purple-400 mx-auto flex items-center justify-center mb-4">
          {isVaultUnlocked ? <Unlock className="w-8 h-8" /> : <Lock className="w-8 h-8" />}
        </div>

        <h3 className="text-xl font-bold text-white mb-1">
          {isVaultUnlocked ? 'Vault Cryptographically Unlocked' : 'Unlock Family Memory Vault'}
        </h3>
        <p className="text-xs text-slate-400 max-w-xs mx-auto mb-6">
          {isVaultUnlocked
            ? 'Your client possesses the active decryption key. Memory pixels are decrypted locally.'
            : 'Enter your 256-bit Master Recovery Key or Passphrase to decrypt memory photos.'}
        </p>

        {isVaultUnlocked ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 justify-center">
              <ShieldCheck className="w-4 h-4" />
              <span>Active AES-256-GCM Session Established</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  lockVault();
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-300 hover:bg-rose-600/40 text-xs font-semibold transition-all"
              >
                Lock Vault Session
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-glow"
              >
                Keep Active
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="1A2B-3C4D-5E6F-7890-ABCD-EF01-2345-6789-..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="glass-input w-full p-3 rounded-xl text-xs font-mono text-center tracking-wider"
                required
              />
            </div>

            {error && (
              <div className="text-xs text-rose-400 flex items-center justify-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-glow transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Decrypting Key...' : 'Unlock Memories'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
