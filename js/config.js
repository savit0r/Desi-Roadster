/**
 * DESI ROADSTER - CONFIGURATION & CONSTANTS
 * Centralized settings for physics, dimensions, and gameplay balance.
 */

window.DesiRoadster = window.DesiRoadster || {};

window.DesiRoadster.Config = {
  // Virtual Canvas Resolution (16:9 aspect ratio)
  CANVAS_WIDTH: 960,
  CANVAS_HEIGHT: 540,

  // World & Horizon Metrics
  HORIZON_Y: 260,
  ROAD_TOP_Y: 330,
  ROAD_BOTTOM_Y: 510,
  ROAD_LANES: 3,

  // Road Driving Defaults
  DEFAULT_GROUND_Y: 410,
  GRAVITY: 1200,
  JUMP_FORCE: -480,

  // Speed & Movement
  MIN_SPEED: 220,
  BASE_SPEED: 350,
  BOOST_SPEED: 550,
  PLAYER_HORIZ_ACCEL: 450,
  PLAYER_HORIZ_FRICTION: 0.92,
  PLAYER_ROAD_VERT_SPEED: 180,
  PLAYER_FLIGHT_VERT_SPEED: 260,

  // Flight Mode Dynamics & Energy
  FLIGHT_MIN_Y: 70,       // Ceiling in flight mode
  FLIGHT_MAX_Y: 340,      // Max descent before touching road
  TAKEOFF_TARGET_Y: 220,  // Target altitude when transforming to flight
  TRANSFORM_DURATION: 0.45, // Time in seconds for transformation sequence
  BATTERY_MAX: 100,
  BATTERY_MIN_LAUNCH: 15, // Minimum % required to engage flight mode
  BATTERY_DRAIN_FLIGHT: 7.0, // % per second in flight mode (~14s total flight)
  BATTERY_RECHARGE_ROAD: 10.0, // % per second while on road (~10s to full recharge)

  // Aerial Hazards (Overhead Wires, Fighter Kites, Flyovers)
  AERIAL_HAZARD_MIN_INTERVAL: 6.5,
  AERIAL_HAZARD_MAX_INTERVAL: 9.5,

  // Road Defects (Potholes)
  POTHOLE_MIN_INTERVAL: 4.5,
  POTHOLE_MAX_INTERVAL: 8.0,
  POTHOLE_LAUNCH_SPEED_THRESHOLD: 380, // Launch trigger speed
  POTHOLE_LAUNCH_FORCE: -420,          // Launch vertical impulse

  // Random Indian Road Events
  EVENT_MIN_DISTANCE: 40,              // Minimum meters before events can trigger
  EVENT_COOLDOWN: 13.0,                // Seconds between major random events

  // Horn of Authority
  HORN_COOLDOWN: 1.8,                  // Seconds between horn honks

  // Jugaad Upgrades Definitions
  UPGRADES: {
    SUSPENSION: {
      id: 'suspension',
      name: 'Desi Heavy-Duty Suspension',
      desc: 'Absorbs pothole impacts and prevents violent launches.',
      tradeoff: 'Costs 250 ₹. Slightly heavier chassis.',
      cost: 250,
      icon: '🔧'
    },
    BATTERY: {
      id: 'battery',
      name: 'Extra Flight Battery Pack',
      desc: 'Increases flight energy to 130%.',
      tradeoff: 'Costs 350 ₹. 8% slower road acceleration.',
      cost: 350,
      icon: '🔋'
    },
    RADAR: {
      id: 'radar',
      name: 'Kite-String Sensor / Radar',
      desc: 'Telegraphs incoming kite strings earlier with HUD warning.',
      tradeoff: 'Costs 200 ₹. Pure visual telegraphing.',
      cost: 200,
      icon: '📡'
    },
    HORN: {
      id: 'horn',
      name: 'Horn of Authority (Pressure Horn)',
      desc: 'Blast multi-tone truck horn (H / 📯) to part cows and autos!',
      tradeoff: 'Costs 300 ₹. 1.8s cooldown.',
      cost: 300,
      icon: '📯'
    },
    SHIELD: {
      id: 'shield',
      name: 'Jugaad Skidplate (Pothole Shield)',
      desc: 'Absorbs the first 2 pothole strikes completely each run.',
      tradeoff: 'Costs 200 ₹. Consumed after 2 uses per run.',
      cost: 200,
      icon: '🛡️'
    },
    BOOSTER: {
      id: 'booster',
      name: 'Jugaad Nitro Overdrive',
      desc: 'Tap Right / Boost for explosive +220 km/h acceleration.',
      tradeoff: 'Costs 400 ₹. Consumes 4% battery per boost burst.',
      cost: 400,
      icon: '🚀'
    }
  },

  // Parallax Multipliers (relative to game scroll speed)
  PARALLAX: {
    SKY: 0.0,
    SUN_AND_CLOUDS: 0.05,
    FAR_SKYLINE: 0.15,
    MID_MONUMENTS: 0.32,
    ROADSIDE_POLES_TREES: 0.70,
    ROAD_SURFACE: 1.0,
    ROAD_MARKINGS: 1.0,
  },

  // Color Palette
  COLORS: {
    SAFFRON: '#FF9933',
    CYAN: '#00F3FF',
    NEON_GREEN: '#39FF14',
    NEON_PINK: '#FF007F',
    ASPHALT: '#21252D',
    ASPHALT_DARK: '#181B22',
    ROAD_MARKING_YELLOW: '#FFC83B',
    ROAD_MARKING_WHITE: '#E8EDF5',
  }
};
