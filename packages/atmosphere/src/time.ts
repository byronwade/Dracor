import type { TimePeriod, TimeOfDayState, Vec3 } from './types';

// ---------------------------------------------------------------------------
// Period boundaries (worldTime is 0-1, where 0/1 = midnight)
// ---------------------------------------------------------------------------
interface PeriodBoundary {
  period: TimePeriod;
  start: number;
  end: number;
}

const PERIOD_BOUNDARIES: PeriodBoundary[] = [
  { period: 'midnight',  start: 0.00, end: 0.20 },
  { period: 'dawn',      start: 0.20, end: 0.28 },
  { period: 'morning',   start: 0.28, end: 0.42 },
  { period: 'noon',      start: 0.42, end: 0.58 },
  { period: 'afternoon', start: 0.58, end: 0.70 },
  { period: 'sunset',    start: 0.70, end: 0.78 },
  { period: 'dusk',      start: 0.78, end: 0.85 },
  { period: 'night',     start: 0.85, end: 0.97 },
  // midnight wraps: 0.97-1.0 also maps to midnight
  { period: 'midnight',  start: 0.97, end: 1.00 },
];

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

const DEG_TO_RAD = Math.PI / 180;

function toRad(degrees: number): number {
  return degrees * DEG_TO_RAD;
}

/**
 * Smooth-step (cubic Hermite) between 0 and 1 over [edge0, edge1].
 * Returns 0 for t <= edge0, 1 for t >= edge1.
 */
function smoothstep(edge0: number, edge1: number, t: number): number {
  const x = Math.max(0, Math.min(1, (t - edge0) / (edge1 - edge0)));
  return x * x * (3 - 2 * x);
}

/**
 * Normalise a Vec3 in place and return it.
 */
