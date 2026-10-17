/**
 * DESI ROADSTER - RUN RECAP, HEADLINE GENERATOR & SHAREABLE CARD
 * Accurately tracks cause of death, generates contextual satirical headlines,
 * renders high-resolution shareable result cards (Canvas PNG export),
 * copies challenge text to clipboard, and provides seeded Daily Challenge mode.
 */

window.DesiRoadster = window.DesiRoadster || {};

(function() {
  const { Config } = window.DesiRoadster;

  class RecapManager {
    constructor() {
      this.isDailyChallenge = false;
      this.resetRunStats();
    }

    resetRunStats() {
      this.stats = {
        distance: 0,
        score: 0,
        coins: 0,
        nearMisses: 0,
        topSpeedKmh: 0,
        airtimeSeconds: 0,
        potholesHit: 0,
        lastHazardType: null,
        isDailyChallenge: this.isDailyChallenge
      };
    }

    recordHazardHit(hazardType) {
      if (hazardType) {
        this.stats.lastHazardType = hazardType;
      }
    }

    updateStats(dt, currentSpeed, player, distance, score, coins, nearMisses) {
      this.stats.distance = Math.floor(distance);
      this.stats.score = Math.floor(score);
      this.stats.coins = coins;
      this.stats.nearMisses = nearMisses;

      const kmh = Math.floor((currentSpeed / Config.BASE_SPEED) * 110);
      if (kmh > this.stats.topSpeedKmh) {
        this.stats.topSpeedKmh = kmh;
      }

      if (player && (player.state === 'FLIGHT' || player.state === 'TRANSFORM_TO_FLIGHT')) {
        this.stats.airtimeSeconds += dt;
      }
    }

    /**
     * Contextual headline generator based on actual cause of death
     */
    generateHeadline() {
      const type = this.stats.lastHazardType;
      switch (type) {
        case 'pothole':
        case 'pothole_large':
          return 'Survived the traffic. Lost to a pothole.';
        case 'aerial_wires':
          return 'Flight terminated by 440V overhead wires.';
        case 'kite_string':
          return 'Entangled in a kite string over Old Delhi. 🪁';
        case 'flyover':
          return 'Bridge too low! Defeated by a city flyover.';
        case 'cow':
          return 'The Holy Cow won this round. 🐄';
        case 'buffalo':
          return 'Buffalo blocked the lane of dreams. 🐃';
        case 'truck':
          return 'Flattened by a "Horn OK Please" Tata truck. 🚛';
        case 'auto':
          return 'Auto-rickshaw took the impossible gap. 🛺';
        case 'scooter':
          return 'Cut off by a two-wheeler with no mirrors. 🛵';
        case 'car':
        case 'taxi':
          return 'Ambassador taxi bumper check! 🚕';
        case 'wedding_baraat':
          return 'Delayed permanently by a Punjabi Baraat. 🎺';
        case 'vendor_cart':
          return 'Totaled by a roadside sabzi thela. 🥭';
        case 'cricket_ball':
          return 'Clean bowled by a gulley cricket sixer! 🏏';
        case 'battery':
          return 'Electric battery hit 0% mid-air. Forced landing failed!';
        default:
          return 'Built for the skies. Defeated by Indian roads.';
      }
    }

    /**
     * Generates a date-based seed string and integer for reproducible Daily Challenges
     */
    static getDailySeed() {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const str = `${y}-${m}-${d}`;
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) | 0;
      }
      return { dateString: str, seed: Math.abs(hash) };
    }

    /**
     * Generates challenge text for X, Reddit, or WhatsApp
     */
    getShareText() {
      const headline = this.generateHeadline();
      const mode = this.stats.isDailyChallenge ? '📅 DAILY CHALLENGE' : '🚗 HIGHWAY RUN';
      return `Desi Roadster (${mode})\n"${headline}"\n\n🏆 Score: ${this.stats.score.toLocaleString()} | 📏 Distance: ${this.stats.distance}m | ⚡ Top Speed: ${this.stats.topSpeedKmh} km/h\nCan you survive Indian traffic? Play Desi Roadster! #DesiRoadster`;
    }

    /**
     * Renders a high-resolution, polished cartoon result card onto a Canvas
     * for instant PNG download.
     */
    renderResultCard() {
      const cardCanvas = document.createElement('canvas');
      cardCanvas.width = 840;
      cardCanvas.height = 480;
      const ctx = cardCanvas.getContext('2d');

      // 1. Warm Indian Sunset Gradient Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 480);
      bgGrad.addColorStop(0, '#1E1035');   // Twilight purple
      bgGrad.addColorStop(0.35, '#3B1845');
      bgGrad.addColorStop(0.65, '#832838'); // Crimson horizon
      bgGrad.addColorStop(0.9, '#D9532F');  // Sunset orange
      bgGrad.addColorStop(1, '#1A1829');    // Road asphalt dark base

      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 840, 480);

      // Decorative sunset sun disk
      ctx.fillStyle = 'rgba(255, 180, 80, 0.3)';
      ctx.beginPath();
      ctx.arc(420, 240, 110, 0, Math.PI * 2);
      ctx.fill();

      // Outer Card Cartoon Border
      ctx.strokeStyle = '#FF9933';
      ctx.lineWidth = 6;
      ctx.strokeRect(6, 6, 828, 468);
      ctx.strokeStyle = '#00F3FF';
      ctx.lineWidth = 2;
      ctx.strokeRect(12, 12, 816, 456);

      // Title Banner
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(240, 20, 360, 44);
      ctx.strokeStyle = '#FF9933';
      ctx.lineWidth = 2;
      ctx.strokeRect(240, 20, 360, 44);

      ctx.fillStyle = '#FF9933';
      ctx.font = '900 22px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DESI ROADSTER', 420, 49);

      // Mode Badge
      ctx.fillStyle = this.stats.isDailyChallenge ? '#39FF14' : '#00F3FF';
      ctx.font = 'bold 11px Orbitron, sans-serif';
      ctx.fillText(this.stats.isDailyChallenge ? '📅 DAILY CHALLENGE RESULTS' : '⚡ GRAND TRUNK RUN RESULTS', 420, 92);

      // Headline
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 17px Outfit, sans-serif';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 6;
      ctx.fillText(`"${this.generateHeadline()}"`, 420, 130);
      ctx.shadowBlur = 0;

      // Stats Grid Boxes
      const drawStatBox = (x, y, w, h, label, val, color) => {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.6;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = '#94A3B8';
        ctx.font = 'bold 10px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, x + w / 2, y + 20);

        ctx.fillStyle = color;
        ctx.font = '900 20px Orbitron, sans-serif';
        ctx.fillText(val, x + w / 2, y + 48);
      };

      drawStatBox(60, 160, 160, 68, 'FINAL SCORE', this.stats.score.toLocaleString(), '#00F3FF');
      drawStatBox(245, 160, 160, 68, 'DISTANCE', `${this.stats.distance} m`, '#FF9933');
      drawStatBox(430, 160, 160, 68, 'TOP SPEED', `${this.stats.topSpeedKmh} km/h`, '#39FF14');
      drawStatBox(615, 160, 160, 68, 'COINS EARNED', `${this.stats.coins} ₹`, '#FCD34D');

      drawStatBox(150, 245, 165, 68, 'NEAR-MISSES', `${this.stats.nearMisses}`, '#FF007F');
      drawStatBox(335, 245, 170, 68, 'AIRTIME', `${Math.floor(this.stats.airtimeSeconds)} sec`, '#38BDF8');
      drawStatBox(525, 245, 165, 68, 'POTHOLES HIT', `${this.stats.potholesHit}`, '#E2E8F0');

      // Tesla Roadster Cartoon Silhouette at bottom
      ctx.fillStyle = '#EF233C';
      ctx.beginPath();
      ctx.roundRect(360, 360, 120, 24, [8, 16, 2, 2]);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(385, 384, 10, 0, Math.PI * 2);
      ctx.arc(455, 384, 10, 0, Math.PI * 2);
      ctx.fill();

      // Footer Call to Action
      ctx.fillStyle = '#E2E8F0';
      ctx.font = 'bold 12px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Can you survive Indian traffic? Play at DesiRoadster.com • #DesiRoadster', 420, 440);

      return cardCanvas;
    }
  }

  window.DesiRoadster.RecapManager = RecapManager;
})();
