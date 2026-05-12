This document describes the map feature of the app, meant to show users where they can buy recommended food items.
The map feature should be implemented as a popup modal.
This feature requires location services and permissions to be available, prompt for it in the modal if unavailable, otherwise show the following UI:

```
┌─────────────────────┐
│        MAP          │
│                     │
│    markers shown    │
│                     │
└─────────────────────┘
┌─────────────────────┐
│   Search Results    │
│ ──────────────────  │
│ Store A             │
│ Store B             │
│ Store C             │
└─────────────────────┘
```

The map feature should use Google places text search api and react-native-maps.
The map modal should always be opened with a food item e.g. "apple".
Using this, make a query to Google places text search with the template `buy {food_item} near me`.
With the example of "apple", the query would be `buy apple near me`.
The results should be shown as markers on the map as well as a search results list below.
The results list should link to the corresponding location in Google maps.

Example code snippets that might be useful:
```
// Fetch places
const response = await fetch(
  `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`
);

const data = await response.json();
```

```
// Render markers
<MapView style={{ flex: 1 }}>
  {places.map(place => (
    <Marker
      key={place.place_id}
      coordinate={{
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
      }}
      title={place.name}
    />
  ))}
</MapView>
```

```
// Render results list
<FlatList
  data={places}
  keyExtractor={(item) => item.place_id}
  renderItem={({ item }) => (
    <TouchableOpacity onPress={() => openInGoogleMaps(item)}>
      <View style={{ padding: 16 }}>
        <Text>{item.name}</Text>
        <Text>{item.formatted_address}</Text>
      </View>
    </TouchableOpacity>
  )}
/>
```

```
// Opening Google Maps from Search Results
import { Linking } from 'react-native';

const openInGoogleMaps = (place) => {
  const lat = place.geometry.location.lat;
  const lng = place.geometry.location.lng;

  const url =
    `https://www.google.com/maps/search/?api=1&query_place_id=${place.place_id}`;

  Linking.openURL(url);
};
```

There should also be search debouncing, results caching, pagination, and careful consideration of the search radius around the user's location.

The map feature can be accessed from two entrypoints: the first being from `app\(tabs)\goal.tsx`, the second from `app\(tabs)\scan\analysis.tsx`.

In `app\(tabs)\goal.tsx`, in each individual goal, there are some food suggestions, categorized into 'Super Power Foods', 'Tiny Hero Challenge', and 'Try Less'.
The items suggested in 'Super Power Foods' and 'Tiny Hero Challenge' should be clickable. Upon clicking any one of them, the map modal should pop up. The suggested food item should be passed to the map modal to be used in the query.

In `app\(tabs)\scan\analysis.tsx`, some alternative food items may be shown to the user. These alternatives should also be clickable and should open the map modal and behave just like if opened from `app\(tabs)\goal.tsx`. The alternative food item selected should be passed to the map modal to be used in the query.

## Map Feature Implementation Plan

Here's the full plan to implement the map feature as described in `memory-bank/map/map.md`.

---

### Overview

We need to:
1. Install required packages (`react-native-maps`, `expo-location`)
2. Create a `MapModal` component
3. Create a `usePlacesSearch` hook (Google Places API, debouncing, caching, pagination)
4. Wire up the modal in all 6 goal detail components (Super Power Foods + Tiny Hero Challenge items clickable)
5. Wire up the modal in `analysis.tsx` (alternative food items clickable)
6. Add location permission + Google Maps API key config

---

### Step 1 — Install packages

```
npx expo install react-native-maps expo-location
```

`react-native-maps` provides `MapView` and `Marker`. `expo-location` handles location permissions and getting the user's current coordinates.

---

### Step 2 — Environment / config

Add `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` to `.env` (already gitignored). Add the `expo-location` plugin and `react-native-maps` config to `app.json` (Android `ACCESS_FINE_LOCATION` permission, iOS `NSLocationWhenInUseUsageDescription`).

---

### Step 3 — `services/placesSearch.ts`

A dedicated service module (single responsibility) that:
- Exports `searchPlaces(query: string, latitude: number, longitude: number, pageToken?: string)` — calls Google Places Text Search API with a `location` bias and `radius`
- Returns `{ places: Place[], nextPageToken?: string }`
- Caches results keyed by `query+lat+lng+pageToken` using a simple in-memory `Map`

```ts
// Type
export interface Place {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
}
```

---

### Step 4 — `hooks/usePlacesSearch.ts`

Custom hook that:
- Accepts `foodItem: string | null` and user location
- Debounces the query (300ms)
- Calls `searchPlaces` from the service
- Manages state: `places`, `loading`, `error`, `nextPageToken`
- Exposes `loadMore()` for pagination

---

### Step 5 — `components/map/MapModal.tsx`

A modal component that:
- Accepts `visible: boolean`, `foodItem: string | null`, `onClose: () => void`
- On open: requests location permission via `expo-location`
  - If denied: shows a permission prompt UI inside the modal
  - If granted: shows the map + results
- Uses `MapView` with `Marker` for each place result
- Shows a `FlatList` below the map with store name + address
- Each list item is a `TouchableOpacity` that calls `Linking.openURL(...)` to open Google Maps
- Implements "load more" button at the bottom of the list for pagination
- Shows a loading indicator while fetching

Layout:
```
Modal (full screen or large sheet)
  ├── Header: "Where to buy {foodItem}" + close button
  ├── [Location permission denied view] OR:
  │   ├── MapView (flex: 1, ~50% height) with Markers
  │   └── FlatList (scrollable results list)
  │       ├── Store A (address) → opens Google Maps
  │       ├── Store B (address) → opens Google Maps
  │       └── [Load More] button
  └── (loading spinner overlay)
