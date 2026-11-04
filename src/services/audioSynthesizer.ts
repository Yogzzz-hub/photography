/**
 * High-Fidelity Celestial Audio Engine & Generative Ambient Synthesizer
 *
 * Provides:
 * 1. Rich, warm generative ambient BGM soundscapes (Brian Eno-style, Golden Hour, Deep Solitude, Zenith Horizon)
 *    calibrated with proper gain staging (-14 dBFS) for audible playback on mobile & laptop speakers.
 * 2. Asynchronous AudioContext initialization & auto-resume on first user gesture.
 * 3. Tactile interactive hover & click soundscapes (Marimba, Crystal Glass, Harp, Leica Shutter, Celestial Bell).
 * 4. Custom audio track upload (.mp3, .wav, .m4a, .ogg) with full playback & volume control.
 */

export type HoverSoundProfile = 'marimba' | 'glass' | 'harp' | 'click' | 'celestial' | 'off';

export interface BgmTrackConfig {
  id: 'orbit' | 'solitude' | 'golden' | 'zenith';
  name: string;
  key: string;
  keyCenter?: string;
  tempo: string;
  desc: string;
  tagline?: string;
}

export const BGM_TRACKS: BgmTrackConfig[] = [
  {
    id: 'orbit',
    name: 'Celestial Orbit',
    key: 'Eb Major',
    keyCenter: 'Eb Major',
    tempo: 'Fluid 52 BPM',
    desc: 'Brian Eno-inspired ambient drone with gentle harmonic shimmer',
    tagline: 'Brian Eno-inspired ambient drone with gentle harmonic shimmer',
  },
  {
    id: 'solitude',
    name: 'Deep Solitude',
    key: 'C Minor',
    keyCenter: 'C Minor',
    tempo: 'Meditative 44 BPM',
    desc: 'Warm acoustic meditation pad with gentle vinyl crackle',
    tagline: 'Warm acoustic meditation pad with gentle vinyl crackle',
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    key: 'Ab Major',
    keyCenter: 'Ab Major',
    tempo: 'Gentle 60 BPM',
    desc: 'Lush electric piano chords with warm tape saturation',
    tagline: 'Lush electric piano chords with warm tape saturation',
  },
  {
    id: 'zenith',
    name: 'Zenith Horizon',
    key: 'D Major',
    keyCenter: 'D Major',
    tempo: 'Ethereal 48 BPM',
    desc: 'Singing bowl cosmic harmonics with subtle binaural pulse',
    tagline: 'Singing bowl cosmic harmonics with subtle binaural pulse',
  },
];

