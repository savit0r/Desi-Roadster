/**
 * DESI ROADSTER - PROCEDURAL AUDIO SYNTHESIZER
 * Zero external audio files: synthesizes arcade sound effects (Coins, Jumps,
 * Mode Transforms, Near-Miss whoosh, Crash explosions) using the Web Audio API.
 * Includes master volume, persistent mute toggle, and autoplay unlock.
 */

window.DesiRoadster = window.DesiRoadster || {};

(function() {
  class SoundController {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.isMuted = localStorage.getItem('desi_roadster_muted') === 'true';

      // Lazy unlock on first interaction
      const unlockAudio = () => {
        this.init();
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };
      window.addEventListener('pointerdown', unlockAudio);
      window.addEventListener('keydown', unlockAudio);
    }

    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.28, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }

    toggleMute() {
      this.init();
      this.isMuted = !this.isMuted;
      localStorage.setItem('desi_roadster_muted', this.isMuted.toString());

      if (this.masterGain && this.ctx) {
        const targetGain = this.isMuted ? 0 : 0.28;
        this.masterGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);
      }
      return this.isMuted;
    }

    // --- 1. COLLECTIBLE COIN SFX (Dual ascending bright square chime) ---
    playCoin() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.setValueAtTime(1318.51, now + 0.07); // E6
      osc.frequency.setValueAtTime(1975.53, now + 0.14); // B6

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.28);
    }

    // --- 2. JUMP SFX (Smooth ascending sine glide) ---
    playJump() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.18);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.22);
    }

    // --- 3. FLIGHT TRANSFORM SFX (Futuristic cyber energy swell) ---
    playTransform(isTakeoff) {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      if (isTakeoff) {
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(720, now + 0.35);
      } else {
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.35);
      }

      // Filter high-pitch harshness
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.38);
    }

    // --- 4. NEAR-MISS SFX (Whoosh pitch drop) ---
    playNearMiss() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.2);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.2);
    }

    // --- 5. CRASH / IMPACT SFX (Noise burst with heavy low-pass filter) ---
    playCrash() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.45;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(700, now);
      filter.frequency.exponentialRampToValueAtTime(80, now + 0.45);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(now);
      noise.stop(now + 0.45);
    }

    // --- 6. GAME OVER SFX (Sad arcade descent) ---
    playGameOver() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notes = [392.00, 349.23, 311.13, 261.63]; // G4, F4, Eb4, C4

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = now + idx * 0.18;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(start);
        osc.stop(start + 0.28);
      });
    }

    // --- 7. BUTTON CLICK SFX ---
    playClick() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(880, now + 0.04);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.08);
    }

    // --- 8. HORN OF AUTHORITY (Iconic Indian multi-tone musical pressure horn) ---
    playHorn() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // Classic Indian melody tones: D4, F#4, A4, D5 fanfare burst
      const melody = [
        { freq: 293.66, start: 0.00, dur: 0.08 },
        { freq: 369.99, start: 0.08, dur: 0.08 },
        { freq: 440.00, start: 0.16, dur: 0.09 },
        { freq: 587.33, start: 0.25, dur: 0.20 }
      ];

      melody.forEach(note => {
        const osc = this.ctx.createOscillator();
        const oscHarmonic = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        oscHarmonic.type = 'square';
        osc.frequency.setValueAtTime(note.freq, now + note.start);
        oscHarmonic.frequency.setValueAtTime(note.freq * 1.5, now + note.start); // Perfect fifth brass buzz

        gain.gain.setValueAtTime(0.24, now + note.start);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.dur);

        osc.connect(gain);
        oscHarmonic.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now + note.start);
        oscHarmonic.start(now + note.start);
        osc.stop(now + note.start + note.dur);
        oscHarmonic.stop(now + note.start + note.dur);
      });
    }

    // --- 9. POTHOLE SUSPENSION THUD SFX ---
    playPotholeThud() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.22); // Deep bottom-out thud

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.25);
    }

    // --- 10. ELECTRIC WIRE ZAP SFX ---
    playZap() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.setValueAtTime(880, now + 0.04);
      osc.frequency.setValueAtTime(220, now + 0.12);
      osc.frequency.setValueAtTime(1400, now + 0.18);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.24);
    }

    // --- 11. ENGINE SPUTTER SFX (Kite String Drag) ---
    playSputter() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      for (let i = 0; i < 4; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const st = now + i * 0.05;

        osc.type = 'square';
        osc.frequency.setValueAtTime(90 + Math.random() * 40, st);

        gain.gain.setValueAtTime(0.2, st);
        gain.gain.exponentialRampToValueAtTime(0.0001, st + 0.04);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(st);
        osc.stop(st + 0.04);
      }
    }

    // --- 12. WEDDING BARAAT FESTIVE DHOL SFX ---
    playBaraat() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // Dhol beat pattern: Dha... Dha-Tin... Ge-Ge-Na
      [0.0, 0.12, 0.24].forEach((delay, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const st = now + delay;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(idx === 1 ? 260 : 110, st);
        osc.frequency.exponentialRampToValueAtTime(50, st + 0.1);

        gain.gain.setValueAtTime(0.25, st);
        gain.gain.exponentialRampToValueAtTime(0.0001, st + 0.11);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(st);
        osc.stop(st + 0.11);
      });
    }
  }

  window.DesiRoadster.SoundController = SoundController;
})();
