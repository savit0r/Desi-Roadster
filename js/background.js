/**
 * DESI ROADSTER - PARALLAX BACKGROUND SYSTEM
 * Renders multi-layer scrolling environments: Indian twilight sky, monuments skyline,
 * electric poles with wires, highway billboards, and multi-lane asphalt road.
 */

window.DesiRoadster = window.DesiRoadster || {};

(function() {
  const { Config } = window.DesiRoadster;

  class ParallaxBackground {
    constructor() {
      this.width = Config.CANVAS_WIDTH;
      this.height = Config.CANVAS_HEIGHT;

      // Parallax layer scroll offsets
      this.offsetFar = 0;
      this.offsetMid = 0;
      this.offsetNear = 0;
      this.offsetRoad = 0;

      // Generate procedural skyline silhouettes so each section repeats seamlessly
      this.skylineSegmentWidth = 960;
      this.skylineCanvas = this._generateSkylineCanvas();
      this.roadsideCanvas = this._generateRoadsideCanvas();

      // Blinking beacon timer for telecom towers
      this.beaconTimer = 0;

      // Aerial Environment System (Clouds, Kites, Birds & Flight Streaks)
      this._initAerialElements();
    }

    /**
     * Pre-renders procedural distant skyline onto an offscreen canvas for top performance
     */
    _generateSkylineCanvas() {
      const offscreen = document.createElement('canvas');
      offscreen.width = this.skylineSegmentWidth;
      offscreen.height = Config.HORIZON_Y;
      const ctx = offscreen.getContext('2d');

      ctx.fillStyle = '#201633'; // Deep silhouette indigo

      // Draw stylized skyline elements (Indian city + monuments)
      let x = 0;
      while (x < this.skylineSegmentWidth) {
        const type = Math.floor((x / 120) % 5);

        if (type === 0) {
          // Modern high-rise skyscraper
          const w = 45 + ((x * 7) % 25);
          const h = 80 + ((x * 13) % 70);
          ctx.fillRect(x, Config.HORIZON_Y - h, w, h);
          // Windows glow
          ctx.fillStyle = 'rgba(255, 230, 150, 0.4)';
          for (let wy = Config.HORIZON_Y - h + 12; wy < Config.HORIZON_Y - 10; wy += 14) {
            for (let wx = x + 6; wx < x + w - 6; wx += 10) {
              if ((wx + wy) % 3 === 0) ctx.fillRect(wx, wy, 4, 6);
            }
          }
          ctx.fillStyle = '#201633';
          x += w + 8;
        } else if (type === 1) {
          // Indian Monument silhouette (Arch / Gate style)
          const w = 70;
          const h = 95;
          const baseH = Config.HORIZON_Y - h;
          ctx.fillRect(x, baseH, w, h);
          // Center arch cutout
          ctx.clearRect(x + 18, baseH + 30, w - 36, h - 30);
          // Dome / Top pinnacle
          ctx.beginPath();
          ctx.arc(x + w / 2, baseH, 18, Math.PI, 0, false);
          ctx.fill();
          x += w + 20;
        } else if (type === 2) {
          // Cellular telecom tower with lattice silhouette
          const w = 30;
          const h = 120;
          const baseY = Config.HORIZON_Y;
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#201633';
          ctx.beginPath();
          ctx.moveTo(x + w / 2, baseY - h);
          ctx.lineTo(x, baseY);
          ctx.moveTo(x + w / 2, baseY - h);
          ctx.lineTo(x + w, baseY);
          // cross rungs
          for (let ry = baseY - 20; ry > baseY - h; ry -= 20) {
            ctx.moveTo(x + 4, ry);
            ctx.lineTo(x + w - 4, ry);
          }
          ctx.stroke();
          x += w + 35;
        } else if (type === 3) {
          // Temple Shikhara / Dome dome silhouette
          const w = 50;
          const h = 85;
          const baseY = Config.HORIZON_Y;
          ctx.beginPath();
          ctx.moveTo(x, baseY);
          ctx.quadraticCurveTo(x + w / 2, baseY - h * 1.1, x + w, baseY);
          ctx.fill();
          // Kalash pinnacle
          ctx.fillRect(x + w / 2 - 2, baseY - h - 10, 4, 10);
          x += w + 15;
        } else {
          // Stepped office tower
          const w = 60;
          const h = 100;
          ctx.fillRect(x, Config.HORIZON_Y - h * 0.7, w, h * 0.7);
          ctx.fillRect(x + 10, Config.HORIZON_Y - h, w - 20, h * 0.3);
          x += w + 15;
        }
      }

      return offscreen;
    }

    /**
     * Pre-renders roadside elements: Indian highway trees, billboards, electric poles
     */
    _generateRoadsideCanvas() {
      const offscreen = document.createElement('canvas');
      offscreen.width = this.skylineSegmentWidth;
      offscreen.height = Config.ROAD_TOP_Y;
      const ctx = offscreen.getContext('2d');

      const groundY = Config.ROAD_TOP_Y;

      // Draw roadside trees and billboards
      // 1. Banyan / Neem tree shapes
      const treePositions = [60, 280, 520, 780];
      treePositions.forEach((tx, idx) => {
        ctx.fillStyle = '#1c2e22'; // Dark foliage
        ctx.beginPath();
        ctx.arc(tx, groundY - 45, 32, 0, Math.PI * 2);
        ctx.arc(tx - 22, groundY - 30, 24, 0, Math.PI * 2);
        ctx.arc(tx + 22, groundY - 32, 26, 0, Math.PI * 2);
        ctx.fill();

        // Trunk
        ctx.fillStyle = '#2d1e17';
        ctx.fillRect(tx - 6, groundY - 24, 12, 24);
      });

      // 2. Highway Hoarding Billboards
      const billboards = [
        { x: 160, text: 'CHAI POINT ☕', sub: 'KADAK CHAI AHEAD' },
        { x: 640, text: 'DESI EV ⚡', sub: 'ZERO EMISSION SPEED' }
      ];

      billboards.forEach(b => {
        // Billboard poles
        ctx.fillStyle = '#374151';
        ctx.fillRect(b.x + 12, groundY - 60, 4, 60);
        ctx.fillRect(b.x + 84, groundY - 60, 4, 60);

        // Board
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#FF9933';
        ctx.lineWidth = 2;
        ctx.fillRect(b.x, groundY - 95, 100, 36);
        ctx.strokeRect(b.x, groundY - 95, 100, 36);

        // Text
        ctx.fillStyle = '#00F3FF';
        ctx.font = 'bold 9px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(b.text, b.x + 50, groundY - 80);
        ctx.fillStyle = '#FF9933';
        ctx.font = '7px Outfit, sans-serif';
        ctx.fillText(b.sub, b.x + 50, groundY - 68);
      });

      // 3. Electric Utility Poles & chaotic wires
      const polePositions = [0, 240, 480, 720, 960];
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#475569';

      polePositions.forEach(px => {
        // Vertical pole
        ctx.beginPath();
        ctx.moveTo(px, groundY);
        ctx.lineTo(px, groundY - 80);
        ctx.stroke();

        // Crossbeam
        ctx.beginPath();
        ctx.moveTo(px - 14, groundY - 72);
        ctx.lineTo(px + 14, groundY - 72);
        ctx.stroke();

        // Insulators
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(px - 16, groundY - 76, 4, 4);
        ctx.fillRect(px + 12, groundY - 76, 4, 4);
      });

      // Hanging wires between poles (catenary curve)
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.7)';
      for (let i = 0; i < polePositions.length - 1; i++) {
        const x1 = polePositions[i];
        const x2 = polePositions[i + 1];
        const midX = (x1 + x2) / 2;

        // Wire 1
        ctx.beginPath();
        ctx.moveTo(x1 - 14, groundY - 74);
        ctx.quadraticCurveTo(midX, groundY - 60, x2 - 14, groundY - 74);
        ctx.stroke();

        // Wire 2
        ctx.beginPath();
        ctx.moveTo(x1 + 14, groundY - 74);
        ctx.quadraticCurveTo(midX, groundY - 58, x2 + 14, groundY - 74);
        ctx.stroke();
      }

      return offscreen;
    }

    reset() {
      this._initAerialElements();
      this.offsetFar = 0;
      this.offsetMid = 0;
      this.offsetNear = 0;
      this.offsetRoad = 0;
      this.beaconTimer = 0;
    }

    _initAerialElements() {
      // 1. Pre-allocated Bounded Clouds (5 cartoon clouds with soft sunset hues)
      this.clouds = [
        { x: 80,  y: 65,  scale: 0.85, speedMult: 0.07, drift: 6,  opacity: 0.44 },
        { x: 310, y: 110, scale: 1.15, speedMult: 0.11, drift: 10, opacity: 0.52 },
        { x: 540, y: 55,  scale: 0.75, speedMult: 0.06, drift: 5,  opacity: 0.38 },
        { x: 760, y: 125, scale: 1.05, speedMult: 0.10, drift: 8,  opacity: 0.48 },
        { x: 980, y: 80,  scale: 0.95, speedMult: 0.08, drift: 7,  opacity: 0.42 }
      ];

      // 2. Pre-allocated Indian Fighter Kites (Patang - 2 decorative kites)
      this.kites = [
        { x: 380, y: 90,  baseSpeed: 16, size: 14, color: '#FF007F', tailColor: '#FF9933', phase: 0 },
        { x: 850, y: 135, baseSpeed: 20, size: 12, color: '#00F3FF', tailColor: '#39FF14', phase: 2.2 }
      ];

      // 3. Pre-allocated Twilight Birds (3 birds flying across horizon)
      this.birds = [
        { x: 220, y: 75, wingSpan: 7.5, speedMult: 0.18, phase: 0 },
        { x: 245, y: 88, wingSpan: 6.5, speedMult: 0.18, phase: 0.8 },
        { x: 210, y: 95, wingSpan: 6.0, speedMult: 0.18, phase: 1.5 }
      ];

      // 4. Pre-allocated High-Altitude Flight Speed Streaks (10 streaks)
      this.flightStreaks = [];
      for (let i = 0; i < 10; i++) {
        this.flightStreaks.push({
          x: Math.random() * this.width,
          y: 65 + Math.random() * 160,
          length: 40 + Math.random() * 65,
          speedMult: 1.4 + Math.random() * 0.8,
          alpha: 0.18 + Math.random() * 0.22
        });
      }

      this.flightIntensity = 0; // Smooth 0..1 transition for flight speed streaks
      this.kiteAnimTimer = 0;
      this.birdAnimTimer = 0;
    }

    /**
     * Updates offsets and aerial elements based on delta time and world scroll speed
     */
    update(dt, speed, player = null) {
      this.beaconTimer = (this.beaconTimer + dt * 4) % (Math.PI * 2);

      // Scroll layers with respective parallax multipliers
      const farDelta = speed * Config.PARALLAX.FAR_SKYLINE * dt;
      const midDelta = speed * Config.PARALLAX.ROADSIDE_POLES_TREES * dt;
      const roadDelta = speed * Config.PARALLAX.ROAD_SURFACE * dt;

      this.offsetFar = (this.offsetFar + farDelta) % this.skylineSegmentWidth;
      this.offsetMid = (this.offsetMid + midDelta) % this.skylineSegmentWidth;
      this.offsetRoad = (this.offsetRoad + roadDelta) % 120; // 120px lane marker stride

      // Update aerial objects (clouds, kites, birds, flight streaks)
      this._updateAerialElements(dt, speed, player);
    }

    _updateAerialElements(dt, speed, player) {
      this.kiteAnimTimer += dt;
      this.birdAnimTimer += dt;

      // Flight mode intensity lerp for aerial speed depth
      const isFlying = player && (player.mode === 'FLIGHT' || (player.transformProgress && player.transformProgress > 0.1));
      const targetIntensity = isFlying ? 1.0 : 0.0;
      this.flightIntensity += (targetIntensity - this.flightIntensity) * Math.min(dt * 4, 1);

      // 1. Update Clouds (Bounded recycling: off-screen clouds wrap smoothly to right)
      for (let i = 0; i < this.clouds.length; i++) {
        const c = this.clouds[i];
        const scrollSpeed = speed * c.speedMult + c.drift;
        c.x -= scrollSpeed * dt;

        // Recycle when completely off left edge
        if (c.x + 50 * c.scale < -60) {
          c.x = this.width + 40 + Math.random() * 90;
          c.y = 50 + Math.random() * 115;
          c.scale = 0.75 + Math.random() * 0.45;
          c.speedMult = 0.06 + Math.random() * 0.07;
          c.opacity = 0.38 + Math.random() * 0.15;
        }
      }

      // 2. Update Indian Kites
      for (let i = 0; i < this.kites.length; i++) {
        const k = this.kites[i];
        k.x -= (speed * 0.09 + k.baseSpeed) * dt;
        k.y += Math.sin(this.kiteAnimTimer * 2 + k.phase) * (dt * 5);

        if (k.x < -60) {
          k.x = this.width + 60 + Math.random() * 120;
          k.y = 65 + Math.random() * 95;
        }
      }

      // 3. Update Birds Flock
      for (let i = 0; i < this.birds.length; i++) {
        const b = this.birds[i];
        b.x -= (speed * b.speedMult + 35) * dt;
        b.y += Math.sin(this.birdAnimTimer * 3 + b.phase) * (dt * 4);

        if (b.x < -50) {
          b.x = this.width + 40 + i * 25;
          b.y = 65 + (i * 12);
        }
      }

      // 4. Update High-Altitude Flight Speed Streaks
      if (this.flightIntensity > 0.02) {
        for (let i = 0; i < this.flightStreaks.length; i++) {
          const s = this.flightStreaks[i];
          s.x -= (speed * s.speedMult + 160) * dt;

          if (s.x + s.length < -20) {
            s.x = this.width + 20 + Math.random() * 100;
            s.y = 65 + Math.random() * 165;
            s.length = 40 + Math.random() * 65;
          }
        }
      }
    }

    /**
     * Renders the complete scene background including aerial elements
     */
    render(ctx) {
      this._renderSky(ctx);
      this._renderCloudsAndSkyElements(ctx);
      this._renderFarSkyline(ctx);
      this._renderRoadside(ctx);
      this._renderRoad(ctx);
      this._renderFlightSpeedStreaks(ctx);
    }

    _renderCloudsAndSkyElements(ctx) {
      // 1. Render Clouds
      for (let i = 0; i < this.clouds.length; i++) {
        const c = this.clouds[i];
        this._drawCartoonCloud(ctx, c.x, c.y, c.scale, c.opacity);
      }

      // 2. Render Indian Fighter Kites
      for (let i = 0; i < this.kites.length; i++) {
        this._drawKite(ctx, this.kites[i]);
      }

      // 3. Render Silhouette Birds
      for (let i = 0; i < this.birds.length; i++) {
        this._drawBird(ctx, this.birds[i]);
      }
    }

    _drawCartoonCloud(ctx, cx, cy, scale, opacity) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.globalAlpha = opacity;

      // Sunset twilight gradient fill
      const cGrad = ctx.createLinearGradient(0, -20 * scale, 0, 16 * scale);
      cGrad.addColorStop(0, '#FFE8D6');   // Warm peach sunset top
      cGrad.addColorStop(0.45, '#FDBA74'); // Golden orange
      cGrad.addColorStop(1, '#A855F7');   // Twilight purple underside

      ctx.fillStyle = cGrad;
      ctx.beginPath();
      // Center main dome
      ctx.arc(0, 0, 20 * scale, 0, Math.PI * 2);
      // Left puff
      ctx.arc(-18 * scale, 4 * scale, 14 * scale, 0, Math.PI * 2);
      // Right puff
      ctx.arc(18 * scale, 3 * scale, 16 * scale, 0, Math.PI * 2);
      // Far left small puff
      ctx.arc(-32 * scale, 8 * scale, 10 * scale, 0, Math.PI * 2);
      // Far right small puff
      ctx.arc(32 * scale, 8 * scale, 11 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Fluffy underside shadow
      ctx.fillStyle = 'rgba(88, 28, 135, 0.22)';
      ctx.beginPath();
      ctx.ellipse(0, 12 * scale, 36 * scale, 6 * scale, 0, 0, Math.PI * 2);
      ctx.fill();

      // Warm upper rim highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 1.5 * scale;
      ctx.beginPath();
      ctx.arc(0, 0, 20 * scale, Math.PI * 1.1, Math.PI * 1.9);
      ctx.arc(18 * scale, 3 * scale, 16 * scale, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();

      ctx.restore();
    }

    _drawKite(ctx, kite) {
      ctx.save();
      ctx.translate(kite.x, kite.y);

      // Subtle aerodynamic sway in the wind
      const sway = Math.sin(this.kiteAnimTimer * 2.5 + kite.phase) * 0.14;
      ctx.rotate(sway);

      const s = kite.size;

      // 1. Fluttering Tail Thread
      ctx.strokeStyle = kite.tailColor;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(0, s * 1.2);
      const t1 = Math.sin(this.kiteAnimTimer * 5 + kite.phase) * 6;
      const t2 = Math.cos(this.kiteAnimTimer * 4 + kite.phase) * 8;
      ctx.quadraticCurveTo(-5 + t1, s * 1.8, t2, s * 2.8);
      ctx.stroke();

      // 2. Diamond Kite Paper Body with Cartoon Outline
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.2);  // Top vertex
      ctx.lineTo(s * 0.95, 0);  // Right vertex
      ctx.lineTo(0, s * 1.2);   // Bottom vertex
      ctx.lineTo(-s * 0.95, 0); // Left vertex
      ctx.closePath();

      ctx.fillStyle = kite.color;
      ctx.fill();
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // 3. Bamboo Spine (Vertical)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.2);
      ctx.lineTo(0, s * 1.2);
      ctx.stroke();

      // 4. Curved Bow Spar (Horizontal)
      ctx.beginPath();
      ctx.moveTo(-s * 0.95, 0);
      ctx.quadraticCurveTo(0, -s * 0.45, s * 0.95, 0);
      ctx.stroke();

      // 5. Small Triangular Tail
      ctx.fillStyle = kite.tailColor;
      ctx.beginPath();
      ctx.moveTo(-3, s * 1.2);
      ctx.lineTo(3, s * 1.2);
      ctx.lineTo(0, s * 1.55);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    _drawBird(ctx, bird) {
      ctx.save();
      ctx.translate(bird.x, bird.y);

      const flap = Math.sin(this.birdAnimTimer * 7 + bird.phase);
      const span = bird.wingSpan;
      const wingY = -flap * 4;

      ctx.strokeStyle = '#221538'; // Dark twilight silhouette
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';

      ctx.beginPath();
      // Left Wing arc
      ctx.moveTo(-span, wingY);
      ctx.quadraticCurveTo(-span * 0.45, -wingY * 0.4, 0, 0);
      // Right Wing arc
      ctx.quadraticCurveTo(span * 0.45, -wingY * 0.4, span, wingY);
      ctx.stroke();

      ctx.restore();
    }

    _renderFlightSpeedStreaks(ctx) {
      if (this.flightIntensity < 0.02) return;

      ctx.save();
      for (let i = 0; i < this.flightStreaks.length; i++) {
        const s = this.flightStreaks[i];
        const alpha = (s.alpha * this.flightIntensity).toFixed(3);

        const grad = ctx.createLinearGradient(s.x, s.y, s.x + s.length, s.y);
        grad.addColorStop(0, 'rgba(0, 243, 255, 0)');
        grad.addColorStop(0.4, `rgba(0, 243, 255, ${alpha})`);
        grad.addColorStop(0.8, `rgba(255, 255, 255, ${alpha})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + s.length, s.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    _renderSky(ctx) {
      // Twilight Indian sunset sky gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, Config.HORIZON_Y);
      skyGrad.addColorStop(0, '#100C24');   // Deep night violet
      skyGrad.addColorStop(0.4, '#381643'); // Imperial purple
      skyGrad.addColorStop(0.75, '#8D2F40');// Twilight magenta
      skyGrad.addColorStop(1, '#E65C00');   // Saffron orange horizon glow

      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, this.width, Config.HORIZON_Y);

      // Low glowing Indian sun
      const sunX = this.width * 0.72;
      const sunY = Config.HORIZON_Y - 45;
      const sunGrad = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, 70);
      sunGrad.addColorStop(0, '#FFF5CC');
      sunGrad.addColorStop(0.3, 'rgba(255, 170, 50, 0.8)');
      sunGrad.addColorStop(0.7, 'rgba(230, 92, 0, 0.3)');
      sunGrad.addColorStop(1, 'rgba(230, 92, 0, 0)');

      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, 70, 0, Math.PI * 2);
      ctx.fill();

      // Atmospheric distant dust haze along horizon
      const hazeGrad = ctx.createLinearGradient(0, Config.HORIZON_Y - 30, 0, Config.HORIZON_Y);
      hazeGrad.addColorStop(0, 'rgba(230, 92, 0, 0)');
      hazeGrad.addColorStop(1, 'rgba(255, 153, 51, 0.35)');
      ctx.fillStyle = hazeGrad;
      ctx.fillRect(0, Config.HORIZON_Y - 30, this.width, 30);
    }

    _renderFarSkyline(ctx) {
      ctx.save();
      const x = -this.offsetFar;
      // Draw twice for seamless infinite scrolling
      ctx.drawImage(this.skylineCanvas, x, 0);
      ctx.drawImage(this.skylineCanvas, x + this.skylineSegmentWidth, 0);

      // Draw blinking red warning beacon lights atop telecom towers
      const beaconAlpha = (Math.sin(this.beaconTimer) + 1) / 2;
      ctx.fillStyle = `rgba(255, 40, 40, ${beaconAlpha.toFixed(2)})`;
      ctx.shadowColor = '#FF2828';
      ctx.shadowBlur = 6;

      const towerXPositions = [285, 765];
      towerXPositions.forEach(tx => {
        let screenX = (tx - this.offsetFar) % this.skylineSegmentWidth;
        if (screenX < 0) screenX += this.skylineSegmentWidth;
        ctx.beginPath();
        ctx.arc(screenX, Config.HORIZON_Y - 120, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
    }

    _renderRoadside(ctx) {
      ctx.save();
      const x = -this.offsetMid;
      ctx.drawImage(this.roadsideCanvas, x, 0);
      ctx.drawImage(this.roadsideCanvas, x + this.skylineSegmentWidth, 0);
      ctx.restore();
    }

    _renderRoad(ctx) {
      const roadTop = Config.ROAD_TOP_Y;
      const roadBottom = Config.ROAD_BOTTOM_Y;
      const roadHeight = roadBottom - roadTop;

      // 1. Indian Highway Curb (Yellow and Black safety hazard stripes)
      const curbHeight = 12;
      const curbY = roadTop - curbHeight;
      const stripeWidth = 24;
      const curbOffset = this.offsetRoad % (stripeWidth * 2);

      for (let cx = -curbOffset - stripeWidth * 2; cx < this.width + stripeWidth; cx += stripeWidth * 2) {
        // Yellow block
        ctx.fillStyle = Config.COLORS.ROAD_MARKING_YELLOW;
        ctx.fillRect(cx, curbY, stripeWidth, curbHeight);
        // Black block
        ctx.fillStyle = '#111827';
        ctx.fillRect(cx + stripeWidth, curbY, stripeWidth, curbHeight);
      }

      // Curb edge border
      ctx.fillStyle = '#374151';
      ctx.fillRect(0, curbY, this.width, 2);

      // 2. Main Road Asphalt surface
      const roadGrad = ctx.createLinearGradient(0, roadTop, 0, roadBottom);
      roadGrad.addColorStop(0, '#1c202a');
      roadGrad.addColorStop(0.5, '#232936');
      roadGrad.addColorStop(1, '#181b22');

      ctx.fillStyle = roadGrad;
      ctx.fillRect(0, roadTop, this.width, roadHeight);

      // 3. Central Median Double Solid Yellow Line
      const medianY = roadTop + roadHeight * 0.48;
      ctx.fillStyle = Config.COLORS.ROAD_MARKING_YELLOW;
      ctx.fillRect(0, medianY - 4, this.width, 3);
      ctx.fillRect(0, medianY + 2, this.width, 3);

      // 4. Broken Lane Markers (Top lane and Bottom lane)
      const laneMarkerY1 = roadTop + roadHeight * 0.24;
      const laneMarkerY2 = roadTop + roadHeight * 0.74;
      const dashWidth = 55;
      const dashGap = 65;
      const stride = dashWidth + dashGap; // 120px
      const markerOffset = this.offsetRoad;

      ctx.fillStyle = Config.COLORS.ROAD_MARKING_WHITE;
      for (let lx = -markerOffset - stride; lx < this.width + stride; lx += stride) {
        ctx.fillRect(lx, laneMarkerY1, dashWidth, 4);
        ctx.fillRect(lx, laneMarkerY2, dashWidth, 4);
      }

      // 5. Road Shoulder / Dust Verge at Bottom
      ctx.fillStyle = '#33291E'; // Indian highway clay/dust verge
      ctx.fillRect(0, roadBottom, this.width, this.height - roadBottom);
      ctx.fillStyle = '#483C2D';
      ctx.fillRect(0, roadBottom, this.width, 4); // border gravel strip
    }
  }

  window.DesiRoadster.ParallaxBackground = ParallaxBackground;
})();
