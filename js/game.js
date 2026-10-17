/**
 * DESI ROADSTER - CORE GAME CONTROLLER & ARCADE LOOP
 * Manages game states (START, PLAYING, PAUSED, GAMEOVER), progressive difficulty,
 * distance scoring, Rupee coins, near-miss bonuses, procedural Web Audio SFX,
 * health lives, and persistent high scores.
 */

window.DesiRoadster = window.DesiRoadster || {};

(function() {
  const { Config, InputHandler, ParallaxBackground, Player, ObstacleManager, SoundController, UpgradeManager, EventDirector, RecapManager } = window.DesiRoadster;

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

      // Expansion Subsystems
      this.upgrades = new UpgradeManager();
      this.recap = new RecapManager();
      this.events = new EventDirector(this.obstacles);
      this.isDailyChallengeMode = false;
      this.hornCooldownTimer = 0;

      // Global reference for audio & upgrade lookups
      window.DesiRoadsterGameInstance = this;

      // State & Progression
      this.state = STATE.START;
      this.lastTime = 0;
      this.currentSpeed = Config.BASE_SPEED;
      this.screenShake = 0;

      // Scoring & Stats
      this.distance = 0;
      this.coinScore = 0;
      this.coinsCount = 0;
      this.nearMissScore = 0;
      this.nearMissCount = 0;
      this.scorePopTimer = 0;
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
        pauseToggleBtn: document.getElementById('pause-toggle-btn'),
        startScreen: document.getElementById('start-screen'),
        startBtn: document.getElementById('start-btn'),
        dailyChallengeBtn: document.getElementById('daily-challenge-btn'),
        dailyChallengeLabel: document.getElementById('daily-challenge-label'),
        openShopBtn: document.getElementById('open-shop-btn'),
        gameoverShopBtn: document.getElementById('gameover-shop-btn'),
        closeShopBtn: document.getElementById('close-shop-btn'),
        shopModal: document.getElementById('shop-modal'),
        shopBankDisplay: document.getElementById('shop-bank-display'),
        upgradesGrid: document.getElementById('upgrades-grid'),
        pauseScreen: document.getElementById('pause-screen'),
        resumeBtn: document.getElementById('resume-btn'),
        gameoverScreen: document.getElementById('gameover-screen'),
        finalHeadline: document.getElementById('final-headline'),
        downloadCardBtn: document.getElementById('download-card-btn'),
        shareTextBtn: document.getElementById('share-text-btn'),
        restartBtn: document.getElementById('restart-btn'),
        touchControls: document.getElementById('touch-controls'),
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
      // Daily Challenge Toggle
      if (this.ui.dailyChallengeBtn) {
        this.ui.dailyChallengeBtn.addEventListener('click', () => this.toggleDailyChallenge());
      }
      // Garage Shop Open/Close
      if (this.ui.openShopBtn) {
        this.ui.openShopBtn.addEventListener('click', () => this.openShop());
      }
      if (this.ui.gameoverShopBtn) {
        this.ui.gameoverShopBtn.addEventListener('click', () => this.openShop());
      }
      if (this.ui.closeShopBtn) {
        this.ui.closeShopBtn.addEventListener('click', () => this.closeShop());
      }
      // Result Card Download
      if (this.ui.downloadCardBtn) {
        this.ui.downloadCardBtn.addEventListener('click', () => this.downloadResultCard());
      }
      // Copy Share Challenge Text
      if (this.ui.shareTextBtn) {
        this.ui.shareTextBtn.addEventListener('click', () => this.copyShareText());
      }
      // Resume Button
      if (this.ui.resumeBtn) {
        this.ui.resumeBtn.addEventListener('click', () => this.togglePause());
      }
      // Quick Pause Toggle Button in HUD
      if (this.ui.pauseToggleBtn) {
        this.ui.pauseToggleBtn.addEventListener('click', () => this.togglePause());
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

    toggleDailyChallenge() {
      this.isDailyChallengeMode = !this.isDailyChallengeMode;
      if (this.ui.dailyChallengeBtn) {
        this.ui.dailyChallengeBtn.classList.toggle('active', this.isDailyChallengeMode);
      }
      if (this.ui.dailyChallengeLabel) {
        const seedInfo = RecapManager.getDailySeed();
        this.ui.dailyChallengeLabel.textContent = this.isDailyChallengeMode ? `📅 DAILY CHALLENGE: ${seedInfo.dateString}` : 'HIGHWAY RUN: NORMAL';
      }
      this.audio.playClick();
    }

    openShop() {
      this.audio.playClick();
      if (this.state === STATE.PLAYING) {
        this.togglePause();
      }
      if (this.ui.shopModal) {
        this.ui.shopModal.classList.remove('hidden');
        this.renderShopGrid();
      }
    }

    closeShop() {
      this.audio.playClick();
      if (this.ui.shopModal) {
        this.ui.shopModal.classList.add('hidden');
      }
    }

    renderShopGrid() {
      if (!this.ui.upgradesGrid) return;
      if (this.ui.shopBankDisplay) {
        this.ui.shopBankDisplay.textContent = `${this.upgrades.getBank()} ₹`;
      }

      this.ui.upgradesGrid.innerHTML = '';
      const bank = this.upgrades.getBank();

      Object.keys(Config.UPGRADES).forEach(key => {
        const up = Config.UPGRADES[key];
        const isOwned = this.upgrades.hasUpgrade(up.id);
        const canAfford = bank >= up.cost;

        const card = document.createElement('div');
        card.className = `upgrade-card ${isOwned ? 'owned' : ''}`;

        card.innerHTML = `
          <div>
            <div class="upgrade-header">
              <span class="upgrade-title">${up.name}</span>
              <span class="upgrade-cost">${isOwned ? 'OWNED' : `${up.cost} ₹`}</span>
            </div>
            <p class="upgrade-desc">${up.desc}</p>
            <p class="tradeoff-tag">⚠️ Trade-off: ${up.tradeoff}</p>
          </div>
          <button class="upgrade-buy-btn" data-upgrade-id="${up.id}" ${isOwned || !canAfford ? 'disabled' : ''}>
            ${isOwned ? 'INSTALLED ✓' : (canAfford ? `BUY RETROFIT (${up.cost} ₹)` : `NEED ${up.cost - bank} MORE ₹`)}
          </button>
        `;

        const buyBtn = card.querySelector('.upgrade-buy-btn');
        if (buyBtn && !isOwned && canAfford) {
          buyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.buyUpgrade(up.id);
          });
        }

        this.ui.upgradesGrid.appendChild(card);
      });
    }

    buyUpgrade(id) {
      const res = this.upgrades.buyUpgrade(id);
      if (res.success) {
        this.audio.playCoin();
        this.renderShopGrid();
        if (this.player && this.player.applyUpgrades) {
          this.player.applyUpgrades(this.upgrades);
        }
      }
    }

    triggerHorn() {
      if (this.hornCooldownTimer > 0) return;
      const cooldown = this.upgrades.hasHorn() ? 0.65 : 1.25;
      this.hornCooldownTimer = cooldown;
      this.audio.playHorn();

      this.obstacles.scareTrafficWithHorn(this.player);
      this.events.onHornHonked(this.player);
    }

    downloadResultCard() {
      this.audio.playClick();
      this.recap.downloadResultCard();
    }

    copyShareText() {
      this.audio.playClick();
      this.recap.copyShareText();
      if (this.ui.shareTextBtn) {
        const prev = this.ui.shareTextBtn.innerHTML;
        this.ui.shareTextBtn.innerHTML = '<span>✅</span> COPIED TO CLIPBOARD!';
        setTimeout(() => {
          if (this.ui.shareTextBtn) this.ui.shareTextBtn.innerHTML = prev;
        }, 2200);
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
      this.scorePopTimer = 0;
      this.hornCooldownTimer = 0;

      if (this.ui.scoreDisplay) {
        this.ui.scoreDisplay.style.color = '';
        this.ui.scoreDisplay.style.textShadow = '';
        this.ui.scoreDisplay.style.transform = '';
      }
      this.currentSpeed = Config.BASE_SPEED;
      this.screenShake = 0;

      // Reset and initialize subsystems
      this.upgrades.initRun();
      this.recap.resetRunStats();
      this.recap.isDailyChallenge = this.isDailyChallengeMode;

      this.player = new Player();
      this.player.applyUpgrades(this.upgrades);
      this.obstacles.reset();
      this.events.reset();
      this.background.reset();

      // UI Overlays
      this.ui.startScreen.classList.add('hidden');
      this.ui.pauseScreen.classList.add('hidden');
      this.ui.gameoverScreen.classList.add('hidden');
      if (this.ui.shopModal) this.ui.shopModal.classList.add('hidden');
      this.ui.hud.classList.remove('hidden');
      if (this.ui.touchControls) {
        this.ui.touchControls.classList.remove('hidden');
      }

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
        if (this.ui.touchControls) {
          this.ui.touchControls.classList.add('hidden');
        }
      } else if (this.state === STATE.PAUSED) {
        this.audio.playClick();
        this.state = STATE.PLAYING;
        this.lastTime = performance.now();
        this.ui.pauseScreen.classList.add('hidden');
        if (this.ui.touchControls) {
          this.ui.touchControls.classList.remove('hidden');
        }
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

      // Bank earned coins permanently into player's wallet
      this.upgrades.addCoins(this.coinsCount);

      // Satirical headline
      if (this.ui.finalHeadline) {
        this.ui.finalHeadline.textContent = `"${this.recap.generateHeadline()}"`;
      }

      // Populate Game Over Statistics
      this.ui.finalScore.textContent = isNewRecord ? `${totalScore} 🌟 (NEW HIGH SCORE!)` : `${totalScore}`;
      this.ui.finalDistance.textContent = `${Math.floor(this.distance)} m`;
      this.ui.finalCoins.textContent = `${this.coinsCount} ₹ (Banked!)`;
      this.ui.finalNearmisses.textContent = `${this.nearMissCount} (+${this.nearMissScore} pts)`;
      this.ui.finalHighscore.textContent = `${this.highScore}`;

      this.ui.gameoverScreen.classList.remove('hidden');
      if (this.ui.touchControls) {
        this.ui.touchControls.classList.add('hidden');
      }
    }

    run(timestamp = 0) {
      if (!this.lastTime) this.lastTime = timestamp;

      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
      this.lastTime = timestamp;

      this.update(dt);
      this.render();

      this.input.update();
      requestAnimationFrame((t) => this.run(t));
    }

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
        this.player.update(dt, { isDown: () => false, isJustPressed: () => false }, 0);
        return;
      }

      // 3. Pause Hotkey (P / Escape)
      if (this.input.isJustPressed('pause')) {
        this.togglePause();
        return;
      }

      if (this.state !== STATE.PLAYING) return;

      // 4. Pressure Horn
      if (this.hornCooldownTimer > 0) {
        this.hornCooldownTimer -= dt;
      }
      if (this.input.isJustPressed('horn')) {
        this.triggerHorn();
      }

      // 5. Speed Throttling & Progressive Difficulty
      const dynamicBaseSpeed = Config.BASE_SPEED + Math.min(180, Math.floor(this.distance / 120));
      let targetSpeed = dynamicBaseSpeed;

      if (this.input.isDown('right')) {
        targetSpeed = dynamicBaseSpeed + 180;
      } else if (this.input.isDown('left')) {
        targetSpeed = Math.max(Config.MIN_SPEED, dynamicBaseSpeed - 120);
      }
      this.currentSpeed += (targetSpeed - this.currentSpeed) * Math.min(dt * 3, 1);

      // 6. Distance Score Increment
      this.distance += (this.currentSpeed * 0.25) * dt;

      // 7. Audio triggers for Jump
      if (this.input.isJustPressed('jump') && this.player.isGrounded && this.player.mode === 'ROAD') {
        this.audio.playJump();
      }

      // 8. Mode Transformation Toggle (F or Shift)
      if (this.input.isJustPressed('toggleFlight')) {
        const toggleResult = this.player.toggleMode();
        if (toggleResult && toggleResult.success) {
          this.audio.playTransform(toggleResult.targetMode === 'FLIGHT');
        } else if (toggleResult && !toggleResult.success && toggleResult.reason === 'BATTERY_LOW') {
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

      // 9. Update Subsystems
      this.background.update(dt, this.currentSpeed, this.player);
      this.player.update(dt, this.input, this.currentSpeed);

      // Screen shake decay
      if (this.screenShake > 0) {
        this.screenShake = Math.max(0, this.screenShake - dt * 20);
      }

      // Score POP highlight decay
      if (this.scorePopTimer > 0) {
        this.scorePopTimer = Math.max(0, this.scorePopTimer - dt);
        if (this.scorePopTimer === 0 && this.ui.scoreDisplay) {
          this.ui.scoreDisplay.style.color = '';
          this.ui.scoreDisplay.style.textShadow = '';
          this.ui.scoreDisplay.style.transform = '';
        }
      }

      // 10. Update Random Indian Road Events (Wedding Baraat, Sabzi Cart, Cricket Ball)
      this.events.update(
        dt,
        this.currentSpeed,
        this.player,
        this.distance,
        (eventObs) => {
          this.recap.recordHazardHit(eventObs.type);
          const hitResult = this.player.triggerHit();
          if (hitResult.hit) {
            this.audio.playCrash();
            this.screenShake = 12;
            this.currentSpeed = Math.max(Config.MIN_SPEED * 0.7, this.currentSpeed - 130);
            this.player.battery = Math.max(0, this.player.battery - 8);

            if (hitResult.isDead) {
              this.triggerGameOver();
            }
          }
        },
        (eventObs) => {
          this.nearMissCount++;
          this.nearMissScore += 100;
          this.audio.playNearMiss();
          this.scorePopTimer = 0.35;
        },
        this.audio
      );

      // 11. Update Obstacles, Near-Misses, and Coins
      this.obstacles.update(
        dt,
        this.currentSpeed,
        this.player,
        this.distance,
        // Collision Callback
        (obs) => {
          this.recap.recordHazardHit(obs.type);
          const hitResult = this.player.triggerHit();
          if (hitResult.hit) {
            this.audio.playCrash();
            this.screenShake = 12;
            this.currentSpeed = Math.max(Config.MIN_SPEED * 0.7, this.currentSpeed - 140);
            this.player.battery = Math.max(0, this.player.battery - 8);

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
          this.scorePopTimer = 0.35;
          if (this.ui.scoreDisplay) {
            this.ui.scoreDisplay.style.color = '#FFFFFF';
            this.ui.scoreDisplay.style.textShadow = '0 0 14px #00F3FF, 0 0 24px #FFFFFF';
            this.ui.scoreDisplay.style.transform = 'scale(1.18)';
            this.ui.scoreDisplay.style.transition = 'transform 0.1s ease, color 0.1s ease';
          }
        },
        // Coin Collect Callback (+50 PTS & +4% Battery)
        (coin) => {
          this.coinsCount++;
          this.coinScore += 50;
          this.player.battery = Math.min(this.player.maxBattery || Config.BATTERY_MAX, this.player.battery + 4);
          this.audio.playCoin();
        }
      );

      // 12. Update Run Recap Statistics
      const totalScore = Math.floor(this.distance) + this.coinScore + this.nearMissScore;
      this.recap.updateStats(dt, this.currentSpeed, this.player, this.distance, totalScore, this.coinsCount, this.nearMissCount);

      // 13. Sync HUD
      this._updateHUD();
    }

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
      const maxB = this.player.maxBattery || Config.BATTERY_MAX;
      const batteryPct = Math.round((this.player.battery / maxB) * 100);
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

    render() {
      this.ctx.clearRect(0, 0, Config.CANVAS_WIDTH, Config.CANVAS_HEIGHT);

      this.ctx.save();

      if (this.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * this.screenShake;
        const shakeY = (Math.random() - 0.5) * this.screenShake;
        this.ctx.translate(shakeX, shakeY);
      }

      // 1. Parallax World
      this.background.render(this.ctx);

      // 2. Obstacles, Potholes & Coins
      if (this.state !== STATE.START) {
        this.obstacles.render(this.ctx);
      }

      // 3. Random Road Events (Wedding Baraat, Sabzi Cart, Cricket Ball)
      if (this.state !== STATE.START) {
        this.events.render(this.ctx);
      }

      // 4. Player Entity
      if (this.state !== STATE.START) {
        this.player.render(this.ctx);
      }

      this.ctx.restore();

      // 5. Atmospheric Vignette
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
