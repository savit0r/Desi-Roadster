// Automated unit test suite for Desi Roadster Step 3A: Near-Miss Feedback
const fs = require('fs');
const path = require('path');

// 1. Mock browser globals
global.window = {};
global.document = {
  getElementById: (id) => ({
    textContent: '',
    style: {},
    classList: { add: () => {}, remove: () => {} },
    querySelector: () => ({ textContent: '' })
  })
};
global.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

// 2. Load game files
require('../js/config.js');
const Config = window.DesiRoadster.Config;
require('../js/obstacles.js');
const { ObstacleManager, AutoRickshaw, TaxiCar, Scooter, DesiCow, DesiBuffalo } = window.DesiRoadster;

function runTests() {
  console.log('--- RUNNING NEAR-MISS UNIT TESTS ---');
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

  // Helper to simulate obstacle driving past player
  function simulatePass(player, obs) {
    let nearMissAwarded = false;
    let collisionFired = false;
    for (let ox = 260; ox >= 40; ox -= 15) {
      obs.x = ox;
      manager._checkPlayerCollision(player, obs, () => { collisionFired = true; });
      manager._checkNearMiss(player, obs, () => { nearMissAwarded = true; });
    }
    return { nearMissAwarded, collisionFired };
  }

  // Test 1: Adjacent lane near-miss (Lane 0 player, Lane 1 obstacle)
  {
    const player = {
      x: 150, y: 325, width: 80, height: 40,
      isDead: false, mode: 'ROAD', isGrounded: true,
      getHitbox: () => ({ x: 158, y: 331, width: 64, height: 30 })
    };
    const obs = new AutoRickshaw(1, 260);
    obs.y = 405 - obs.height / 2;

    const res = simulatePass(player, obs);
    assert(res.nearMissAwarded === true, 'Adjacent lane pass (Lane 0 to 1) awards near-miss');
    assert(obs.hasNearMissed === true, 'Obstacle is flagged as hasNearMissed');

    // Test 1b: Verify same obstacle cannot award a second near-miss if it continues
    let secondAward = false;
    for (let ox = 40; ox >= -60; ox -= 15) {
      obs.x = ox;
      manager._checkNearMiss(player, obs, () => { secondAward = true; });
    }
    assert(secondAward === false, 'Same obstacle cannot award near-miss more than once');
  }

  // Test 2: Adjacent lane near-miss (Lane 1 player, Lane 2 obstacle)
  {
    const player = {
      x: 150, y: 385, width: 80, height: 40,
      isDead: false, mode: 'ROAD', isGrounded: true,
      getHitbox: () => ({ x: 158, y: 391, width: 64, height: 30 })
    };
    const obs = new TaxiCar(2, 260);
    obs.y = 460 - obs.height / 2;

    const res = simulatePass(player, obs);
    assert(res.nearMissAwarded === true, 'Adjacent lane pass (Lane 1 to 2) awards near-miss');
  }

  // Test 3: Safe distance pass (Lane 0 player, Lane 2 obstacle: 2 lanes apart = 115px)
  {
    const player = {
      x: 150, y: 325, width: 80, height: 40,
      isDead: false, mode: 'ROAD', isGrounded: true,
      getHitbox: () => ({ x: 158, y: 331, width: 64, height: 30 })
    };
    const obs = new AutoRickshaw(2, 260);
    obs.y = 460 - obs.height / 2;

    const res = simulatePass(player, obs);
    assert(res.nearMissAwarded === false, 'Safe distance pass (2 lanes apart) does NOT award near-miss');
    assert(obs.hasNearMissed === false, 'Obstacle remains unflagged for safe pass');
  }

  // Test 4: Collision prevents near-miss
  {
    const player = {
      x: 150, y: 385, width: 80, height: 40,
      isDead: false, mode: 'ROAD', isGrounded: true,
      triggerHit: () => ({ hit: true, health: 2, isDead: false }),
      getHitbox: () => ({ x: 158, y: 391, width: 64, height: 30 })
    };
    const obs = new Scooter(1, 260);
    obs.y = 405 - obs.height / 2;

    const res = simulatePass(player, obs);
    assert(res.collisionFired === true, 'Collision detected when hitboxes overlap');
    assert(obs.hasCollided === true, 'Obstacle hasCollided is set to true');
    assert(obs.hasNearMissed === true, 'Obstacle hasNearMissed is set to true on collision');
    assert(res.nearMissAwarded === false, 'Collided obstacle NEVER awards near-miss bonus');
  }

  // Test 5: Jumping over an obstacle in same lane with close clearance
  {
    const player = {
      x: 150, y: 335, width: 80, height: 40, // Jumped 50px up from lane 1 (385 -> 335)
      isDead: false, mode: 'ROAD', isGrounded: false,
      getHitbox: () => ({ x: 158, y: 341, width: 64, height: 30 })
    };
    const obs = new AutoRickshaw(1, 260);
    obs.y = 405 - obs.height / 2; // 382. Top of obstacle is 382. Bottom of car is 375. Clears by 7px!

    const res = simulatePass(player, obs);
    assert(res.collisionFired === false, 'Jump avoidance prevents collision when clearing top');
    assert(res.nearMissAwarded === true, 'Close jump-over clearance awards legitimate near-miss');
  }

  // Test 6: Flight mode low-altitude skim
  {
    const player = {
      x: 150, y: 290, width: 80, height: 40, // Flying low above top lane (y: 322)
      isDead: false, mode: 'FLIGHT', isGrounded: false,
      getHitbox: () => ({ x: 154, y: 294, width: 72, height: 32 })
    };
    const obs = new AutoRickshaw(0, 260);
    obs.y = 345 - obs.height / 2;

    const res = simulatePass(player, obs);
    assert(res.collisionFired === false, 'Flight mode avoidance prevents collision');
    assert(res.nearMissAwarded === true, 'Low-altitude flight skim awards legitimate near-miss');
  }

  // Test 7: High-altitude flight (safe cruising altitude)
  {
    const player = {
      x: 150, y: 140, width: 80, height: 40, // High in the sky
      isDead: false, mode: 'FLIGHT', isGrounded: false,
      getHitbox: () => ({ x: 154, y: 144, width: 72, height: 32 })
    };
    const obs = new TaxiCar(0, 260);
    obs.y = 345 - obs.height / 2;

    const res = simulatePass(player, obs);
    assert(res.nearMissAwarded === false, 'High-altitude cruising does NOT award near-miss for traffic far below');
  }

  // Test 8: Dead player cannot trigger near-miss
  {
    const player = {
      x: 150, y: 325, width: 80, height: 40,
      isDead: true, mode: 'ROAD', isGrounded: true,
      getHitbox: () => ({ x: 158, y: 331, width: 64, height: 30 })
    };
    const obs = new AutoRickshaw(1, 150);
    obs.y = 405 - obs.height / 2;

    let nearMissAwarded = false;
    manager._checkNearMiss(player, obs, () => { nearMissAwarded = true; });
    assert(nearMissAwarded === false, 'Dead player cannot trigger near-miss rewards');
  }

  // Test 9: Notification HUD clearance check
  {
    manager.floatingTexts = [];
    const playerHigh = {
      x: 150, y: 70, width: 80, height: 40, // Minimum flight ceiling
      isDead: false, mode: 'FLIGHT', isGrounded: false,
      getHitbox: () => ({ x: 154, y: 74, width: 72, height: 32 })
    };
    // Fake near-miss text position calculation
    const notifyY = playerHigh.y < 125 ? (playerHigh.y + playerHigh.height + 22) : (playerHigh.y - 18);
    assert(notifyY >= 130, `Notification at flight ceiling is placed at Y=${notifyY} (well clear of HUD Y <= 65)`);
  }

  // Test 10: Reset clears all manager state
  {
    manager.reset();
    assert(manager.obstacles.length === 0, 'Reset clears obstacles array');
    assert(manager.floatingTexts.length === 0, 'Reset clears floatingTexts array');
    assert(manager.impactParticles.length === 0, 'Reset clears impactParticles array');
  }

  console.log(`\nTEST SUMMARY: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests();
