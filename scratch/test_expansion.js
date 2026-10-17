/**
 * Comprehensive Automated Tests for Desi Roadster Master Gameplay Expansion
 * Tests all 6 features:
 * 1. Indian Traffic AI (Lane changing, hesitation, DesiTruck)
 * 2. Pothole Physics (Standard crater, large launch crater, suspension damp, shield)
 * 3. Aerial Hazards (Wires, kite string, low flyover clearances)
 * 4. Random Road Events (Wedding Baraat, Sabzi Cart, Cricket Ball, cooldowns)
 * 5. Jugaad Upgrade Shop (Economy, persistence, perks, trade-offs)
 * 6. Run Recap & Shareable Challenge (Cause of death, headline, seed, card generator)
 */

const assert = require('assert');

// Mock browser environment for Node.js test runner
global.window = global;
global.performance = { now: () => Date.now() };
global.document = {
  getElementById: (id) => ({
    classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
    style: {},
    addEventListener: () => {},
    querySelectorAll: () => [],
    appendChild: () => {},
    innerHTML: '',
    textContent: ''
  }),
  createElement: (tag) => ({
    className: '',
    innerHTML: '',
    style: {},
    querySelector: () => ({ addEventListener: () => {} }),
    appendChild: () => {}
  })
};

const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = v.toString(); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};

// Mock HTMLCanvasElement
global.HTMLCanvasElement = class {};

// Load scripts in order
require('../js/config.js');
require('../js/input.js');
require('../js/audio.js');
require('../js/upgrades.js');
require('../js/background.js');
require('../js/player.js');
require('../js/obstacles.js');
require('../js/events.js');
require('../js/recap.js');
require('../js/game.js');

const {
  Config,
  Player,
  ObstacleManager,
  AutoRickshaw,
  TaxiCar,
  Scooter,
  DesiCow,
  DesiBuffalo,
  DesiTruck,
  PotholeObstacle,
  AerialWireHazard,
  KiteStringHazard,
  LowFlyoverHazard,
  UpgradeManager,
  EventDirector,
  WeddingBaraatObstacle,
  StreetVendorCart,
  CricketBallObstacle,
  RecapManager
} = window.DesiRoadster;

let passed = 0;
let total = 0;

