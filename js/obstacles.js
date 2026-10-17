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

      // Classic green & yellow CNG scheme or black & yellow
      this.isGreenCNG = Math.random() > 0.4;
      this.bodyColor = this.isGreenCNG ? '#15803D' : '#1F2937';
      this.yellowHood = '#FBBF24';
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

      // 2. Yellow Canopy Roof
      ctx.fillStyle = this.yellowHood;
      ctx.beginPath();
      ctx.moveTo(8, 6);
      ctx.quadraticCurveTo(this.width * 0.5, 2, this.width - 4, 10);
      ctx.lineTo(this.width - 6, 22);
      ctx.lineTo(4, 22);
      ctx.closePath();
      ctx.fill();

      // 3. Lower Body (Green CNG or Black)
      ctx.fillStyle = this.bodyColor;
      ctx.beginPath();
      ctx.moveTo(4, 20);
      ctx.lineTo(this.width - 6, 20);
      ctx.lineTo(this.width - 2, 36);
      ctx.lineTo(this.width * 0.45, 36);
      // Front wheel cutout
      ctx.lineTo(this.width * 0.28, 32);
      ctx.lineTo(2, 32);
      ctx.closePath();
      ctx.fill();

      // 4. Front Slanted Windshield
      ctx.fillStyle = '#67E8F9';
      ctx.beginPath();
      ctx.moveTo(4, 20);
      ctx.lineTo(14, 8);
      ctx.lineTo(26, 8);
      ctx.lineTo(22, 20);
      ctx.closePath();
      ctx.fill();

      // Windshield frame
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 5. Open Passenger Cabin & Driver Silhouette
      ctx.fillStyle = '#111827';
      ctx.fillRect(28, 9, 32, 13);

      // Driver Silhouette
      ctx.fillStyle = '#E5E7EB';
      ctx.beginPath();
      ctx.arc(22, 14, 4, 0, Math.PI * 2); // Driver head
      ctx.fill();
      ctx.fillStyle = '#9CA3AF';
      ctx.fillRect(18, 18, 8, 8); // Driver torso

      // Chrome Grab Rail / Side Bar
      ctx.strokeStyle = '#D1D5DB';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(27, 8);
      ctx.lineTo(27, 24);
      ctx.moveTo(60, 8);
      ctx.lineTo(60, 24);
      ctx.stroke();

      // 6. Wheels (Front Single Wheel & Rear Wheel)
      this._renderWheel(ctx, 12, 34, 7);
      this._renderWheel(ctx, 54, 34, 8);

      // 7. Headlight & Rear Bumper
      // Single round front headlight
      ctx.fillStyle = '#FEF08A';
      ctx.shadowColor = '#FDE047';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(2, 26, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Rear hazard stripes / bumper
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(this.width - 4, 25, 3, 7);

      ctx.restore();
    }

    _renderWheel(ctx, wx, wy, radius) {
      // Tire rubber
      ctx.fillStyle = '#1F2937';
      ctx.beginPath();
      ctx.arc(wx, wy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Rim
      ctx.fillStyle = '#9CA3AF';
      ctx.beginPath();
      ctx.arc(wx, wy, radius - 3, 0, Math.PI * 2);
      ctx.fill();

      // Hubcap
      ctx.fillStyle = '#4B5563';
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
      ctx.fillStyle = this.bodyColor;
      ctx.beginPath();
      ctx.moveTo(2, 28);
      ctx.lineTo(this.width - 2, 28);
      ctx.lineTo(this.width - 4, 34);
      ctx.lineTo(2, 34);
      ctx.closePath();
      ctx.fill();

      // Yellow Upper Body & Doors
      ctx.fillStyle = this.roofColor;
      ctx.beginPath();
      ctx.moveTo(4, 28);
      ctx.lineTo(16, 18);
      ctx.lineTo(76, 18);
      ctx.lineTo(this.width - 4, 28);
      ctx.closePath();
      ctx.fill();

      // Rounded Roof
      ctx.fillStyle = this.roofColor;
      ctx.beginPath();
      ctx.moveTo(22, 18);
      ctx.lineTo(30, 8);
      ctx.lineTo(65, 8);
      ctx.lineTo(74, 18);
      ctx.closePath();
      ctx.fill();

      // 3. Windows
      ctx.fillStyle = '#93C5FD';
      ctx.beginPath();
      // Front Windshield
      ctx.moveTo(24, 17);
      ctx.lineTo(31, 10);
      ctx.lineTo(44, 10);
      ctx.lineTo(44, 17);
      ctx.closePath();
      ctx.fill();

      // Rear Side Window
      ctx.beginPath();
      ctx.moveTo(48, 10);
      ctx.lineTo(63, 10);
      ctx.lineTo(71, 17);
      ctx.lineTo(48, 17);
      ctx.closePath();
      ctx.fill();

      // 4. Roof Carrier Rack with Luggage
      ctx.strokeStyle = '#4B5563';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(34, 4, 30, 4);
      // Luggage boxes tied with rope
      ctx.fillStyle = '#B45309';
      ctx.fillRect(36, 1, 12, 4);
      ctx.fillStyle = '#047857';
      ctx.fillRect(50, 0, 11, 5);

      // 5. Chrome Bumpers & Round Headlight
      ctx.fillStyle = '#E5E7EB';
      ctx.fillRect(0, 26, 3, 7); // Front bumper
      ctx.fillRect(this.width - 3, 26, 3, 7); // Rear bumper

      // Glowing front headlight
      ctx.fillStyle = '#FEF08A';
      ctx.shadowColor = '#FDE047';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(3, 23, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Red taillight
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(this.width - 4, 22, 3, 4);

      // 6. Wheels
      this._renderWheel(ctx, 20, 34, 8);
      this._renderWheel(ctx, 74, 34, 8);

      ctx.restore();
    }

    _renderWheel(ctx, wx, wy, radius) {
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(wx, wy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#D1D5DB';
      ctx.beginPath();
      ctx.arc(wx, wy, radius - 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4B5563';
      ctx.beginPath();
      ctx.arc(wx, wy, 2, 0, Math.PI * 2);
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
    }

    render(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      // Gentle chewing and tail swish
      const chew = Math.sin(this.animTimer * 6) * 1.2;
      const tailSwish = Math.sin(this.animTimer * 4) * 4;

      // 1. Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(this.width * 0.5, this.height * 0.94, this.width * 0.45, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Swishing Tail
      ctx.strokeStyle = this.coatColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(this.width - 12, 18);
      ctx.quadraticCurveTo(this.width - 2, 26 + tailSwish, this.width - 4, 34);
      ctx.stroke();
      // Black tail tuft
      ctx.fillStyle = '#1F2937';
      ctx.beginPath();
      ctx.arc(this.width - 4, 34, 3, 0, Math.PI * 2);
      ctx.fill();

      // 3. Legs & Hooves (4 legs)
      ctx.fillStyle = this.coatColor;
      // Front legs
      ctx.fillRect(18, 28, 5, 16);
      ctx.fillRect(26, 26, 5, 18);
      // Back legs
      ctx.fillRect(52, 26, 5, 18);
      ctx.fillRect(59, 28, 5, 16);

      // Dark hooves
      ctx.fillStyle = '#374151';
      ctx.fillRect(18, 42, 5, 3);
      ctx.fillRect(26, 42, 5, 3);
      ctx.fillRect(52, 42, 5, 3);
      ctx.fillRect(59, 42, 5, 3);

      // 4. Main Torso Body
      ctx.fillStyle = this.coatColor;
      ctx.beginPath();
      ctx.ellipse(40, 22, 24, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      // 5. PROMINENT ZEBU HUMP (Iconic Indian Cow feature!)
      ctx.fillStyle = this.coatColor;
      ctx.beginPath();
      ctx.arc(30, 11, 7, 0, Math.PI * 2);
      ctx.fill();

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

      // 7. Head & Snout (facing left towards incoming traffic)
      ctx.fillStyle = this.coatColor;
      ctx.beginPath();
      ctx.ellipse(12, 14 + chew * 0.3, 9, 7, -0.2, 0, Math.PI * 2);
      ctx.fill();

      // Pinkish muzzle/nose
      ctx.fillStyle = '#FDA4AF';
      ctx.beginPath();
      ctx.arc(6, 16 + chew * 0.5, 4, 0, Math.PI * 2);
      ctx.fill();

      // Calm black eye
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(13, 12, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // 8. Curved Graceful Horns (pointed upward)
      ctx.strokeStyle = '#4B5563';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(15, 9);
      ctx.quadraticCurveTo(18, 2, 16, -2); // Horn 1
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(11, 9);
      ctx.quadraticCurveTo(13, 3, 11, -1); // Horn 2
      ctx.stroke();

      // Drooping friendly ear
      ctx.fillStyle = '#FDA4AF';
      ctx.beginPath();
      ctx.ellipse(16, 14, 4, 2, 0.4, 0, Math.PI * 2);
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

      this.bodyColor = '#1E293B'; // Dark charcoal / slate hide
      this.snoutColor = '#334155';
    }

    render(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      const headBob = Math.sin(this.animTimer * 4) * 0.8;

      // 1. Ground Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(this.width * 0.5, this.height * 0.94, this.width * 0.46, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Thick Legs
      ctx.fillStyle = this.bodyColor;
      ctx.fillRect(20, 28, 7, 16);
      ctx.fillRect(29, 26, 7, 18);
      ctx.fillRect(58, 26, 7, 18);
      ctx.fillRect(67, 28, 7, 16);

      // Hooves
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(20, 42, 7, 3);
      ctx.fillRect(29, 42, 7, 3);
      ctx.fillRect(58, 42, 7, 3);
      ctx.fillRect(67, 42, 7, 3);

      // 3. Heavy Stocky Torso (no hump, broad shoulders)
      ctx.fillStyle = this.bodyColor;
      ctx.beginPath();
      ctx.ellipse(46, 22, 28, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Heavy Neck
      ctx.beginPath();
      ctx.moveTo(18, 14);
      ctx.lineTo(34, 12);
      ctx.lineTo(34, 28);
      ctx.lineTo(16, 26);
      ctx.closePath();
      ctx.fill();

      // 4. Head & Broad Muzzle
      ctx.beginPath();
      ctx.ellipse(14, 16 + headBob, 11, 8, -0.1, 0, Math.PI * 2);
      ctx.fill();

      // Wide flat snout with nostrils
      ctx.fillStyle = this.snoutColor;
      ctx.beginPath();
      ctx.ellipse(7, 18 + headBob, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Small eyes
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(15, 14 + headBob, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // 5. WIDE SWEPT-BACK CRESCENT HORNS (Iconic Indian Murrah Buffalo!)
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(18, 12 + headBob);
      ctx.quadraticCurveTo(24, 0 + headBob, 32, 6 + headBob); // Sweeps back over neck
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(14, 10 + headBob);
      ctx.quadraticCurveTo(20, 2 + headBob, 28, 7 + headBob);
      ctx.stroke();

      // 6. Tail with brush
      ctx.strokeStyle = this.bodyColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(74, 18);
      ctx.lineTo(82, 32);
      ctx.stroke();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(82, 33, 3, 0, Math.PI * 2);
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
  // OBSTACLE MANAGER & FAIR SPAWNING SYSTEM
  // ==========================================================================
  class ObstacleManager {
    constructor() {
      this.obstacles = [];
      this.coins = [];

      // Road lane center coordinates (3 distinct lanes across asphalt)
      this.lanes = [
        { y: 345, name: 'TOP_LANE' },
        { y: 405, name: 'MID_LANE' },
        { y: 460, name: 'BOT_LANE' }
      ];

      // Spawning timers & fairness constraints
      this.spawnTimer = 0;
      this.coinSpawnTimer = 0;
      this.minSpawnInterval = 1.35; // Dynamically scales with distance
      this.currentInterval = 2.0;

      // Track recent lane occupancy to guarantee NEVER blocking all 3 lanes simultaneously
      this.recentLaneHistory = [];

      // Visual feedback / collision particles
      this.impactParticles = [];
      this.floatingTexts = [];
    }

    reset() {
      this.obstacles = [];
      this.coins = [];
      this.spawnTimer = 0;
      this.coinSpawnTimer = 0;
      this.recentLaneHistory = [];
      this.impactParticles = [];
      this.floatingTexts = [];
    }

    /**
     * Spawns an obstacle in a guaranteed fair manner
     */
    _spawnObstacle(worldSpeed) {
      // 1. Pick candidate lane ensuring AT LEAST ONE lane remains open
      const availableLanes = [0, 1, 2];

      // Check which lanes currently have obstacles near the right screen entry (x > 700)
      const busyLanes = new Set();
      this.obstacles.forEach(obs => {
        if (obs.x > Config.CANVAS_WIDTH - 240) {
          busyLanes.add(obs.laneIndex);
        }
      });

      // Filter available lanes that are not currently occupied near the spawn zone
      let selectableLanes = availableLanes.filter(l => !busyLanes.has(l));

      // CRITICAL FAIRNESS: If 2 lanes are already busy, selectableLanes will only have 1 lane.
      // If all 3 are somehow busy, abort spawn until lane clears.
      if (selectableLanes.length === 0) return;

      const chosenLane = selectableLanes[Math.floor(Math.random() * selectableLanes.length)];

      // 2. Randomly select obstacle type with realistic Indian highway weights
      const rand = Math.random();
      let obstacle;
      const spawnX = Config.CANVAS_WIDTH + 50 + Math.random() * 40;

      if (rand < 0.32) {
        // Auto-rickshaw (frequent)
        obstacle = new AutoRickshaw(chosenLane, spawnX);
      } else if (rand < 0.58) {
        // Scooter (quick)
        obstacle = new Scooter(chosenLane, spawnX);
      } else if (rand < 0.78) {
        // Ambassador Taxi
        obstacle = new TaxiCar(chosenLane, spawnX);
      } else if (rand < 0.90) {
        // Holy Zebu Cow
        obstacle = new DesiCow(chosenLane, spawnX);
      } else {
        // Charcoal Water Buffalo
        obstacle = new DesiBuffalo(chosenLane, spawnX);
      }

      // Center obstacle vertically in its designated lane
      obstacle.y = this.lanes[chosenLane].y - (obstacle.height / 2);

      this.obstacles.push(obstacle);
    }

    /**
     * Spawns a series of collectible gold coins along a lane or aerial arc
     */
    _spawnCoins(player) {
      const isAir = Math.random() > 0.45;
      const count = 3 + Math.floor(Math.random() * 3);
      const startX = Config.CANVAS_WIDTH + 60;
      const spacing = 40;

      let startY;
      if (isAir) {
        startY = 120 + Math.random() * 140; // Airborne coins
      } else {
        const lane = Math.floor(Math.random() * 3);
        startY = this.lanes[lane].y;
      }

      for (let i = 0; i < count; i++) {
        this.coins.push(new Coin(startX + i * spacing, startY, isAir));
      }
    }

    update(dt, worldSpeed, player, distance, onCollision, onNearMiss, onCoinCollect) {
      // 1. Difficulty Scaling over distance traveled
      this.minSpawnInterval = Math.max(0.85, 1.35 - ((distance || 0) / 4500));

      // 2. Obstacle Spawner with Fair Lane Enforcement
      this.spawnTimer += dt;
      if (this.spawnTimer >= this.currentInterval) {
        this._spawnObstacle(worldSpeed);
        this.spawnTimer = 0;
        this.currentInterval = this.minSpawnInterval + Math.random() * 1.0;
      }

      // 3. Coin Spawner
      this.coinSpawnTimer += dt;
      if (this.coinSpawnTimer >= 2.0) {
        this._spawnCoins(player);
        this.coinSpawnTimer = 0;
      }

      // 4. Update Obstacles, Collisions, and Near-Miss Detection
      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        const obs = this.obstacles[i];
        obs.update(dt, worldSpeed);

        if (player) {
          this._checkPlayerCollision(player, obs, onCollision);
          this._checkNearMiss(player, obs, onNearMiss);
        }

        // Memory-safe culling when left edge is passed
        if (obs.isOffscreen()) {
          this.obstacles.splice(i, 1);
        }
      }

      // 5. Update Coins & Collection Check
      for (let i = this.coins.length - 1; i >= 0; i--) {
        const coin = this.coins[i];
        coin.update(dt, worldSpeed);

        if (player && !coin.collected) {
          const pHitbox = player.getHitbox ? player.getHitbox() : { x: player.x, y: player.y, width: player.width, height: player.height };
          const pCenterX = pHitbox.x + pHitbox.width * 0.5;
          const pCenterY = pHitbox.y + pHitbox.height * 0.5;
          const dist = Math.hypot(pCenterX - coin.x, pCenterY - coin.y);

          // Collection radius
          if (dist < (coin.radius + Math.min(pHitbox.width, pHitbox.height) * 0.55)) {
            coin.collected = true;
            this.coins.splice(i, 1);

            // Spawn golden sparkle particles
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

            // Floating text
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

      // 6. Update Impact Particles & Floating Feedback Texts
      this._updateEffects(dt);
    }

    _checkNearMiss(player, obs, onNearMiss) {
      if (obs.hasNearMissed) return;

      const pHitbox = player.getHitbox ? player.getHitbox() : { x: player.x, y: player.y, width: player.width, height: player.height };
      const oHitbox = obs.getHitbox();

      // Check if player has safely cleared the obstacle horizontally
      const isPastFront = pHitbox.x > (oHitbox.x + oHitbox.width * 0.5) && pHitbox.x < (oHitbox.x + oHitbox.width + 65);
      const vertDist = Math.abs((pHitbox.y + pHitbox.height * 0.5) - (oHitbox.y + oHitbox.height * 0.5));

      // Close call threshold (passed adjacent lane or jump clearance without colliding)
      if (isPastFront && vertDist < 58 && vertDist > 20) {
        obs.hasNearMissed = true;

        this.floatingTexts.push({
          text: '⚡ NEAR-MISS! +100',
          x: player.x + 50,
          y: player.y - 20,
          vy: -40,
          color: '#00F3FF',
          life: 0.85,
          maxLife: 0.85
        });

        if (onNearMiss) onNearMiss(obs);
      }
    }

    _checkPlayerCollision(player, obs, onCollision) {
      // 1. FLIGHT MODE AVOIDANCE:
      // If player is flying high above the road, they glide effortlessly OVER all traffic!
      if (player.mode === 'FLIGHT' && (player.y + player.height - 12) < obs.y) {
        return;
      }

      // 2. ROAD MODE JUMP AVOIDANCE:
      // If player jumped and car bottom cleared obstacle top
      if (!player.isGrounded && (player.y + player.height) < (obs.y + 12)) {
        return;
      }

      // 3. AABB Collision Box intersection
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
      // Spawn collision spark particles
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

      // Funny Desi collision alerts
      let alertMsg = 'BUMP!';
      if (obs.type === 'cow') alertMsg = 'HOLY COW! 🐄';
      else if (obs.type === 'buffalo') alertMsg = 'BUFFALO BLOCK! 🐃';
      else if (obs.type === 'auto') alertMsg = 'AUTO SCRAPE! 🛺';
      else if (obs.type === 'scooter') alertMsg = 'SCOOTER SWERVE! 🛵';
      else if (obs.type === 'car') alertMsg = 'TAXI TAP! 🚕';

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
      // Particles
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

      // Floating texts
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const t = this.floatingTexts[i];
        t.life -= dt;
        if (t.life <= 0) {
          this.floatingTexts.splice(i, 1);
        } else {
          t.y += t.vy * dt;
        }
      }
    }

    render(ctx) {
      // 1. Draw Collectible Coins
      for (const coin of this.coins) {
        coin.render(ctx);
      }

      // 2. Sort obstacles by Y (lane order) so closer obstacles render in front
      const sorted = [...this.obstacles].sort((a, b) => a.y - b.y);

      // 3. Draw Obstacles
      for (const obs of sorted) {
        obs.render(ctx);
      }

      // 4. Draw Impact Sparks & Floating Texts
      this._renderEffects(ctx);
    }

    _renderEffects(ctx) {
      ctx.save();

      // Sparks
      for (const p of this.impactParticles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Floating Texts
      ctx.font = 'bold 13px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      for (const t of this.floatingTexts) {
        const alpha = Math.max(0, t.life / t.maxLife);
        ctx.fillStyle = t.color;
        ctx.globalAlpha = alpha;
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 8;
        ctx.fillText(t.text, t.x, t.y);
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
  window.DesiRoadster.ObstacleManager = ObstacleManager;
})();
