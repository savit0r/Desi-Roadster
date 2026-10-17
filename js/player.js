/**
 * DESI ROADSTER - PLAYER CAR ENTITY
 * Futuristic electric supercar capable of road driving, jumping,
 * and transforming into flight mode with folding wheels, retractable ion wings,
 * dynamic road shadows, and emergency battery-drain landing.
 */

window.DesiRoadster = window.DesiRoadster || {};

(function() {
  const { Config } = window.DesiRoadster;

  // Discrete Player Flight/Road States
  const PLAYER_STATE = {
    ROAD: 'ROAD',
    TRANSFORM_TO_FLIGHT: 'TRANSFORM_TO_FLIGHT',
    FLIGHT: 'FLIGHT',
    TRANSFORM_TO_ROAD: 'TRANSFORM_TO_ROAD'
  };

  class Player {
    constructor() {
      // Dimensions
      this.width = 104;
      this.height = 38;

      // Position & Physics
      this.x = 140;
      this.y = Config.DEFAULT_GROUND_Y;
      this.targetLaneY = Config.DEFAULT_GROUND_Y;
      this.vx = 0;
      this.vy = 0;
      this.isGrounded = true;

      // State Machine
      this.state = PLAYER_STATE.ROAD;
      this.mode = 'ROAD'; // Backwards compatibility for external systems
      this.transformProgress = 0; // 0 = Pure Road, 1 = Full Flight
      this.transformTimer = 0;
      this.transformStartY = Config.DEFAULT_GROUND_Y;
      this.transformTargetY = Config.TAKEOFF_TARGET_Y;

      // Battery & Energy
      this.battery = Config.BATTERY_MAX;

      // Animation & visual timers
      this.wheelRotation = 0;
      this.hoverTimer = 0;
      this.particles = [];
      this.shockwaves = []; // Expanding transformation energy rings
      this.lightningArcs = []; // Electric arcs during transformation

      // Bounded Cinematic Thruster Smoke Pool (Zero-allocation pool for flight exhaust)
      this.smokePool = [];
      for (let i = 0; i < 48; i++) {
        this.smokePool.push({
          active: false,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          radius: 4,
          maxRadius: 28,
          life: 0,
          maxLife: 0.5,
          baseAlpha: 0.55
        });
      }
      this.smokeSpawnTimer = 0;
      this.underWheelSmokeTimer = 0;

      // Horizontal bounds
      this.minX = 60;
      this.maxX = 380;

      // Hit & Health feedback
      this.invulnerableTimer = 0;
      this.health = 3; // 3 Chassis integrity lives
      this.isDead = false;

      // Upgrades & Modifiers
      this.maxBattery = Config.BATTERY_MAX;
      this.suspensionDamping = 1.0;
    }

    applyUpgrades(upgradeManager) {
      if (!upgradeManager) return;
      if (upgradeManager.hasExtraBattery()) {
        this.maxBattery = Math.round(Config.BATTERY_MAX * 1.3);
      } else {
        this.maxBattery = Config.BATTERY_MAX;
      }
      this.battery = this.maxBattery;

      if (upgradeManager.hasSuspension()) {
        this.suspensionDamping = 0.65; // 35% less severe pothole jolt
      } else {
        this.suspensionDamping = 1.0;
      }
    }

    launchFromPothole(force = -420) {
      if (this.mode === 'ROAD') {
        this.vy = force;
        this.isGrounded = false;
        this._spawnLandingDust();
      }
    }

    /**
     * Fair collision hitbox (mode-dependent: slightly wider wings in flight mode)
     */
    getHitbox() {
      if (this.mode === 'FLIGHT' || this.transformProgress > 0.5) {
        return {
          x: this.x + 4,
          y: this.y + 4,
          width: this.width - 8,
          height: this.height - 8
        };
      }
      return {
        x: this.x + 8,
        y: this.y + 6,
        width: this.width - 16,
        height: this.height - 10
      };
    }

    /**
     * Trigger collision impact reaction with invulnerability grace period
     */
    triggerHit() {
      if (this.invulnerableTimer > 0 || this.isDead) return { hit: false };
      this.invulnerableTimer = 1.4; // 1.4s grace period
      this.vx = -180; // Knockback recoil
      this.health = Math.max(0, this.health - 1);
      if (this.health <= 0) {
        this.isDead = true;
      }
      return { hit: true, health: this.health, isDead: this.isDead };
    }

    /**
     * Safely toggles between Road and Flight modes with validation & debouncing
     * @returns {Object} { success: boolean, reason?: string }
     */
    toggleMode() {
      // 1. Prevent accidental spam during active transitions
      if (this.state === PLAYER_STATE.TRANSFORM_TO_FLIGHT || this.state === PLAYER_STATE.TRANSFORM_TO_ROAD) {
        return { success: false, reason: 'IN_TRANSITION' };
      }

      // 2. Initiate Takeoff from Road
      if (this.state === PLAYER_STATE.ROAD) {
        if (this.battery < Config.BATTERY_MIN_LAUNCH) {
          return { success: false, reason: 'BATTERY_LOW' };
        }

        this.state = PLAYER_STATE.TRANSFORM_TO_FLIGHT;
        this.mode = 'FLIGHT';
        this.transformTimer = 0;
        this.transformStartY = this.y;
        this.transformTargetY = Config.TAKEOFF_TARGET_Y;
        this.isGrounded = false;
        this.vy = -160; // Initial upward impulse

        // Spawn Transformation Shockwave & Lightning
        this._spawnTransformationFX();
        return { success: true, targetMode: 'FLIGHT' };
      }

      // 3. Initiate Smooth Landing from Flight
      if (this.state === PLAYER_STATE.FLIGHT) {
        this._initiateLanding();
        return { success: true, targetMode: 'ROAD' };
      }

      return { success: false };
    }

    _initiateLanding() {
      this.state = PLAYER_STATE.TRANSFORM_TO_ROAD;
      this.mode = 'ROAD';
      this.transformTimer = 0;
      this.transformStartY = this.y;

      // Choose nearest valid road lane to land into
      const lanes = [345, 405, 460];
      let closestLane = lanes[1];
      let minDiff = 9999;
      lanes.forEach(ly => {
        const diff = Math.abs((this.y + this.height) - ly);
        if (diff < minDiff) {
          minDiff = diff;
          closestLane = ly;
        }
      });
      this.targetLaneY = closestLane - this.height / 2;
      this.transformTargetY = this.targetLaneY;

      this._spawnTransformationFX();
    }

    _spawnTransformationFX() {
      // Expanding Energy Shockwave Ring
      this.shockwaves.push({
        x: this.x + this.width * 0.45,
        y: this.y + this.height * 0.5,
        radius: 12,
        maxRadius: 75,
        life: 0.42,
        maxLife: 0.42,
        color: Config.COLORS.CYAN
      });

      // Electric Lightning Arcs around Chassis
      this.lightningArcs = [];
      for (let i = 0; i < 5; i++) {
        this.lightningArcs.push({
          x1: this.width * (0.1 + Math.random() * 0.8),
          y1: this.height * Math.random(),
          x2: this.width * (0.1 + Math.random() * 0.8),
          y2: this.height * Math.random(),
          life: 0.28
        });
      }
    }

    /**
     * Main update routine (Physics, State Machine, Energy & Particles)
     */
    update(dt, input, currentSpeed) {
      this.hoverTimer += dt * 5;

      // Invulnerability timer decay
      if (this.invulnerableTimer > 0) {
        this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
      }

      // 1. STATE MACHINE EXECUTION
      switch (this.state) {
        case PLAYER_STATE.ROAD:
          this._updateRoadPhysics(dt, input);
          // Regenerative charging on asphalt
          this.battery = Math.min(this.maxBattery || Config.BATTERY_MAX, this.battery + Config.BATTERY_RECHARGE_ROAD * dt);
          this.transformProgress = Math.max(0, this.transformProgress - dt * 5);
          break;

        case PLAYER_STATE.TRANSFORM_TO_FLIGHT:
          this._updateTakeoffTransition(dt);
          break;

        case PLAYER_STATE.FLIGHT:
          this._updateFlightPhysics(dt, input);
          this.transformProgress = Math.min(1, this.transformProgress + dt * 5);
          // Battery drain in air
          this.battery = Math.max(0, this.battery - Config.BATTERY_DRAIN_FLIGHT * dt);
          // Forced emergency landing if battery completely drains
          if (this.battery <= 0) {
            this._initiateLanding();
            this._spawnEmergencySparks();
          }
          break;

        case PLAYER_STATE.TRANSFORM_TO_ROAD:
          this._updateLandingTransition(dt);
          break;
      }

      // 2. Horizontal Navigation (Brake / Nitro Boost)
      if (input.isDown('right')) {
        this.vx += Config.PLAYER_HORIZ_ACCEL * dt;
      } else if (input.isDown('left')) {
        this.vx -= Config.PLAYER_HORIZ_ACCEL * dt;
      }
      this.vx *= Config.PLAYER_HORIZ_FRICTION;
      this.x += this.vx * dt;
      this.x = Math.max(this.minX, Math.min(this.maxX, this.x));

      // 3. Wheel rotation & particle emitters
      if (this.state === PLAYER_STATE.ROAD) {
        this.wheelRotation += (currentSpeed / 20) * dt;
      }
      this._updateParticlesAndFX(dt, currentSpeed);
    }

    _updateTakeoffTransition(dt) {
      this.transformTimer += dt;
      const progress = Math.min(1, this.transformTimer / Config.TRANSFORM_DURATION);

      // Smooth easeOutCubic curve for takeoff lift
      const ease = 1 - Math.pow(1 - progress, 3);
      this.transformProgress = ease;
      this.y = this.transformStartY + (this.transformTargetY - this.transformStartY) * ease;

      if (progress >= 1) {
        this.state = PLAYER_STATE.FLIGHT;
        this.vy = 0;
      }
    }

    _updateLandingTransition(dt) {
      this.transformTimer += dt;
      const progress = Math.min(1, this.transformTimer / Config.TRANSFORM_DURATION);

      // Smooth easeInQuad curve for touchdown descent
      const ease = progress * progress;
      this.transformProgress = 1 - ease;
      this.y = this.transformStartY + (this.transformTargetY - this.transformStartY) * ease;

      if (progress >= 1 || this.y >= this.targetLaneY) {
        this.y = this.targetLaneY;
        this.vy = 0;
        this.isGrounded = true;
        this.state = PLAYER_STATE.ROAD;
        this.transformProgress = 0;
        this._spawnLandingDust();
      }
    }

    _updateRoadPhysics(dt, input) {
      // Road Lane Steering
      if (input.isDown('up')) {
        this.targetLaneY -= Config.PLAYER_ROAD_VERT_SPEED * dt;
      } else if (input.isDown('down')) {
        this.targetLaneY += Config.PLAYER_ROAD_VERT_SPEED * dt;
      }

      // Constrain within highway asphalt limits
      const minRoadY = Config.ROAD_TOP_Y + 12;
      const maxRoadY = Config.ROAD_BOTTOM_Y - this.height - 4;
      this.targetLaneY = Math.max(minRoadY, Math.min(maxRoadY, this.targetLaneY));

      // Road Mode Jumping
      if (input.isJustPressed('jump') && this.isGrounded) {
        this.vy = Config.JUMP_FORCE;
        this.isGrounded = false;
      }

      if (!this.isGrounded) {
        this.vy += Config.GRAVITY * dt;
        this.y += this.vy * dt;

        // Ground landing check
        if (this.y >= this.targetLaneY) {
          this.y = this.targetLaneY;
          this.vy = 0;
          this.isGrounded = true;
          this._spawnLandingDust();
        }
      } else {
        // Smooth lane follow
        this.y += (this.targetLaneY - this.y) * Math.min(dt * 12, 1);
      }
    }

    _updateFlightPhysics(dt, input) {
      let vyTarget = 0;
      if (input.isDown('up')) {
        vyTarget = -Config.PLAYER_FLIGHT_VERT_SPEED;
      } else if (input.isDown('down')) {
        vyTarget = Config.PLAYER_FLIGHT_VERT_SPEED;
      }

      // Smooth VTOL response
      this.vy += (vyTarget - this.vy) * Math.min(dt * 7, 1);
      this.y += this.vy * dt;

      // Gentle aerodynamic altitude float
      const hoverOffset = Math.sin(this.hoverTimer) * 1.0;
      this.y += hoverOffset;

      // Enforce Flight ceiling and road boundaries
      this.y = Math.max(Config.FLIGHT_MIN_Y, Math.min(Config.FLIGHT_MAX_Y, this.y));
    }

    _spawnLandingDust() {
      for (let i = 0; i < 9; i++) {
        this.particles.push({
          x: this.x + 10 + Math.random() * (this.width - 20),
          y: this.y + this.height - 2,
          vx: (Math.random() - 0.7) * 110,
          vy: -Math.random() * 45,
          size: 3 + Math.random() * 4,
          color: 'rgba(210, 190, 160, 0.75)',
          life: 0.38,
          maxLife: 0.38
        });
      }
    }

    _spawnEmergencySparks() {
      for (let i = 0; i < 12; i++) {
        this.particles.push({
          x: this.x + 5,
          y: this.y + this.height * 0.5,
          vx: -(150 + Math.random() * 120),
          vy: (Math.random() - 0.5) * 80,
          size: 3 + Math.random() * 3,
          color: '#FF0055',
          life: 0.35,
          maxLife: 0.35
        });
      }
    }

    _updateParticlesAndFX(dt, currentSpeed) {
      const isFlying = this.state === PLAYER_STATE.FLIGHT || this.transformProgress > 0.08;

      // 1. Cinematic Thruster Smoke & Vapor (Flight & Takeoff/Landing)
      if (isFlying) {
        this.smokeSpawnTimer += dt;
        // High spawn frequency creates continuous volumetric plume
        const spawnInterval = 0.022;
        if (this.smokeSpawnTimer >= spawnInterval) {
          this.smokeSpawnTimer = 0;

          // Dual rear nozzles: upper (0.58) and lower (0.72)
          const nozzleY = (Math.random() > 0.5 ? this.height * 0.58 : this.height * 0.72);
          const spawnX = this.x;
          const spawnY = this.y + nozzleY + (Math.random() - 0.5) * 3;

          // Find inactive slot in pre-allocated bounded pool
          for (let i = 0; i < this.smokePool.length; i++) {
            const smk = this.smokePool[i];
            if (!smk.active) {
              smk.active = true;
              smk.x = spawnX;
              smk.y = spawnY;
              // Eject rapidly backwards relative to vehicle motion with subtle turbulence
              smk.vx = -(currentSpeed * 0.88 + 190 + Math.random() * 90);
              smk.vy = (Math.random() - 0.5) * 20 + (this.vy * 0.18);
              smk.radius = 4.5 + Math.random() * 2.5;
              smk.maxRadius = 24 + Math.random() * 12;
              smk.life = 0.48 + Math.random() * 0.18;
              smk.maxLife = smk.life;
              smk.baseAlpha = 0.54 + Math.random() * 0.16;
              break;
            }
          }
        }

        // Under-wheel downward thruster smoke puffs
        this.underWheelSmokeTimer += dt;
        const wheelSmokeInterval = 0.034;
        if (this.underWheelSmokeTimer >= wheelSmokeInterval) {
          this.underWheelSmokeTimer = 0;

          // Alternate between rear wheel (24) and front wheel (80)
          const isRear = Math.random() > 0.5;
          const wheelXOffset = isRear ? 24 : 80;
          const spawnX = this.x + wheelXOffset + (Math.random() - 0.5) * 4;
          const spawnY = this.y + this.height * 0.78 + 4 + Math.random() * 3;

          for (let i = 0; i < this.smokePool.length; i++) {
            const smk = this.smokePool[i];
            if (!smk.active) {
              smk.active = true;
              smk.x = spawnX;
              smk.y = spawnY;
              // Eject downwards and drift back with road wind
              smk.vx = -(currentSpeed * 0.75 + 110 + Math.random() * 50);
              smk.vy = 45 + Math.random() * 35 + (this.vy * 0.18);
              smk.radius = 3.5 + Math.random() * 2.0;
              smk.maxRadius = 18 + Math.random() * 8;
              smk.life = 0.38 + Math.random() * 0.14;
              smk.maxLife = smk.life;
              smk.baseAlpha = 0.42 + Math.random() * 0.14;
              break;
            }
          }
        }

        // Wingtip Condensation Vortices
        if (this.transformProgress > 0.8) {
          const wingY = this.height * 0.45;
          const wingLen = 34 * this.transformProgress;
          this.particles.push({
            x: this.x + this.width * 0.15,
            y: this.y + wingY - wingLen,
            vx: -currentSpeed * 0.6,
            vy: (Math.random() - 0.5) * 10,
            size: 2,
            color: 'rgba(255, 255, 255, 0.4)',
            life: 0.18,
            maxLife: 0.18
          });
        }
      } else if (this.isGrounded) {
        // Subtle road asphalt dust
        if (Math.random() > 0.55) {
          this.particles.push({
            x: this.x + 10,
            y: this.y + this.height - 2,
            vx: -currentSpeed * 0.5,
            vy: -Math.random() * 14,
            size: 2 + Math.random() * 2,
            color: 'rgba(160, 150, 140, 0.35)',
            life: 0.2,
            maxLife: 0.2
          });
        }
      }

      // 2. Update Bounded Smoke Particles
      for (let i = 0; i < this.smokePool.length; i++) {
        const smk = this.smokePool[i];
        if (!smk.active) continue;
        smk.life -= dt;
        if (smk.life <= 0) {
          smk.active = false;
        } else {
          smk.x += smk.vx * dt;
          smk.y += smk.vy * dt;
          smk.vx *= 0.985; // Atmospheric deceleration
          smk.vy += Math.sin(smk.life * 9) * 1.6;
        }
      }

      // 3. Update General Particles (dust & sparks)
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.life -= dt;
        if (pt.life <= 0) {
          this.particles.splice(i, 1);
        } else {
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
        }
      }

      // 4. Update Shockwave Rings
      for (let i = this.shockwaves.length - 1; i >= 0; i--) {
        const sw = this.shockwaves[i];
        sw.life -= dt;
        if (sw.life <= 0) {
          this.shockwaves.splice(i, 1);
        } else {
          const progress = 1 - (sw.life / sw.maxLife);
          sw.radius = 12 + (sw.maxRadius - 12) * progress;
        }
      }

      // 5. Update Lightning Arcs
      for (let i = this.lightningArcs.length - 1; i >= 0; i--) {
        const arc = this.lightningArcs[i];
        arc.life -= dt;
        if (arc.life <= 0) {
          this.lightningArcs.splice(i, 1);
        }
      }
    }

    // ========================================================================
    // RENDERING PIPELINE (Pure Canvas Drawing)
    // ========================================================================
    render(ctx) {
      // 1. Dynamic Road Shadow (stays on the road even when high in flight)
      this._renderRoadShadow(ctx);

      // 2. Transformation Shockwave Rings
      this._renderShockwaves(ctx);

      // 3. Trailing particles behind vehicle
      this._renderParticles(ctx);

      // 4. Cinematic Volumetric Exhaust Smoke (Drawn behind vehicle in world space)
      this._renderThrusterSmoke(ctx);

      ctx.save();

      // Post-hit invulnerability flashing
      if (this.invulnerableTimer > 0) {
        const isFlicker = Math.floor(this.invulnerableTimer * 14) % 2 === 0;
        ctx.globalAlpha = isFlicker ? 0.35 : 0.9;
      }

      ctx.translate(this.x, this.y);

      // Dynamic Flight Pitch Tilt
      let tilt = 0;
      if (this.state === PLAYER_STATE.FLIGHT || this.state === PLAYER_STATE.TRANSFORM_TO_FLIGHT) {
        tilt = (this.vy / Config.PLAYER_FLIGHT_VERT_SPEED) * 0.12;
      } else if (!this.isGrounded) {
        tilt = (this.vy / Config.GRAVITY) * 0.16;
      }
      ctx.rotate(tilt);

      // 5. Forward Headlight Beam
      this._renderHeadlightBeam(ctx);

      // 6. Dual Supersonic Plasma Thruster Flames (Flight Mode)
      if (this.transformProgress > 0.05) {
        this._renderIonThrusterFlames(ctx);
        this._renderUnderWheelThrusterFlames(ctx);
      }

      // 7. Retractable Aero Wings (Extends outwards)
      if (this.transformProgress > 0.01) {
        this._renderFlightWings(ctx);
      }

      // 8. Sleek Tesla Roadster-Inspired Aerodynamic Sports Car Chassis
      this._renderChassis(ctx);

      // 9. Sport Turbine Wheels / Hover Repulsor Pods
      this._renderWheels(ctx);

      // 10. Electric Lightning Arcs (during transformation)
      if (this.lightningArcs.length > 0) {
        this._renderLightningArcs(ctx);
      }

      ctx.restore();
    }

    /**
     * Renders a soft shadow cast on the asphalt road below,
     * scaling and fading smoothly with altitude for realistic 3D depth perception.
     */
    _renderRoadShadow(ctx) {
      ctx.save();

      // Road surface ground line where shadow lands
      const roadGroundY = Math.max(Config.ROAD_TOP_Y + 30, this.targetLaneY || Config.DEFAULT_GROUND_Y);
      const altitude = Math.max(0, roadGroundY - this.y);

      // Dynamic height factor (0 = touching road, 1 = maximum sky height)
      const maxAltitude = Config.DEFAULT_GROUND_Y - Config.FLIGHT_MIN_Y;
      const heightFactor = Math.min(1, altitude / maxAltitude);

      // Shadow shrinks and fades as altitude increases
      const shadowScale = Math.max(0.45, 1.0 - heightFactor * 0.5);
      const shadowAlpha = Math.max(0.12, 0.55 - heightFactor * 0.4);

      const shadowX = this.x + this.width * 0.48;
      const shadowY = roadGroundY + this.height - 3;
      const rx = (this.width * 0.44) * shadowScale;
      const ry = 5 * shadowScale;

      ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.ellipse(shadowX, shadowY, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    /**
     * Renders multi-layered volumetric exhaust smoke trailing behind the car during flight.
     * Uses pre-allocated bounded smokePool with smooth expanding radial gradients.
     */
    _renderThrusterSmoke(ctx) {
      if (this.transformProgress <= 0.05) return;

      ctx.save();
      for (let i = 0; i < this.smokePool.length; i++) {
        const smk = this.smokePool[i];
        if (!smk.active) continue;

        const progress = 1 - (smk.life / smk.maxLife); // 0 (birth) to 1 (fade)
        const curRadius = smk.radius + (smk.maxRadius - smk.radius) * Math.pow(progress, 0.65);
        // Smooth sine envelope: rapid initial billow, gentle lingering dissipation
        const envelope = Math.sin(progress * Math.PI);
        const alpha = envelope * (smk.baseAlpha || 0.55) * this.transformProgress;

        if (alpha <= 0.01) continue;

        const grad = ctx.createRadialGradient(smk.x, smk.y, 0, smk.x, smk.y, curRadius);
        // White-hot / bright cyan core fading into soft atmospheric smoke
        grad.addColorStop(0, `rgba(240, 249, 255, ${Math.min(1, alpha * 0.95).toFixed(3)})`);
        grad.addColorStop(0.3, `rgba(186, 230, 253, ${(alpha * 0.65).toFixed(3)})`);
        grad.addColorStop(0.7, `rgba(147, 197, 253, ${(alpha * 0.28).toFixed(3)})`);
        grad.addColorStop(1, 'rgba(96, 165, 250, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(smk.x, smk.y, curRadius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    /**
     * Renders supersonic white-hot rocket/plasma thruster flames at dual rear nozzles
     */
    _renderIonThrusterFlames(ctx) {
      const p = this.transformProgress;
      if (p <= 0.04) return;

      const nozzleOffsets = [this.height * 0.58, this.height * 0.72];
      const baseLen = 28 * p;
      const flicker = Math.sin(this.hoverTimer * 18) * 4 + (Math.random() - 0.5) * 6;
      const flameLength = Math.max(12, baseLen + flicker);

      ctx.save();

      nozzleOffsets.forEach(ny => {
        // 1. Outer Translucent Blue/Cyan Plasma Envelope
        const outerGrad = ctx.createLinearGradient(0, ny, -flameLength * 1.25, ny);
        outerGrad.addColorStop(0, 'rgba(0, 243, 255, 0.75)');
        outerGrad.addColorStop(0.35, 'rgba(56, 189, 248, 0.45)');
        outerGrad.addColorStop(0.75, 'rgba(37, 99, 235, 0.2)');
        outerGrad.addColorStop(1, 'rgba(30, 64, 175, 0)');

        ctx.fillStyle = outerGrad;
        ctx.beginPath();
        ctx.moveTo(0, ny - 5.5 * p);
        ctx.lineTo(-flameLength * 1.25, ny);
        ctx.lineTo(0, ny + 5.5 * p);
        ctx.closePath();
        ctx.fill();

        // 2. High-Energy Electric Cyan Jet Core
        const coreGrad = ctx.createLinearGradient(0, ny, -flameLength, ny);
        coreGrad.addColorStop(0, '#FFFFFF');
        coreGrad.addColorStop(0.25, 'rgba(186, 230, 253, 0.95)');
        coreGrad.addColorStop(0.65, 'rgba(0, 243, 255, 0.75)');
        coreGrad.addColorStop(1, 'rgba(0, 243, 255, 0)');

        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.moveTo(0, ny - 3.2 * p);
        ctx.lineTo(-flameLength, ny);
        ctx.lineTo(0, ny + 3.2 * p);
        ctx.closePath();
        ctx.fill();

        // 3. Supersonic Shock Diamond Nodes
        const d1 = -flameLength * 0.32;
        const d2 = -flameLength * 0.62;

        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#00F3FF';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(d1 - 3, ny);
        ctx.lineTo(d1, ny - 2 * p);
        ctx.lineTo(d1 + 3, ny);
        ctx.lineTo(d1, ny + 2 * p);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(d2 - 2, ny);
        ctx.lineTo(d2, ny - 1.4 * p);
        ctx.lineTo(d2 + 2, ny);
        ctx.lineTo(d2, ny + 1.4 * p);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        // 4. Blinding White-Hot Throat at Nozzle Exit
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, ny, 2.2 * p, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    }

    /**
     * Renders two powerful downward-facing rocket/plasma thruster jets beneath the wheels
     * (rear wheel at X=24, front wheel at X=80), providing visual VTOL lift in flight mode.
     */
    _renderUnderWheelThrusterFlames(ctx) {
      const p = this.transformProgress;
      if (p <= 0.04) return;

      const nozzleY = this.height * 0.78 + 4; // Emerges just beneath the wheel hub / lower chassis line
      const wheelThrusters = [
        { x: 24, weight: 1.05, phase: 0 },         // Rear thruster (slightly heavier lift)
        { x: 80, weight: 0.95, phase: 2.3 }        // Front thruster (balanced, distinct phase)
      ];

      ctx.save();

      wheelThrusters.forEach(jet => {
        const wx = jet.x;
        // Subtle dynamic flicker & pulsing tied to flight hover timer and delta time
        const flicker = Math.sin(this.hoverTimer * 16 + jet.phase) * 2.5 + (Math.random() - 0.5) * 3.5;
        const baseJetLen = 22 * p * jet.weight;
        const jetLength = Math.max(8, baseJetLen + flicker);
        const jetHalfWidth = 5.2 * p * jet.weight;
        const coreHalfWidth = 2.8 * p * jet.weight;

        // 1. Outer Soft Cyan-Blue Plasma Glow Envelope
        const outerGrad = ctx.createLinearGradient(wx, nozzleY, wx, nozzleY + jetLength * 1.3);
        outerGrad.addColorStop(0, 'rgba(0, 243, 255, 0.85)');
        outerGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.5)');
        outerGrad.addColorStop(0.7, 'rgba(37, 99, 235, 0.2)');
        outerGrad.addColorStop(1, 'rgba(30, 64, 175, 0)');

        ctx.fillStyle = outerGrad;
        ctx.beginPath();
        ctx.moveTo(wx - jetHalfWidth * 1.3, nozzleY);
        ctx.lineTo(wx, nozzleY + jetLength * 1.3);
        ctx.lineTo(wx + jetHalfWidth * 1.3, nozzleY);
        ctx.closePath();
        ctx.fill();

        // 2. High-Energy Electric Cyan Jet Conical Flame
        const midGrad = ctx.createLinearGradient(wx, nozzleY, wx, nozzleY + jetLength);
        midGrad.addColorStop(0, '#FFFFFF');
        midGrad.addColorStop(0.25, 'rgba(186, 230, 253, 0.95)');
        midGrad.addColorStop(0.65, 'rgba(0, 243, 255, 0.75)');
        midGrad.addColorStop(1, 'rgba(0, 243, 255, 0)');

        ctx.fillStyle = midGrad;
        ctx.beginPath();
        ctx.moveTo(wx - jetHalfWidth, nozzleY);
        ctx.lineTo(wx, nozzleY + jetLength);
        ctx.lineTo(wx + jetHalfWidth, nozzleY);
        ctx.closePath();
        ctx.fill();

        // 3. Blinding White-Hot Inner Core
        const coreGrad = ctx.createLinearGradient(wx, nozzleY, wx, nozzleY + jetLength * 0.65);
        coreGrad.addColorStop(0, '#FFFFFF');
        coreGrad.addColorStop(0.6, 'rgba(255, 255, 255, 0.9)');
        coreGrad.addColorStop(1, 'rgba(186, 230, 253, 0)');

        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.moveTo(wx - coreHalfWidth, nozzleY);
        ctx.lineTo(wx, nozzleY + jetLength * 0.65);
        ctx.lineTo(wx + coreHalfWidth, nozzleY);
        ctx.closePath();
        ctx.fill();

        // 4. Supersonic Vertical Shock Diamond Node
        const sdY = nozzleY + jetLength * 0.38;
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#00F3FF';
        ctx.shadowBlur = 6 * p;
        ctx.beginPath();
        ctx.moveTo(wx, sdY - 2.5 * p);
        ctx.lineTo(wx + 2.2 * p, sdY);
        ctx.lineTo(wx, sdY + 2.5 * p);
        ctx.lineTo(wx - 2.2 * p, sdY);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        // 5. Blinding White-Hot Throat at Wheel Pod Exit
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(wx, nozzleY, 2.4 * p, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    }

    /**
     * Renders retractable carbon-fiber aero wings extending during flight
     */
    _renderFlightWings(ctx) {
      const p = this.transformProgress;
      const wingLength = 36 * p;
      const wingY = this.height * 0.45;

      ctx.save();
      // Back Wing in carbon graphite with cyan leading accent
      ctx.fillStyle = '#111827';
      ctx.strokeStyle = Config.COLORS.CYAN;
      ctx.lineWidth = 1.6;
      ctx.shadowColor = Config.COLORS.CYAN;
      ctx.shadowBlur = 9 * p;

      ctx.beginPath();
      ctx.moveTo(this.width * 0.35, wingY - 2);
      ctx.lineTo(this.width * 0.12, wingY - wingLength);
      ctx.lineTo(this.width * 0.46, wingY - wingLength * 0.82);
      ctx.lineTo(this.width * 0.68, wingY - 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wingtip Ion Glow Beacon
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#38BDF8';
      ctx.shadowBlur = 6;
      ctx.fillRect(this.width * 0.12, wingY - wingLength, 4, 3);

      ctx.restore();
    }

    /**
     * Renders a high-quality cartoon red electric sports car in rear three-quarter perspective.
     * Features:
     * - Recognizable aerodynamic electric sports-car proportions (low nose, sculpted haunches, kamm-tail).
     * - Rear three-quarter view showing the rear fascia, upper targa deck, and near flank.
     * - Multi-coat candy apple red with warm sunset peach/gold rim highlights and twilight purple ambient shadows.
     * - Dark tinted canopy glass with clean specular glazing and sunset reflection.
     * - Wrap-around ruby neon lightbar with hot core and warm glow.
     * - Slender front LED blade headlight with ice-cyan brow.
     * - Sculpted side aero channel with door shut line and minimal handle.
     * - Carbon-fiber aero rear diffuser and cold-gas nozzle rings.
     * - Consistent 2.2px dark navy-charcoal cartoon outlines for maximum arcade readability.
     */
    _renderChassis(ctx) {
      ctx.save();

      // 1. Sleek Multi-Coat Ultra-Red Metallic Body Gradient with Warm Sunset Lighting
      // Top receives warm sunset peach-gold ambient; bottom grounds into rich twilight plum/purple
      const bodyGrad = ctx.createLinearGradient(0, 4, 0, this.height);
      bodyGrad.addColorStop(0, '#FFA07A');    // Warm Indian sunset peach rim highlight
      bodyGrad.addColorStop(0.12, '#FF334B'); // Glossy candy sports-car red
      bodyGrad.addColorStop(0.40, '#DC2626'); // Deep crimson body core
      bodyGrad.addColorStop(0.72, '#991B1B'); // Rich metallic wine shade
      bodyGrad.addColorStop(0.90, '#4A081A'); // Twilight plum ambient shadow
      bodyGrad.addColorStop(1, '#20030C');    // Deep graphite-purple base

      // 2. Main Aerodynamic Sports-Car Silhouette Path (Rear Three-Quarter Stance)
      ctx.beginPath();
      // Rear lower carbon diffuser tip
      ctx.moveTo(0, this.height * 0.82);
      // Rear vertical kamm-tail fascia
      ctx.lineTo(1.5, this.height * 0.46);
      // Integrated aerodynamic ducktail spoiler lip
      ctx.lineTo(2, this.height * 0.40);
      // Rear targa deck flowing forward into muscular haunch
      ctx.quadraticCurveTo(14, this.height * 0.39, 24, this.height * 0.37);
      // Fastback targa glass arch rising to roof
      ctx.quadraticCurveTo(34, this.height * 0.22, 45, this.height * 0.20);
      // Low aerodynamic roofline
      ctx.lineTo(58, this.height * 0.21);
      // Steeply raked windshield cowl
      ctx.quadraticCurveTo(68, this.height * 0.32, 73, this.height * 0.44);
      // Sculpted low-slung front hood sloping forward
      ctx.quadraticCurveTo(86, this.height * 0.49, 97, this.height * 0.58);
      // Razor-sharp front nose cone
      ctx.quadraticCurveTo(103, this.height * 0.64, 104, this.height * 0.68);
      // Lower front nose & carbon splitter
      ctx.lineTo(102, this.height * 0.77);
      ctx.lineTo(96, this.height * 0.82);
      // Front wheel arch cutout (X: 94 to 66)
      ctx.lineTo(94, this.height * 0.82);
      ctx.quadraticCurveTo(80, this.height * 0.44, 66, this.height * 0.82);
      // Center carbon side skirt
      ctx.lineTo(38, this.height * 0.82);
      // Rear wheel arch cutout (X: 38 to 10)
      ctx.quadraticCurveTo(24, this.height * 0.44, 10, this.height * 0.82);
      // Under-diffuser line
      ctx.lineTo(0, this.height * 0.82);
      ctx.closePath();

      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // Bold Dark Precision Contour Outline (Consistent Cartoon Styling)
      ctx.strokeStyle = '#0A0E1A';
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // 3. Rear Three-Quarter Kamm-Tail Facet (Facing Viewer/Camera Rear)
      // Gives the back of the car true 3D perspective depth in a side-scrolling format
      const rearFacetGrad = ctx.createLinearGradient(0, this.height * 0.40, 8, this.height * 0.82);
      rearFacetGrad.addColorStop(0, '#7F1D1D');
      rearFacetGrad.addColorStop(0.6, '#550815');
      rearFacetGrad.addColorStop(1, '#2D040C');
      ctx.fillStyle = rearFacetGrad;
      ctx.beginPath();
      ctx.moveTo(0, this.height * 0.40);
      ctx.lineTo(7, this.height * 0.42);
      ctx.lineTo(9, this.height * 0.82);
      ctx.lineTo(0, this.height * 0.82);
      ctx.closePath();
      ctx.fill();

      // Facet ridge line defining the rear corner bevel
      ctx.strokeStyle = 'rgba(255, 120, 120, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(7, this.height * 0.42);
      ctx.lineTo(9, this.height * 0.82);
      ctx.stroke();

      // 4. Wheel Well Shadow Liners (Dark inner arch cavities)
      ctx.fillStyle = '#080A0E';
      // Rear wheel well liner
      ctx.beginPath();
      ctx.arc(24, this.height * 0.78, 14.5, Math.PI, 0, false);
      ctx.fill();
      // Front wheel well liner
      ctx.beginPath();
      ctx.arc(80, this.height * 0.78, 14.5, Math.PI, 0, false);
      ctx.fill();

      // Flared wheel arch rim highlights (showing wide muscular fenders)
      ctx.strokeStyle = 'rgba(254, 215, 170, 0.4)'; // Warm sunset glint on arch lip
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(24, this.height * 0.78, 15.5, Math.PI * 1.05, Math.PI * 1.95, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(80, this.height * 0.78, 15.5, Math.PI * 1.05, Math.PI * 1.95, false);
      ctx.stroke();

      // 5. Warm Sunset Rim Highlights & Muscular Body Creases
      // Upper targa deck & rear spoiler sunset peach rim
      ctx.strokeStyle = 'rgba(254, 215, 170, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(2, this.height * 0.40);
      ctx.quadraticCurveTo(14, this.height * 0.39, 24, this.height * 0.37);
      ctx.stroke();

      // Muscular rear haunch shoulder line (wide-body athletic hip)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(10, this.height * 0.44);
      ctx.quadraticCurveTo(24, this.height * 0.38, 42, this.height * 0.44);
      ctx.stroke();

      // Main dynamic waist crease flowing forward to front fender
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(42, this.height * 0.44);
      ctx.quadraticCurveTo(68, this.height * 0.46, 94, this.height * 0.58);
      ctx.stroke();

      // Hood center power bulge crease catching warm sunset light
      ctx.strokeStyle = 'rgba(254, 215, 170, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(74, this.height * 0.45);
      ctx.quadraticCurveTo(86, this.height * 0.50, 98, this.height * 0.60);
      ctx.stroke();

      // 6. Sculpted Door Cove / Side Air Channel
      // Aerodynamic scallop channeling air toward the rear haunches
      ctx.fillStyle = 'rgba(40, 5, 12, 0.5)';
      ctx.beginPath();
      ctx.moveTo(40, this.height * 0.57);
      ctx.quadraticCurveTo(52, this.height * 0.51, 64, this.height * 0.55);
      ctx.quadraticCurveTo(58, this.height * 0.74, 42, this.height * 0.73);
      ctx.closePath();
      ctx.fill();

      // Lower cove accent crease with warm twilight bounce
      ctx.strokeStyle = 'rgba(251, 146, 60, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(40, this.height * 0.73);
      ctx.lineTo(62, this.height * 0.73);
      ctx.stroke();

      // Clean door shut line
      ctx.strokeStyle = 'rgba(10, 14, 26, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(44, this.height * 0.45);
      ctx.lineTo(43, this.height * 0.77);
      ctx.stroke();

      // Flush minimal door handle
      ctx.fillStyle = '#0A0E1A';
      ctx.fillRect(47, this.height * 0.50, 6, 1.5);

      // 7. Cockpit Canopy / Tinted Glass Fastback (Rear Three-Quarter Perspective)
      // Displays the fastback rear hatch glass and side windshield with sunset reflection
      const glassGrad = ctx.createLinearGradient(35, 8, 70, 20);
      glassGrad.addColorStop(0, '#1E293B');   // Top sky reflection
      glassGrad.addColorStop(0.35, '#0F172A'); // Midnight glass core
      glassGrad.addColorStop(0.8, '#030712');  // Deep obsidian tint
      glassGrad.addColorStop(1, '#020408');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(27, this.height * 0.40);
      ctx.quadraticCurveTo(36, this.height * 0.24, 46, this.height * 0.22);
      ctx.lineTo(56, this.height * 0.23);
      ctx.quadraticCurveTo(65, this.height * 0.33, 70, this.height * 0.43);
      ctx.lineTo(27, this.height * 0.43);
      ctx.closePath();

      ctx.fillStyle = glassGrad;
      ctx.fill();

      // Crisp A-pillar, roofline, and rear glass contour outline
      ctx.strokeStyle = '#0A0E1A';
      ctx.lineWidth = 2.0;
      ctx.stroke();

      // Interior headrest shadow silhouette
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.ellipse(47, this.height * 0.32, 3.5, 4.5, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Specular windshield glazing streak (bright white)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(56, this.height * 0.26);
      ctx.lineTo(66, this.height * 0.41);
      ctx.stroke();

      // Warm Indian sunset apricot sky reflection glaze
      ctx.strokeStyle = 'rgba(253, 186, 116, 0.4)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(35, this.height * 0.34);
      ctx.lineTo(45, this.height * 0.25);
      ctx.stroke();

      // Subtle B-pillar divider
      ctx.strokeStyle = 'rgba(10, 14, 26, 0.85)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(49, this.height * 0.23);
      ctx.lineTo(48, this.height * 0.43);
      ctx.stroke();
      ctx.restore();

      // 8. Front Headlight (Slender horizontal LED blade with ice-cyan brow)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(94, this.height * 0.60);
      ctx.lineTo(102, this.height * 0.65);
      ctx.lineTo(98, this.height * 0.68);
      ctx.lineTo(93, this.height * 0.65);
      ctx.closePath();
      // Gloss black housing
      ctx.fillStyle = '#0A0E1A';
      ctx.fill();
      // Pure white projector lens core
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#38BDF8';
      ctx.shadowBlur = 8;
      ctx.fillRect(96, this.height * 0.63, 4, 2);
      // Cool ice-cyan DRL brow
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.2;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(94, this.height * 0.61);
      ctx.lineTo(102, this.height * 0.65);
      ctx.stroke();
      ctx.restore();

      // 9. Rear Taillight (Continuous wrap-around ruby LED blade)
      // Rounds the rear quarter corner in 3/4 perspective
      ctx.save();
      // Taillight dark bezel
      ctx.fillStyle = '#180306';
      ctx.fillRect(0, this.height * 0.40, 8, 3.5);
      // Vibrant neon ruby laser core
      ctx.fillStyle = '#FF0055';
      ctx.shadowColor = '#FF0055';
      ctx.shadowBlur = 10;
      ctx.fillRect(0, this.height * 0.41, 7, 2.2);
      // White-hot laser center filament
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, this.height * 0.415, 3.5, 1.2);
      ctx.restore();

      // 10. Rear Carbon Aero Diffuser & Cold-Gas Thruster Nozzle Rings
      ctx.fillStyle = '#0F1218';
      ctx.beginPath();
      ctx.moveTo(0, this.height * 0.78);
      ctx.lineTo(8, this.height * 0.79);
      ctx.lineTo(10, this.height * 0.83);
      ctx.lineTo(0, this.height * 0.83);
      ctx.closePath();
      ctx.fill();

      // Twin cold-gas thruster nozzle rings on rear kamm-tail facia
      // Perfectly aligned with the rear flight thruster flame origin
      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(1.5, this.height * 0.58, 2.6, 0, Math.PI * 2);
      ctx.arc(1.5, this.height * 0.72, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Cool cyan nozzle core glow
      ctx.fillStyle = 'rgba(0, 243, 255, 0.45)';
      ctx.beginPath();
      ctx.arc(1.5, this.height * 0.58, 1.2, 0, Math.PI * 2);
      ctx.arc(1.5, this.height * 0.72, 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    /**
     * Renders high-performance directional turbine wheels with visible red brake calipers,
     * or horizontal repulsor pods during flight mode.
     */
    _renderWheels(ctx) {
      const p = this.transformProgress;
      const wheelRadius = 13.5;
      const wheelY = this.height * 0.78;
      const rearWheelX = 24;
      const frontWheelX = 80;

      [rearWheelX, frontWheelX].forEach(wx => {
        ctx.save();
        ctx.translate(wx, wheelY);

        if (p > 0.05) {
          // Wheel folds horizontally into hover repulsor pod
          const foldAngle = p * (Math.PI / 2.2);
          ctx.rotate(foldAngle);

          // Outer dark casing contour
          ctx.fillStyle = '#0F172A';
          ctx.strokeStyle = '#0B1120';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, wheelRadius * (1 - p * 0.2), 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // High-contrast cyan coil ring
          ctx.strokeStyle = Config.COLORS.CYAN;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = Config.COLORS.CYAN;
          ctx.shadowBlur = 10 * p;
          ctx.beginPath();
          ctx.arc(0, 0, wheelRadius * 0.58, 0, Math.PI * 2);
          ctx.stroke();

          // White center plasma dot
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Tesla Roadster Sport Turbine Alloy Wheels
          // 1. Low-profile performance sport tire with dark cartoon contour
          ctx.fillStyle = '#0E1117';
          ctx.strokeStyle = '#07090E';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(0, 0, wheelRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // 2. Tread ring & outer shoulder detail
          ctx.strokeStyle = '#1E2530';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(0, 0, wheelRadius - 1.8, 0, Math.PI * 2);
          ctx.stroke();

          // 3. Ventilated ceramic brake disc behind spokes
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.arc(0, 0, wheelRadius - 3.8, 0, Math.PI * 2);
          ctx.fill();

          // 4. Performance Red Brake Caliper
          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          ctx.arc(0, 0, wheelRadius - 3.8, -Math.PI * 0.85, -Math.PI * 0.45);
          ctx.lineWidth = 3.2;
          ctx.strokeStyle = '#EF4444';
          ctx.stroke();

          // 5. Turbine alloy rim outer lip
          ctx.strokeStyle = '#64748B';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(0, 0, wheelRadius - 3.8, 0, Math.PI * 2);
          ctx.stroke();

          // 6. Rotating Sport Directional Turbine Spokes
          ctx.save();
          ctx.rotate(this.wheelRotation);
          ctx.strokeStyle = '#CBD5E1';
          ctx.lineWidth = 2.0;
          ctx.lineCap = 'round';
          for (let s = 0; s < 5; s++) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            const spokeAngle = (s * Math.PI * 2) / 5;
            ctx.lineTo(Math.cos(spokeAngle) * (wheelRadius - 4), Math.sin(spokeAngle) * (wheelRadius - 4));
            ctx.stroke();
          }
          ctx.restore();

          // 7. Center Aero Hubcap with dark contour
          ctx.fillStyle = '#0A0E1A';
          ctx.beginPath();
          ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#94A3B8';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.restore();
      });
    }

    _renderHeadlightBeam(ctx) {
      ctx.save();
      const beamGrad = ctx.createRadialGradient(
        this.width + 10, this.height * 0.55, 5,
        this.width + 120, this.height * 0.55, 140
      );
      beamGrad.addColorStop(0, 'rgba(0, 243, 255, 0.45)');
      beamGrad.addColorStop(0.4, 'rgba(0, 243, 255, 0.15)');
      beamGrad.addColorStop(1, 'rgba(0, 243, 255, 0)');

      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(this.width - 2, this.height * 0.45);
      ctx.lineTo(this.width + 200, this.height * 0.1);
      ctx.lineTo(this.width + 200, this.height * 1.0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    _renderLightningArcs(ctx) {
      ctx.save();
      ctx.strokeStyle = Config.COLORS.CYAN;
      ctx.lineWidth = 2;
      ctx.shadowColor = Config.COLORS.CYAN;
      ctx.shadowBlur = 8;

      for (const arc of this.lightningArcs) {
        ctx.beginPath();
        ctx.moveTo(arc.x1, arc.y1);
        const midX = (arc.x1 + arc.x2) / 2 + (Math.random() - 0.5) * 12;
        const midY = (arc.y1 + arc.y2) / 2 + (Math.random() - 0.5) * 12;
        ctx.lineTo(midX, midY);
        ctx.lineTo(arc.x2, arc.y2);
        ctx.stroke();
      }
      ctx.restore();
    }

    _renderShockwaves(ctx) {
      ctx.save();
      for (const sw of this.shockwaves) {
        const alpha = Math.max(0, sw.life / sw.maxLife);
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = 3 * alpha;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    _renderParticles(ctx) {
      ctx.save();
      for (const p of this.particles) {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  window.DesiRoadster.Player = Player;
  window.DesiRoadster.PLAYER_STATE = PLAYER_STATE;
})();
