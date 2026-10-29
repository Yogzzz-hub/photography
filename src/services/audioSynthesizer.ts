/**
 * MyOrb Family Vault - Procedural Web Audio Synthesizer
 * Zero external audio files. Generates soft harmonic celestial tones using Web Audio API.
 */

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted = false;
  private droneOsc: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.isMuted && this.droneGain) {
      this.droneGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    }
  }

  public getIsMuted() {
    return this.isMuted;
  }

  /**
   * Soft harmonic bell/chime played when hovering or interacting with memories
   */
  public playHoverChime(freq = 587.33) {
    // D5 frequency default
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      // Slight pitch variation for organic feel
      osc.frequency.setValueAtTime(freq * (0.98 + Math.random() * 0.04), now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.65);
    } catch (_) {
      // Audio autoplay policy fallback
    }
  }

  /**
   * Celestial whoosh sound on card swap, drag release, or explosion
   */
  public playWhoosh() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(550, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.4);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (_) {}
  }

  /**
   * Harmonic snap sound when a dragged photo drops into place
   */
  public playSnap() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.18);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (_) {}
  }
}

export const vaultAudio = new AudioSynthesizer();
