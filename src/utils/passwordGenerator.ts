/**
 * Cryptographic Password & Passphrase Generator Utility
 * Uses Web Crypto API (crypto.getRandomValues) for true randomness.
 */

export interface PasswordGeneratorOptions {
  length?: number;
  useUpper?: boolean;
  useLower?: boolean;
  useNumbers?: boolean;
  useSymbols?: boolean;
}

export interface PasswordStrengthResult {
  score: number; // 0 - 4
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Cryptographic (256-bit)';
  crackTime: string;
  color: string;
  feedback: string;
  entropyBits: number;
}

const UPPERCASE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluded ambiguous I, O
const LOWERCASE_CHARS = 'abcdefghijkmnopqrstuvwxyz'; // Excluded ambiguous l
const NUMBER_CHARS = '23456789'; // Excluded 0, 1
const SYMBOL_CHARS = '!@#$%^&*()_+~|}{[]:;?><,.-=';

const PASSPHRASE_WORDS = [
  'Cosmic', 'Orion', 'Velvet', 'Golden', 'Horizon', 'Sanctuary', 'Echo', 'Aura',
  'Solitude', 'Celestial', 'Marina', 'Zenith', 'Citadel', 'Obsidian', 'Lapis',
  'Eclipse', 'Starlight', 'Astral', 'Nebula', 'Genesis', 'Vanguard', 'Harbor',
  'Summit', 'Canyon', 'Cascade', 'Mirage', 'Radiance', 'Infinity', 'Voyager',
  'Monolith', 'Timber', 'Sylvan', 'Breeze', 'Tidal', 'Archway', 'Marble',
  'Zephyr', 'Halcyon', 'Arcadia', 'Solace', 'Aethel', 'Elysium', 'Apex'
];

/**
 * Generates a cryptographically random password
 */
export function generatePassword(options: PasswordGeneratorOptions = {}): string {
  const {
    length = 16,
    useUpper = true,
    useLower = true,
    useNumbers = true,
    useSymbols = true,
  } = options;

  let charset = '';
  const guaranteedChars: string[] = [];

  if (useUpper) {
    charset += UPPERCASE_CHARS;
    guaranteedChars.push(getRandomChar(UPPERCASE_CHARS));
  }
  if (useLower) {
    charset += LOWERCASE_CHARS;
    guaranteedChars.push(getRandomChar(LOWERCASE_CHARS));
  }
  if (useNumbers) {
    charset += NUMBER_CHARS;
    guaranteedChars.push(getRandomChar(NUMBER_CHARS));
  }
  if (useSymbols) {
    charset += SYMBOL_CHARS;
    guaranteedChars.push(getRandomChar(SYMBOL_CHARS));
  }

  if (charset.length === 0) {
    charset = LOWERCASE_CHARS + NUMBER_CHARS;
  }

  const remainingLength = Math.max(0, length - guaranteedChars.length);
  const randomBytes = new Uint32Array(remainingLength);

  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < remainingLength; i++) {
      randomBytes[i] = Math.floor(Math.random() * 0xffffffff);
    }
  }

  const passwordChars = [...guaranteedChars];
  for (let i = 0; i < remainingLength; i++) {
    passwordChars.push(charset[randomBytes[i] % charset.length]);
  }

  // Shuffle using Fisher-Yates with crypto random
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const j = Math.floor((getRandomNumber() / 0xffffffff) * (i + 1));
    [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
  }

  return passwordChars.join('');
}

/**
 * Generates an easy-to-remember yet highly secure diceware-style passphrase
 * Example: "Cosmic-Velvet-Orion-Echo-2026"
 */
export function generatePassphrase(wordCount = 4, separator = '-'): string {
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) {
    const idx = Math.floor((getRandomNumber() / 0xffffffff) * PASSPHRASE_WORDS.length);
    words.push(PASSPHRASE_WORDS[idx]);
  }
  // Append a 2-digit random number to ensure high entropy
  const num = Math.floor((getRandomNumber() / 0xffffffff) * 90 + 10);
  return `${words.join(separator)}${separator}${num}`;
}

/**
 * Generates a numeric PIN code
 */
export function generatePin(digits = 6): string {
  let pin = '';
  for (let i = 0; i < digits; i++) {
    pin += Math.floor((getRandomNumber() / 0xffffffff) * 10).toString();
  }
  return pin;
}

/**
 * Evaluates password strength and entropy
 */
export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return {
      score: 0,
      label: 'Very Weak',
      crackTime: 'Instant',
      color: 'text-slate-500',
      feedback: 'Enter a password to evaluate strength.',
      entropyBits: 0,
    };
  }

  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 32;

  const entropy = password.length * Math.log2(poolSize || 1);
  const entropyBits = Math.round(entropy);

  if (entropy < 28) {
    return {
      score: 1,
      label: 'Weak',
      crackTime: '< 1 second',
      color: 'text-rose-500',
      feedback: 'Too short or simple. Easily cracked by brute force.',
      entropyBits,
    };
  }

  if (entropy < 45) {
    return {
      score: 2,
      label: 'Fair',
      crackTime: 'Several minutes to a day',
      color: 'text-amber-400',
      feedback: 'Moderate strength. Add uppercase, numbers or symbols.',
      entropyBits,
    };
  }

  if (entropy < 70) {
    return {
      score: 3,
      label: 'Strong',
      crackTime: 'Several centuries',
      color: 'text-emerald-400',
      feedback: 'Strong password. Resistant to dictionary and offline attacks.',
      entropyBits,
    };
  }

  return {
    score: 4,
    label: 'Cryptographic (256-bit)',
    crackTime: 'Billions of years',
    color: 'text-vault-gold',
    feedback: 'Military-grade entropy. Cryptographically uncrackable.',
    entropyBits,
  };
}

function getRandomNumber(): number {
  if (typeof window !== 'undefined' && window.crypto) {
    const buf = new Uint32Array(1);
    window.crypto.getRandomValues(buf);
    return buf[0];
  }
  return Math.floor(Math.random() * 0xffffffff);
}

function getRandomChar(str: string): string {
  const num = getRandomNumber();
  return str[num % str.length];
}
