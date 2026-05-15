/**
 * locationCache
 *
 * In-memory cache for the user's last known location.
 * TTL: 2 minutes — short enough to stay reasonably fresh,
 * long enough to avoid repeated permission prompts within a session.
 *
 * Single responsibility: location caching only.
 */

const LOCATION_TTL_MS = 2 * 60 * 1000; // 2 minutes

interface CachedLocation {
  latitude: number;
  longitude: number;
  cachedAt: number;
}

let cached: CachedLocation | null = null;

/** Returns the cached location if it is still within TTL, otherwise null. */
export function getCachedLocation(): { latitude: number; longitude: number } | null {
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > LOCATION_TTL_MS) {
    cached = null;
    return null;
  }
  return { latitude: cached.latitude, longitude: cached.longitude };
}

/** Stores a location in the cache with the current timestamp. */
export function setCachedLocation(latitude: number, longitude: number): void {
  cached = { latitude, longitude, cachedAt: Date.now() };
}

/** Clears the cached location (e.g. on explicit refresh). */
export function clearCachedLocation(): void {
  cached = null;
}