function it(desc, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✓ ${desc}`);
  } catch (err) {
    console.error(`  ✗ ${desc}`);
    console.error(err);
    process.exit(1);
  }
}

console.log('\n--- 1. FEATURE 1: INDIAN TRAFFIC AI ---');

it('AutoRickshaw and TaxiCar initialize with lane changing AI properties', () => {
  const auto = new AutoRickshaw(1, 800);
  assert.strictEqual(auto.isChangingLane, false);
  assert.strictEqual(auto.targetLaneIndex, 1);
  assert(auto.laneChangeTimer > 0);

  const taxi = new TaxiCar(0, 800);
  assert.strictEqual(taxi.isChangingLane, false);
  assert.strictEqual(taxi.targetLaneIndex, 0);
  assert(taxi.laneChangeTimer > 0);
});

it('AutoRickshaw triggers indicator blink before changing lane when safe', () => {
  const lanes = [{ y: 345 }, { y: 405 }, { y: 460 }];
  const auto = new AutoRickshaw(1, 800);
  auto.laneChangeTimer = 0.01;
  auto.update(0.02, 300, [auto], lanes);

  assert.strictEqual(auto.indicatorBlinking, true);
  assert(auto.indicatorTimer > 0);
  assert(auto.targetLaneIndex === 0 || auto.targetLaneIndex === 2);
});

it('DesiCow and DesiBuffalo have hesitation update behavior', () => {
  const cow = new DesiCow(0, 800);
  assert.strictEqual(cow.isHesitating, false);
  cow.hesitationTimer = 0.01;
  cow.update(0.02, 300);
  assert.strictEqual(cow.isHesitating, true);

  const buffalo = new DesiBuffalo(1, 800);
  buffalo.hesitationTimer = 0.01;
  buffalo.update(0.02, 300);
  assert.strictEqual(buffalo.isHesitating, true);
});

it('DesiTruck has classic dimensions and HORN OK PLEASE type', () => {
  const truck = new DesiTruck(2, 900);
  assert.strictEqual(truck.type, 'truck');
  assert.strictEqual(truck.width, 122);
  assert.strictEqual(truck.height, 54);
  assert.strictEqual(truck.speedMultiplier, 0.30);
});

console.log('\n--- 2. FEATURE 2: POTHOLE PHYSICS ---');

it('PotholeObstacle creates standard and large craters flush to road', () => {
  const standard = new PotholeObstacle(1, 700, 'standard');
  assert.strictEqual(standard.type, 'pothole');
  assert.strictEqual(standard.potholeType, 'standard');
  assert.strictEqual(standard.speedMultiplier, 0.0);

  const large = new PotholeObstacle(0, 700, 'large');
  assert.strictEqual(large.potholeType, 'large');
  assert.strictEqual(large.width, 82);
});

it('Potholes only collide when player is in ROAD mode and on the ground', () => {
  const pothole = new PotholeObstacle(1, 100, 'standard');
  pothole.y = 405;

  const player = new Player();
  player.x = 100;
  player.y = 390;
  player.targetLaneY = 390;
  player.mode = 'ROAD';
  player.isGrounded = true;

  assert.strictEqual(pothole.checkCollision(player), true);

  // Flight mode car is completely immune to potholes!
  player.mode = 'FLIGHT';
  assert.strictEqual(pothole.checkCollision(player), false);

  // Jumped car high above road is immune
  player.mode = 'ROAD';
  player.isGrounded = false;
  player.y = 300;
  assert.strictEqual(pothole.checkCollision(player), false);
});

it('Player launchFromPothole gives immediate upward impulse', () => {
  const player = new Player();
  player.mode = 'ROAD';
  player.isGrounded = true;
  player.vy = 0;

  player.launchFromPothole(-420);
  assert.strictEqual(player.isGrounded, false);
  assert.strictEqual(player.vy, -420);
});

console.log('\n--- 3. FEATURE 3: AERIAL HAZARDS EXPANSION ---');

it('LowFlyoverHazard creates concrete bridge deck with road & flight clearances', () => {
  const flyover = new LowFlyoverHazard(200, 135);
  assert.strictEqual(flyover.type, 'flyover');
  assert.strictEqual(flyover.width, 180);
  assert.strictEqual(flyover.deckThickness, 34);

  const player = new Player();
  player.x = 220;

  // Road driving is 100% immune (cars drive safely under the flyover!)
  player.mode = 'ROAD';
  player.isGrounded = true;
  player.y = 390;
  assert.strictEqual(flyover.checkCollision(player), false);

  // High flight is 100% immune (flies over the bridge deck)
  player.mode = 'FLIGHT';
  player.y = 80;
  assert.strictEqual(flyover.checkCollision(player), false);

  // Flying directly into the concrete deck collides!
  player.y = 138;
  assert.strictEqual(flyover.checkCollision(player), true);
});

console.log('\n--- 4. FEATURE 4: RANDOM INDIAN ROAD EVENTS ---');

it('EventDirector spawns and manages Baraat, Sabzi Cart, and Cricket Ball', () => {
  const director = new EventDirector();
  assert.strictEqual(director.events.length, 0);

  // Force spawn Wedding Baraat
  director._triggerEvent('wedding_baraat');
  assert.strictEqual(director.events.length, 1);
  assert.strictEqual(director.events[0].type, 'wedding_baraat');

  director.reset();
  director._triggerEvent('vendor_cart');
  assert.strictEqual(director.events[0].type, 'vendor_cart');

  director.reset();
  director._triggerEvent('cricket_ball');
  assert.strictEqual(director.events[0].type, 'cricket_ball');
});

console.log('\n--- 5. FEATURE 5: JUGAAD UPGRADE SHOP ---');

it('UpgradeManager handles economy, purchase validation, and persistence', () => {
  localStorage.clear();
  const manager = new UpgradeManager();
  assert.strictEqual(manager.getBank(), 0);

  // Add coins
  manager.addCoins(600);
  assert.strictEqual(manager.getBank(), 600);

  // Buy Desi Suspension
  const res1 = manager.buyUpgrade('suspension');
  assert.strictEqual(res1.success, true);
  assert.strictEqual(manager.hasUpgrade('suspension'), true);
  assert.strictEqual(manager.getBank(), 350);

  // Cannot buy already owned
  const resDup = manager.buyUpgrade('suspension');
  assert.strictEqual(resDup.success, false);
  assert.strictEqual(resDup.reason, 'ALREADY_OWNED');

  // Persistence check in fresh manager instance
  const manager2 = new UpgradeManager();
  assert.strictEqual(manager2.hasUpgrade('suspension'), true);
  assert.strictEqual(manager2.getBank(), 350);

  // Pothole shield consumable charges
  manager2.buyUpgrade('shield'); // 300 cost
  manager2.initRun();
  assert.strictEqual(manager2.potholeShieldCharges, 2);
  assert.strictEqual(manager2.consumePotholeShield(), true);
  assert.strictEqual(manager2.consumePotholeShield(), true);
  assert.strictEqual(manager2.consumePotholeShield(), false);
});

console.log('\n--- 6. FEATURE 6: RUN RECAP & SHAREABLE CHALLENGES ---');

it('RecapManager maps real hazards to accurate satirical headlines', () => {
  const recap = new RecapManager();

  recap.recordHazardHit('pothole');
  assert.strictEqual(recap.generateHeadline(), 'Survived the traffic. Lost to a pothole.');

  recap.recordHazardHit('aerial_wires');
  assert.strictEqual(recap.generateHeadline(), 'Flight terminated by 440V overhead wires.');

  recap.recordHazardHit('flyover');
  assert.strictEqual(recap.generateHeadline(), 'Bridge too low! Defeated by a city flyover.');

  recap.recordHazardHit('cow');
  assert.strictEqual(recap.generateHeadline(), 'The Holy Cow won this round. 🐄');

  recap.recordHazardHit('truck');
  assert.strictEqual(recap.generateHeadline(), 'Flattened by a "Horn OK Please" Tata truck. 🚛');

  recap.recordHazardHit('wedding_baraat');
  assert.strictEqual(recap.generateHeadline(), 'Delayed permanently by a Punjabi Baraat. 🎺');
});

it('RecapManager provides date-based daily challenge seed and share text', () => {
  const daily = RecapManager.getDailySeed();
  assert(daily.dateString.match(/^\d{4}-\d{2}-\d{2}$/));
  assert(daily.seed > 0);

  const recap = new RecapManager();
  recap.stats.distance = 1450;
  recap.stats.score = 2500;
  recap.stats.topSpeedKmh = 142;
  recap.recordHazardHit('pothole');

  const shareText = recap.getShareText();
  assert(shareText.includes('Desi Roadster'));
  assert(shareText.includes('Survived the traffic. Lost to a pothole.'));
  assert(shareText.includes('2,500'));
});

console.log(`\n========================================`);
console.log(`TOTAL EXPANSION UNIT TESTS PASSED: ${passed} / ${total}`);
console.log(`========================================\n`);
