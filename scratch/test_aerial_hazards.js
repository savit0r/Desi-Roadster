// Unit tests for Desi Roadster Aerial Hazard System (Wires & Kite Strings)
const fs = require('fs');

global.window = {};
global.document = {
  getElementById: () => ({ textContent: '', style: {}, classList: { add: () => {}, remove: () => {} } }),
  createElement: () => ({
    width: 0,
    height: 0,
    getContext: () => ({
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      fillRect: () => {},
      strokeRect: () => {},
      clearRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      quadraticCurveTo: () => {},
      arc: () => {},
      ellipse: () => {},
      fill: () => {},
      stroke: () => {},
      fillText: () => {}
    })
  })
};
global.localStorage = { getItem: () => null, setItem: () => {} };

require('../js/config.js');
const Config = window.DesiRoadster.Config;
require('../js/player.js');
const { Player, PLAYER_STATE } = window.DesiRoadster;
require('../js/obstacles.js');
const { ObstacleManager, AerialWireHazard, KiteStringHazard } = window.DesiRoadster;

function runAerialHazardTests() {
  console.log('--- RUNNING DESI ROADSTER AERIAL HAZARD TESTS ---');
  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) {
      console.log(`  ✓ ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      failed++;
    }
  }

  const manager = new ObstacleManager();
  const player = new Player();

  // Test 1: Grounded road driving immunity
  player.state = PLAYER_STATE.ROAD;
  player.mode = 'ROAD';
  player.isGrounded = true;
  player.y = 405; // Mid road lane

  const wire = new AerialWireHazard(player.x - 20, 165);
  const kite = new KiteStringHazard(player.x - 20, 140);

  assert(!wire.checkCollision(player), 'Grounded road car NEVER collides with overhead wires');
  assert(!kite.checkCollision(player), 'Grounded road car NEVER collides with kite string');
  assert(!wire.checkNearMiss(player), 'Grounded road car does not trigger aerial near-miss');
  assert(!kite.checkNearMiss(player), 'Grounded road car does not trigger kite near-miss');

  // Test 2: Takeoff transition safety
  player.state = PLAYER_STATE.TRANSFORM_TO_FLIGHT;
  player.transformProgress = 0.2;
  manager.aerialHazards = [];
  manager._spawnAerialHazard(350, player);
  assert(manager.aerialHazards.length === 0, 'Spawner never spawns aerial hazards during initial takeoff transition');

  // Test 3: Overhead Wire Collision in Flight
  player.state = PLAYER_STATE.FLIGHT;
  player.mode = 'FLIGHT';
  player.isGrounded = false;
  player.y = 165; // Same altitude as wire
  player.battery = 80;

  const wireFlight = new AerialWireHazard(player.x - 20, 165);
  assert(wireFlight.checkCollision(player), 'Direct flight intersection with overhead wire triggers collision');

  let collisionTriggered = false;
  manager._handleAerialCollision(player, wireFlight, () => { collisionTriggered = true; });
  assert(collisionTriggered, 'Collision callback invoked on wire collision');
  assert(wireFlight.hasCollided === true, 'Wire hazard marked as hasCollided');
  assert(wireFlight.hasNearMissed === true, 'Collided wire hazard flagged ineligible for near-miss');
  assert(player.battery === 70, 'Wire collision applies -10% battery penalty (80% -> 70%)');
  const wireText = manager.floatingTexts.find(t => t.text.includes('LIVE WIRE JOLT'));
  assert(wireText !== undefined, 'Floating feedback text spawned for wire jolt');

  // Test 4: Overhead Wire Near-Miss (Flying narrowly over wires)
  const wireNearMiss = new AerialWireHazard(player.x - 120, 185);
  player.y = 135; // Flying 35px above wire
  assert(!wireNearMiss.checkCollision(player), 'Player flying above wire does NOT collide');
  assert(wireNearMiss.checkNearMiss(player), 'Narrow clearance above wire qualifies as near-miss');

  let nearMissTriggered = false;
  manager._handleAerialNearMiss(player, wireNearMiss, () => { nearMissTriggered = true; });
  assert(nearMissTriggered, 'Near-miss callback invoked on wire clearance');
  assert(wireNearMiss.hasNearMissed === true, 'Wire flagged hasNearMissed');
  const wireSkimText = manager.floatingTexts.find(t => t.text.includes('WIRE SKIM'));
  assert(wireSkimText !== undefined, 'Floating text "WIRE SKIM! +100" spawned');

  // Test 5: Kite String Collision in Flight
  const kiteFlight = new KiteStringHazard(player.x - 40, 160);
  // Calculate expected string Y at player center
  const pHitbox = player.getHitbox();
  const pCenterX = pHitbox.x + pHitbox.width * 0.5;
  const t = (pCenterX - (kiteFlight.x + 35)) / 80;
  const expectedStringY = (kiteFlight.y - 25) + t * 90;
  player.y = expectedStringY - pHitbox.height * 0.5; // Place car right across string

  assert(kiteFlight.checkCollision(player), 'Direct flight intersection with kite string triggers collision');
  collisionTriggered = false;
  player.battery = 70;
  manager._handleAerialCollision(player, kiteFlight, () => { collisionTriggered = true; });
  assert(collisionTriggered, 'Collision callback invoked on kite collision');
  assert(player.battery === 62, 'Kite collision applies -8% battery penalty (70% -> 62%)');
  const kiteText = manager.floatingTexts.find(t => t.text.includes('MANJA SNAG'));
  assert(kiteText !== undefined, 'Floating feedback text "MANJA SNAG!" spawned');

  // Test 6: Kite String Near-Miss (Evading narrowly above or below)
  const kiteNear = new KiteStringHazard(player.x - 70, 160);
  player.y = 75; // Flying near ceiling, safely clear of string at Y~170
  assert(!kiteNear.checkCollision(player), 'High altitude flight does not collide with low kite string');

  // Test 7: Offscreen Culling
  const offscreenWire = new AerialWireHazard(-400, 150);
  assert(offscreenWire.isOffscreen(), 'Offscreen aerial wire detected');
  manager.aerialHazards.push(offscreenWire);
  manager.update(0.016, 350, player, 500);
  assert(!manager.aerialHazards.includes(offscreenWire), 'Offscreen aerial hazard is culled from collection');

  // Test 8: Reset behavior
  manager.aerialHazards.push(new AerialWireHazard(500, 150));
  manager.reset();
  assert(manager.aerialHazards.length === 0, 'manager.reset() clears all aerial hazards');
  assert(manager.floatingTexts.length === 0, 'manager.reset() clears all floating texts');
  assert(manager.impactParticles.length === 0, 'manager.reset() clears all impact particles');

  // Test 9: Mock Canvas Save/Restore Parity
  let wireSaves = 0, wireRestores = 0;
  const mockWireCtx = {
    save: () => { wireSaves++; },
    restore: () => { wireRestores++; },
    fillRect: () => {},
    strokeRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    quadraticCurveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    fillText: () => {}
  };
  const testWire = new AerialWireHazard(200, 150);
  testWire.render(mockWireCtx);
  assert(wireSaves === wireRestores && wireSaves > 0, `Aerial wire save/restore parity verified (${wireSaves} saves, ${wireRestores} restores)`);

  let kiteSaves = 0, kiteRestores = 0;
  const mockKiteCtx = {
    save: () => { kiteSaves++; },
    restore: () => { kiteRestores++; },
    translate: () => {},
    rotate: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    quadraticCurveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    fillText: () => {}
  };
  const testKite = new KiteStringHazard(200, 150);
  testKite.render(mockKiteCtx);
  assert(kiteSaves === kiteRestores && kiteSaves > 0, `Kite string save/restore parity verified (${kiteSaves} saves, ${kiteRestores} restores)`);

  console.log(`\nAERIAL HAZARD TESTS SUMMARY: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runAerialHazardTests();
