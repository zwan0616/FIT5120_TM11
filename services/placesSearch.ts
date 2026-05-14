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
  id: string;
  displayName: {
    languageCode: string;
    text: string;
  };
  formatted_address: string;
  location: {
    latitude: number;
    longitude: number;
  };
  googleMapsUri: string;
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
  // const cacheKey = buildCacheKey(query, latitude, longitude, pageToken);

  // if (cache.has(cacheKey)) {
  //   return cache.get(cacheKey)!;
  // }

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
    // `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`
    `https://places.googleapis.com/v1/places:searchText`,
    {
      method: 'POST',
      body: JSON.stringify({
        textQuery: query,
        locationBias: {
          circle: {
            center: {latitude, longitude},
            radius: 5000 // 5km radius
          }
        },
        pageSize: 10,
        rankPreference: 'RELEVANCE'
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.photos'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Places API request failed: ${response.status}`);
  }

  const data = await response.json();

  // if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
  //   throw new Error(`Places API error: ${data.status} — ${data.error_message ?? ''}`);
  // }

  const result: PlacesSearchResult = {
    places: (data.places ?? []) as Place[],
    nextPageToken: data.next_page_token,
  };

  // cache.set(cacheKey, result);

  return result;
}
