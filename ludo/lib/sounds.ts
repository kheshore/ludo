// ============================================================
// Sound Effects Manager
// Generates procedural audio for dice rolls, piece moves, captures
// ============================================================

class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled = true;
  private volume = 0.6;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  // Dice rolling sound - multiple rapid clicks
  async playDiceRoll() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const now = ctx.currentTime;

    for (let i = 0; i < 8; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = 800 + Math.random() * 1200;
      osc.type = 'square';

      const t = now + i * 0.06;
      gain.gain.setValueAtTime(this.volume * 0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.start(t);
      osc.stop(t + 0.05);
    }
  }

  // Dice land sound - solid thump
  async playDiceLand() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Low thump
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
    osc.type = 'sine';

    gain.gain.setValueAtTime(this.volume * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.start(now);
    osc.stop(now + 0.2);

    // High click
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc2.frequency.value = 2000;
    osc2.type = 'triangle';

    gain2.gain.setValueAtTime(this.volume * 0.2, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc2.start(now);
    osc2.stop(now + 0.06);
  }

  // Piece move sound - soft tap
  async playPieceMove() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = 600 + Math.random() * 200;
    osc.type = 'sine';

    gain.gain.setValueAtTime(this.volume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // Piece enter board - whoosh up
  async playPieceEnter() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2);
    osc.type = 'sine';

    gain.gain.setValueAtTime(this.volume * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Capture sound - dramatic hit
  async playCapture() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const now = ctx.currentTime;

    // Impact
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.frequency.setValueAtTime(400, now);
    osc1.frequency.exponentialRampToValueAtTime(60, now + 0.3);
    osc1.type = 'sawtooth';

    gain1.gain.setValueAtTime(this.volume * 0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc1.start(now);
    osc1.stop(now + 0.35);

    // Sparkle
    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = 1500 + i * 400;
      osc.type = 'sine';

      const t = now + 0.05 + i * 0.06;
      gain.gain.setValueAtTime(this.volume * 0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.start(t);
      osc.stop(t + 0.1);
    }
  }

  // Victory fanfare
  async playVictory() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = freq;
      osc.type = 'sine';

      const t = now + i * 0.15;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(this.volume * 0.3, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      osc.start(t);
      osc.stop(t + 0.5);
    });
  }

  // Six rolled - exciting chime
  async playSixRolled() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const notes = [880, 1108.73]; // A5, C#6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = freq;
      osc.type = 'triangle';

      const t = now + i * 0.1;
      gain.gain.setValueAtTime(this.volume * 0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  // Button click
  async playClick() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = 1000;
    osc.type = 'sine';

    gain.gain.setValueAtTime(this.volume * 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Notification ping
  async playNotification() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const notes = [880, 1318.51]; // A5, E6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = freq;
      osc.type = 'sine';

      const t = now + i * 0.12;
      gain.gain.setValueAtTime(this.volume * 0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.start(t);
      osc.stop(t + 0.2);
    });
  }

  // Piece finish - ascending sparkle
  async playPieceFinish() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = freq;
      osc.type = 'sine';

      const t = now + i * 0.08;
      gain.gain.setValueAtTime(this.volume * 0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

      osc.start(t);
      osc.stop(t + 0.25);
    });
  }
}

// Singleton
export const soundManager = new SoundManager();
