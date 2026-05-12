/**
 * Places Search Service
 *
 * Calls the Google Places Text Search API to find stores near the user's location.
 * Results are cached in-memory keyed by query + location + pageToken.
 *
 * Single responsibility: all Google Places API communication lives here.
 */

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

/** Search radius in metres around the user's location */
const SEARCH_RADIUS_METRES = 5000;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Place {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface PlacesSearchResult {
  places: Place[];
  nextPageToken?: string;
}

// ─── In-memory cache ──────────────────────────────────────────────────────────

const cache = new Map<string, PlacesSearchResult>();

function buildCacheKey(
  query: string,
  latitude: number,
  longitude: number,
  pageToken?: string
): string {
  return `${query}|${latitude.toFixed(4)}|${longitude.toFixed(4)}|${pageToken ?? ''}`;
}

// ─── API call ─────────────────────────────────────────────────────────────────

/**
 * Search for places matching the query near the given coordinates.
 *
 * @param query      - Free-text query, e.g. "buy apple near me"
 * @param latitude   - User's current latitude
 * @param longitude  - User's current longitude
 * @param pageToken  - Optional pagination token from a previous response
 */
export async function searchPlaces(
  query: string,
  latitude: number,
  longitude: number,
  pageToken?: string
): Promise<PlacesSearchResult> {
  const cacheKey = buildCacheKey(query, latitude, longitude, pageToken);

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  const params = new URLSearchParams({
    query: encodeURIComponent(query),
    location: `${latitude},${longitude}`,
    radius: String(SEARCH_RADIUS_METRES),
    key: GOOGLE_API_KEY,
  });

  if (pageToken) {
    params.set('pagetoken', pageToken);
  }

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Places API request failed: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places API error: ${data.status} — ${data.error_message ?? ''}`);
  }

  const result: PlacesSearchResult = {
    places: (data.results ?? []) as Place[],
    nextPageToken: data.next_page_token,
  };

  cache.set(cacheKey, result);

  return result;
}
