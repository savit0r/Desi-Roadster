// Unit tests for Tesla Roadster Visual Upgrade & Flight Smoke System
const fs = require('fs');

global.window = {};
global.document = {
  getElementById: () => ({ textContent: '', style: {}, classList: { add: () => {}, remove: () => {} } })
};
global.localStorage = { getItem: () => null, setItem: () => {} };

require('../js/config.js');
const Config = window.DesiRoadster.Config;
require('../js/player.js');
const { Player, PLAYER_STATE } = window.DesiRoadster;

function runPlayerTests() {
  console.log('--- RUNNING TESLA ROADSTER VISUAL & EXHAUST TESTS ---');
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

  const player = new Player();

  // Test 1: Dimensions and basic physics preserved
  assert(player.width === 104, 'Player width preserved at 104');
  assert(player.height === 38, 'Player height preserved at 38');
  assert(player.minX === 60 && player.maxX === 380, 'Player horizontal bounds preserved');

  // Test 2: Bounded smoke pool
  assert(Array.isArray(player.smokePool), 'smokePool initialized');
  assert(player.smokePool.length === 48, 'smokePool is strictly bounded to 48 objects');
  assert(player.smokePool.every(p => p.active === false), 'All smoke particles initially inactive');

  // Test 3: Hitboxes preserved in road mode
  const roadHitbox = player.getHitbox();
  assert(roadHitbox.width === 104 - 16, 'Road hitbox width matches width - 16');
  assert(roadHitbox.height === 38 - 10, 'Road hitbox height matches height - 10');

  // Test 4: Road driving does not activate flight smoke
  const mockInput = { isDown: () => false, isJustPressed: () => false };
  for (let f = 0; f < 30; f++) {
    player.update(0.016, mockInput, 350);
  }
  const activeSmokeRoad = player.smokePool.filter(p => p.active).length;
  assert(activeSmokeRoad === 0, 'No flight smoke particles spawned while driving on road');

  // Test 5: Takeoff and flight mode activate smoke particles
  player.toggleMode(); // Triggers takeoff
  assert(player.state === PLAYER_STATE.TRANSFORM_TO_FLIGHT, 'Player initiates takeoff transition');

  for (let f = 0; f < 40; f++) {
    player.update(0.016, mockInput, 350);
  }
  const activeSmokeFlight = player.smokePool.filter(p => p.active).length;
  assert(activeSmokeFlight > 0, `Flight mode activates thruster smoke particles (${activeSmokeFlight} active)`);
  assert(player.smokePool.length === 48, 'smokePool length never expands beyond 48 (bounded zero-allocation)');

  // Test 6: Hitbox in flight mode
  const flightHitbox = player.getHitbox();
  assert(flightHitbox.width === 104 - 8, 'Flight hitbox width matches width - 8');
  assert(flightHitbox.height === 38 - 8, 'Flight hitbox height matches height - 8');

  // Test 7: Smoke particle motion, downward under-wheel smoke, and lifecycle recycling
  const activeParticles = player.smokePool.filter(p => p.active);
  const rearSmoke = activeParticles.find(p => p.vx < 0 && Math.abs(p.vy) < 25);
  const downSmoke = activeParticles.find(p => p.vy > 30);
  assert(rearSmoke !== undefined, 'Rear nozzle smoke particle emitted horizontally (vx < 0, vy small)');
  assert(downSmoke !== undefined, 'Under-wheel thruster smoke particle emitted downwards (vy > 30)');

  // Fast forward time without spawning to ensure particles deactivate and recycle
  player.state = PLAYER_STATE.ROAD;
  player.transformProgress = 0;
  for (let f = 0; f < 60; f++) {
    player.update(0.016, mockInput, 350);
  }
  const remainingActive = player.smokePool.filter(p => p.active).length;
  assert(remainingActive === 0, 'Expired smoke particles safely deactivate and recycle');
  assert(player.smokePool.length === 48, 'smokePool remains strictly bounded at 48');

  // Test 8: Mock canvas render save/restore balance in both road and flight modes
  let saveCount = 0;
  let restoreCount = 0;
  const mockCtx = {
    save: () => { saveCount++; },
    restore: () => { restoreCount++; },
    translate: () => {},
    rotate: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    closePath: () => {},
    fill: () => {},
    stroke: () => {},
    arc: () => {},
    ellipse: () => {},
    fillRect: () => {},
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    shadowColor: '',
    shadowBlur: 0,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineJoin: '',
    lineCap: '',
    globalAlpha: 1
  };

  // Road mode render balance
  saveCount = 0;
  restoreCount = 0;
  player.render(mockCtx);
  assert(saveCount === restoreCount, `Road mode Canvas save/restore balance verified (${saveCount} saves, ${restoreCount} restores)`);

  // Flight mode render balance (exercises under-wheel thruster flame rendering)
  player.state = PLAYER_STATE.FLIGHT;
  player.transformProgress = 1.0;
  saveCount = 0;
  restoreCount = 0;
  player.render(mockCtx);
  assert(saveCount === restoreCount, `Flight mode Canvas save/restore balance verified (${saveCount} saves, ${restoreCount} restores)`);

  console.log(`\nTESLA ROADSTER TESTS SUMMARY: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runPlayerTests();
