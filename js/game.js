/**
 * DESI ROADSTER - CORE GAME CONTROLLER & ARCADE LOOP
 * Manages game states (START, PLAYING, PAUSED, GAMEOVER), progressive difficulty,
 * distance scoring, Rupee coins, near-miss bonuses, procedural Web Audio SFX,
 * health lives, and persistent high scores.
 */

window.DesiRoadster = window.DesiRoadster || {};

(function() {
  const { Config, InputHandler, ParallaxBackground, Player, ObstacleManager, SoundController } = window.DesiRoadster;

  // Game States
  const STATE = {
    START: 'START',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAMEOVER: 'GAMEOVER'
  };

  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');

      // Virtual Canvas Resolution
      this.canvas.width = Config.CANVAS_WIDTH;
      this.canvas.height = Config.CANVAS_HEIGHT;

      // Core Subsystems
      this.input = new InputHandler();
      this.background = new ParallaxBackground();
      this.player = new Player();
      this.obstacles = new ObstacleManager();
      this.audio = new SoundController();

      // State & Progression
      this.state = STATE.START;
      this.lastTime = 0;
      this.currentSpeed = Config.BASE_SPEED;
      this.screenShake = 0;

      // Scoring & Stats
      this.distance = 0; // In meters (strictly frozen when not in PLAYING state)
      this.coinScore = 0;
      this.coinsCount = 0;
      this.nearMissScore = 0;
      this.nearMissCount = 0;
      this.highScore = parseInt(localStorage.getItem('desi_roadster_highscore') || '0', 10);

      // DOM UI Elements
      this.ui = {
        hud: document.getElementById('hud'),
        scoreDisplay: document.getElementById('score-display'),
        distanceDisplay: document.getElementById('distance-display'),
        speedDisplay: document.getElementById('speed-display'),
        modeBadge: document.getElementById('mode-badge'),
        modeText: document.getElementById('mode-text'),
        livesDisplay: document.getElementById('lives-display'),
        batteryBar: document.getElementById('battery-bar'),
        batteryPct: document.getElementById('battery-pct'),
        muteBtn: document.getElementById('mute-btn'),
        startScreen: document.getElementById('start-screen'),
        startBtn: document.getElementById('start-btn'),
        pauseScreen: document.getElementById('pause-screen'),
        resumeBtn: document.getElementById('resume-btn'),
        gameoverScreen: document.getElementById('gameover-screen'),
        restartBtn: document.getElementById('restart-btn'),
        finalScore: document.getElementById('final-score'),
        finalDistance: document.getElementById('final-distance'),
        finalCoins: document.getElementById('final-coins'),
        finalNearmisses: document.getElementById('final-nearmisses'),
        finalHighscore: document.getElementById('final-highscore')
      };

      this._bindUIEvents();
      this._updateMuteButtonUI();
    }

    _bindUIEvents() {
      // Start Button
      if (this.ui.startBtn) {
        this.ui.startBtn.addEventListener('click', () => this.startGame());
      }
      // Resume Button
      if (this.ui.resumeBtn) {
        this.ui.resumeBtn.addEventListener('click', () => this.togglePause());
      }
      // Restart Button
      if (this.ui.restartBtn) {
        this.ui.restartBtn.addEventListener('click', () => this.restartGame());
      }
      // Audio Mute Toggle Button
      if (this.ui.muteBtn) {
        this.ui.muteBtn.addEventListener('click', () => this.toggleMute());
      }
    }

    toggleMute() {
      const isMuted = this.audio.toggleMute();
      this._updateMuteButtonUI();
      return isMuted;
    }

    _updateMuteButtonUI() {
      if (this.ui.muteBtn) {
        this.ui.muteBtn.textContent = this.audio.isMuted ? '🔇' : '🔊';
      }
    }

    startGame() {
      this.audio.playClick();
      this.state = STATE.PLAYING;
      this.distance = 0;
      this.coinScore = 0;
      this.coinsCount = 0;
      this.nearMissScore = 0;
      this.nearMissCount = 0;
      this.currentSpeed = Config.BASE_SPEED;
      this.screenShake = 0;

      this.player = new Player();
      this.obstacles.reset();

      // UI Overlays
      this.ui.startScreen.classList.add('hidden');
      this.ui.pauseScreen.classList.add('hidden');
      this.ui.gameoverScreen.classList.add('hidden');
      this.ui.hud.classList.remove('hidden');

      this._updateHUD();
    }

    restartGame() {
      this.startGame();
    }

    togglePause() {
      if (this.state === STATE.PLAYING) {
        this.audio.playClick();
        this.state = STATE.PAUSED;
        this.ui.pauseScreen.classList.remove('hidden');
      } else if (this.state === STATE.PAUSED) {
        this.audio.playClick();
        this.state = STATE.PLAYING;
        this.lastTime = performance.now();
        this.ui.pauseScreen.classList.add('hidden');
      }
    }

    triggerGameOver() {
      this.state = STATE.GAMEOVER;
      this.screenShake = 16;
      this.currentSpeed = 0;
      this.player.vx = 0;
      this.audio.playGameOver();

      const totalScore = Math.floor(this.distance) + this.coinScore + this.nearMissScore;
      let isNewRecord = false;
      if (totalScore > this.highScore) {
        this.highScore = totalScore;
        localStorage.setItem('desi_roadster_highscore', this.highScore.toString());
        isNewRecord = true;
      }

      // Populate Game Over Statistics
      this.ui.finalScore.textContent = isNewRecord ? `${totalScore} 🌟 (NEW HIGH SCORE!)` : `${totalScore}`;
      this.ui.finalDistance.textContent = `${Math.floor(this.distance)} m`;
      this.ui.finalCoins.textContent = `${this.coinsCount} collected (+${this.coinScore} pts)`;
      this.ui.finalNearmisses.textContent = `${this.nearMissCount} (+${this.nearMissScore} pts)`;
      this.ui.finalHighscore.textContent = `${this.highScore}`;

      this.ui.gameoverScreen.classList.remove('hidden');
    }

    /**
     * Main engine loop using requestAnimationFrame
     */
    run(timestamp = 0) {
      if (!this.lastTime) this.lastTime = timestamp;

      // Delta Time in seconds, capped at 0.1s to prevent physics blowup on tab lag
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
      this.lastTime = timestamp;

      this.update(dt);
      this.render();

      this.input.update();
      requestAnimationFrame((t) => this.run(t));
    }

    /**
     * Game logic update step
     */
    update(dt) {
      // 1. Audio Mute hotkey (M)
      if (this.input.isJustPressed('mute')) {
        this.toggleMute();
      }

      // 2. Handle Start & Game Over Menu States
      if (this.state === STATE.START) {
        if (this.input.isJustPressed('start') || this.input.isJustPressed('jump')) {
          this.startGame();
          return;
        }
        this.background.update(dt, Config.BASE_SPEED * 0.4);
        return;
      }

      if (this.state === STATE.GAMEOVER) {
        if (this.input.isJustPressed('restart') || this.input.isJustPressed('start')) {
          this.restartGame();
          return;
        }
        // Player cannot move after game over
        this.player.update(dt, { isDown: () => false, isJustPressed: () => false }, 0);
        return;
      }

      // 3. Pause Hotkey (P / Escape)
      if (this.input.isJustPressed('pause')) {
        this.togglePause();
        return;
      }

      if (this.state !== STATE.PLAYING) return;

      // 4. Speed Throttling & Progressive Difficulty
      // Base highway speed gradually increases over distance
      const dynamicBaseSpeed = Config.BASE_SPEED + Math.min(180, Math.floor(this.distance / 120));
      let targetSpeed = dynamicBaseSpeed;

      if (this.input.isDown('right')) {
        targetSpeed = dynamicBaseSpeed + 180; // Nitro boost
      } else if (this.input.isDown('left')) {
        targetSpeed = Math.max(Config.MIN_SPEED, dynamicBaseSpeed - 120); // Braking
      }
      this.currentSpeed += (targetSpeed - this.currentSpeed) * Math.min(dt * 3, 1);

      // 5. Distance Score Increment (Strictly frozen when not PLAYING)
      this.distance += (this.currentSpeed * 0.25) * dt;

      // 6. Audio triggers for Jump
      if (this.input.isJustPressed('jump') && this.player.isGrounded && this.player.mode === 'ROAD') {
        this.audio.playJump();
      }

      // 7. Mode Transformation Toggle (F or Shift)
      if (this.input.isJustPressed('toggleFlight')) {
        const toggleResult = this.player.toggleMode();
        if (toggleResult && toggleResult.success) {
          this.audio.playTransform(toggleResult.targetMode === 'FLIGHT');
        } else if (toggleResult && !toggleResult.success && toggleResult.reason === 'BATTERY_LOW') {
          // Floating warning alert
          this.obstacles.floatingTexts.push({
            text: '⚡ BATTERY LOW! (>15% REQUIRED TO FLY)',
            x: this.player.x + 60,
            y: this.player.y - 25,
            vy: -35,
            color: '#FF0055',
            life: 1.1,
            maxLife: 1.1
          });
        }
      }

      // 8. Update Subsystems
      this.background.update(dt, this.currentSpeed);
      this.player.update(dt, this.input, this.currentSpeed);

      // Screen shake decay
      if (this.screenShake > 0) {
        this.screenShake = Math.max(0, this.screenShake - dt * 20);
      }

      // 9. Update Obstacles, Near-Misses, and Coins
      this.obstacles.update(
        dt,
        this.currentSpeed,
        this.player,
        this.distance,
        // Collision Callback
        (obs) => {
          const hitResult = this.player.triggerHit();
          if (hitResult.hit) {
            this.audio.playCrash();
            this.screenShake = 12;
            this.currentSpeed = Math.max(Config.MIN_SPEED * 0.7, this.currentSpeed - 140);
            this.player.battery = Math.max(0, this.player.battery - 8);

            // Check if player has run out of chassis integrity
            if (hitResult.isDead) {
              this.triggerGameOver();
            }
          }
        },
        // Near-Miss Callback (+100 PTS)
        (obs) => {
          this.nearMissCount++;
          this.nearMissScore += 100;
          this.audio.playNearMiss();
        },
        // Coin Collect Callback (+50 PTS & +4% Battery)
        (coin) => {
          this.coinsCount++;
          this.coinScore += 50;
          this.player.battery = Math.min(Config.BATTERY_MAX, this.player.battery + 4);
          this.audio.playCoin();
        }
      );

      // 10. Sync HUD
      this._updateHUD();
    }

    /**
     * Synchronizes in-game HUD with current player state
     */
    _updateHUD() {
      // 1. Total Arcade Score & Distance
      const totalScore = Math.floor(this.distance) + this.coinScore + this.nearMissScore;
      this.ui.scoreDisplay.textContent = `${totalScore.toString().padStart(5, '0')}`;
      if (this.ui.distanceDisplay) {
        this.ui.distanceDisplay.textContent = `${Math.floor(this.distance).toString().padStart(4, '0')} m`;
      }

      // 2. Speed gauge in km/h
      const kmh = Math.floor((this.currentSpeed / Config.BASE_SPEED) * 110);
      this.ui.speedDisplay.textContent = `${kmh} km/h`;

      // 3. Mode Badge
      if (this.player.state === 'TRANSFORM_TO_FLIGHT') {
        this.ui.modeBadge.className = 'mode-badge transform-mode';
        this.ui.modeBadge.querySelector('.mode-icon').textContent = '⚡';
        this.ui.modeText.textContent = 'TAKING OFF...';
      } else if (this.player.state === 'TRANSFORM_TO_ROAD') {
        this.ui.modeBadge.className = 'mode-badge transform-mode';
        this.ui.modeBadge.querySelector('.mode-icon').textContent = '🚗';
        this.ui.modeText.textContent = 'LANDING...';
      } else if (this.player.mode === 'FLIGHT') {
        this.ui.modeBadge.className = 'mode-badge flight-mode';
        this.ui.modeBadge.querySelector('.mode-icon').textContent = '⚡';
        this.ui.modeText.textContent = 'FLIGHT HOVER';
      } else {
        this.ui.modeBadge.className = 'mode-badge road-mode';
        this.ui.modeBadge.querySelector('.mode-icon').textContent = '🚗';
        this.ui.modeText.textContent = 'ROAD DRIVE';
      }

      // 4. Chassis Integrity (3 Lives Hearts)
      if (this.ui.livesDisplay) {
        const hearts = this.ui.livesDisplay.querySelectorAll('.heart');
        hearts.forEach((heartEl, idx) => {
          if (idx < this.player.health) {
            heartEl.classList.remove('lost');
          } else {
            heartEl.classList.add('lost');
          }
        });
      }

      // 5. EV Battery / Flight Energy Core gauge
      const batteryPct = Math.round(this.player.battery);
      const batteryCard = document.querySelector('.battery-card');

      if (batteryPct <= 20) {
        this.ui.batteryPct.textContent = `${batteryPct}% (LOW!)`;
        this.ui.batteryBar.style.background = 'linear-gradient(90deg, #FF0055, #FF5500)';
        if (batteryCard) batteryCard.classList.add('critical');
      } else {
        const isCharging = this.player.mode === 'ROAD' && batteryPct < 99;
        this.ui.batteryPct.textContent = isCharging ? `${batteryPct}% ⚡` : `${batteryPct}%`;
        if (batteryCard) batteryCard.classList.remove('critical');

        if (this.player.mode === 'FLIGHT') {
          this.ui.batteryBar.style.background = 'linear-gradient(90deg, #00F3FF, #0088FF)';
        } else {
          this.ui.batteryBar.style.background = 'linear-gradient(90deg, #00FF87, #00F3FF)';
        }
      }
      this.ui.batteryBar.style.width = `${batteryPct}%`;
    }

    /**
     * Render step: Canvas drawing pipeline
     */
    render() {
      // Clear canvas
      this.ctx.clearRect(0, 0, Config.CANVAS_WIDTH, Config.CANVAS_HEIGHT);

      this.ctx.save();

      // Screen shake translation
      if (this.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * this.screenShake;
        const shakeY = (Math.random() - 0.5) * this.screenShake;
        this.ctx.translate(shakeX, shakeY);
      }

      // 1. Parallax World (Sky, Skyline, Roadside, Road surface)
      this.background.render(this.ctx);

      // 2. Obstacles, Coins & Effects
      if (this.state !== STATE.START) {
        this.obstacles.render(this.ctx);
      }

      // 3. Player Entity
      if (this.state !== STATE.START) {
        this.player.render(this.ctx);
      }

      this.ctx.restore();

      // 4. Vignette / Arcade CRT overlay effect
      this._renderAtmosphere();
    }

    _renderAtmosphere() {
      const vigGrad = this.ctx.createLinearGradient(0, 0, 0, Config.CANVAS_HEIGHT);
      vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
      vigGrad.addColorStop(0.12, 'rgba(0, 0, 0, 0)');
      vigGrad.addColorStop(0.88, 'rgba(0, 0, 0, 0)');
      vigGrad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');

      this.ctx.fillStyle = vigGrad;
      this.ctx.fillRect(0, 0, Config.CANVAS_WIDTH, Config.CANVAS_HEIGHT);
    }
  }

  window.DesiRoadster.Game = Game;
})();
