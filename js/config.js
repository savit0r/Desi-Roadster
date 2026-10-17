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
