/**
 * usePlacesSearch hook
 *
 * Manages Google Places search state for a given food item and user location.
 * Handles debouncing, caching (via placesSearch service), and pagination.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { searchPlaces, type Place } from '../services/placesSearch';

const DEBOUNCE_MS = 300;

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

export function usePlacesSearch({
  foodItem,
  latitude,
  longitude,
}: UsePlacesSearchOptions): UsePlacesSearchResult {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);

  // Track the current search to avoid stale updates
  const searchIdRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(
    async (
      query: string,
      lat: number,
      lng: number,
      pageToken: string | undefined,
      searchId: number,
      append: boolean
    ) => {
      setLoading(true);
      if (!append) {
        setError(null);
      }

      try {
        const result = await searchPlaces(query, lat, lng, pageToken);

        // Discard if a newer search has started
        if (searchId !== searchIdRef.current) return;

        setPlaces((prev) => (append ? [...prev, ...result.places] : result.places));
        setNextPageToken(result.nextPageToken);
        setHasMore(!!result.nextPageToken);
      } catch (err) {
        if (searchId !== searchIdRef.current) return;
        setError(err instanceof Error ? err.message : 'Failed to search for places.');
        setHasMore(false);
      } finally {
        if (searchId === searchIdRef.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  // Trigger a fresh search whenever foodItem or location changes
  useEffect(() => {
    if (!foodItem || latitude === null || longitude === null) {
      setPlaces([]);
      setNextPageToken(undefined);
      setHasMore(false);
      setError(null);
      return;
    }

    const query = `buy ${foodItem} near me`;
    const searchId = ++searchIdRef.current;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      runSearch(query, latitude, longitude, undefined, searchId, false);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [foodItem, latitude, longitude, runSearch]);

  const loadMore = useCallback(() => {
    if (!foodItem || latitude === null || longitude === null || !nextPageToken || loading) return;

    const query = `buy ${foodItem} near me`;
    const searchId = ++searchIdRef.current;
    runSearch(query, latitude, longitude, nextPageToken, searchId, true);
  }, [foodItem, latitude, longitude, nextPageToken, loading, runSearch]);

  return { places, loading, error, hasMore, loadMore };
}