```

---

### Step 6 — Wire up in Goal Detail components

All 6 detail components (`GrowUpDetail`, `BeStrongDetail`, `FeelGoodDetail`, `FightGermsDetail`, `SeeClearDetail`, `ThinkFastDetail`) need the same changes:

- Add `mapFoodItem: string | null` and `mapVisible: boolean` state
- Wrap Super Power Foods items in `TouchableOpacity` → sets `mapFoodItem` and opens modal
- Wrap Tiny Hero Challenge items in `TouchableOpacity` → same
- Render `<MapModal visible={mapVisible} foodItem={mapFoodItem} onClose={() => setMapVisible(false)} />`

To avoid repeating this in all 6 files, we can lift the modal state into a shared wrapper or pass `onFoodPress` as a prop from `goal.tsx`. The cleanest approach: add an `onFoodPress?: (foodName: string) => void` prop to each detail component's `Props` interface, and manage the modal state in `goal.tsx` itself (one modal instance for all goals).

---

### Step 7 — Wire up in `analysis.tsx`

- Add `mapFoodItem` and `mapVisible` state
- Change the `handleSwap` function to open the map modal with `item.name`
- Render `<MapModal>` at the bottom of the component

---

### File Summary

| File | Action |
|------|--------|
| `package.json` / `app.json` | Add `react-native-maps`, `expo-location`, permissions |
| `.env` | Add `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` |
| `services/placesSearch.ts` | New — Google Places API calls + caching |
| `hooks/usePlacesSearch.ts` | New — debounced search hook with pagination |
| `components/map/MapModal.tsx` | New — the map modal component |
| `components/goal/types.ts` | Add `onFoodPress?: (name: string) => void` to Props |
| `components/goal/*.tsx` (all 6) | Add `onFoodPress` prop, wrap food items as touchable |
| `app/(tabs)/goal.tsx` | Add modal state, pass `onFoodPress` to detail components |
| `app/(tabs)/scan/analysis.tsx` | Update `handleSwap` to open map modal |

---

### Key Design Decisions

- **Single modal instance** in `goal.tsx` (not one per detail component) — avoids 6 duplicate modal instances
- **In-memory cache** in `placesSearch.ts` — simple `Map<string, result>`, cleared on app restart
- **Search radius**: 5000m (5km) around user's location, passed as `location` + `radius` params to Places API
- **Debounce**: 300ms in the hook — though since the query is derived from the food item (not typed by user), debounce mainly guards against rapid re-opens
- **Pagination**: `pagetoken` from Places API response, exposed via `loadMore()` in the hook

---
