/**
 * DESI ROADSTER - OBSTACLES & INDIAN ROAD TRAFFIC SYSTEM
 * Procedurally drawn Indian vehicles (Auto-rickshaws, Scooters, Ambassador Taxis)
 * and distinct animals (Zebu Cows with humps & Water Buffaloes with swept-back horns).
 * Includes fair lane-spawning, AABB collision boxes, and memory-safe culling.
 */

window.DesiRoadster = window.DesiRoadster || {};

(function() {
  const { Config } = window.DesiRoadster;

  // ==========================================================================
  // BASE OBSTACLE CLASS
  // ==========================================================================
  class Obstacle {
    constructor(laneIndex, x) {
      this.laneIndex = laneIndex;
      this.x = x || (Config.CANVAS_WIDTH + 80);
      this.y = 0;
      this.width = 70;
      this.height = 40;
      this.type = 'generic';

      // Relative speed multiplier (0 = static on road, >0 moves with traffic)
      this.speedMultiplier = 0.5;
      this.animTimer = Math.random() * Math.PI * 2;
      this.hitboxInset = { top: 4, bottom: 4, left: 6, right: 6 };
      this.hasNearMissed = false;
      this.hasCollided = false;
    }

    update(dt, worldSpeed) {
      this.animTimer += dt * 5;
      // Moving left relative to screen: road speed minus obstacle's own forward motion
      const effectiveSpeed = worldSpeed - (worldSpeed * this.speedMultiplier);
      this.x -= effectiveSpeed * dt;
    }

    getHitbox() {
      return {
        x: this.x + this.hitboxInset.left,
        y: this.y + this.hitboxInset.top,
        width: this.width - (this.hitboxInset.left + this.hitboxInset.right),
        height: this.height - (this.hitboxInset.top + this.hitboxInset.bottom)
      };
    }

    isOffscreen() {
      return (this.x + this.width) < -100;
    }

    render(ctx) {
      // Subclasses override
    }

    renderHitboxDebug(ctx) {
      const hb = this.getHitbox();
      ctx.save();
      ctx.strokeStyle = '#FF0055';
      ctx.lineWidth = 1;
      ctx.strokeRect(hb.x, hb.y, hb.width, hb.height);
      ctx.restore();
    }
  }

  // ==========================================================================
  // 1. AUTO-RICKSHAW (Classic Indian 3-Wheeler Tuk-Tuk)
  // ==========================================================================
  class AutoRickshaw extends Obstacle {
    constructor(laneIndex, x) {
      super(laneIndex, x);
      this.type = 'auto';
      this.width = 72;
      this.height = 46;
      this.speedMultiplier = 0.38; // Drives at steady auto pace
      this.hitboxInset = { top: 6, bottom: 2, left: 6, right: 6 };

      // Classic vibrant green & yellow CNG scheme or dark slate & yellow
      this.isGreenCNG = Math.random() > 0.4;
      this.bodyColor = this.isGreenCNG ? '#16A34A' : '#1E293B';
      this.yellowHood = '#FBBF24';

      // Feature 1: Indian Traffic AI - Lane Changing with Indicator Blinkers
      this.laneChangeTimer = 2.0 + Math.random() * 3.5;
      this.isChangingLane = false;
      this.targetLaneIndex = laneIndex;
      this.indicatorBlinking = false;
      this.indicatorTimer = 0;
      this.indicatorDirection = 'down';
    }

    update(dt, worldSpeed, allObstacles, lanes) {
      super.update(dt, worldSpeed);
      this._updateLaneChangeAI(dt, allObstacles, lanes);
    }

    _updateLaneChangeAI(dt, allObstacles, lanes) {
      if (!lanes) return;

      // 1. If currently shifting lane, smoothly interpolate Y
      if (this.isChangingLane) {
        const targetY = lanes[this.targetLaneIndex].y - (this.height / 2);
        const diff = targetY - this.y;
        const step = Math.sign(diff) * Math.min(Math.abs(diff), 80 * dt);
        this.y += step;
        if (Math.abs(this.y - targetY) < 1.5) {
          this.y = targetY;
          this.laneIndex = this.targetLaneIndex;
          this.isChangingLane = false;
          this.indicatorBlinking = false;
          this.laneChangeTimer = 3.5 + Math.random() * 4.0;
        }
        return;
      }

      // 2. If indicator is blinking, countdown to start lane change
      if (this.indicatorBlinking) {
        this.indicatorTimer -= dt;
        if (this.indicatorTimer <= 0) {
          this.isChangingLane = true;
        }
        return;
      }

      // 3. Periodic AI decision to change lane
      this.laneChangeTimer -= dt;
      if (this.laneChangeTimer <= 0) {
        this.laneChangeTimer = 3.0 + Math.random() * 3.5;

        let candidateLane = 1;
        if (this.laneIndex === 0) candidateLane = 1;
        else if (this.laneIndex === 2) candidateLane = 1;
        else candidateLane = Math.random() > 0.5 ? 0 : 2;

        // Fairness check: verify candidate lane is clear nearby
        let isSafe = true;
        if (allObstacles) {
          for (const obs of allObstacles) {
            if (obs !== this && obs.laneIndex === candidateLane) {
              if (Math.abs(obs.x - this.x) < 150) {
                isSafe = false;
                break;
              }
            }
          }
        }

        if (isSafe) {
          this.targetLaneIndex = candidateLane;
          this.indicatorBlinking = true;
          this.indicatorTimer = 0.55; // 0.55s visible warning blink before moving
          this.indicatorDirection = candidateLane > this.laneIndex ? 'down' : 'up';
        }
      }
    }

    onHonked() {
      // Swerve reaction to horn
      this.speedMultiplier = Math.min(0.65, this.speedMultiplier + 0.12);
      this.animTimer += 2.0;
    }

    render(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      // Subtle engine vibration idle
      const vibration = Math.sin(this.animTimer * 14) * 0.8;
      ctx.translate(0, vibration);

      // 1. Shadow underneath
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(this.width * 0.48, this.height * 0.94, this.width * 0.46, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Yellow Canopy Roof with Cartoon Contour & Gloss Highlight
      ctx.beginPath();
      ctx.moveTo(8, 6);
      ctx.quadraticCurveTo(this.width * 0.5, 2, this.width - 4, 10);
      ctx.lineTo(this.width - 6, 22);
      ctx.lineTo(4, 22);
      ctx.closePath();
      ctx.fillStyle = this.yellowHood;
      ctx.fill();

      // Bold cartoon outline on roof
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Canopy gloss curve highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(12, 8);
      ctx.quadraticCurveTo(this.width * 0.5, 5, this.width - 8, 12);
      ctx.stroke();

      // 3. Lower Body (Vibrant Green CNG or Dark Slate)
      ctx.beginPath();
      ctx.moveTo(4, 20);
      ctx.lineTo(this.width - 6, 20);
      ctx.lineTo(this.width - 2, 36);
      ctx.lineTo(this.width * 0.45, 36);
      // Front wheel cutout
      ctx.lineTo(this.width * 0.28, 32);
      ctx.lineTo(2, 32);
      ctx.closePath();
      ctx.fillStyle = this.bodyColor;
      ctx.fill();

      // Dark cartoon contour on body
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Yellow waistband accent stripe along lower body
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(4, 23, this.width - 8, 3.5);

      // 4. Front Slanted Windshield with Diagonal Glare
      ctx.beginPath();
      ctx.moveTo(4, 20);
      ctx.lineTo(14, 8);
      ctx.lineTo(26, 8);
      ctx.lineTo(22, 20);
      ctx.closePath();
      ctx.fillStyle = '#67E8F9';
      ctx.fill();

      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Specular glare reflection slash
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(8, 18);
      ctx.lineTo(20, 10);
      ctx.stroke();

      // 5. Open Passenger Cabin & Driver
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(28, 9, 32, 13);

      // Driver Silhouette with saffron/khaki turban or cap
      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.arc(22, 12, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FCD34D';
      ctx.beginPath();
      ctx.arc(22, 14, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#334155';
      ctx.fillRect(18, 18, 8, 8); // Driver uniform

      // Chrome Grab Rail / Side Bar
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(27, 8);
      ctx.lineTo(27, 24);
      ctx.moveTo(60, 8);
      ctx.lineTo(60, 24);
      ctx.stroke();

      // 6. Wheels (Front Single Wheel & Rear Wheel)
      this._renderWheel(ctx, 12, 34, 7);
      this._renderWheel(ctx, 54, 34, 8);

      // 7. Headlight with Chrome Ring Bezel & Rear Reflector
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.arc(2, 26, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(2, 26, 3, 0, Math.PI * 2);
      ctx.fill();

      // Rear hazard reflector
      ctx.fillStyle = '#EF4444';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.width - 4, 25, 3, 7);
      ctx.fillRect(this.width - 4, 25, 3, 7);

      // Flashing Indian Indicator Blinker
      if (this.indicatorBlinking && Math.floor(this.animTimer * 10) % 2 === 0) {
        ctx.save();
        ctx.fillStyle = '#F59E0B';
        ctx.shadowColor = '#F59E0B';
        ctx.shadowBlur = 8;
        const indY = this.indicatorDirection === 'down' ? 36 : 10;
        ctx.beginPath();
        ctx.arc(this.width - 6, indY, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    }

    _renderWheel(ctx, wx, wy, radius) {
      // Dark cartoon outer tire
      ctx.fillStyle = '#0D1117';
      ctx.strokeStyle = '#05070B';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(wx, wy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Silver Steel Rim
      ctx.fillStyle = '#CBD5E1';
      ctx.beginPath();
      ctx.arc(wx, wy, radius - 2.8, 0, Math.PI * 2);
      ctx.fill();

      // Hubcap center
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(wx, wy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ==========================================================================
  // 2. SCOOTER (Iconic Bajaj Chetak / Vespa with Rider)
  // ==========================================================================
  class Scooter extends Obstacle {
    constructor(laneIndex, x) {
      super(laneIndex, x);
      this.type = 'scooter';
      this.width = 54;
      this.height = 45;
      this.speedMultiplier = 0.52; // Quick and agile
      this.hitboxInset = { top: 8, bottom: 2, left: 6, right: 6 };

      // Classic Chetak colors (Sky Blue, Mint Green, Chetak Silver)
      const colors = ['#38BDF8', '#34D399', '#CBD5E1', '#FB7185'];
      this.scooterColor = colors[Math.floor(Math.random() * colors.length)];
      this.helmetColor = '#F59E0B';
    }

    render(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      // Rider bobbing
      const bob = Math.sin(this.animTimer * 10) * 0.7;

      // 1. Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(this.width * 0.5, this.height * 0.94, this.width * 0.4, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Helmeted Rider
      // Helmet with black visor
      ctx.fillStyle = this.helmetColor;
      ctx.beginPath();
      ctx.arc(22, 10 + bob, 6, 0, Math.PI * 2);
      ctx.fill();
      // Visor
      ctx.fillStyle = '#111827';
      ctx.fillRect(17, 9 + bob, 5, 3);

      // Rider Jacket & Arms reaching for handlebars
      ctx.fillStyle = '#374151';
      ctx.beginPath();
      ctx.moveTo(22, 16 + bob);
      ctx.lineTo(16, 26 + bob);
      ctx.lineTo(28, 28);
      ctx.lineTo(30, 20 + bob);
      ctx.closePath();
      ctx.fill();

      // 3. Front Apron / Leg-shield
      ctx.fillStyle = this.scooterColor;
      ctx.beginPath();
      ctx.moveTo(12, 18);
      ctx.lineTo(6, 32);
      ctx.lineTo(16, 34);
      ctx.lineTo(20, 24);
      ctx.closePath();
      ctx.fill();

      // Handlebar & Chrome Headlight
      ctx.strokeStyle = '#9CA3AF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(14, 20);
      ctx.lineTo(12, 16);
      ctx.stroke();

      ctx.fillStyle = '#FEF08A';
      ctx.shadowColor = '#FDE047';
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(10, 16, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 4. Bulbous Engine Cowl / Rear Body
      ctx.fillStyle = this.scooterColor;
      ctx.beginPath();
      ctx.ellipse(36, 30, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Long Single Seat
      ctx.fillStyle = '#1F2937';
      ctx.fillRect(20, 24 + bob * 0.3, 20, 4);

      // Mounted Spare Tire on rear
      ctx.fillStyle = '#374151';
      ctx.beginPath();
      ctx.arc(48, 28, 5, 0, Math.PI * 2);
      ctx.fill();

      // 5. Wheels
      this._renderWheel(ctx, 11, 36, 5);
      this._renderWheel(ctx, 38, 36, 5);

      ctx.restore();
    }

    _renderWheel(ctx, wx, wy, radius) {
      ctx.fillStyle = '#1F2937';
      ctx.beginPath();
      ctx.arc(wx, wy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#E5E7EB';
      ctx.beginPath();
      ctx.arc(wx, wy, radius - 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ==========================================================================
  // 3. INDIAN TAXI CAR (Ambassador Classic Yellow & Black Cab)
  // ==========================================================================
  class TaxiCar extends Obstacle {
    constructor(laneIndex, x) {
      super(laneIndex, x);
      this.type = 'car';
      this.width = 96;
      this.height = 42;
      this.speedMultiplier = 0.44; // Steady cruising
      this.hitboxInset = { top: 6, bottom: 2, left: 6, right: 6 };

      this.roofColor = '#FBBF24'; // Classic yellow top
      this.bodyColor = '#1F2937'; // Classic black lower doors

      // Feature 1: Indian Traffic AI - Taxi Lane Changing with Indicator Blinkers
      this.laneChangeTimer = 3.5 + Math.random() * 4.0;
      this.isChangingLane = false;
      this.targetLaneIndex = laneIndex;
      this.indicatorBlinking = false;
      this.indicatorTimer = 0;
      this.indicatorDirection = 'down';
    }

    update(dt, worldSpeed, allObstacles, lanes) {
      super.update(dt, worldSpeed);
      this._updateLaneChangeAI(dt, allObstacles, lanes);
    }

    _updateLaneChangeAI(dt, allObstacles, lanes) {
      if (!lanes) return;

      if (this.isChangingLane) {
        const targetY = lanes[this.targetLaneIndex].y - (this.height / 2);
        const diff = targetY - this.y;
        const step = Math.sign(diff) * Math.min(Math.abs(diff), 70 * dt);
        this.y += step;
        if (Math.abs(this.y - targetY) < 1.5) {
          this.y = targetY;
          this.laneIndex = this.targetLaneIndex;
          this.isChangingLane = false;
          this.indicatorBlinking = false;
          this.laneChangeTimer = 4.0 + Math.random() * 4.0;
        }
        return;
      }

      if (this.indicatorBlinking) {
        this.indicatorTimer -= dt;
        if (this.indicatorTimer <= 0) {
          this.isChangingLane = true;
        }
        return;
      }

      this.laneChangeTimer -= dt;
      if (this.laneChangeTimer <= 0) {
        this.laneChangeTimer = 3.5 + Math.random() * 4.0;

        let candidateLane = 1;
        if (this.laneIndex === 0) candidateLane = 1;
        else if (this.laneIndex === 2) candidateLane = 1;
        else candidateLane = Math.random() > 0.5 ? 0 : 2;

        let isSafe = true;
        if (allObstacles) {
          for (const obs of allObstacles) {
            if (obs !== this && obs.laneIndex === candidateLane) {
              if (Math.abs(obs.x - this.x) < 160) {
                isSafe = false;
                break;
              }
            }
          }
        }

        if (isSafe) {
          this.targetLaneIndex = candidateLane;
          this.indicatorBlinking = true;
          this.indicatorTimer = 0.6;
          this.indicatorDirection = candidateLane > this.laneIndex ? 'down' : 'up';
        }
      }
    }

    onHonked() {
      // Taxi accelerates slightly
      this.speedMultiplier = Math.min(0.68, this.speedMultiplier + 0.1);
      this.animTimer += 1.5;
    }

    render(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      // 1. Ground Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(this.width * 0.5, this.height * 0.94, this.width * 0.46, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Vintage Rounded Body Curves (Hindustan Ambassador)
      // Lower Black Body
      ctx.beginPath();
      ctx.moveTo(2, 28);
      ctx.lineTo(this.width - 2, 28);
      ctx.lineTo(this.width - 4, 34);
      ctx.lineTo(2, 34);
      ctx.closePath();
      ctx.fillStyle = this.bodyColor;
      ctx.fill();
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Yellow Upper Body & Doors
      ctx.beginPath();
      ctx.moveTo(4, 28);
      ctx.lineTo(16, 18);
      ctx.lineTo(76, 18);
      ctx.lineTo(this.width - 4, 28);
      ctx.closePath();
      ctx.fillStyle = this.roofColor;
      ctx.fill();
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Rounded Roof
      ctx.beginPath();
      ctx.moveTo(22, 18);
      ctx.lineTo(30, 8);
      ctx.lineTo(65, 8);
      ctx.lineTo(74, 18);
      ctx.closePath();
      ctx.fillStyle = this.roofColor;
      ctx.fill();
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Roof Cartoon Gloss Highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(32, 10);
      ctx.lineTo(63, 10);
      ctx.stroke();

      // Classic Taxi Checker Stripe along door beltline
      const stripeY = 27;
      for (let cx = 12; cx < this.width - 14; cx += 8) {
        ctx.fillStyle = (Math.floor(cx / 8) % 2 === 0) ? '#0F172A' : '#FBBF24';
        ctx.fillRect(cx, stripeY, 8, 2.5);
      }

      // 3. Cartoon Windows with Diagonal Glare
      ctx.fillStyle = '#67E8F9';
      // Front Windshield
      ctx.beginPath();
      ctx.moveTo(24, 17);
      ctx.lineTo(31, 10);
      ctx.lineTo(44, 10);
      ctx.lineTo(44, 17);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Front windshield glare slash
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(28, 16);
      ctx.lineTo(38, 11);
      ctx.stroke();

      // Rear Side Window
      ctx.fillStyle = '#67E8F9';
      ctx.beginPath();
      ctx.moveTo(48, 10);
      ctx.lineTo(63, 10);
      ctx.lineTo(71, 17);
      ctx.lineTo(48, 17);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Rear window glare slash
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(52, 16);
      ctx.lineTo(64, 11);
      ctx.stroke();

      // 4. Roof Carrier Rack with Luggage
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.8;
      ctx.strokeRect(34, 4, 30, 4);
      // Luggage boxes tied with rope
      ctx.fillStyle = '#B45309';
      ctx.fillRect(36, 1, 12, 4);
      ctx.fillStyle = '#047857';
      ctx.fillRect(50, 0, 11, 5);

      // Luggage tie ropes
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(42, 1);
      ctx.lineTo(42, 5);
      ctx.moveTo(56, 0);
      ctx.lineTo(56, 5);
      ctx.stroke();

      // 5. Chrome Bumpers & Round Headlight
      ctx.fillStyle = '#E2E8F0';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(0, 26, 3.5, 7);
      ctx.fillRect(0, 26, 3.5, 7); // Front bumper
      ctx.strokeRect(this.width - 3.5, 26, 3.5, 7);
      ctx.fillRect(this.width - 3.5, 26, 3.5, 7); // Rear bumper

      // Round front headlight with chrome bezel
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.arc(3.5, 23, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(3.5, 23, 3, 0, Math.PI * 2);
      ctx.fill();

      // Red taillight
      ctx.fillStyle = '#EF4444';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.width - 4, 22, 3, 4);
      ctx.fillRect(this.width - 4, 22, 3, 4);

      // 6. Wheels (Front & Rear)
      this._renderWheel(ctx, 20, 34, 8);
      this._renderWheel(ctx, 74, 34, 8);

      // Flashing Indian Indicator Blinker
      if (this.indicatorBlinking && Math.floor(this.animTimer * 10) % 2 === 0) {
        ctx.save();
        ctx.fillStyle = '#F59E0B';
        ctx.shadowColor = '#F59E0B';
        ctx.shadowBlur = 8;
        const indY = this.indicatorDirection === 'down' ? 32 : 12;
        ctx.beginPath();
        ctx.arc(this.width - 6, indY, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    }

    _renderWheel(ctx, wx, wy, radius) {
      // Dark cartoon outer tire
      ctx.fillStyle = '#0D1117';
      ctx.strokeStyle = '#05070B';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(wx, wy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Classic Chrome Dish Hubcap
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.arc(wx, wy, radius - 2.8, 0, Math.PI * 2);
      ctx.fill();

      // Center Chrome Boss Button
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(wx, wy, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ==========================================================================
  // 4. DESI COW (Sacred Zebu Cow with characteristic hump & horns)
  // ==========================================================================
  class DesiCow extends Obstacle {
    constructor(laneIndex, x) {
      super(laneIndex, x);
      this.type = 'cow';
      this.width = 78;
      this.height = 48;
      this.speedMultiplier = 0.05; // Almost stationary relative to the road
      this.hitboxInset = { top: 6, bottom: 2, left: 6, right: 6 };

      // Holy white or light fawn coat
      this.coatColor = Math.random() > 0.5 ? '#F8FAFC' : '#F1E9DA';
      this.spotColor = '#D4C4B5';

      // Feature 1: Animal Hesitation & Right-of-Way
      this.hesitationTimer = 2.5 + Math.random() * 3.5;
      this.isHesitating = false;
    }

    update(dt, worldSpeed) {
      this.animTimer += dt * 5;
      this.hesitationTimer -= dt;
      if (this.hesitationTimer <= 0) {
        this.isHesitating = !this.isHesitating;
        this.hesitationTimer = this.isHesitating ? (1.2 + Math.random() * 1.5) : (3.5 + Math.random() * 4.0);
      }
      const actualMultiplier = this.isHesitating ? 0.0 : this.speedMultiplier;
      const effectiveSpeed = worldSpeed - (worldSpeed * actualMultiplier);
      this.x -= effectiveSpeed * dt;
    }

    onHonked() {
      // Cow twitches ears, calmly maintains right of way
      this.animTimer += 2.5;
    }

    render(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      // Gentle chewing and tail swish
      const chew = Math.sin(this.animTimer * 6) * 1.2;
      const tailSwish = Math.sin(this.animTimer * 4) * 4;
      const isBlink = Math.sin(this.animTimer * 1.8) > 0.93;

      // 1. Ground Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.beginPath();
      ctx.ellipse(this.width * 0.5, this.height * 0.94, this.width * 0.45, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Swishing Tail with Cartoon Brush
      ctx.strokeStyle = this.coatColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(this.width - 12, 18);
      ctx.quadraticCurveTo(this.width - 2, 26 + tailSwish, this.width - 4, 34);
      ctx.stroke();

      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Black tail tuft
      ctx.fillStyle = '#1F2937';
      ctx.beginPath();
      ctx.arc(this.width - 4, 34, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // 3. Legs & Hooves (4 legs with dark cartoon contour)
      ctx.fillStyle = this.coatColor;
      // Front legs
      ctx.fillRect(18, 28, 5, 16);
      ctx.fillRect(26, 26, 5, 18);
      // Back legs
      ctx.fillRect(52, 26, 5, 18);
      ctx.fillRect(59, 28, 5, 16);

      // Cartoon leg outlines
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(18, 28, 5, 16);
      ctx.strokeRect(26, 26, 5, 18);
      ctx.strokeRect(52, 26, 5, 18);
      ctx.strokeRect(59, 28, 5, 16);

      // Dark hooves with outline
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(18, 42, 5, 3.5);
      ctx.fillRect(26, 42, 5, 3.5);
      ctx.fillRect(52, 42, 5, 3.5);
      ctx.fillRect(59, 42, 5, 3.5);

      // 4. Main Torso Body with Cartoon Outline
      ctx.fillStyle = this.coatColor;
      ctx.beginPath();
      ctx.ellipse(40, 22, 24, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // 5. PROMINENT ZEBU HUMP (Iconic Indian Cow feature with contour)
      ctx.fillStyle = this.coatColor;
      ctx.beginPath();
      ctx.arc(30, 11, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Natural patches/spots
      ctx.fillStyle = this.spotColor;
      ctx.beginPath();
      ctx.arc(42, 20, 6, 0, Math.PI * 2);
      ctx.arc(50, 18, 5, 0, Math.PI * 2);
      ctx.fill();

      // 6. Neck Dewlap (folded skin below neck)
      ctx.fillStyle = this.coatColor;
      ctx.beginPath();
      ctx.moveTo(14, 16);
      ctx.quadraticCurveTo(18, 28, 26, 26);
      ctx.lineTo(24, 18);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // 7. Head & Snout (facing left towards traffic)
      ctx.fillStyle = this.coatColor;
      ctx.beginPath();
      ctx.ellipse(12, 14 + chew * 0.3, 9, 7, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Pinkish muzzle/nose with nostrils
      ctx.fillStyle = '#FDA4AF';
      ctx.beginPath();
      ctx.arc(6, 16 + chew * 0.5, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Nostril dots
      ctx.fillStyle = '#881337';
      ctx.beginPath();
      ctx.arc(5, 15.5 + chew * 0.5, 1, 0, Math.PI * 2);
      ctx.arc(7.2, 16.5 + chew * 0.5, 1, 0, Math.PI * 2);
      ctx.fill();

      // Expressive Cartoon Eye with Safe Blink Animation
      const eyeY = 12;
      if (isBlink) {
        // Closed happy eyelid arc
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(13, eyeY + 1, 2.2, 0.2, Math.PI - 0.2);
        ctx.stroke();
      } else {
        // Open dark eye with white catchlight reflection
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(13, eyeY, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(12.2, eyeY - 0.8, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // 8. Curved Graceful Horns (Pointed upward with light bone fill & dark tips)
      // Horn 1 (Outer / Right)
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(15, 9);
      ctx.quadraticCurveTo(18, 2, 16, -2);
      ctx.stroke();

      ctx.strokeStyle = '#F1F5F9';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(15, 9);
      ctx.quadraticCurveTo(18, 2, 16, -2);
      ctx.stroke();

      // Dark horn tip
      ctx.fillStyle = '#334155';
      ctx.fillRect(15.5, -3, 2, 2.5);

      // Horn 2 (Inner / Left)
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(11, 9);
      ctx.quadraticCurveTo(13, 3, 11, -1);
      ctx.stroke();

      ctx.strokeStyle = '#F1F5F9';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(11, 9);
      ctx.quadraticCurveTo(13, 3, 11, -1);
      ctx.stroke();

      ctx.fillStyle = '#334155';
      ctx.fillRect(10.5, -2, 2, 2);

      // Drooping friendly ear with inner pink
      ctx.fillStyle = this.coatColor;
      ctx.beginPath();
      ctx.ellipse(16, 14, 4.5, 2.5, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.fillStyle = '#FDA4AF';
      ctx.beginPath();
      ctx.ellipse(16, 14, 2.8, 1.4, 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // ==========================================================================
  // 5. DESI BUFFALO (Muscular Charcoal Water Buffalo with Swept-Back Horns)
  // ==========================================================================
  class DesiBuffalo extends Obstacle {
    constructor(laneIndex, x) {
      super(laneIndex, x);
      this.type = 'buffalo';
      this.width = 86;
      this.height = 48;
      this.speedMultiplier = 0.04; // Extremely calm & slow obstacle
      this.hitboxInset = { top: 6, bottom: 2, left: 6, right: 6 };

      this.bodyColor = '#243042'; // Dark slate-charcoal hide
      this.snoutColor = '#3B485A';

      // Feature 1: Buffalo Hesitation
      this.hesitationTimer = 3.0 + Math.random() * 4.0;
      this.isHesitating = false;
    }

    update(dt, worldSpeed) {
      this.animTimer += dt * 5;
      this.hesitationTimer -= dt;
      if (this.hesitationTimer <= 0) {
        this.isHesitating = !this.isHesitating;
        this.hesitationTimer = this.isHesitating ? (1.5 + Math.random() * 1.5) : (4.0 + Math.random() * 4.0);
      }
      const actualMultiplier = this.isHesitating ? 0.0 : this.speedMultiplier;
      const effectiveSpeed = worldSpeed - (worldSpeed * actualMultiplier);
      this.x -= effectiveSpeed * dt;
    }

    onHonked() {
      // Buffalo grunts, shifts slightly
      this.animTimer += 2.0;
    }

    render(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      const headBob = Math.sin(this.animTimer * 4) * 0.8;
      const isBlink = Math.sin(this.animTimer * 1.8 + 1.2) > 0.93;

      // 1. Ground Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(this.width * 0.5, this.height * 0.94, this.width * 0.46, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Thick Stocky Legs with Dark Contours
      ctx.fillStyle = this.bodyColor;
      ctx.fillRect(20, 28, 7, 16);
      ctx.fillRect(29, 26, 7, 18);
      ctx.fillRect(58, 26, 7, 18);
      ctx.fillRect(67, 28, 7, 16);

      ctx.strokeStyle = '#0B1120';
      ctx.lineWidth = 1.8;
      ctx.strokeRect(20, 28, 7, 16);
      ctx.strokeRect(29, 26, 7, 18);
      ctx.strokeRect(58, 26, 7, 18);
      ctx.strokeRect(67, 28, 7, 16);

      // Heavy Hooves
      ctx.fillStyle = '#080C14';
      ctx.fillRect(20, 42, 7, 3.5);
      ctx.fillRect(29, 42, 7, 3.5);
      ctx.fillRect(58, 42, 7, 3.5);
      ctx.fillRect(67, 42, 7, 3.5);

      // 3. Heavy Stocky Torso (No hump, broad cartoon shoulders)
      ctx.fillStyle = this.bodyColor;
      ctx.beginPath();
      ctx.ellipse(46, 22, 28, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Muscular Spine Top Highlight
      ctx.strokeStyle = '#3A4B63';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(46, 22, 27, -Math.PI * 0.75, -Math.PI * 0.25);
      ctx.stroke();

      // Outer Torso Contour
      ctx.strokeStyle = '#0B1120';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(46, 22, 28, 14, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Heavy Neck
      ctx.fillStyle = this.bodyColor;
      ctx.beginPath();
      ctx.moveTo(18, 14);
      ctx.lineTo(34, 12);
      ctx.lineTo(34, 28);
      ctx.lineTo(16, 26);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0B1120';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 4. Head & Broad Muzzle
      ctx.fillStyle = this.bodyColor;
      ctx.beginPath();
      ctx.ellipse(14, 16 + headBob, 11, 8, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0B1120';
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Wide flat snout with nostrils
      ctx.fillStyle = this.snoutColor;
      ctx.beginPath();
      ctx.ellipse(7, 18 + headBob, 5.5, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0B1120';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Nostril slits
      ctx.fillStyle = '#080C14';
      ctx.beginPath();
      ctx.arc(6, 17.5 + headBob, 1.2, 0, Math.PI * 2);
      ctx.arc(8.5, 18.5 + headBob, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Small Calm Eye with Safe Blink
      const bufEyeY = 14 + headBob;
      if (isBlink) {
        ctx.strokeStyle = '#080C14';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(15, bufEyeY + 0.8, 1.8, 0.2, Math.PI - 0.2);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#080C14';
        ctx.beginPath();
        ctx.arc(15, bufEyeY, 1.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(14.5, bufEyeY - 0.6, 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. WIDE SWEPT-BACK CRESCENT HORNS (High-contrast Murrah crescent horns)
      // Horn 1 (Outer heavy horn sweep)
      ctx.strokeStyle = '#0B1120';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(18, 12 + headBob);
      ctx.quadraticCurveTo(24, -1 + headBob, 33, 5 + headBob);
      ctx.stroke();

      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(18, 12 + headBob);
      ctx.quadraticCurveTo(24, -1 + headBob, 33, 5 + headBob);
      ctx.stroke();

      // Horn 2 (Inner horn sweep)
      ctx.strokeStyle = '#0B1120';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(14, 10 + headBob);
      ctx.quadraticCurveTo(20, 1 + headBob, 29, 6 + headBob);
      ctx.stroke();

      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(14, 10 + headBob);
      ctx.quadraticCurveTo(20, 1 + headBob, 29, 6 + headBob);
      ctx.stroke();

      // 6. Tail with brush
      ctx.strokeStyle = this.bodyColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(74, 18);
      ctx.lineTo(82, 32);
      ctx.stroke();

      ctx.strokeStyle = '#0B1120';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = '#0B1120';
      ctx.beginPath();
      ctx.arc(82, 33, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // ==========================================================================
  // 6. COLLECTIBLE COIN (Indian Rupee Gold Coin / Energy Orb)
  // ==========================================================================
  class Coin {
    constructor(x, y, isAir = false) {
      this.x = x;
      this.y = y;
      this.radius = 12;
      this.isAir = isAir;
      this.collected = false;
      this.animTimer = Math.random() * Math.PI * 2;
    }

    update(dt, worldSpeed) {
      this.animTimer += dt * 6;
      this.x -= worldSpeed * dt;
    }

    isOffscreen() {
      return (this.x + this.radius) < -50;
    }

    render(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      // 3D spinning coin perspective using horizontal scale
      const scaleX = Math.cos(this.animTimer);
      ctx.scale(scaleX, 1);

      // Gold radiant glow
      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, this.radius);
      grad.addColorStop(0, '#FFFBEB');
      grad.addColorStop(0.5, '#F59E0B');
      grad.addColorStop(1, '#B45309');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
      ctx.fill();

      // Shiny outer gold rim
      ctx.strokeStyle = '#FDE68A';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Indian Rupee Symbol ₹
      if (Math.abs(scaleX) > 0.35) {
        ctx.fillStyle = '#78350F';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('₹', 0, 1);
      }

      ctx.restore();
    }
  }

  // ==========================================================================
  // AERIAL HAZARD 1: OVERHEAD ELECTRICAL WIRES (Tangled Indian Power Cables)
  // ==========================================================================
  class AerialWireHazard {
    constructor(x, y) {
      this.type = 'aerial_wires';
      this.x = x || (Config.CANVAS_WIDTH + 80);
      this.y = y || 165; // Wire altitude (typically 120 - 190)
      this.width = 240;  // Span of wires across the flight corridor
      this.height = 36;  // Sag vertical zone
      this.speedMultiplier = 0.0; // Static in world, scrolls with full worldSpeed
      this.animTimer = Math.random() * Math.PI * 2;

      this.hasCollided = false;
      this.hasNearMissed = false;

      // Pole structure anchor (rooted at roadside ground)
      this.poleWidth = 14;
      this.poleHeight = Config.ROAD_TOP_Y - this.y;

      // Sag depth of the electrical cables in pixels
      this.sag = 14;
    }

    update(dt, worldSpeed) {
      this.animTimer += dt * 3;
      this.x -= worldSpeed * dt;
    }

    isOffscreen() {
      return (this.x + this.width) < -150;
    }

    /**
     * Hitbox: The electrical cables form a horizontal corridor with slight vertical sag.
     * The pole on the left also has a physical post collision.
     */
    checkCollision(player) {
      if (!player || player.isDead) return false;
      // Completely immune if grounded or driving on road
      if (player.mode === 'ROAD' && player.isGrounded) return false;

      const pHitbox = player.getHitbox ? player.getHitbox() : {
        x: player.x + 4,
        y: player.y + 4,
        width: player.width - 8,
        height: player.height - 8
      };

      // 1. Check Wire Span Corridor (X: this.x to this.x + this.width, Y: this.y - 6 to this.y + this.sag + 4)
      const wireLeft = this.x;
      const wireRight = this.x + this.width;
      const wireTop = this.y - 6;
      const wireBottom = this.y + this.sag + 4;

      const wireOverlap = (
        pHitbox.x < wireRight &&
        pHitbox.x + pHitbox.width > wireLeft &&
        pHitbox.y < wireBottom &&
        pHitbox.y + pHitbox.height > wireTop
      );

      // 2. Check Pole Collision (X: this.x - 4 to this.x + 10, Y: this.y - 14 to Config.ROAD_TOP_Y)
      const poleLeft = this.x - 4;
      const poleRight = this.x + 10;
      const poleTop = this.y - 14;
      const poleBottom = Config.ROAD_TOP_Y;

      const poleOverlap = (
        pHitbox.x < poleRight &&
        pHitbox.x + pHitbox.width > poleLeft &&
        pHitbox.y < poleBottom &&
        pHitbox.y + pHitbox.height > poleTop
      );

      return wireOverlap || poleOverlap;
    }

    checkNearMiss(player) {
      if (!player || player.isDead || this.hasCollided || this.hasNearMissed) return false;
      if (player.mode === 'ROAD' && player.isGrounded) return false;

      const pHitbox = player.getHitbox ? player.getHitbox() : {
        x: player.x + 4,
        y: player.y + 4,
        width: player.width - 8,
        height: player.height - 8
      };

      // Near miss triggers as player clears the middle of the wire span
      const midWireX = this.x + this.width * 0.5;
      const isPastCenter = (pHitbox.x > midWireX) && (pHitbox.x < this.x + this.width + 50);
      if (!isPastCenter) return false;

      const playerCenterY = pHitbox.y + pHitbox.height * 0.5;
      const wireCenterY = this.y + this.sag * 0.5;
      const vertDist = Math.abs(playerCenterY - wireCenterY);

      // Narrow fly-over or fly-under clearance
      return vertDist >= 22 && vertDist <= 68;
    }

    render(ctx) {
      ctx.save();

      const breeze = Math.sin(this.animTimer) * 1.5;
      const sagY = this.y + this.sag + breeze;
      const midX = this.x + this.width * 0.5;
      const rightX = this.x + this.width;

      // 1. Roadside Concrete Utility Pole (Left anchor)
      const groundY = Config.ROAD_TOP_Y;
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.0;

      // Main vertical pole
      ctx.fillRect(this.x - 4, this.y - 14, 8, groundY - (this.y - 14));
      ctx.strokeRect(this.x - 4, this.y - 14, 8, groundY - (this.y - 14));

      // Dual Crossarms
      ctx.fillStyle = '#475569';
      ctx.fillRect(this.x - 14, this.y - 12, 28, 5);
      ctx.strokeRect(this.x - 14, this.y - 12, 28, 5);

      ctx.fillRect(this.x - 10, this.y + 2, 20, 4);
      ctx.strokeRect(this.x - 10, this.y + 2, 20, 4);

      // Ceramic Cup Insulators
      ctx.fillStyle = '#E2E8F0';
      [-12, -4, 4, 12].forEach(ox => {
        ctx.fillRect(this.x + ox - 2, this.y - 17, 4, 5);
        ctx.strokeRect(this.x + ox - 2, this.y - 17, 4, 5);
      });

      // 2. High-Voltage Warning Danger Plaque on Pole
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(this.x - 8, this.y + 16, 16, 10);
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x - 8, this.y + 16, 16, 10);
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('440V', this.x, this.y + 24);

      // 3. Hanging Catenary Electrical Wires (3 chaotic lines)
      const wireOffsets = [-10, -2, 6];
      wireOffsets.forEach((wo, idx) => {
        const wireSag = sagY + wo;
        const startY = this.y + wo * 0.6;
        const endY = this.y + wo * 0.6 + (idx === 1 ? 4 : 0);

        // Dark navy cartoon outer stroke for crisp sunset contrast
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(this.x, startY);
        ctx.quadraticCurveTo(midX, wireSag + 1, rightX, endY);
        ctx.stroke();

        // Core wire line
        ctx.strokeStyle = idx === 1 ? '#1E293B' : '#334155';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(this.x, startY);
        ctx.quadraticCurveTo(midX, wireSag, rightX, endY);
        ctx.stroke();

        // Warning Aerial Marker Spheres (Indian aviation/highway marker beads)
        const beadX = this.x + this.width * (0.35 + idx * 0.25);
        const beadT = (beadX - this.x) / this.width;
        const beadY = (1 - beadT) * (1 - beadT) * startY + 2 * (1 - beadT) * beadT * wireSag + beadT * beadT * endY;

        ctx.fillStyle = idx === 1 ? '#EF4444' : '#F59E0B'; // Vivid red / amber marker beads
        ctx.beginPath();
        ctx.arc(beadX, beadY, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Specular bead highlight
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(beadX - 1.2, beadY - 1.2, 1.2, 0, Math.PI * 2);
        ctx.fill();
      });

      // 4. Subtle Electric Ion Sparkle (occasional live-wire crackle)
      if (Math.sin(this.animTimer * 12) > 0.85) {
        ctx.fillStyle = '#00F3FF';
        ctx.shadowColor = '#00F3FF';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(midX + Math.sin(this.animTimer * 8) * 30, sagY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // ==========================================================================
  // AERIAL HAZARD 2: FIGHTER-KITE STRING (Manja / Patang Hazard)
  // ==========================================================================
  class KiteStringHazard {
    constructor(x, y) {
      this.type = 'kite_string';
      this.x = x || (Config.CANVAS_WIDTH + 80);
      this.y = y || 140; // Altitude of the kite
      this.width = 130;  // Horizontal span of the string corridor
      this.height = 110; // Vertical span of the string corridor
      this.speedMultiplier = 0.12; // Kites drift slowly against wind
      this.animTimer = Math.random() * Math.PI * 2;

      this.hasCollided = false;
      this.hasNearMissed = false;

      // Color scheme for the Indian fighter kite (patang)
      const schemes = [
        { primary: '#FF007F', secondary: '#FF9933' }, // Pink & Saffron
        { primary: '#00F3FF', secondary: '#39FF14' }, // Cyan & Neon Green
        { primary: '#FFC83B', secondary: '#EF4444' }  // Sun Yellow & Crimson
      ];
      this.scheme = schemes[Math.floor(Math.random() * schemes.length)];
      this.kiteSize = 18;
    }

    update(dt, worldSpeed) {
      this.animTimer += dt * 4;
      // Moves left with world speed minus subtle kite drift
      const effectiveSpeed = worldSpeed - (worldSpeed * this.speedMultiplier);
      this.x -= effectiveSpeed * dt;
    }

    isOffscreen() {
      return (this.x + this.width) < -150;
    }

    /**
     * Hitbox: Tests intersection with the taut diagonal kite string running
     * from top kite (x + 35, y - 25) down-right to (x + 115, y + 65).
     */
    checkCollision(player) {
      if (!player || player.isDead) return false;
      // Road driving is completely immune
      if (player.mode === 'ROAD' && player.isGrounded) return false;

      const pHitbox = player.getHitbox ? player.getHitbox() : {
        x: player.x + 4,
        y: player.y + 4,
        width: player.width - 8,
        height: player.height - 8
      };

      // String line endpoints in world coordinates
      const x1 = this.x + 35;
      const y1 = this.y - 25 + Math.sin(this.animTimer * 2) * 3;
      const x2 = this.x + 115;
      const y2 = this.y + 65;

      const pCenterX = pHitbox.x + pHitbox.width * 0.5;

      // Check if player's X overlaps the string horizontal range with margin
      if (pHitbox.x + pHitbox.width < x1 - 10 || pHitbox.x > x2 + 10) return false;

      // Calculate string Y at player's center X
      const t = Math.max(0, Math.min(1, (pCenterX - x1) / (x2 - x1)));
      const stringY = y1 + t * (y2 - y1);

      // Collision if player hitbox envelops or crosses the string Y within tolerance
      const isYOverlap = (pHitbox.y < stringY + 8) && (pHitbox.y + pHitbox.height > stringY - 8);
      return isYOverlap;
    }

    checkNearMiss(player) {
      if (!player || player.isDead || this.hasCollided || this.hasNearMissed) return false;
      if (player.mode === 'ROAD' && player.isGrounded) return false;

      const pHitbox = player.getHitbox ? player.getHitbox() : {
        x: player.x + 4,
        y: player.y + 4,
        width: player.width - 8,
        height: player.height - 8
      };

      const x1 = this.x + 35;
      const x2 = this.x + 115;
      const y1 = this.y - 25;
      const y2 = this.y + 65;

      const pCenterX = pHitbox.x + pHitbox.width * 0.5;
      const isPastCenter = (pCenterX > (x1 + x2) * 0.45) && (pCenterX < x2 + 45);
      if (!isPastCenter) return false;

      const t = Math.max(0, Math.min(1, (pCenterX - x1) / (x2 - x1)));
      const stringY = y1 + t * (y2 - y1);
      const pCenterY = pHitbox.y + pHitbox.height * 0.5;
      const vertDist = Math.abs(pCenterY - stringY);

      return vertDist >= 20 && vertDist <= 65;
    }

    render(ctx) {
      ctx.save();

      // Fluttering kite motion
      const flutter = Math.sin(this.animTimer * 3.5) * 4;
      const kiteX = this.x + 35;
      const kiteY = this.y - 25 + flutter;

      // Anchor string runs diagonally downward to lower-right
      const anchorX = this.x + 115;
      const anchorY = this.y + 65;

      // 1. Taut Glass-Coated Manja String (with dark outline for sunset readability)
      // Dark under-stroke
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(kiteX, kiteY);
      ctx.lineTo(anchorX, anchorY);
      ctx.stroke();

      // Shimmering glass-coated core (White / Ice-cyan reflection)
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(kiteX, kiteY);
      ctx.lineTo(anchorX, anchorY);
      ctx.stroke();

      // 2. Fluttering Paper Warning Ribbons on the String
      const ribbonPositions = [0.3, 0.65];
      ribbonPositions.forEach((rp, idx) => {
        const rx = kiteX + (anchorX - kiteX) * rp;
        const ry = kiteY + (anchorY - kiteY) * rp;
        const ribbonWave = Math.sin(this.animTimer * 5 + idx * 2) * 5;

        ctx.fillStyle = idx === 0 ? '#FF0055' : '#FF9933';
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.quadraticCurveTo(rx - 6, ry + ribbonWave, rx - 10, ry + ribbonWave * 1.5);
        ctx.lineTo(rx - 8, ry + ribbonWave * 1.5 + 3);
        ctx.lineTo(rx, ry + 2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // 3. Indian Fighter Kite (Patang) at the apex
      ctx.save();
      ctx.translate(kiteX, kiteY);
      ctx.rotate(Math.sin(this.animTimer * 2.5) * 0.12);

      const s = this.kiteSize;

      // Diamond Body Upper Half (Primary Color)
      ctx.fillStyle = this.scheme.primary;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s, 0);
      ctx.lineTo(0, 0);
      ctx.lineTo(-s, 0);
      ctx.closePath();
      ctx.fill();

      // Diamond Body Lower Half (Secondary Color)
      ctx.fillStyle = this.scheme.secondary;
      ctx.beginPath();
      ctx.moveTo(-s, 0);
      ctx.lineTo(0, 0);
      ctx.lineTo(s, 0);
      ctx.lineTo(0, s * 1.15);
      ctx.closePath();
      ctx.fill();

      // Dark Precision Cartoon Outline
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s, 0);
      ctx.lineTo(0, s * 1.15);
      ctx.lineTo(-s, 0);
      ctx.closePath();
      ctx.stroke();

      // Curved Bamboo Spine (Thattha) & Cross-Bow Spar
      ctx.strokeStyle = '#FDE68A';
      ctx.lineWidth = 1.4;
      // Vertical central spine
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(0, s * 1.15);
      ctx.stroke();

      // Bow cross-spar
      ctx.beginPath();
      ctx.moveTo(-s, 0);
      ctx.quadraticCurveTo(0, -s * 0.45, s, 0);
      ctx.stroke();

      // Triangular Paper Tail
      ctx.fillStyle = this.scheme.primary;
      ctx.beginPath();
      ctx.moveTo(-s * 0.35, s * 1.15);
      ctx.lineTo(s * 0.35, s * 1.15);
      ctx.lineTo(0, s * 1.7);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.restore();

      ctx.restore();
    }
  }

  // ==========================================================================
  // DESI TRUCK (Classic Indian Tata 1613 Highway Cargo Truck with "HORN OK PLEASE")
  // ==========================================================================
  class DesiTruck extends Obstacle {
    constructor(laneIndex, x) {
      super(laneIndex, x);
      this.type = 'truck';
      this.width = 122;
      this.height = 54;
      this.speedMultiplier = 0.30; // Heavy, steady highway cruiser
      this.hitboxInset = { top: 6, bottom: 2, left: 8, right: 8 };

      const colors = ['#EAB308', '#2563EB', '#16A34A', '#DC2626'];
      this.truckColor = colors[Math.floor(Math.random() * colors.length)];
      this.cargoColor = '#B45309';
    }

    onHonked() {
      // Truck stays its course, slight engine rumble
      this.animTimer += 1.0;
    }

    render(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      const vib = Math.sin(this.animTimer * 16) * 0.7;
      ctx.translate(0, vib);

      // 1. Ground Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(this.width * 0.5, this.height * 0.94, this.width * 0.48, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Wooden Cargo Carrier Body (Rear & Center)
      ctx.fillStyle = this.cargoColor;
      ctx.fillRect(28, 8, this.width - 32, 34);

      // Dark cartoon outline on cargo bed
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.4;
      ctx.strokeRect(28, 8, this.width - 32, 34);

      // Wooden planks horizontal dividers
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 1.5;
      [16, 24, 32].forEach(py => {
        ctx.beginPath();
        ctx.moveTo(28, py);
        ctx.lineTo(this.width - 4, py);
        ctx.stroke();
      });

      // Hand-painted "HORN OK PLEASE" script on tailgate
      ctx.fillStyle = '#FEF08A';
      ctx.font = '900 8.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.6;
      ctx.strokeText('HORN  OK  PLEASE', 72, 28);
      ctx.fillText('HORN  OK  PLEASE', 72, 28);

      // Festive Marigold / Lotus decorative crown banner along top cargo rail
      for (let bx = 32; bx < this.width - 10; bx += 14) {
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(bx, 8, 3.5, 0, Math.PI);
        ctx.fill();
      }

      // 3. Heavy Front Truck Cab (Tata rounded bonnet & windshield)
      ctx.fillStyle = this.truckColor;
      ctx.beginPath();
      ctx.moveTo(4, 26);
      ctx.lineTo(16, 12);
      ctx.lineTo(34, 12);
      ctx.lineTo(34, 42);
      ctx.lineTo(4, 42);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // Cab Sun-Visor with garland
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(14, 10, 20, 3.5);

      // Windshield with light blue glare
      ctx.fillStyle = '#67E8F9';
      ctx.beginPath();
      ctx.moveTo(17, 14);
      ctx.lineTo(32, 14);
      ctx.lineTo(32, 24);
      ctx.lineTo(13, 24);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Front Chrome Grille with Horizontal slats
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(4, 28, 6, 12);
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1;
      ctx.strokeRect(4, 28, 6, 12);

      // Round Projector Headlight
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(3, 34, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // 4. Swinging Nazar Battu (Black pom-pom charm under rear bumper)
      const sway = Math.sin(this.animTimer * 8) * 4;
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(this.width - 10, 42);
      ctx.lineTo(this.width - 10 + sway, 48);
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(this.width - 10 + sway, 49, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // 5. Heavy Dual Wheels & Hubs
      this._renderTruckWheel(ctx, 18, 44, 7.5);
      this._renderTruckWheel(ctx, 80, 44, 7.5);
      this._renderTruckWheel(ctx, 102, 44, 7.5);

      ctx.restore();
    }

    _renderTruckWheel(ctx, wx, wy, radius) {
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(wx, wy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#05070B';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.fillStyle = '#64748B';
      ctx.beginPath();
      ctx.arc(wx, wy, radius - 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(wx, wy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ==========================================================================
  // POTHOLE OBSTACLE (Indian Road Condition Hazard: Standard & Launch Craters)
  // ==========================================================================
  class PotholeObstacle extends Obstacle {
    constructor(laneIndex, x, potholeType = 'standard') {
      super(laneIndex, x);
      this.type = 'pothole';
      this.potholeType = potholeType; // 'standard' or 'large'
      this.speedMultiplier = 0.0; // Stationary road defect
      this.width = potholeType === 'large' ? 82 : 58;
      this.height = potholeType === 'large' ? 22 : 16;
      this.hitboxInset = { top: 2, bottom: 2, left: 8, right: 8 };
      this.hasTriggered = false;
    }

    checkCollision(player) {
      if (!player || player.isDead || this.hasTriggered) return false;
      if (player.mode !== 'ROAD') return false;
      if (!player.isGrounded && player.y < (player.targetLaneY - 14)) return false;

      const pHitbox = player.getHitbox ? player.getHitbox() : {
        x: player.x + 8,
        y: player.y + 6,
        width: player.width - 16,
        height: player.height - 12
      };
      const oHitbox = this.getHitbox();

      return (
        pHitbox.x < oHitbox.x + oHitbox.width &&
        pHitbox.x + pHitbox.width > oHitbox.x &&
        pHitbox.y < oHitbox.y + oHitbox.height &&
        pHitbox.y + pHitbox.height > oHitbox.y
      );
    }

    render(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      const isLarge = this.potholeType === 'large';
      const w = this.width;
      const h = this.height;

      // 1. Fractured Asphalt Outer Rim (Dark Jagged Contour)
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.4;
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.5, w * 0.48, h * 0.46, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 2. Deep Crater Interior (Obsidian Pit with Depth Shadow)
      const craterGrad = ctx.createRadialGradient(w * 0.5, h * 0.45, 2, w * 0.5, h * 0.5, w * 0.46);
      craterGrad.addColorStop(0, '#030712');
      craterGrad.addColorStop(0.7, '#0F172A');
      craterGrad.addColorStop(1, '#1F2937');
      ctx.fillStyle = craterGrad;
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.52, w * 0.42, h * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3. Muddy Rain Puddle Reflection (Reflecting warm sunset sky)
      ctx.fillStyle = 'rgba(251, 146, 60, 0.35)';
      ctx.beginPath();
      ctx.ellipse(w * 0.48, h * 0.55, w * 0.28, h * 0.22, -0.05, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(w * 0.44, h * 0.54, w * 0.16, 0.4, 2.2);
      ctx.stroke();

      // 4. Loose Asphalt Rubble & Cracks
      ctx.fillStyle = '#475569';
      ctx.fillRect(w * 0.12, h * 0.2, 3, 2.5);
      ctx.fillRect(w * 0.82, h * 0.65, 3.5, 3);
      ctx.fillRect(w * 0.72, h * 0.15, 2.5, 2);

      if (isLarge) {
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(w * 0.05, h * 0.35, 4, 3);
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(w * 0.9, h * 0.4, 4, 3);
      }

      ctx.restore();
    }
  }

  // ==========================================================================
  // AERIAL HAZARD 3: LOW FLYOVER / OVERHEAD EXPRESSWAY STRUCTURE
  // ==========================================================================
  class LowFlyoverHazard {
    constructor(x, y) {
      this.type = 'flyover';
      this.x = x || (Config.CANVAS_WIDTH + 80);
      this.y = y || 135; // Altitude of the bridge deck
      this.width = 180;  // Span of the flyover section
      this.height = 140; // Total height including clearance corridor
      this.deckThickness = 34; // Solid concrete deck collision height
      this.speedMultiplier = 0.0; // Stationary world structure
      this.hasCollided = false;
      this.hasNearMissed = false;
      this.animTimer = 0;
    }

    update(dt, worldSpeed) {
      this.animTimer += dt;
      this.x -= worldSpeed * dt;
    }

    isOffscreen() {
      return (this.x + this.width) < -150;
    }

    checkCollision(player) {
      if (!player || player.isDead) return false;
      if (player.mode === 'ROAD' && player.isGrounded) return false;

      const pHitbox = player.getHitbox ? player.getHitbox() : {
        x: player.x + 4,
        y: player.y + 4,
        width: player.width - 8,
        height: player.height - 8
      };

      if (pHitbox.x + pHitbox.width < this.x + 10 || pHitbox.x > this.x + this.width - 10) {
        return false;
      }

      const deckTop = this.y;
      const deckBottom = this.y + this.deckThickness;

      return (pHitbox.y < deckBottom) && (pHitbox.y + pHitbox.height > deckTop);
    }

    checkNearMiss(player) {
      if (!player || player.isDead || this.hasCollided || this.hasNearMissed) return false;
      if (player.mode === 'ROAD' && player.isGrounded) return false;

      const pHitbox = player.getHitbox ? player.getHitbox() : {
        x: player.x + 4,
        y: player.y + 4,
        width: player.width - 8,
        height: player.height - 8
      };

      const isPastCenter = (pHitbox.x > this.x + this.width * 0.4) && (pHitbox.x < this.x + this.width + 50);
      if (!isPastCenter) return false;

      const pCenterY = pHitbox.y + pHitbox.height * 0.5;
      const deckCenterY = this.y + this.deckThickness * 0.5;
      const vertDist = Math.abs(pCenterY - deckCenterY);

      return vertDist >= 32 && vertDist <= 72;
    }

    render(ctx) {
      ctx.save();

      const dx = this.x;
      const dy = this.y;
      const w = this.width;
      const th = this.deckThickness;

      // 1. Concrete Support Pillars descending toward roadside
      ctx.fillStyle = '#64748B';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.2;

      ctx.fillRect(dx + 18, dy + th, 16, 120);
      ctx.strokeRect(dx + 18, dy + th, 16, 120);
      ctx.fillRect(dx + w - 34, dy + th, 16, 120);
      ctx.strokeRect(dx + w - 34, dy + th, 16, 120);

      // Pillar crash barriers
      for (let by = dy + th + 40; by < dy + th + 100; by += 16) {
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(dx + 18, by, 16, 8);
        ctx.fillRect(dx + w - 34, by, 16, 8);
      }

      // 2. Concrete Flyover Bridge Deck
      const deckGrad = ctx.createLinearGradient(dx, dy, dx, dy + th);
      deckGrad.addColorStop(0, '#94A3B8');
      deckGrad.addColorStop(0.5, '#64748B');
      deckGrad.addColorStop(1, '#475569');

      ctx.fillStyle = deckGrad;
      ctx.fillRect(dx, dy, w, th);
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.6;
      ctx.strokeRect(dx, dy, w, th);

      // 3. Underside Caution Hazard Stripes
      const stripeH = 8;
      const stripeY = dy + th - stripeH;
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(dx, stripeY, w, stripeH);

      ctx.fillStyle = '#0F172A';
      for (let sx = dx; sx < dx + w; sx += 18) {
        ctx.beginPath();
        ctx.moveTo(sx, stripeY);
        ctx.lineTo(sx + 9, stripeY);
        ctx.lineTo(sx + 3, stripeY + stripeH);
        ctx.lineTo(sx - 6, stripeY + stripeH);
        ctx.closePath();
        ctx.fill();
      }

      // 4. Overhead NHAI Expressway Signboard
      const signW = 100;
      const signH = 22;
      const signX = dx + (w - signW) * 0.5;
      const signY = dy - signH - 4;

      ctx.fillStyle = '#334155';
      ctx.fillRect(signX + 15, dy - 6, 4, 6);
      ctx.fillRect(signX + signW - 19, dy - 6, 4, 6);

      ctx.fillStyle = '#15803D';
      ctx.fillRect(signX, signY, signW, signH);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(signX + 2, signY + 2, signW - 4, signH - 4);
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.0;
      ctx.strokeRect(signX, signY, signW, signH);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NH-48 EXPRESSWAY', signX + signW * 0.5, signY + 10);
      ctx.fillStyle = '#FEF08A';
      ctx.font = 'bold 7px sans-serif';
      ctx.fillText('CLEARANCE 4.5M ▼', signX + signW * 0.5, signY + 18);

      // 5. Metal Bridge Guardrail along top
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(dx, dy - 3);
      ctx.lineTo(dx + w, dy - 3);
      ctx.stroke();

      ctx.restore();
    }
  }

  // ==========================================================================
  // OBSTACLE MANAGER & FAIR SPAWNING SYSTEM
  // ==========================================================================
  class ObstacleManager {
    constructor() {
      this.obstacles = [];
      this.coins = [];
      this.potholes = [];
      this.aerialHazards = [];

      this.lanes = [
        { y: 345, name: 'TOP_LANE' },
        { y: 405, name: 'MID_LANE' },
        { y: 460, name: 'BOT_LANE' }
      ];

      this.spawnTimer = 0;
      this.coinSpawnTimer = 0;
      this.potholeSpawnTimer = 0;
      this.potholeInterval = 3.5 + Math.random() * 2.5;
      this.minSpawnInterval = 1.35;
      this.currentInterval = 2.0;

      this.aerialSpawnTimer = 0;
      this.aerialInterval = (Config.AERIAL_HAZARD_MIN_INTERVAL || 6.5) + Math.random() * 2.5;

      this.impactParticles = [];
      this.floatingTexts = [];
    }

    reset() {
      this.obstacles = [];
      this.coins = [];
      this.potholes = [];
      this.aerialHazards = [];
      this.spawnTimer = 0;
      this.coinSpawnTimer = 0;
      this.potholeSpawnTimer = 0;
      this.potholeInterval = 3.5 + Math.random() * 2.5;
      this.aerialSpawnTimer = 0;
      this.aerialInterval = (Config.AERIAL_HAZARD_MIN_INTERVAL || 6.5) + Math.random() * 2.5;
      this.impactParticles = [];
      this.floatingTexts = [];
    }

    _spawnObstacle(worldSpeed) {
      const availableLanes = [0, 1, 2];
      const busyLanes = new Set();
      this.obstacles.forEach(obs => {
        if (obs.x > Config.CANVAS_WIDTH - 240) {
          busyLanes.add(obs.laneIndex);
        }
      });

      let selectableLanes = availableLanes.filter(l => !busyLanes.has(l));
      if (selectableLanes.length === 0) return;

      const chosenLane = selectableLanes[Math.floor(Math.random() * selectableLanes.length)];
      const rand = Math.random();
      let obstacle;
      const spawnX = Config.CANVAS_WIDTH + 50 + Math.random() * 40;

      if (rand < 0.26) {
        obstacle = new AutoRickshaw(chosenLane, spawnX);
      } else if (rand < 0.46) {
        obstacle = new Scooter(chosenLane, spawnX);
      } else if (rand < 0.64) {
        obstacle = new TaxiCar(chosenLane, spawnX);
      } else if (rand < 0.78) {
        obstacle = new DesiTruck(chosenLane, spawnX);
      } else if (rand < 0.90) {
        obstacle = new DesiCow(chosenLane, spawnX);
      } else {
        obstacle = new DesiBuffalo(chosenLane, spawnX);
      }

      obstacle.y = this.lanes[chosenLane].y - (obstacle.height / 2);
      this.obstacles.push(obstacle);
    }

    _spawnPothole() {
      const lane = Math.floor(Math.random() * 3);
      const hasRecent = this.potholes.some(p => p.laneIndex === lane && p.x > Config.CANVAS_WIDTH - 200);
      if (hasRecent) return;

      const spawnX = Config.CANVAS_WIDTH + 60;
      const type = Math.random() > 0.45 ? 'large' : 'standard';
      const pothole = new PotholeObstacle(lane, spawnX, type);
      pothole.y = this.lanes[lane].y + 4;
      this.potholes.push(pothole);
    }

    _spawnCoins(player) {
      const isAir = Math.random() > 0.45;
      const count = 3 + Math.floor(Math.random() * 3);
      const startX = Config.CANVAS_WIDTH + 60;
      const spacing = 40;

      let startY;
      if (isAir) {
        startY = 120 + Math.random() * 140;
      } else {
        const lane = Math.floor(Math.random() * 3);
        startY = this.lanes[lane].y;
      }

      for (let i = 0; i < count; i++) {
        this.coins.push(new Coin(startX + i * spacing, startY, isAir));
      }
    }

    _spawnAerialHazard(worldSpeed, player) {
      if (player && (player.state === 'TRANSFORM_TO_FLIGHT' || player.transformProgress < 0.6)) return;

      const hasRecentAerial = this.aerialHazards.some(h => h.x > Config.CANVAS_WIDTH - 240);
      if (hasRecentAerial) return;

      const spawnX = Config.CANVAS_WIDTH + 80;
      const rand = Math.random();

      if (rand < 0.38) {
        const alt = Math.random() > 0.5 ? 125 : 175;
        this.aerialHazards.push(new AerialWireHazard(spawnX, alt));
      } else if (rand < 0.72) {
        const alt = 115 + Math.random() * 50;
        this.aerialHazards.push(new KiteStringHazard(spawnX, alt));
      } else {
        this.aerialHazards.push(new LowFlyoverHazard(spawnX, 130));
      }
    }

    scareTrafficWithHorn(player) {
      if (!player) return;
      this.obstacles.forEach(obs => {
        const dist = Math.abs(obs.x - player.x);
        if (dist < 320 && obs.x > player.x - 40) {
          if (obs.onHonked) {
            obs.onHonked();
          }
        }
      });

      this.floatingTexts.push({
        text: '📯 HORN HONKED!',
        x: player.x + 50,
        y: player.y - 25,
        vy: -35,
        color: '#F59E0B',
        life: 0.65,
        maxLife: 0.65
      });
    }

    update(dt, worldSpeed, player, distance, onCollision, onNearMiss, onCoinCollect) {
      this.minSpawnInterval = Math.max(0.85, 1.35 - ((distance || 0) / 4500));

      // 1. Vehicles
      this.spawnTimer += dt;
      if (this.spawnTimer >= this.currentInterval) {
        this._spawnObstacle(worldSpeed);
        this.spawnTimer = 0;
        this.currentInterval = this.minSpawnInterval + Math.random() * 1.0;
      }

      // 2. Potholes
      this.potholeSpawnTimer += dt;
      if (this.potholeSpawnTimer >= this.potholeInterval) {
        this._spawnPothole();
        this.potholeSpawnTimer = 0;
        this.potholeInterval = 3.5 + Math.random() * 2.5;
      }

      // 3. Coins
      this.coinSpawnTimer += dt;
      if (this.coinSpawnTimer >= 2.0) {
        this._spawnCoins(player);
        this.coinSpawnTimer = 0;
      }

      // 4. Update Obstacles with AI
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obs = this.obstacles[i];
        obs.update(dt, worldSpeed, this.obstacles, this.lanes);

        if (player) {
          this._checkPlayerCollision(player, obs, onCollision);
          this._checkNearMiss(player, obs, onNearMiss);
        }

        if (obs.isOffscreen()) {
          this.obstacles.splice(i, 1);
        }
      }

      // 5. Update Potholes
      for (let i = this.potholes.length - 1; i >= 0; i--) {
        const p = this.potholes[i];
        p.update(dt, worldSpeed);

        if (player && !p.hasTriggered && p.checkCollision(player)) {
          this._handlePotholeCollision(player, p, onCollision);
        }

        if (p.isOffscreen()) {
          this.potholes.splice(i, 1);
        }
      }

      // 6. Update Coins
      for (let i = this.coins.length - 1; i >= 0; i--) {
        const coin = this.coins[i];
        coin.update(dt, worldSpeed);

        if (player && !coin.collected) {
          const pHitbox = player.getHitbox ? player.getHitbox() : { x: player.x, y: player.y, width: player.width, height: player.height };
          const pCenterX = pHitbox.x + pHitbox.width * 0.5;
          const pCenterY = pHitbox.y + pHitbox.height * 0.5;
          const dist = Math.hypot(pCenterX - coin.x, pCenterY - coin.y);

          if (dist < (coin.radius + Math.min(pHitbox.width, pHitbox.height) * 0.55)) {
            coin.collected = true;
            this.coins.splice(i, 1);

            for (let sp = 0; sp < 8; sp++) {
              this.impactParticles.push({
                x: coin.x,
                y: coin.y,
                vx: (Math.random() - 0.5) * 140,
                vy: (Math.random() - 0.5) * 140,
                color: '#FCD34D',
                size: 2 + Math.random() * 2,
                life: 0.28,
                maxLife: 0.28
              });
            }

            this.floatingTexts.push({
              text: '+50 ₹',
              x: coin.x,
              y: coin.y - 12,
              vy: -35,
              color: '#FCD34D',
              life: 0.6,
              maxLife: 0.6
            });

            if (onCoinCollect) onCoinCollect(coin);
            continue;
          }
        }

        if (coin.isOffscreen()) {
          this.coins.splice(i, 1);
        }
      }

      // 7. Aerial Hazards
      this.aerialSpawnTimer += dt;
      if (this.aerialSpawnTimer >= this.aerialInterval) {
        this._spawnAerialHazard(worldSpeed, player);
        this.aerialSpawnTimer = 0;
        this.aerialInterval = (Config.AERIAL_HAZARD_MIN_INTERVAL || 6.5) + Math.random() * 3.0;
      }

      for (let i = this.aerialHazards.length - 1; i >= 0; i--) {
        const hazard = this.aerialHazards[i];
        hazard.update(dt, worldSpeed);

        if (player) {
          if (!hazard.hasCollided && hazard.checkCollision(player)) {
            this._handleAerialCollision(player, hazard, onCollision);
          } else if (!hazard.hasNearMissed && !hazard.hasCollided && hazard.checkNearMiss(player)) {
            this._handleAerialNearMiss(player, hazard, onNearMiss);
          }
        }

        if (hazard.isOffscreen()) {
          this.aerialHazards.splice(i, 1);
        }
      }

      this._updateEffects(dt);
    }

    _handlePotholeCollision(player, pothole, onCollision) {
      pothole.hasTriggered = true;
      pothole.hasCollided = true;

      const upgradeManager = window.DesiRoadsterGameInstance && window.DesiRoadsterGameInstance.upgrades;
      if (upgradeManager && upgradeManager.consumePotholeShield()) {
        const audio = window.DesiRoadsterGameInstance && window.DesiRoadsterGameInstance.audio;
        if (audio && audio.playZap) audio.playZap();
        this.floatingTexts.push({
          text: '🛡️ POTHOLE SHIELD SAVED YOU!',
          x: player.x + 40,
          y: player.y - 20,
          vy: -35,
          color: '#38BDF8',
          life: 0.9,
          maxLife: 0.9
        });
        return;
      }

      const isLarge = pothole.potholeType === 'large';
      const suspensionDamp = (player.suspensionDamping || 1.0);
      const audio = window.DesiRoadsterGameInstance && window.DesiRoadsterGameInstance.audio;
      if (audio && audio.playPotholeThud) {
        audio.playPotholeThud();
      }

      for (let i = 0; i < (isLarge ? 12 : 6); i++) {
        this.impactParticles.push({
          x: player.x + 30,
          y: pothole.y + 10,
          vx: (Math.random() - 0.5) * 160,
          vy: -Math.random() * 120,
          color: '#CBD5E1',
          size: 2.5 + Math.random() * 2.5,
          life: 0.35,
          maxLife: 0.35
        });
      }

      if (isLarge) {
        const currentSpeed = (window.DesiRoadsterGameInstance && window.DesiRoadsterGameInstance.currentSpeed) || 300;
        if (currentSpeed > 320 && player.launchFromPothole) {
          player.launchFromPothole(-420 * suspensionDamp);
          if (window.DesiRoadsterGameInstance) {
            window.DesiRoadsterGameInstance.screenShake = 12;
          }
          this.floatingTexts.push({
            text: '🚀 POTHOLE LAUNCH!',
            x: player.x + 40,
            y: player.y - 25,
            vy: -40,
            color: '#F59E0B',
            life: 0.9,
            maxLife: 0.9
          });
        } else {
          if (window.DesiRoadsterGameInstance) {
            window.DesiRoadsterGameInstance.screenShake = 8;
            window.DesiRoadsterGameInstance.currentSpeed = Math.max(Config.MIN_SPEED, window.DesiRoadsterGameInstance.currentSpeed - 60);
          }
          this.floatingTexts.push({
            text: '💥 DEEP CRATER JOLT!',
            x: player.x + 40,
            y: player.y - 20,
            vy: -35,
            color: '#EF4444',
            life: 0.85,
            maxLife: 0.85
          });
        }
      } else {
        if (window.DesiRoadsterGameInstance) {
          window.DesiRoadsterGameInstance.screenShake = 5;
          window.DesiRoadsterGameInstance.currentSpeed = Math.max(Config.MIN_SPEED, window.DesiRoadsterGameInstance.currentSpeed - 40 * suspensionDamp);
        }
        this.floatingTexts.push({
          text: '💥 SUSPENSION JOLT!',
          x: player.x + 40,
          y: player.y - 20,
          vy: -35,
          color: '#E2E8F0',
          life: 0.75,
          maxLife: 0.75
        });
      }

      if (onCollision) {
        onCollision(pothole);
      }
    }

    _handleAerialCollision(player, hazard, onCollision) {
      hazard.hasCollided = true;
      hazard.hasNearMissed = true;

      const isWire = hazard.type === 'aerial_wires';
      const isFlyover = hazard.type === 'flyover';
      const contactX = player.x + player.width * 0.7;
      const contactY = player.y + player.height * 0.5;

      const sparkColor = isWire ? '#00F3FF' : (isFlyover ? '#CBD5E1' : '#FF9933');
      for (let i = 0; i < 14; i++) {
        this.impactParticles.push({
          x: contactX,
          y: contactY,
          vx: (Math.random() - 0.5) * 200,
          vy: (Math.random() - 0.5) * 160,
          color: Math.random() > 0.4 ? sparkColor : '#FFFFFF',
          size: 2.5 + Math.random() * 2.5,
          life: 0.35,
          maxLife: 0.35
        });
      }

      let alertMsg = isWire ? '⚡ LIVE WIRE JOLT!' : '🪁 MANJA SNAG!';
      let alertColor = isWire ? '#00F3FF' : '#FF0055';
      if (isFlyover) {
        alertMsg = '🌉 FLYOVER IMPACT!';
        alertColor = '#EF4444';
      }

      this.floatingTexts.push({
        text: alertMsg,
        x: contactX,
        y: Math.max(75, contactY - 22),
        vy: -35,
        color: alertColor,
        life: 0.85,
        maxLife: 0.85
      });

      if (player.battery !== undefined) {
        player.battery = Math.max(0, player.battery - (isWire ? 10 : (isFlyover ? 15 : 8)));
      }

      if (onCollision) {
        onCollision(hazard);
      }
    }

    _handleAerialNearMiss(player, hazard, onNearMiss) {
      hazard.hasNearMissed = true;

      const isWire = hazard.type === 'aerial_wires';
      const isFlyover = hazard.type === 'flyover';
      let text = isWire ? '⚡ WIRE SKIM! +100' : '🪁 KITE EVADED! +100';
      if (isFlyover) text = '🌉 BRIDGE CLEARANCE! +100';
      const notifyX = Math.max(90, Math.min(Config.CANVAS_WIDTH - 120, player.x + player.width * 0.5));
      const notifyY = player.y < 125 ? (player.y + player.height + 22) : (player.y - 18);
      const notifyVy = player.y < 125 ? 18 : -32;

      this.floatingTexts.push({
        text: text,
        x: notifyX,
        y: notifyY,
        vy: notifyVy,
        color: isWire ? '#00F3FF' : (isFlyover ? '#38BDF8' : '#FF9933'),
        isNearMiss: true,
        life: 0.9,
        maxLife: 0.9
      });

      for (let i = 0; i < 5; i++) {
        this.impactParticles.push({
          x: player.x + player.width * 0.5,
          y: player.y + player.height * 0.5,
          vx: (Math.random() - 0.5) * 120,
          vy: (Math.random() - 0.5) * 80,
          color: isWire ? '#00F3FF' : '#FFD700',
          size: 2 + Math.random() * 2,
          life: 0.25,
          maxLife: 0.25
        });
      }

      if (onNearMiss) onNearMiss(hazard);
    }

    _checkNearMiss(player, obs, onNearMiss) {
      if (!player || player.isDead) return;
      if (obs.hasNearMissed || obs.hasCollided) return;

      const pHitbox = player.getHitbox ? player.getHitbox() : { x: player.x, y: player.y, width: player.width, height: player.height };
      const oHitbox = obs.getHitbox();

      const isOverlapping = (
        pHitbox.x < oHitbox.x + oHitbox.width &&
        pHitbox.x + pHitbox.width > oHitbox.x &&
        pHitbox.y < oHitbox.y + oHitbox.height &&
        pHitbox.y + pHitbox.height > oHitbox.y
      );
      if (isOverlapping) return;

      const isPastRear = pHitbox.x > (oHitbox.x + oHitbox.width * 0.45);
      const isWithinCatchWindow = pHitbox.x < (oHitbox.x + oHitbox.width + 65);
      if (!isPastRear || !isWithinCatchWindow) return;

      const playerCenterY = pHitbox.y + pHitbox.height * 0.5;
      const obsCenterY = oHitbox.y + oHitbox.height * 0.5;
      const vertDist = Math.abs(playerCenterY - obsCenterY);

      const isCloseCall = vertDist >= 22 && vertDist <= 74;

      if (isCloseCall) {
        obs.hasNearMissed = true;

        const notifyX = Math.max(90, Math.min(Config.CANVAS_WIDTH - 120, player.x + player.width * 0.5));
        const notifyY = player.y < 125 ? (player.y + player.height + 22) : (player.y - 18);
        const notifyVy = player.y < 125 ? 18 : -32;

        this.floatingTexts.push({
          text: '⚡ NEAR MISS! +100',
          x: notifyX,
          y: notifyY,
          vy: notifyVy,
          color: '#00F3FF',
          isNearMiss: true,
          life: 0.9,
          maxLife: 0.9
        });

        const sparkX = (pHitbox.x + oHitbox.x + oHitbox.width) * 0.5;
        const sparkY = (playerCenterY + obsCenterY) * 0.5;
        for (let i = 0; i < 5; i++) {
          this.impactParticles.push({
            x: sparkX,
            y: sparkY,
            vx: (Math.random() - 0.5) * 140,
            vy: (Math.random() - 0.5) * 90,
            color: Math.random() > 0.4 ? '#00F3FF' : '#FFFFFF',
            size: 2 + Math.random() * 2,
            life: 0.28,
            maxLife: 0.28
          });
        }

        if (onNearMiss) onNearMiss(obs);
      }
    }

    _checkPlayerCollision(player, obs, onCollision) {
      if (player.mode === 'FLIGHT' && (player.y + player.height - 12) < obs.y) {
        return;
      }

      if (!player.isGrounded && (player.y + player.height) < (obs.y + 12)) {
        return;
      }

      const pHitbox = player.getHitbox ? player.getHitbox() : {
        x: player.x + 8,
        y: player.y + 6,
        width: player.width - 16,
        height: player.height - 12
      };
      const oHitbox = obs.getHitbox();

      const isColliding = (
        pHitbox.x < oHitbox.x + oHitbox.width &&
        pHitbox.x + pHitbox.width > oHitbox.x &&
        pHitbox.y < oHitbox.y + oHitbox.height &&
        pHitbox.y + pHitbox.height > oHitbox.y
      );

      if (isColliding) {
        this._handleCollision(player, obs, onCollision);
      }
    }

    _handleCollision(player, obs, onCollision) {
      obs.hasCollided = true;
      obs.hasNearMissed = true;

      const contactX = (player.x + player.width + obs.x) / 2;
      const contactY = (player.y + obs.y + obs.height) / 2;

      for (let i = 0; i < 14; i++) {
        this.impactParticles.push({
          x: contactX,
          y: contactY,
          vx: (Math.random() - 0.5) * 220,
          vy: (Math.random() - 0.5) * 180,
          color: Math.random() > 0.5 ? '#FF0055' : '#FFC83B',
          size: 3 + Math.random() * 3,
          life: 0.35,
          maxLife: 0.35
        });
      }

      let alertMsg = 'BUMP!';
      if (obs.type === 'cow') alertMsg = 'HOLY COW! 🐄';
      else if (obs.type === 'buffalo') alertMsg = 'BUFFALO BLOCK! 🐃';
      else if (obs.type === 'auto') alertMsg = 'AUTO SCRAPE! 🛺';
      else if (obs.type === 'scooter') alertMsg = 'SCOOTER SWERVE! 🛵';
      else if (obs.type === 'car') alertMsg = 'TAXI TAP! 🚕';
      else if (obs.type === 'truck') alertMsg = 'HORN OK PLEASE! 🚛';

      this.floatingTexts.push({
        text: alertMsg,
        x: contactX - 20,
        y: contactY - 20,
        vy: -40,
        color: '#FF0055',
        life: 0.8,
        maxLife: 0.8
      });

      if (onCollision) {
        onCollision(obs);
      }
    }

    _updateEffects(dt) {
      for (let i = this.impactParticles.length - 1; i >= 0; i--) {
        const p = this.impactParticles[i];
        p.life -= dt;
        if (p.life <= 0) {
          this.impactParticles.splice(i, 1);
        } else {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }
      }

      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const t = this.floatingTexts[i];
        t.life -= dt;
        if (t.life <= 0) {
          this.floatingTexts.splice(i, 1);
        } else {
          t.y += t.vy * dt;
          if (t.isNearMiss && t.y < 75) {
            t.y = 75;
          }
        }
      }
    }

    render(ctx) {
      // 1. Draw Potholes (On road surface beneath traffic)
      for (const p of this.potholes) {
        p.render(ctx);
      }

      // 2. Draw Collectible Coins
      for (const coin of this.coins) {
        coin.render(ctx);
      }

      // 3. Sort obstacles by Y (lane order) so closer obstacles render in front
      const sorted = [...this.obstacles].sort((a, b) => a.y - b.y);
      for (const obs of sorted) {
        obs.render(ctx);
      }

      // 4. Draw Aerial Hazards (Overhead Wires, Kite Strings, Low Flyovers)
      for (const hazard of this.aerialHazards) {
        hazard.render(ctx);
      }

      // 5. Draw Impact Sparks & Floating Texts
      this._renderEffects(ctx);
    }

    _renderEffects(ctx) {
      ctx.save();

      for (const p of this.impactParticles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const t of this.floatingTexts) {
        const alpha = Math.max(0, t.life / t.maxLife);
        const progress = 1 - (t.life / t.maxLife);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(t.x, t.y);

        if (t.isNearMiss) {
          const scale = progress < 0.25 ? (1.0 + (progress / 0.25) * 0.25) : Math.max(0.9, 1.25 - (progress - 0.25) * 0.35);
          ctx.scale(scale, scale);
          ctx.font = '900 15px Orbitron, sans-serif';
        } else {
          ctx.font = 'bold 13px Orbitron, sans-serif';
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.strokeStyle = '#050B14';
        ctx.lineWidth = 3;
        ctx.strokeText(t.text, 0, 0);

        ctx.fillStyle = t.color;
        ctx.shadowColor = t.color;
        ctx.shadowBlur = t.isNearMiss ? 10 : 6;
        ctx.fillText(t.text, 0, 0);

        ctx.restore();
      }

      ctx.restore();
    }
  }

  // Export to game namespace
  window.DesiRoadster.Obstacle = Obstacle;
  window.DesiRoadster.AutoRickshaw = AutoRickshaw;
  window.DesiRoadster.Scooter = Scooter;
  window.DesiRoadster.TaxiCar = TaxiCar;
  window.DesiRoadster.DesiCow = DesiCow;
  window.DesiRoadster.DesiBuffalo = DesiBuffalo;
  window.DesiRoadster.DesiTruck = DesiTruck;
  window.DesiRoadster.PotholeObstacle = PotholeObstacle;
  window.DesiRoadster.AerialWireHazard = AerialWireHazard;
  window.DesiRoadster.KiteStringHazard = KiteStringHazard;
  window.DesiRoadster.LowFlyoverHazard = LowFlyoverHazard;
  window.DesiRoadster.ObstacleManager = ObstacleManager;
})();
