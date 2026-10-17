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

    /**
     * Updates offsets based on delta time and world scroll speed
     */
    update(dt, speed) {
      this.beaconTimer = (this.beaconTimer + dt * 4) % (Math.PI * 2);

      // Scroll layers with respective parallax multipliers
      const farDelta = speed * Config.PARALLAX.FAR_SKYLINE * dt;
      const midDelta = speed * Config.PARALLAX.ROADSIDE_POLES_TREES * dt;
      const roadDelta = speed * Config.PARALLAX.ROAD_SURFACE * dt;

      this.offsetFar = (this.offsetFar + farDelta) % this.skylineSegmentWidth;
      this.offsetMid = (this.offsetMid + midDelta) % this.skylineSegmentWidth;
      this.offsetRoad = (this.offsetRoad + roadDelta) % 120; // 120px lane marker stride
    }

    /**
     * Renders the complete scene background
     */
    render(ctx) {
      this._renderSky(ctx);
      this._renderFarSkyline(ctx);
      this._renderRoadside(ctx);
      this._renderRoad(ctx);
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
