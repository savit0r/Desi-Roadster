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
      this.bgmGain = null;
      this.isMuted = localStorage.getItem('desi_roadster_muted') === 'true';

      // Background Music & Ambient Horns State
      this.bgmPlaying = false;
      this.bgmStep = 0;
      this.nextStepTime = 0;
      this.tanpuraOscs = [];
      this.ambientHornTimer = 10.0 + Math.random() * 8.0;

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

      // Dedicated Background Music Gain Node
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);
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

    // --- 8. AUTHENTIC INDIAN HORN TYPES ---
    // A. Tata Truck Multi-Tone Air Horn (Highway King fanfare)
    playTataTruckHorn(volumeScale = 1.0) {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
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
        oscHarmonic.frequency.setValueAtTime(note.freq * 1.5, now + note.start);

        const peak = 0.22 * volumeScale;
        gain.gain.setValueAtTime(peak, now + note.start);
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

    // B. Bajaj Auto-Rickshaw Impatient Twin-Chirp ("Pee-Pee!")
    playAutoRickshawHorn(volumeScale = 1.0) {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const bursts = [0.00, 0.11];

      bursts.forEach(delay => {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const st = now + delay;
        const dur = 0.07;

        osc1.type = 'square';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(784, st); // G5
        osc2.frequency.setValueAtTime(880, st); // A5

        const peak = 0.18 * volumeScale;
        gain.gain.setValueAtTime(peak, st);
        gain.gain.exponentialRampToValueAtTime(0.0001, st + dur);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.masterGain);

        osc1.start(st);
        osc2.start(st);
        osc1.stop(st + dur);
        osc2.stop(st + dur);
      });
    }

    // C. Ambassador Taxi Deep Air-Bulb Horn ("Pawn-Pawn!")
    playAmbassadorTaxiHorn(volumeScale = 1.0) {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const bursts = [0.00, 0.15];

      bursts.forEach((delay, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const st = now + delay;
        const dur = idx === 0 ? 0.11 : 0.14;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(311.13, st); // Eb4
        osc.frequency.exponentialRampToValueAtTime(290, st + dur);

        const peak = 0.22 * volumeScale;
        gain.gain.setValueAtTime(peak, st);
        gain.gain.exponentialRampToValueAtTime(0.0001, st + dur);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(st);
        osc.stop(st + dur);
      });
    }

    // D. Vintage Scooter Squeeze Horn ("Peeeee-ep!")
    playScooterHorn(volumeScale = 1.0) {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const vibrato = this.ctx.createOscillator();
      const vibratoGain = this.ctx.createGain();
      const gain = this.ctx.createGain();
      const dur = 0.24;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(466.16, now); // Bb4

      vibrato.frequency.setValueAtTime(22, now); // 22Hz flutter
      vibratoGain.gain.setValueAtTime(14, now);
      vibrato.connect(osc.frequency);

      const peak = 0.17 * volumeScale;
      gain.gain.setValueAtTime(peak, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(gain);
      gain.connect(this.masterGain);

      vibrato.start(now);
      osc.start(now);
      vibrato.stop(now + dur);
      osc.stop(now + dur);
    }

    // E. Intercity Bus Musical Air Chime ("Pa-Pi-Poo-Paa!")
    playBusPressureHorn(volumeScale = 1.0) {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const notes = [
        { freq: 392.00, start: 0.00, dur: 0.07 }, // G4
        { freq: 493.88, start: 0.07, dur: 0.07 }, // B4
        { freq: 587.33, start: 0.14, dur: 0.09 }, // D5
        { freq: 659.25, start: 0.23, dur: 0.18 }  // E5
      ];

      notes.forEach(note => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.freq, now + note.start);

        const peak = 0.20 * volumeScale;
        gain.gain.setValueAtTime(peak, now + note.start);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.dur);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now + note.start);
        osc.stop(now + note.start + note.dur);
      });
    }

    // Play a random Indian horn (either full volume or ambient distant highway horn)
    playRandomIndianHorn(isAmbient = false) {
      const types = ['truck', 'auto', 'taxi', 'scooter', 'bus'];
      const pick = types[Math.floor(Math.random() * types.length)];
      const volume = isAmbient ? 0.38 : 1.0;

      switch (pick) {
        case 'truck':
          this.playTataTruckHorn(volume);
          break;
        case 'auto':
          this.playAutoRickshawHorn(volume);
          break;
        case 'taxi':
          this.playAmbassadorTaxiHorn(volume);
          break;
        case 'scooter':
          this.playScooterHorn(volume);
          break;
        case 'bus':
          this.playBusPressureHorn(volume);
          break;
      }
    }

    playHorn() {
      // Player horn: blasts random authentic Indian horns with emphasis on truck & pressure horns
      if (Math.random() > 0.4) {
        this.playTataTruckHorn(1.15);
      } else {
        this.playRandomIndianHorn(false);
      }
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

    // ==========================================================================
    // 13. SOOTHING PROCEDURAL INDIAN SUNSET BGM & AMBIENT HIGHWAY HORNS
    // ==========================================================================
    startBGM() {
      if (this.isMuted) return;
      this.init();
      if (!this.ctx) return;

      this.bgmPlaying = true;
      this.bgmStep = 0;
      this.nextStepTime = this.ctx.currentTime + 0.1;
      this.ambientHornTimer = 10.0 + Math.random() * 8.0;

      this._startTanpura();

      if (this.bgmGain) {
        this.bgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.bgmGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
        this.bgmGain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 1.2);
      }
    }

    pauseBGM() {
      if (!this.ctx || !this.bgmGain) return;
      this.bgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.bgmGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.25);
    }

    resumeBGM() {
      if (this.isMuted || !this.ctx || !this.bgmGain) return;
      if (!this.bgmPlaying) {
        this.startBGM();
        return;
      }
      this.bgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.bgmGain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.3);
    }

    stopBGM() {
      this.bgmPlaying = false;
      this._stopTanpura();
      if (this.ctx && this.bgmGain) {
        this.bgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.bgmGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.4);
      }
    }

    _startTanpura() {
      this._stopTanpura();
      if (!this.ctx || !this.bgmGain) return;

      const now = this.ctx.currentTime;
      // Warm C3 (130.81Hz) and G3 (196.00Hz) root drone with lowpass acoustic filter
      const freqs = [130.81, 196.00, 261.63];
      freqs.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(360, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.032, now + 2.0);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(now);
        this.tanpuraOscs.push({ osc, gain });
      });
    }

    _stopTanpura() {
      if (this.tanpuraOscs && this.tanpuraOscs.length > 0) {
        const now = this.ctx ? this.ctx.currentTime : 0;
        this.tanpuraOscs.forEach(({ osc, gain }) => {
          try {
            gain.gain.linearRampToValueAtTime(0.0001, now + 0.3);
            osc.stop(now + 0.35);
          } catch(e) {}
        });
        this.tanpuraOscs = [];
      }
    }

    _playBGMStep(time, step) {
      if (!this.ctx || !this.bgmGain) return;

      // 1. Serene Raag Bhupali Pentatonic Melody (Bansuri / Indian Bamboo Flute)
      // Notes: C4 (261.63), D4 (293.66), E4 (329.63), G4 (392.00), A4 (440.00), C5 (523.25), D5 (587.33)
      const melody = [
        // Measure 1: Calm Ascent
        261.63, 293.66, 329.63, null,   392.00, null,   440.00, 392.00,
        // Measure 2: Golden Sunset Breeze
        329.63, 392.00, 440.00, null,   523.25, 440.00, 392.00, null,
        // Measure 3: Floating High Over Roads
        523.25, 587.33, 523.25, 440.00, 392.00, 440.00, 392.00, 329.63,
        // Measure 4: Evening Roadtrip Resolution
        329.63, 293.66, 261.63, 293.66, 329.63, 293.66, 261.63, null
      ];

      const freq = melody[step % melody.length];
      if (freq) {
        const osc = this.ctx.createOscillator();
        const harm = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        harm.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);
        harm.frequency.setValueAtTime(freq * 2, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, time);

        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(0.12, time + 0.06); // Breath attack
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.48); // Gentle acoustic release

        osc.connect(filter);
        harm.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(time);
        harm.start(time);
        osc.stop(time + 0.5);
        harm.stop(time + 0.5);
      }

      // 2. Soft Ambient Tabla Rhythm
      // Bayan (Deep Dagga bass glide) on beats 0, 8, 16, 24
      if (step % 8 === 0) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(75, time);
        osc.frequency.exponentialRampToValueAtTime(46, time + 0.18);

        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);

        osc.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(time);
        osc.stop(time + 0.22);
      }

      // Dayan (Soft resonant wood/metal tap) on syncopated off-beats
      if (step % 4 === 2) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, time);

        gain.gain.setValueAtTime(0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);

        osc.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(time);
        osc.stop(time + 0.06);
      }
    }

    update(dt, isPlaying) {
      if (!this.ctx || this.isMuted) return;

      // 1. Ambient Indian Horns In-Between
      if (isPlaying) {
        this.ambientHornTimer -= dt;
        if (this.ambientHornTimer <= 0) {
          this.playRandomIndianHorn(true); // Soft ambient highway horn
          this.ambientHornTimer = 14.0 + Math.random() * 12.0; // Next in 14-26 seconds
        }
      }

      // 2. Background Music Progression
      if (this.bgmPlaying && isPlaying) {
        const lookahead = 0.15;
        while (this.nextStepTime < this.ctx.currentTime + lookahead) {
          this._playBGMStep(this.nextStepTime, this.bgmStep);
          this.nextStepTime += 0.38; // ~95 BPM eighth note
          this.bgmStep = (this.bgmStep + 1) % 32;
        }
      }
    }
  }

  window.DesiRoadster.SoundController = SoundController;
})();
