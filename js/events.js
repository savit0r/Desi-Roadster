/**
 * DESI ROADSTER - RANDOM INDIAN ROAD EVENTS & EVENT DIRECTOR
 * Spawns memorable, satirical Indian highway moments:
 * 1. Wedding Procession (Baraat with brass band, dancing silhouettes, and fairy lights)
 * 2. Street-Vendor Cart (Sabzi/Fruit Thela)
 * 3. Gulley Cricket Ball (Bouncing tennis ball)
 * 4. VIP Convoy (Escort vehicle with flashing red/blue beacons)
 */

window.DesiRoadster = window.DesiRoadster || {};

(function() {
  const { Config, Obstacle } = window.DesiRoadster;

  // ==========================================================================
  // 1. WEDDING BARAAT (Festive Procession with Tents, Music & Lights)
  // ==========================================================================
  class WeddingBaraatObstacle extends Obstacle {
    constructor(laneIndex, x) {
      super(laneIndex, x);
      this.type = 'wedding_baraat';
      this.width = 240;
      this.height = 54;
      this.speedMultiplier = 0.22; // Slow festive march
      this.hitboxInset = { top: 6, bottom: 4, left: 10, right: 10 };
      this.fairyLightTimer = 0;
    }

    update(dt, worldSpeed) {
      super.update(dt, worldSpeed);
      this.fairyLightTimer += dt * 8;
    }

    render(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      // 1. Festive Procession Carpet / Road Shadow
      ctx.fillStyle = 'rgba(120, 10, 30, 0.35)';
      ctx.beginPath();
      ctx.roundRect(0, this.height * 0.75, this.width, 14, 6);
      ctx.fill();

      // 2. Decorated Groom Car / Vintage Chariot at the front (right side)
      const carX = this.width - 90;
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(carX, 14, 80, 32, [8, 12, 2, 2]);
      ctx.fill();
      ctx.stroke();

      // Marigold Flower Garlands on hood & roof
      ctx.fillStyle = '#F59E0B';
      for (let fx = carX + 6; fx < carX + 74; fx += 10) {
        ctx.beginPath();
        ctx.arc(fx, 15, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Windows
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(carX + 22, 18, 38, 12);

      // Wheels
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(carX + 18, 46, 8, 0, Math.PI * 2);
      ctx.arc(carX + 65, 46, 8, 0, Math.PI * 2);
      ctx.fill();

      // 3. Dancing Baraati Silhouettes & Dhol Players (Left half)
      ctx.fillStyle = '#1E1B4B';
      const dancers = [
        { x: 18, bob: Math.sin(this.animTimer * 12) * 5, arm: 1 },
        { x: 42, bob: Math.cos(this.animTimer * 10) * 4, arm: -1 },
        { x: 68, bob: Math.sin(this.animTimer * 14) * 6, arm: 1 },
        { x: 95, bob: Math.cos(this.animTimer * 11) * 4, arm: -1 },
        { x: 122, bob: Math.sin(this.animTimer * 13) * 5, arm: 1 }
      ];

      dancers.forEach(d => {
        const dy = 26 + d.bob;
        // Head with festive turban (pagdi)
        ctx.fillStyle = '#EF4444'; // Red/Pink Turban
        ctx.beginPath();
        ctx.arc(d.x, dy - 14, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(d.x - 3, dy - 8, 6, 16);

        // Raised Dancing Arms
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(d.x, dy - 4);
        ctx.lineTo(d.x + d.arm * 8, dy - 16);
        ctx.stroke();
      });

      // 4. Grand Umbrella Canopy (Chhatri) with Pulsing Fairy Lights
      ctx.fillStyle = '#FF9933';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(70, 8, 22, Math.PI, 0, false);
      ctx.fill();
      ctx.stroke();

      // Central Umbrella Pole
      ctx.strokeStyle = '#FDE68A';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(70, 8);
      ctx.lineTo(70, 42);
      ctx.stroke();

      // Pulsing Multi-Color LED Fairy Lights along the procession
      const lightColors = ['#FF0055', '#00F3FF', '#39FF14', '#FFC83B'];
      for (let lx = 10; lx < this.width - 20; lx += 18) {
        const colIdx = Math.floor((lx + this.fairyLightTimer * 4) % lightColors.length);
        ctx.fillStyle = lightColors[colIdx];
        ctx.shadowColor = lightColors[colIdx];
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(lx, 4, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;

      // Banner Text
      ctx.fillStyle = '#FDE68A';
      ctx.font = 'bold 9px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎺 BARAAT 💃', 70, -4);

      ctx.restore();
    }
  }

  // ==========================================================================
  // 2. STREET VENDOR CART (Sabzi / Fruit Thela)
  // ==========================================================================
  class StreetVendorCart extends Obstacle {
    constructor(laneIndex, x) {
      super(laneIndex, x);
      this.type = 'vendor_cart';
      this.width = 66;
      this.height = 42;
      this.speedMultiplier = 0.15; // Slow pedestrian wheelbarrow speed
      this.hitboxInset = { top: 6, bottom: 2, left: 4, right: 4 };
    }

    render(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      // Wooden cart deck
      ctx.fillStyle = '#854D0E';
      ctx.fillRect(4, 20, 56, 10);
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(4, 20, 56, 10);

      // Pyramids of mangoes & watermelons
      const produceColors = ['#F59E0B', '#16A34A', '#EF4444', '#FBBF24'];
      for (let px = 8; px < 54; px += 8) {
        ctx.fillStyle = produceColors[(px / 8) % produceColors.length];
        ctx.beginPath();
        ctx.arc(px + 4, 16, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Large spoked bicycle wheels
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(16, 32, 9, 0, Math.PI * 2);
      ctx.arc(48, 32, 9, 0, Math.PI * 2);
      ctx.stroke();

      // Vendor walking silhouette behind the cart
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.arc(4, 12, 4.5, 0, Math.PI * 2); // Head
      ctx.fill();
      ctx.fillRect(2, 17, 5, 15); // Body

      ctx.restore();
    }
  }

  // ==========================================================================
  // 3. GULLEY CRICKET BALL (Bouncing Tennis Ball)
  // ==========================================================================
  class CricketBallObstacle extends Obstacle {
    constructor(laneIndex, x) {
      super(laneIndex, x);
      this.type = 'cricket_ball';
      this.width = 22;
      this.height = 22;
      this.speedMultiplier = 0.45;
      this.hitboxInset = { top: 2, bottom: 2, left: 2, right: 2 };
      this.bounceTimer = 0;
    }

    update(dt, worldSpeed) {
      super.update(dt, worldSpeed);
      this.bounceTimer += dt * 10;
    }

    render(ctx) {
      ctx.save();
      const bounceY = Math.abs(Math.sin(this.bounceTimer)) * 24;
      ctx.translate(this.x, this.y - bounceY);

      // Red Indian tennis cricket ball
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.arc(11, 11, 8.5, 0, Math.PI * 2);
      ctx.fill();

      // Dark contour outline
      ctx.strokeStyle = '#450A0A';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // White rubber seam
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(11, 11, 6.5, -Math.PI * 0.4, Math.PI * 0.6);
      ctx.stroke();

      ctx.restore();
    }
  }

  // ==========================================================================
  // 4. EVENT DIRECTOR (Manages Spacing, Cooldowns & Spawns)
  // ==========================================================================
  class EventDirector {
    constructor(obstacleManager) {
      this.manager = obstacleManager || null;
      this.lanes = (obstacleManager && obstacleManager.lanes) || [{ y: 345 }, { y: 405 }, { y: 460 }];
      this.eventObstacles = [];
      this.floatingTexts = [];
      this.cooldown = 4.0; // Quick initial spawn so player experiences events early
      this.activeEvent = null;
    }

    setManager(manager) {
      this.manager = manager;
      if (manager && manager.lanes) {
        this.lanes = manager.lanes;
      }
    }

    get events() {
      return this.eventObstacles;
    }

    reset() {
      this.cooldown = 4.0;
      this.activeEvent = null;
      this.eventObstacles = [];
      this.floatingTexts = [];
    }

    onHornHonked(player) {
      if (!player) return;
      this.eventObstacles.forEach(obs => {
        if (Math.abs(obs.x - player.x) < 360) {
          if (obs.onHonked) obs.onHonked();
        }
      });
    }

    _triggerEvent(type, x = Config.CANVAS_WIDTH + 100) {
      let obstacle;
      const lane0Y = this.lanes[0] ? this.lanes[0].y : 345;
      const lane1Y = this.lanes[1] ? this.lanes[1].y : 405;
      const lane2Y = this.lanes[2] ? this.lanes[2].y : 460;

      if (type === 'wedding_baraat') {
        obstacle = new WeddingBaraatObstacle(0, x);
        obstacle.y = lane0Y - 20;
      } else if (type === 'vendor_cart') {
        obstacle = new StreetVendorCart(1, x);
        obstacle.y = lane1Y - obstacle.height / 2;
      } else {
        obstacle = new CricketBallObstacle(2, x);
        obstacle.y = lane2Y;
      }

      this.eventObstacles.push(obstacle);
      return obstacle;
    }

    update(dt, worldSpeed, player, distance, onCollision, onNearMiss, audio) {
      // 1. Update floating notification banners
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const txt = this.floatingTexts[i];
        txt.life -= dt;
        txt.y += txt.vy * dt;
        if (txt.life <= 0) {
          this.floatingTexts.splice(i, 1);
        }
      }

      // 2. Update active event obstacles
      for (let i = this.eventObstacles.length - 1; i >= 0; i--) {
        const obs = this.eventObstacles[i];
        obs.update(dt, worldSpeed);

        if (player) {
          if (!obs.hasCollided && this._checkCollision(player, obs)) {
            obs.hasCollided = true;
            if (typeof onCollision === 'function') {
              onCollision(obs);
            }
          } else if (!obs.hasNearMissed && !obs.hasCollided && this._checkNearMiss(player, obs)) {
            obs.hasNearMissed = true;
            if (typeof onNearMiss === 'function') {
              onNearMiss(obs);
            }
          }
        }

        if (obs.isOffscreen()) {
          this.eventObstacles.splice(i, 1);
        }
      }

      // 3. Cooldown & Spawning
      this.cooldown -= dt;
      if (this.cooldown > 0) return;

      // Minimum run distance before events begin
      if (distance < (Config.EVENT_MIN_DISTANCE || 40)) return;

      // Don't spawn if an event is currently visible
      const hasActive = this.eventObstacles.some(o => o.x > 80);
      if (hasActive) return;

      this._triggerRandomEvent(worldSpeed, player, audio || (window.DesiRoadsterGameInstance && window.DesiRoadsterGameInstance.audio));
      this.cooldown = Config.EVENT_COOLDOWN || 13.0;
    }

    _checkCollision(player, obs) {
      const pHitbox = player.getHitbox ? player.getHitbox() : { x: player.x, y: player.y, width: player.width, height: player.height };
      const oHitbox = obs.getHitbox ? obs.getHitbox() : { x: obs.x, y: obs.y, width: obs.width, height: obs.height };

      return (
        pHitbox.x < oHitbox.x + oHitbox.width &&
        pHitbox.x + pHitbox.width > oHitbox.x &&
        pHitbox.y < oHitbox.y + oHitbox.height &&
        pHitbox.y + pHitbox.height > oHitbox.y
      );
    }

    _checkNearMiss(player, obs) {
      const pHitbox = player.getHitbox ? player.getHitbox() : { x: player.x, y: player.y, width: player.width, height: player.height };
      const oHitbox = obs.getHitbox ? obs.getHitbox() : { x: obs.x, y: obs.y, width: obs.width, height: obs.height };

      const passed = (pHitbox.x > oHitbox.x + oHitbox.width) && (pHitbox.x < oHitbox.x + oHitbox.width + 65);
      const verticalClearance = Math.abs((pHitbox.y + pHitbox.height * 0.5) - (oHitbox.y + oHitbox.height * 0.5));
      return passed && verticalClearance < 75;
    }

    _triggerRandomEvent(worldSpeed, player, audio) {
      const spawnX = Config.CANVAS_WIDTH + 80;
      const rand = Math.random();

      if (rand < 0.45) {
        // 1. Wedding Baraat
        const isUpper = Math.random() > 0.5;
        const laneIdx = isUpper ? 0 : 1;
        const targetY = (this.lanes[laneIdx] ? this.lanes[laneIdx].y : 345) - 20;

        const baraat = new WeddingBaraatObstacle(laneIdx, spawnX);
        baraat.y = targetY;
        this.eventObstacles.push(baraat);

        if (audio && audio.playBaraat) {
          audio.playBaraat();
        }

        this.floatingTexts.push({
          text: '🎺 WEDDING BARAAT AHEAD! 💃',
          x: Config.CANVAS_WIDTH - 150,
          y: 95,
          vy: -18,
          color: '#FF9933',
          life: 2.0,
          maxLife: 2.0
        });
      } else if (rand < 0.75) {
        // 2. Street Vendor Thela
        const laneIdx = Math.floor(Math.random() * 3);
        const targetY = (this.lanes[laneIdx] ? this.lanes[laneIdx].y : 405) - 21;

        const thela = new StreetVendorCart(laneIdx, spawnX);
        thela.y = targetY;
        this.eventObstacles.push(thela);

        this.floatingTexts.push({
          text: '🛒 SABZI THELA AHEAD!',
          x: Config.CANVAS_WIDTH - 150,
          y: 95,
          vy: -18,
          color: '#22C55E',
          life: 1.8,
          maxLife: 1.8
        });
      } else {
        // 3. Gulley Cricket Ball
        const laneIdx = Math.floor(Math.random() * 3);
        const targetY = (this.lanes[laneIdx] ? this.lanes[laneIdx].y : 460);

        const ball = new CricketBallObstacle(laneIdx, spawnX);
        ball.y = targetY;
        this.eventObstacles.push(ball);

        this.floatingTexts.push({
          text: '🏏 GULLEY CRICKET SIXER!',
          x: Config.CANVAS_WIDTH - 150,
          y: 95,
          vy: -18,
          color: '#EF4444',
          life: 1.8,
          maxLife: 1.8
        });
      }
    }

    render(ctx) {
      // 1. Render all active event obstacles
      const sorted = [...this.eventObstacles].sort((a, b) => a.y - b.y);
      for (const obs of sorted) {
        obs.render(ctx);
      }

      // 2. Render floating notification banners
      ctx.save();
      for (const txt of this.floatingTexts) {
        ctx.fillStyle = txt.color;
        ctx.globalAlpha = Math.max(0, txt.life / txt.maxLife);
        ctx.font = 'bold 15px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 8;
        ctx.fillText(txt.text, txt.x, txt.y);
      }
      ctx.restore();
    }
  }

  window.DesiRoadster.WeddingBaraatObstacle = WeddingBaraatObstacle;
  window.DesiRoadster.StreetVendorCart = StreetVendorCart;
  window.DesiRoadster.CricketBallObstacle = CricketBallObstacle;
  window.DesiRoadster.EventDirector = EventDirector;
})();
