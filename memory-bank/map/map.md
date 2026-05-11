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
