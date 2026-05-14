/**
 * usePlacesSearch (web)
 * Stub for web platform — location and Places API not available in browser.
 * Returns empty results so FoodDetailModal renders gracefully on web.
 */

import type { Place } from '../services/placesSearch';

interface UsePlacesSearchOptions {
  foodItem: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface UsePlacesSearchResult {
  places: Place[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
}

export function usePlacesSearch(
  _options: UsePlacesSearchOptions
): UsePlacesSearchResult {
  return {
    places: [],
    loading: false,
    error: null,
    hasMore: false,
    loadMore: () => {},
  };
}
