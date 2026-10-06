/**
 * Web Audio API synthesizer for clean, professional trading alerts.
 * Avoids any external audio file dependencies.
 */
class SoundService {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.6;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Sound for LONG Breakout & Retest Confirmation (Upward clean chime)
   */
  public playLongAlert() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(this.volume * 0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    gainNode.connect(ctx.destination);

    // Note 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    osc1.connect(gainNode);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // Note 2: G#5 (830.61 Hz)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(830.61, now + 0.15);
    osc2.connect(gainNode);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.35);

    // Note 3: B5 (987.77 Hz)
    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(987.77, now + 0.3);
    osc3.connect(gainNode);
    osc3.start(now + 0.3);
    osc3.stop(now + 0.6);
  }

  /**
   * Sound for SHORT Breakdown & Retest Rejection (Downward crisp chime)
   */
  public playShortAlert() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(this.volume * 0.25, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    gainNode.connect(ctx.destination);

    // Note 1: A5 (880.00 Hz)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880.0, now);
    osc1.connect(gainNode);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Note 2: F5 (698.46 Hz)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(698.46, now + 0.15);
    osc2.connect(gainNode);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.35);

    // Note 3: D5 (587.33 Hz)
    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(587.33, now + 0.3);
    osc3.connect(gainNode);
    osc3.start(now + 0.3);
    osc3.stop(now + 0.6);
  }

  /**
   * Test alert sound
   */
  public playTestSound() {
    this.playLongAlert();
  }

  /**
   * Request browser notifications if supported
   */
  public async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    if (Notification.permission === 'granted') {
      return true;
    }
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  public showBrowserNotification(title: string, options?: NotificationOptions) {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          icon: '/favicon.ico',
          ...options,
        });
      } catch {
        // Fallback gracefully if blocked in iframe
      }
    }
  }
}

export const soundService = new SoundService();
