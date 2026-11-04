import { useState, useEffect } from 'react';
import {
  generatePassword,
  generatePassphrase,
  evaluatePasswordStrength,
  type PasswordStrengthResult,
} from '../../utils/passwordGenerator';
import { vaultAudio } from '../../services/audioSynthesizer';
import {
  KeyRound,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sliders,
  Hash,
  Type,
  X,
  Lock,
} from 'lucide-react';

interface PasswordGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPassword?: (password: string) => void;
  onApplyPassword?: (password: string) => void;
}

export function PasswordGeneratorModal({
  isOpen,
  onClose,
  onSelectPassword,
  onApplyPassword,
}: PasswordGeneratorModalProps) {
  const [mode, setMode] = useState<'password' | 'passphrase' | 'pin'>('password');
  
  // Custom password options
  const [length, setLength] = useState(16);
  const [useUpper, setUseUpper] = useState(true);
  const [useLower, setUseLower] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);

  // Passphrase options
  const [wordCount, setWordCount] = useState(4);
  const [separator, setSeparator] = useState('-');

  // PIN options
  const [pinLength, setPinLength] = useState(6);

  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [strength, setStrength] = useState<PasswordStrengthResult>({
    score: 0,
    label: 'Very Weak',
    crackTime: 'Instant',
    color: 'text-slate-500',
    feedback: '',
    entropyBits: 0,
  });

  const handleGenerate = () => {
    vaultAudio.playSnap();
    let pwd = '';
    if (mode === 'password') {
      pwd = generatePassword({
        length,
        useUpper,
        useLower,
        useNumbers,
        useSymbols,
      });
    } else if (mode === 'passphrase') {
      pwd = generatePassphrase(wordCount, separator);
    } else {
      // PIN
      let pin = '';
      for (let i = 0; i < pinLength; i++) {
        pin += Math.floor(Math.random() * 10).toString();
      }
      pwd = pin;
    }

    setGeneratedPassword(pwd);
    setStrength(evaluatePasswordStrength(pwd));
    setCopied(false);
  };

  useEffect(() => {
    if (isOpen) {
      handleGenerate();
    }
  }, [isOpen, mode, length, useUpper, useLower, useNumbers, useSymbols, wordCount, separator, pinLength]);

  if (!isOpen) return null;

  const handleCopy = () => {
    vaultAudio.playChime(659.25);
    navigator.clipboard.writeText(generatedPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (onApplyPassword) {
      onApplyPassword(generatedPassword);
      onClose();
    } else if (onSelectPassword) {
      onSelectPassword(generatedPassword);
      onClose();
    } else {
      handleCopy();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#0A0D18] text-slate-900 dark:text-white border border-black/10 dark:border-white/15 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-vault-gold/15 border border-vault-gold/30 text-amber-700 dark:text-vault-gold">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-slate-900 dark:text-white tracking-wide flex items-center gap-2">
                <span>Cryptographic Password Studio</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  AES-256
                </span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-sans mt-0.5">
                Generate uncrackable master passphrases & vault credentials
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
            title="Close Generator"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-black/5 dark:bg-white/[0.04] border border-black/10 dark:border-white/10 text-xs font-medium">
          <button
            onClick={() => setMode('password')}
            className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'password'
                ? 'bg-vault-gold text-black font-semibold shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Characters</span>
          </button>
          <button
            onClick={() => setMode('passphrase')}
            className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'passphrase'
                ? 'bg-vault-gold text-black font-semibold shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Passphrase</span>
          </button>
          <button
            onClick={() => setMode('pin')}
            className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'pin'
                ? 'bg-vault-gold text-black font-semibold shadow-sm'
                : 'text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>Vault PIN</span>
          </button>
        </div>

        {/* Generated Password Display Card */}
        <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] border border-black/10 dark:border-white/10 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-sm sm:text-base font-semibold break-all text-slate-900 dark:text-amber-200 select-all tracking-wide">
              {generatedPassword}
            </span>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={handleGenerate}
                className="p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
                title="Regenerate Password"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={handleCopy}
                className={`px-3 py-2 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                  copied
                    ? 'bg-emerald-500 text-white'
                    : 'bg-vault-gold hover:bg-amber-400 text-black'
                }`}
                title="Copy to Clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Strength Bar & Entropy Estimation */}
          <div className="space-y-1.5 pt-1 border-t border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Strength: <strong className={strength.color}>{strength.label}</strong></span>
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                Crack Time: <strong className="text-slate-700 dark:text-slate-200">{strength.crackTime}</strong>
              </span>
            </div>

            {/* Visual Strength Progress Meter */}
            <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden flex gap-1">
              {[1, 2, 3, 4].map((step) => {
                const isActive = strength.score >= step;
                let bg = 'bg-slate-300 dark:bg-slate-700';
                if (isActive) {
                  if (strength.score === 1) bg = 'bg-rose-500';
                  else if (strength.score === 2) bg = 'bg-amber-400';
                  else if (strength.score === 3) bg = 'bg-emerald-400';
                  else bg = 'bg-vault-gold';
                }
                return <div key={step} className={`flex-1 h-full rounded-full transition-all ${bg}`} />;
              })}
            </div>
          </div>
        </div>

        {/* Options Customizer based on Mode */}
        {mode === 'password' && (
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-700 dark:text-slate-300">Length: {length} characters</span>
                <span className="text-slate-500">Min 8 · Max 32</span>
              </div>
              <input
                type="range"
                min="8"
                max="32"
                value={length}
                onChange={(e) => setLength(parseInt(e.target.value, 10))}
                className="w-full accent-vault-gold cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] cursor-pointer">
                <input
                  type="checkbox"
                  checked={useUpper}
                  onChange={(e) => setUseUpper(e.target.checked)}
                  className="rounded accent-vault-gold"
                />
                <span>Uppercase (A-Z)</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] cursor-pointer">
                <input
                  type="checkbox"
                  checked={useLower}
                  onChange={(e) => setUseLower(e.target.checked)}
                  className="rounded accent-vault-gold"
                />
                <span>Lowercase (a-z)</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] cursor-pointer">
                <input
                  type="checkbox"
                  checked={useNumbers}
                  onChange={(e) => setUseNumbers(e.target.checked)}
                  className="rounded accent-vault-gold"
                />
                <span>Numbers (0-9)</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02] cursor-pointer">
                <input
                  type="checkbox"
                  checked={useSymbols}
                  onChange={(e) => setUseSymbols(e.target.checked)}
                  className="rounded accent-vault-gold"
                />
                <span>Symbols (!@#$)</span>
              </label>
            </div>
          </div>
        )}

        {mode === 'passphrase' && (
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-700 dark:text-slate-300">Word Count: {wordCount} words</span>
                <span className="text-slate-500">Min 3 · Max 6</span>
              </div>
              <input
                type="range"
                min="3"
                max="6"
                value={wordCount}
                onChange={(e) => setWordCount(parseInt(e.target.value, 10))}
                className="w-full accent-vault-gold cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between text-xs p-2.5 rounded-xl border border-black/10 dark:border-white/10">
              <span className="text-slate-700 dark:text-slate-300">Word Separator:</span>
              <div className="flex gap-1.5">
                {['-', '.', '_', ' '].map((sep) => (
                  <button
                    key={sep}
                    onClick={() => setSeparator(sep)}
                    className={`w-7 h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                      separator === sep
                        ? 'bg-vault-gold text-black shadow-sm'
                        : 'bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {sep === ' ' ? '␣' : sep}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {mode === 'pin' && (
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-700 dark:text-slate-300">PIN Digits: {pinLength}</span>
                <span className="text-slate-500">4, 6 or 8 Digits</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[4, 6, 8].map((digits) => (
                  <button
                    key={digits}
                    onClick={() => setPinLength(digits)}
                    className={`py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                      pinLength === digits
                        ? 'bg-vault-gold text-black shadow-sm'
                        : 'bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/20'
                    }`}
                  >
                    {digits} Digits
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Footer */}
        <div className="pt-2 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleApply}
            className="px-5 py-2.5 rounded-xl bg-vault-gold hover:bg-amber-400 text-black font-semibold text-xs transition-all shadow-lg active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{onSelectPassword || onApplyPassword ? 'Apply to Form' : 'Copy Password'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
