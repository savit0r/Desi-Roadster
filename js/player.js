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

      // Horizontal bounds
      this.minX = 60;
      this.maxX = 380;

      // Hit & Health feedback
      this.invulnerableTimer = 0;
      this.health = 3; // 3 Chassis integrity lives
      this.isDead = false;
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
          this.battery = Math.min(Config.BATTERY_MAX, this.battery + Config.BATTERY_RECHARGE_ROAD * dt);
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
      const isFlying = this.state === PLAYER_STATE.FLIGHT || this.transformProgress > 0.15;

      // 1. Dual Ion Thruster Exhaust Trails (Flight & Takeoff)
      if (isFlying) {
        const p = this.transformProgress;
        // Upper & Lower Thruster Nozzles
        const nozzleOffsets = [this.height * 0.42, this.height * 0.68];
        nozzleOffsets.forEach(ny => {
          this.particles.push({
            x: this.x + 2,
            y: this.y + ny + (Math.random() - 0.5) * 4,
            vx: -(currentSpeed * 0.9 + 220 + Math.random() * 80),
            vy: (Math.random() - 0.5) * 20,
            size: (3 + Math.random() * 3.5) * p,
            color: Math.random() > 0.35 ? Config.COLORS.CYAN : '#FFFFFF',
            life: 0.22,
            maxLife: 0.22
          });
        });

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

      // 2. Update Particles
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

      // 3. Update Shockwave Rings
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

      // 4. Update Lightning Arcs
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

      // 4. Forward Headlight Beam
      this._renderHeadlightBeam(ctx);

      // 5. Dual Ion Jet Flames (Flight Mode)
      if (this.transformProgress > 0.1) {
        this._renderIonThrusterFlames(ctx);
      }

      // 6. Retractable Aero Wings (Extends outwards)
      if (this.transformProgress > 0.01) {
        this._renderFlightWings(ctx);
      }

      // 7. Aerodynamic Cyber Chassis Body
      this._renderChassis(ctx);

      // 8. Wheels / Hover Repulsor Pods
      this._renderWheels(ctx);

      // 9. Electric Lightning Arcs (during transformation)
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

    _renderIonThrusterFlames(ctx) {
      const p = this.transformProgress;
      const flameLength = (24 + Math.random() * 12) * p;

      ctx.save();
      const nozzleOffsets = [this.height * 0.42, this.height * 0.68];

      nozzleOffsets.forEach(ny => {
        // Outer Cyan Plasma Flame
        const grad = ctx.createLinearGradient(0, ny, -flameLength, ny);
        grad.addColorStop(0, 'rgba(0, 243, 255, 0.9)');
        grad.addColorStop(0.6, 'rgba(0, 150, 255, 0.5)');
        grad.addColorStop(1, 'rgba(0, 243, 255, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, ny - 4 * p);
        ctx.lineTo(-flameLength, ny);
        ctx.lineTo(0, ny + 4 * p);
        ctx.closePath();
        ctx.fill();

        // Inner White Core Flame
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.moveTo(0, ny - 2 * p);
        ctx.lineTo(-flameLength * 0.45, ny);
        ctx.lineTo(0, ny + 2 * p);
        ctx.closePath();
        ctx.fill();
      });

      ctx.restore();
    }

    _renderFlightWings(ctx) {
      const p = this.transformProgress;
      const wingLength = 36 * p;
      const wingY = this.height * 0.45;

      ctx.save();
      // Back Wing
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = Config.COLORS.CYAN;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = Config.COLORS.CYAN;
      ctx.shadowBlur = 10 * p;

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
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 6;
      ctx.fillRect(this.width * 0.12, wingY - wingLength, 4, 3);

      ctx.restore();
    }

    _renderChassis(ctx) {
      // 1. Aerodynamic Sleek Cyber Body
      const bodyGrad = ctx.createLinearGradient(0, 0, 0, this.height);
      bodyGrad.addColorStop(0, '#FFB347'); // Saffron highlight top
      bodyGrad.addColorStop(0.35, Config.COLORS.SAFFRON);
      bodyGrad.addColorStop(0.7, '#D45000');
      bodyGrad.addColorStop(1, '#661A00');

      ctx.save();

      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      // Rear bumper
      ctx.moveTo(0, this.height * 0.65);
      // Rear spoiler kick
      ctx.lineTo(2, this.height * 0.38);
      ctx.lineTo(12, this.height * 0.36);
      // Fastback roofline
      ctx.lineTo(34, this.height * 0.14);
      // Windshield & roof
      ctx.lineTo(68, this.height * 0.14);
      // Slanted hood
      ctx.lineTo(92, this.height * 0.48);
      // Front cyber bumper
      ctx.lineTo(this.width, this.height * 0.65);
      ctx.lineTo(this.width, this.height * 0.82);
      // Bottom side skirt
      ctx.lineTo(0, this.height * 0.82);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // 2. Cockpit Glass Canopy
      const glassGrad = ctx.createLinearGradient(35, 8, 75, 22);
      glassGrad.addColorStop(0, '#00F3FF');
      glassGrad.addColorStop(0.5, '#0F3057');
      glassGrad.addColorStop(1, '#051329');

      ctx.fillStyle = glassGrad;
      ctx.beginPath();
      ctx.moveTo(38, this.height * 0.18);
      ctx.lineTo(64, this.height * 0.18);
      ctx.lineTo(76, this.height * 0.45);
      ctx.lineTo(32, this.height * 0.45);
      ctx.closePath();
      ctx.fill();

      // Specular sheen
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(42, this.height * 0.22);
      ctx.lineTo(60, this.height * 0.22);
      ctx.stroke();

      // 3. Indian Tri-Color Cyber Accent Decal Stripe along side
      const stripeY = this.height * 0.58;
      ctx.lineWidth = 1.5;
      // Saffron band
      ctx.strokeStyle = '#FF9933';
      ctx.beginPath();
      ctx.moveTo(15, stripeY - 2);
      ctx.lineTo(82, stripeY - 2);
      ctx.stroke();
      // White cyber band
      ctx.strokeStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(18, stripeY);
      ctx.lineTo(84, stripeY);
      ctx.stroke();
      // Neon Green band
      ctx.strokeStyle = '#39FF14';
      ctx.beginPath();
      ctx.moveTo(21, stripeY + 2);
      ctx.lineTo(86, stripeY + 2);
      ctx.stroke();

      // 4. Front Cyber Headlight
      ctx.fillStyle = Config.COLORS.CYAN;
      ctx.shadowColor = Config.COLORS.CYAN;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(this.width - 2, this.height * 0.55);
      ctx.lineTo(this.width - 12, this.height * 0.52);
      ctx.lineTo(this.width - 8, this.height * 0.62);
      ctx.closePath();
      ctx.fill();

      // 5. Rear Cyber Taillight (Horizon lightbar)
      ctx.fillStyle = '#FF0055';
      ctx.shadowColor = '#FF0055';
      ctx.shadowBlur = 8;
      ctx.fillRect(0, this.height * 0.42, 5, 8);
      ctx.shadowBlur = 0;
    }

    _renderWheels(ctx) {
      const p = this.transformProgress;
      const wheelRadius = 14;
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

          // Glowing Repulsor ring
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(0, 0, wheelRadius * (1 - p * 0.2), 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = Config.COLORS.CYAN;
          ctx.lineWidth = 3;
          ctx.shadowColor = Config.COLORS.CYAN;
          ctx.shadowBlur = 12 * p;
          ctx.beginPath();
          ctx.arc(0, 0, wheelRadius * 0.6, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // Normal Road Wheel
          // Tire Rubber
          ctx.fillStyle = '#11141a';
          ctx.beginPath();
          ctx.arc(0, 0, wheelRadius, 0, Math.PI * 2);
          ctx.fill();

          // Alloy Rim
          ctx.fillStyle = '#2d3748';
          ctx.beginPath();
          ctx.arc(0, 0, wheelRadius - 4, 0, Math.PI * 2);
          ctx.fill();

          // Cyan LED Rim Accent
          ctx.strokeStyle = Config.COLORS.CYAN;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, wheelRadius - 4, 0, Math.PI * 2);
          ctx.stroke();

          // Rotating Alloy Spokes
          ctx.save();
          ctx.rotate(this.wheelRotation);
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 2;
          for (let s = 0; s < 5; s++) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            const spokeAngle = (s * Math.PI * 2) / 5;
            ctx.lineTo(Math.cos(spokeAngle) * (wheelRadius - 4), Math.sin(spokeAngle) * (wheelRadius - 4));
            ctx.stroke();
          }
          ctx.restore();

          // Center Hubcap
          ctx.fillStyle = Config.COLORS.SAFFRON;
          ctx.beginPath();
          ctx.arc(0, 0, 3, 0, Math.PI * 2);
          ctx.fill();
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