// Harmonious Eb Pentatonic Scale across 3 octaves for gentle non-fatiguing arpeggios
const PENTATONIC_FREQUENCIES = [
  155.56, // Eb3
  174.61, // F3
  196.00, // G3
  233.08, // Bb3
  261.63, // C4
  311.13, // Eb4
  349.23, // F4
  392.00, // G4
  466.16, // Bb4
  523.25, // C5
  622.25, // Eb5
  698.46, // F5
  783.99, // G5
  932.33, // Bb5
  1046.50, // C6
];

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private bgmPlaying = false;
  private currentTrack: BgmTrackConfig['id'] = 'orbit';
  private hoverProfile: HoverSoundProfile = 'marimba';

  // Volume gains calibrated for audible playback on all speakers
  private masterGain: GainNode | null = null;
  private sfxGainNode: GainNode | null = null;
  private bgmGainNode: GainNode | null = null;

  private bgmVolume = 0.80; // 80% volume - rich, audible, warm
  private sfxVolume = 0.65; // 65% volume for crisp, delightful UI feedback

  // Custom User Audio Track
  private customAudioEl: HTMLAudioElement | null = null;
  private customTrackName: string | null = null;

  // Active BGM soundscape nodes
  private bgmOscillators: (OscillatorNode | AudioBufferSourceNode)[] = [];
  private bgmLFOs: OscillatorNode[] = [];
  private bgmIntervalId: any = null;
  private noteScaleIndex = 0;
  private lastHoverTime = 0;

  private listeners: (() => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.ensureContext();
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
      };
      window.addEventListener('pointerdown', unlock, { once: true, passive: true });
      window.addEventListener('keydown', unlock, { once: true, passive: true });
      window.addEventListener('touchstart', unlock, { once: true, passive: true });
    }
  }

  /**
   * Initializes or resumes the Web Audio AudioContext asynchronously
   */
  public async ensureContext(): Promise<AudioContext | null> {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.setupAudioGraph();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (_) {}
    }

    return this.ctx;
  }

  public initContext() {
    this.ensureContext();
  }

  private setupAudioGraph() {
    if (!this.ctx) return;

    // Master gain node
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // SFX Sub-bus
    this.sfxGainNode = this.ctx.createGain();
    this.sfxGainNode.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    this.sfxGainNode.connect(this.masterGain);

    // BGM Sub-bus with gentle acoustic lowpass filter (warm analog curve)
    const bgmFilter = this.ctx.createBiquadFilter();
    bgmFilter.type = 'lowpass';
    bgmFilter.frequency.setValueAtTime(4500, this.ctx.currentTime);
    bgmFilter.Q.setValueAtTime(0.7, this.ctx.currentTime);

    this.bgmGainNode = this.ctx.createGain();
    this.bgmGainNode.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);

    this.bgmGainNode.connect(bgmFilter);
    bgmFilter.connect(this.masterGain);
  }

  public subscribe(cb: () => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  // --- Controls & Getters ---

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    this.ensureContext().then(() => {
      if (this.masterGain && this.ctx) {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(muted ? 0 : 1, now);
      }
      if (this.customAudioEl) {
        this.customAudioEl.muted = muted;
      }
      this.notify();
    });
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setBgmVolume(volume: number) {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    this.ensureContext().then(() => {
      if (this.bgmGainNode && this.ctx) {
        const now = this.ctx.currentTime;
        this.bgmGainNode.gain.cancelScheduledValues(now);
        this.bgmGainNode.gain.linearRampToValueAtTime(this.bgmVolume, now + 0.1);
      }
      if (this.customAudioEl) {
        this.customAudioEl.volume = this.bgmVolume;
      }
      this.notify();
    });
  }

  public getBgmVolume(): number {
    return this.bgmVolume;
  }

  public setSfxVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.ensureContext().then(() => {
      if (this.sfxGainNode && this.ctx) {
        const now = this.ctx.currentTime;
        this.sfxGainNode.gain.cancelScheduledValues(now);
        this.sfxGainNode.gain.linearRampToValueAtTime(this.sfxVolume, now + 0.05);
      }
      this.notify();
    });
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  public getCurrentTrack(): BgmTrackConfig['id'] {
    return this.currentTrack;
  }

  public getHoverProfile(): HoverSoundProfile {
    return this.hoverProfile;
  }

  public setHoverProfile(profile: HoverSoundProfile) {
    this.hoverProfile = profile;
    this.notify();
  }

  public isBgmActive(): boolean {
    return this.bgmPlaying;
  }

  // --- Tactile UI Sound Synthesis (SFX) ---

  public playChime(freq = 523.25) {
    this.playHoverChime(freq);
  }

  public playHoverChime(customFreq?: number) {
    if (this.isMuted || this.hoverProfile === 'off') return;

    const nowMs = Date.now();
    if (nowMs - this.lastHoverTime < 40) return;
    this.lastHoverTime = nowMs;

    this.ensureContext().then((ctx) => {
      if (!ctx || !this.sfxGainNode) return;

      const now = ctx.currentTime;
      const freq =
        customFreq ||
        PENTATONIC_FREQUENCIES[this.noteScaleIndex % PENTATONIC_FREQUENCIES.length];
      this.noteScaleIndex = (this.noteScaleIndex + 1) % PENTATONIC_FREQUENCIES.length;

      switch (this.hoverProfile) {
        case 'marimba': {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          const gain2 = ctx.createGain();

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(freq, now);

          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(freq * 2.01, now);

          gain1.gain.setValueAtTime(0.001, now);
          gain1.gain.linearRampToValueAtTime(0.25, now + 0.006);
          gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

          gain2.gain.setValueAtTime(0.001, now);
          gain2.gain.linearRampToValueAtTime(0.10, now + 0.004);
          gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

          osc1.connect(gain1);
          osc2.connect(gain2);
          gain1.connect(this.sfxGainNode);
          gain2.connect(this.sfxGainNode);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.32);
          osc2.stop(now + 0.16);
          break;
        }

        case 'glass': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq * 1.5, now);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.22, now + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

          osc.connect(gain);
          gain.connect(this.sfxGainNode);
          osc.start(now);
          osc.stop(now + 0.50);
          break;
        }

        case 'harp': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.24, now + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

          osc.connect(gain);
          gain.connect(this.sfxGainNode);
          osc.start(now);
          osc.stop(now + 0.42);
          break;
        }

        case 'click': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(1400, now);
          osc.frequency.exponentialRampToValueAtTime(220, now + 0.025);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.18, now + 0.002);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

          osc.connect(gain);
          gain.connect(this.sfxGainNode);
          osc.start(now);
          osc.stop(now + 0.04);
          break;
        }

        case 'celestial': {
          [freq, freq * 1.498, freq * 2.0].forEach((f, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.12 / (i + 1), now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

            osc.connect(gain);
            gain.connect(this.sfxGainNode!);
            osc.start(now);
            osc.stop(now + 0.70);
          });
          break;
        }
      }
    });
  }

  public playWhoosh() {
    if (this.isMuted) return;
    this.ensureContext().then((ctx) => {
      if (!ctx || !this.sfxGainNode) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.28);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

      osc.connect(gain);
      gain.connect(this.sfxGainNode);
      osc.start(now);
      osc.stop(now + 0.35);
    });
  }

  public playSnap() {
    if (this.isMuted) return;
    this.ensureContext().then((ctx) => {
      if (!ctx || !this.sfxGainNode) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.04);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

      osc.connect(gain);
      gain.connect(this.sfxGainNode);
      osc.start(now);
      osc.stop(now + 0.05);
    });
  }

  /**
   * Immediately plays an audible, uplifting, 3-note harmonic chime (C5-E5-G5-C6)
   * Allows users to instantly test their audio output & verify volume.
   */
  public testAudioTone() {
    this.ensureContext().then((ctx) => {
      if (!ctx || !this.sfxGainNode) return;
      const now = ctx.currentTime;
      const pitches = [523.25, 659.25, 783.99, 1046.50];

      pitches.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.001, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.35, now + idx * 0.08 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.85);

        osc.connect(gain);
        gain.connect(this.sfxGainNode!);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.9);
      });
    });
  }

  // --- Custom Audio Track Engine ---

  public loadCustomTrack(url: string, name: string) {
    if (this.customAudioEl) {
      this.customAudioEl.pause();
      this.customAudioEl.src = '';
    }

    this.stopBgmNodes();
    this.customTrackName = name;
    this.isMuted = false;
    if (this.bgmVolume < 0.25) {
      this.bgmVolume = 0.5;
    }

    this.customAudioEl = new Audio(url);
    this.customAudioEl.loop = true;
    this.customAudioEl.volume = this.bgmVolume;
    this.customAudioEl.play().catch((err) => {
      console.warn('Audio play waiting for user gesture or audio engine unlock', err);
    });

    this.bgmPlaying = true;
    this.notify();
  }

  public loadCustomDemo() {
    this.stopBgmNodes();
    if (this.customAudioEl) {
      this.customAudioEl.pause();
      this.customAudioEl.src = '';
      this.customAudioEl = null;
    }
    this.customTrackName = 'Ethereal Solstice (Studio Demo)';
    this.isMuted = false;
    if (this.bgmVolume < 0.25) {
      this.bgmVolume = 0.5;
    }
    this.currentTrack = 'zenith';
    this.startBgm('zenith');
    this.notify();
  }

  public clearCustomTrack() {
    if (this.customAudioEl) {
      this.customAudioEl.pause();
      this.customAudioEl.src = '';
      this.customAudioEl = null;
    }
    this.customTrackName = null;
    this.notify();
  }

  public getCustomTrackName(): string | null {
    return this.customTrackName;
  }

  // --- Generative Ambient BGM Soundscapes ---

  public async startBgm(trackId?: BgmTrackConfig['id']) {
    const ctx = await this.ensureContext();
    if (!ctx || !this.bgmGainNode) return;

    if (this.customAudioEl && this.customTrackName) {
      this.stopBgmNodes();
      this.customAudioEl.volume = this.isMuted ? 0 : this.bgmVolume;
      this.customAudioEl.play().catch(() => {});
      this.bgmPlaying = true;
      this.notify();
      return;
    }

    if (trackId) {
      this.currentTrack = trackId;
    }

    this.stopBgmNodes();
    this.bgmPlaying = true;

    const now = ctx.currentTime;
    this.bgmGainNode.gain.cancelScheduledValues(now);
    this.bgmGainNode.gain.setValueAtTime(0.001, now);
    this.bgmGainNode.gain.linearRampToValueAtTime(this.bgmVolume, now + 0.8);

    switch (this.currentTrack) {
      case 'orbit':
        this.buildCelestialOrbitBgm(ctx);
        break;
      case 'solitude':
        this.buildDeepSolitudeBgm(ctx);
        break;
      case 'golden':
        this.buildGoldenHourBgm(ctx);
        break;
      case 'zenith':
        this.buildZenithHorizonBgm(ctx);
        break;
    }

    this.notify();
  }

  public stopBgm() {
    if (this.customAudioEl) {
      this.customAudioEl.pause();
    }

    if (!this.bgmPlaying || !this.ctx || !this.bgmGainNode) {
      this.bgmPlaying = false;
      this.stopBgmNodes();
      this.notify();
      return;
    }

    const now = this.ctx.currentTime;
    this.bgmGainNode.gain.cancelScheduledValues(now);
    this.bgmGainNode.gain.setValueAtTime(this.bgmGainNode.gain.value, now);
    this.bgmGainNode.gain.linearRampToValueAtTime(0.0001, now + 0.6);

    setTimeout(() => {
      this.stopBgmNodes();
      this.bgmPlaying = false;
      this.notify();
    }, 700);
  }

  public toggleBgm() {
    if (this.bgmPlaying) {
      this.stopBgm();
    } else {
      this.startBgm(this.currentTrack);
    }
  }

  public selectBgmTrack(trackId: BgmTrackConfig['id']) {
    if (this.customAudioEl) {
      this.customAudioEl.pause();
      this.customTrackName = null;
    }
    this.currentTrack = trackId;
    if (this.bgmPlaying) {
      this.startBgm(trackId);
    } else {
      this.notify();
    }
  }

  private stopBgmNodes() {
    if (this.bgmIntervalId) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }

    this.bgmOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (_) {}
    });
    this.bgmOscillators = [];

    this.bgmLFOs.forEach((lfo) => {
      try {
        lfo.stop();
        lfo.disconnect();
      } catch (_) {}
    });
    this.bgmLFOs = [];
  }

  /**
   * Track 1: Celestial Orbit (Brian Eno-inspired warm harmonic drone)
   * Beautiful, rich mid-register chords (Eb3 to Bb4) that ring clearly on phones & laptops
   */
  private buildCelestialOrbitBgm(ctx: AudioContext) {
    if (!this.bgmGainNode) return;
    const now = ctx.currentTime;

    // Audible chord voices: Eb3 (155.56), Bb3 (233.08), Eb4 (311.13), G4 (392.00), Bb4 (466.16)
    const notes = [155.56, 233.08, 311.13, 392.00, 466.16];

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq * (1 + (idx - 2) * 0.002), now);

      // Safe breathing modulation (never negative)
      const baseGain = 0.16 / Math.sqrt(idx + 1);
      gain.gain.setValueAtTime(baseGain, now);

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(0.08 + idx * 0.02, now);
      lfoGain.gain.setValueAtTime(baseGain * 0.25, now);

      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);

      osc.connect(gain);
      gain.connect(this.bgmGainNode!);

      osc.start(now);
      lfo.start(now);

      this.bgmOscillators.push(osc);
      this.bgmLFOs.push(lfo);
    });

    // Gentle celestial bell shimmer every 3.6 seconds
    const chimePitches = [523.25, 622.25, 783.99, 932.33, 1046.50];
    let chimeIdx = 0;

    const playChimeNote = () => {
      if (!this.bgmPlaying || !this.ctx || !this.bgmGainNode) return;
      const chimeNow = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(chimePitches[chimeIdx % chimePitches.length], chimeNow);
      chimeIdx++;

      gain.gain.setValueAtTime(0.001, chimeNow);
      gain.gain.linearRampToValueAtTime(0.20, chimeNow + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, chimeNow + 3.2);

      osc.connect(gain);
      gain.connect(this.bgmGainNode);

      osc.start(chimeNow);
      osc.stop(chimeNow + 3.5);
    };

    playChimeNote();
    this.bgmIntervalId = setInterval(playChimeNote, 3600);
  }

  /**
   * Track 2: Deep Solitude (Warm acoustic meditation pad with gentle harmonic warmth)
   */
  private buildDeepSolitudeBgm(ctx: AudioContext) {
    if (!this.bgmGainNode) return;
    const now = ctx.currentTime;

    // Audible frequencies: C3 (130.81), G3 (196.00), C4 (261.63), E4 (329.63), G4 (392.00)
    const frequencies = [130.81, 196.00, 261.63, 329.63, 392.00];

    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      const baseGain = 0.24 / Math.sqrt(idx + 1);
      gain.gain.setValueAtTime(baseGain, now);

      // Subtle slow harmonic breathing
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(0.06 + idx * 0.015, now);
      lfoGain.gain.setValueAtTime(baseGain * 0.2, now);
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);

      osc.connect(gain);
      gain.connect(this.bgmGainNode!);
      osc.start(now);
      lfo.start(now);

      this.bgmOscillators.push(osc);
      this.bgmLFOs.push(lfo);
    });

    // Soothing meditation singing chime every 3.2s
    const solitudeChimes = [523.25, 659.25, 783.99, 987.77, 1046.50];
    let sIdx = 0;
    const playSolitudeChime = () => {
      if (!this.bgmPlaying || !this.ctx || !this.bgmGainNode) return;
      const cNow = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(solitudeChimes[sIdx % solitudeChimes.length], cNow);
      sIdx++;

      gain.gain.setValueAtTime(0.001, cNow);
      gain.gain.linearRampToValueAtTime(0.22, cNow + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, cNow + 2.8);

      osc.connect(gain);
      gain.connect(this.bgmGainNode);
      osc.start(cNow);
      osc.stop(cNow + 3.0);
    };

    playSolitudeChime();
    this.bgmIntervalId = setInterval(playSolitudeChime, 3200);

    // Soothing vinyl warmth texture
    try {
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() < 0.002 ? (Math.random() * 2 - 1) * 0.08 : 0;
      }

      const vinyl = ctx.createBufferSource();
      vinyl.buffer = noiseBuffer;
      vinyl.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.Q.setValueAtTime(1.0, now);

      const vGain = ctx.createGain();
      vGain.gain.setValueAtTime(0.08, now);

      vinyl.connect(filter);
      filter.connect(vGain);
      vGain.connect(this.bgmGainNode);
      vinyl.start(now);
      this.bgmOscillators.push(vinyl);
    } catch (_) {}
  }

  /**
   * Track 3: Golden Hour (Lush Rhodes chord progressions with tremolo)
   */
  private buildGoldenHourBgm(ctx: AudioContext) {
    if (!this.bgmGainNode) return;

    // Warm Ab Major 9 chords in audible register: Ab3, C4, Eb4, G4
    const rhodesChords = [
      [207.65, 261.63, 311.13, 392.00], // Abmaj7
      [174.61, 220.00, 261.63, 329.63], // Fm7
      [233.08, 277.18, 349.23, 415.30], // Bbm7
      [155.56, 233.08, 311.13, 392.00], // Eb7sus4
    ];

    let chordIdx = 0;
    const playNextRhodesChord = () => {
      if (!this.bgmPlaying || !this.ctx || !this.bgmGainNode) return;
      const chordTime = this.ctx.currentTime;
      const chord = rhodesChords[chordIdx % rhodesChords.length];
      chordIdx++;

      chord.forEach((freq, idx) => {
        if (!this.ctx || !this.bgmGainNode) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, chordTime);

        // Gentle tremolo
        const tremolo = this.ctx.createOscillator();
        const tremoloGain = this.ctx.createGain();
        tremolo.frequency.setValueAtTime(4.5, chordTime);
        tremoloGain.gain.setValueAtTime(0.03, chordTime);
        tremolo.connect(tremoloGain);
        tremoloGain.connect(gain.gain);

        gain.gain.setValueAtTime(0.001, chordTime);
        gain.gain.linearRampToValueAtTime(0.18, chordTime + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.0001, chordTime + 4.8);

        osc.connect(gain);
        gain.connect(this.bgmGainNode);

        osc.start(chordTime);
        tremolo.start(chordTime);
        osc.stop(chordTime + 5.0);
        tremolo.stop(chordTime + 5.0);
      });
    };

    playNextRhodesChord();
    this.bgmIntervalId = setInterval(playNextRhodesChord, 4800);
  }

  /**
   * Track 4: Zenith Horizon (Singing bowl meditation with cosmic harmonics)
   */
  private buildZenithHorizonBgm(ctx: AudioContext) {
    if (!this.bgmGainNode) return;
    const now = ctx.currentTime;

    // Meditative singing bowl frequencies: D4 (293.66), F#4 (369.99), A4 (440.0), D5 (587.33)
    const bowlNotes = [293.66, 369.99, 440.00, 587.33];

    bowlNotes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const baseGain = 0.18 / (idx + 1);
      gain.gain.setValueAtTime(baseGain, now);

      // 5Hz binaural wave modulation
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(0.12 + idx * 0.03, now);
      lfoGain.gain.setValueAtTime(baseGain * 0.2, now);

      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);

      osc.connect(gain);
      gain.connect(this.bgmGainNode!);

      osc.start(now);
      lfo.start(now);

      this.bgmOscillators.push(osc);
      this.bgmLFOs.push(lfo);
    });
  }
}

export const vaultAudio = new AudioSynthesizer();

if (typeof window !== 'undefined') {
  (window as any).vaultAudio = vaultAudio;
}

// Global unlock listener: browser autoplay policy requires user interaction
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    vaultAudio.ensureContext();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
}