function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len < 1e-10) return { x: 0, y: 1, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

// ---------------------------------------------------------------------------
// Sun / Moon direction calculation
//
// Convention:
//   - worldTime 0.25 = dawn   → sun rises in the east (X+ axis)
//   - worldTime 0.50 = noon   → sun is overhead (Y+), biased south (Z+)
//   - worldTime 0.75 = dusk   → sun sets in the west (X- axis)
//
// The sun angle sweeps from west to east over 24 hours when viewed from
// above.  We compute it as a rotation in the XY plane (east/west movement)
// with an arc that peaks at noon.
//
// sunAngle: azimuth in degrees (0 = east, 90 = south, 180 = west)
//   Maps: dawn (0.25) → 0°, noon (0.50) → 90°, dusk (0.75) → 180°
//   Full formula: sunAngle = (worldTime - 0.25) * 360
//   (wraps naturally for the night portion underneath the horizon)
//
// sunAltitude: elevation in degrees above/below horizon.
//   We want: dawn/dusk → 0°, noon → 70°.
//   Use a sine arc: altitude = sin(π * (worldTime - 0.25) / 0.5) * 70
//   This gives 0° at worldTime=0.25 and 0.75, and 70° at 0.50.
//   Negative values (night) are clamped to 0 for the altitude field
//   but left raw for direction calculation (sun is below horizon).
//
// World axes:
//   X+ = East,  X- = West
//   Y+ = Up
//   Z+ = South (the sun arcs south at noon)
//
// ---------------------------------------------------------------------------

function computeSunAngles(worldTime: number): { sunAngle: number; sunAltitudeRaw: number } {
  // Azimuth in degrees: 0° at dawn (east), 180° at dusk (west)
  const sunAngle = ((worldTime - 0.25) * 360 + 360) % 360;

  // Altitude: sine arc — positive above horizon, negative below
  const phaseAngle = Math.PI * (worldTime - 0.25) / 0.5; // 0 at dawn, π at dusk
  const sunAltitudeRaw = Math.sin(phaseAngle) * 70; // peaks at 70° at noon

  return { sunAngle, sunAltitudeRaw };
}

/**
 * Convert azimuth (degrees, 0=East, 90=South, 180=West) and altitude (degrees)
 * to a unit direction vector pointing FROM the celestial body TOWARD the origin
 * (i.e. the direction a light ray travels, suitable for a directional light).
 *
 * World axes: X+ East, Y+ Up, Z+ South.
 */
function anglestoDirection(azimuthDeg: number, altitudeDeg: number): Vec3 {
  const az = toRad(azimuthDeg);
  const alt = toRad(altitudeDeg);

  const cosAlt = Math.cos(alt);
  // Body position (unit sphere, pointing TOWARD body)
  const bodyX = cosAlt * Math.cos(az);  // east component
  const bodyY = Math.sin(alt);           // up component
  const bodyZ = cosAlt * Math.sin(az);  // south component (Z+)

  // Light direction is FROM body TOWARD scene (negate body position)
  return normalize({ x: -bodyX, y: -bodyY, z: -bodyZ });
}

// ---------------------------------------------------------------------------
// Daylight factor
//
// 0 = full night, 1 = full noon day.
// Uses smooth transitions around dawn and dusk windows.
// Dawn transition: 0.20 → 0.28   (full darkness → full day onset)
// Morning rising:  0.28 → 0.42   (ramping to noon)
// Noon peak:       0.42 → 0.58   (full daylight = 1.0)
// Afternoon fall:  0.58 → 0.70
// Sunset fall:     0.70 → 0.78   (full day → fading)
// Dusk:            0.78 → 0.85   (fading to night)
// ---------------------------------------------------------------------------

function computeDaylight(worldTime: number): number {
  // Rising limb: fade in from 0 at 0.20 to 1 at 0.42
  const rising = smoothstep(0.20, 0.42, worldTime);
  // Setting limb: fade out from 1 at 0.58 to 0 at 0.85
  const setting = 1 - smoothstep(0.58, 0.85, worldTime);
  // Combined: min gives the "both must be true" daylight window
  return Math.min(rising, setting);
}

// ---------------------------------------------------------------------------
// Period detection
// ---------------------------------------------------------------------------

function detectPeriod(worldTime: number): { period: TimePeriod; periodProgress: number } {
  // The last entry (midnight 0.97-1.0) is a wrap-around for midnight
  for (const boundary of PERIOD_BOUNDARIES) {
    if (worldTime >= boundary.start && worldTime < boundary.end) {
      const span = boundary.end - boundary.start;
      const periodProgress = span > 0 ? (worldTime - boundary.start) / span : 0;
      return { period: boundary.period, periodProgress };
    }
  }
  // Fallback: shouldn't happen if worldTime is clamped to [0,1)
  return { period: 'midnight', periodProgress: 0 };
}

// ---------------------------------------------------------------------------
// TimeSystem public interface
// ---------------------------------------------------------------------------

export interface TimeSystem {
  /**
   * Advance world time by `deltaSeconds` real seconds.
   */
  update(deltaSeconds: number): void;

  /**
   * Set world time directly.
   * @param worldTime  0–1  (0 = midnight, 0.25 = dawn, 0.5 = noon, 0.75 = dusk)
   */
  setTime(worldTime: number): void;

  /**
   * Current time-of-day state snapshot.
   */
  getState(): TimeOfDayState;

  /**
   * Unit direction vector from sun toward the scene (for directional lighting).
   * When sun is below the horizon the vector still points at the correct
   * sub-horizon position.
   */
  getSunDirection(): Vec3;

  /**
   * Unit direction vector from moon toward the scene.
   */
  getMoonDirection(): Vec3;

  /**
   * How long one full day lasts in real minutes.
   * Settable at runtime (e.g. for time-lapse or debug).
   */
  dayLengthMinutes: number;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a time system for the day/night cycle.
 *
 * @param initialTime       Starting world time (0–1).  Defaults to 0.25 (dawn).
 * @param dayLengthMinutes  How many real minutes constitute one full in-game
 *                          day.  Defaults to 20.
 */
export function createTimeSystem(
  initialTime = 0.25,
  dayLengthMinutes = 20,
): TimeSystem {
  // Internal mutable state
  let worldTime = Math.max(0, Math.min(1, initialTime));

  // Derived state — recomputed on every update / setTime call
  let cachedState: TimeOfDayState = buildState(worldTime);
  let cachedSunDir: Vec3 = buildSunDir(worldTime);
  let cachedMoonDir: Vec3 = buildMoonDir(worldTime);

  // -------------------------------------------------------------------------
  // Internal builders
  // -------------------------------------------------------------------------

  function buildState(t: number): TimeOfDayState {
    const { sunAngle, sunAltitudeRaw } = computeSunAngles(t);
    const sunAltitude = Math.max(0, sunAltitudeRaw); // clamp for display

    // Moon is opposite the sun with a 10° offset on the altitude arc
    const moonAngle = (sunAngle + 180) % 360;
    const moonAltitudeRaw = -sunAltitudeRaw + 10; // above horizon when sun is below
    const moonAltitude = Math.max(0, moonAltitudeRaw);

    const daylight = computeDaylight(t);
    const nightFactor = 1 - daylight;

    const { period, periodProgress } = detectPeriod(t);

    return {
      worldTime: t,
      period,
      periodProgress,
      sunAngle,
      sunAltitude,
      moonAngle,
      moonAltitude,
      daylight,
      nightFactor,
    };
  }

  function buildSunDir(t: number): Vec3 {
    const { sunAngle, sunAltitudeRaw } = computeSunAngles(t);
    return anglestoDirection(sunAngle, sunAltitudeRaw);
  }

  function buildMoonDir(t: number): Vec3 {
    const { sunAngle, sunAltitudeRaw } = computeSunAngles(t);
    const moonAngle = (sunAngle + 180) % 360;
    const moonAltitudeRaw = -sunAltitudeRaw + 10;
    return anglestoDirection(moonAngle, moonAltitudeRaw);
  }

  function applyTime(t: number): void {
    // Wrap to [0, 1)
    worldTime = ((t % 1) + 1) % 1;
    cachedState  = buildState(worldTime);
    cachedSunDir = buildSunDir(worldTime);
    cachedMoonDir = buildMoonDir(worldTime);
  }

  // -------------------------------------------------------------------------
  // Public API object
  // -------------------------------------------------------------------------

  const system: TimeSystem = {
    dayLengthMinutes,

    update(deltaSeconds: number): void {
      // One full day = dayLengthMinutes * 60 real seconds = 1.0 worldTime
      const dayLengthSeconds = system.dayLengthMinutes * 60;
      const delta = deltaSeconds / dayLengthSeconds;
      applyTime(worldTime + delta);
    },

    setTime(t: number): void {
      applyTime(t);
    },

    getState(): TimeOfDayState {
      return cachedState;
    },

    getSunDirection(): Vec3 {
      return cachedSunDir;
    },

    getMoonDirection(): Vec3 {
      return cachedMoonDir;
    },
  };

  return system;
}
