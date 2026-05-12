/**
 * MapModal
 *
 * A full-screen modal that shows a Google Maps view with markers for stores
 * near the user's location that sell the given food item.
 *
 * Behaviour:
 * - Requests location permission on open.
 * - If denied, shows a permission prompt UI.
 * - If granted, fetches places via usePlacesSearch and renders markers + list.
 * - Each list item opens Google Maps when tapped.
 * - Supports pagination via a "Load More" button.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { X, MapPin, Navigation } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Radius } from '../../constants/radius';
import { FontSize, FontFamily } from '../../constants/fonts';
import { usePlacesSearch } from '../../hooks/usePlacesSearch';
import type { Place } from '../../services/placesSearch';

// ─── Props ────────────────────────────────────────────────────────────────────

interface MapModalProps {
  visible: boolean;
  foodItem: string | null;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function openInGoogleMaps(place: Place) {
  const url = `https://www.google.com/maps/search/?api=1&query_place_id=${place.place_id}`;
  Linking.openURL(url).catch(() => {
    // Fallback: open by coordinates
    const fallback = `https://www.google.com/maps/search/?api=1&query=${place.geometry.location.lat},${place.geometry.location.lng}`;
    Linking.openURL(fallback);
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MapModal({ visible, foodItem, onClose }: MapModalProps) {
  const [locationStatus, setLocationStatus] = useState<
    'idle' | 'requesting' | 'granted' | 'denied'
  >('idle');
  const [userLatitude, setUserLatitude] = useState<number | null>(null);
  const [userLongitude, setUserLongitude] = useState<number | null>(null);

  // Request location when modal becomes visible
  useEffect(() => {
    if (!visible) {
      // Reset when closed so next open re-requests if needed
      return;
    }

    let cancelled = false;

    const requestLocation = async () => {
      setLocationStatus('requesting');

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (cancelled) return;

      if (status !== 'granted') {
        setLocationStatus('denied');
        return;
      }

      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (cancelled) return;

        setUserLatitude(loc.coords.latitude);
        setUserLongitude(loc.coords.longitude);
        setLocationStatus('granted');
      } catch {
        if (!cancelled) setLocationStatus('denied');
      }
    };

    requestLocation();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  const { places, loading, error, hasMore, loadMore } = usePlacesSearch({
    foodItem: locationStatus === 'granted' ? foodItem : null,
    latitude: userLatitude,
    longitude: userLongitude,
  });

  const handleClose = useCallback(() => {
    setLocationStatus('idle');
    setUserLatitude(null);
    setUserLongitude(null);
    onClose();
  }, [onClose]);

  // ─── Render helpers ──────────────────────────────────────────────────────────

  const renderPlaceItem = useCallback(
    ({ item }: { item: Place }) => (
      <TouchableOpacity
        style={styles.placeItem}
        activeOpacity={0.75}
        onPress={() => openInGoogleMaps(item)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.name} in Google Maps`}
      >
        <View style={styles.placeIconWrap}>
          <MapPin size={20} color={Colors.primary} />
        </View>
        <View style={styles.placeTextWrap}>
          <Text style={styles.placeName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.placeAddress} numberOfLines={2}>
            {item.formatted_address}
          </Text>
        </View>
        <View style={styles.placeArrow}>
          <Navigation size={16} color={Colors.outline} />
        </View>
      </TouchableOpacity>
    ),
    []
  );

  const renderListFooter = useCallback(() => {
    if (loading && places.length > 0) {
      return (
        <ActivityIndicator
          color={Colors.primary}
          size="small"
          style={styles.footerLoader}
        />
      );
    }
    if (hasMore) {
      return (
        <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore} activeOpacity={0.8}>
          <Text style={styles.loadMoreText}>Load More</Text>
        </TouchableOpacity>
      );
    }
    return null;
  }, [loading, places.length, hasMore, loadMore]);

  const renderListHeader = useCallback(
    () => (
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>Search Results</Text>
        {places.length > 0 && (
          <Text style={styles.resultsCount}>{places.length} found</Text>
        )}
      </View>
    ),
    [places.length]
  );

  // ─── Content ─────────────────────────────────────────────────────────────────

  const renderContent = () => {
    // Requesting permission
    if (locationStatus === 'idle' || locationStatus === 'requesting') {
      return (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.stateTitle}>Getting your location…</Text>
          <Text style={styles.stateSubtitle}>
            We need your location to find nearby stores.
          </Text>
        </View>
      );
    }

    // Permission denied
    if (locationStatus === 'denied') {
      return (
        <View style={styles.centeredState}>
          <MapPin size={56} color={Colors.outline} />
          <Text style={styles.stateTitle}>Location Access Needed</Text>
          <Text style={styles.stateSubtitle}>
            NutriHeroes needs your location to show stores near you. Please enable
            location access in your device settings.
          </Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => Linking.openSettings()}
            activeOpacity={0.8}
          >
            <Text style={styles.settingsButtonText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Location granted — show map + results
    const initialRegion =
      userLatitude !== null && userLongitude !== null
        ? {
            latitude: userLatitude,
            longitude: userLongitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }
        : undefined;

    return (
      <View style={styles.mapContainer}>
        {/* Map */}
        <MapView style={styles.map} initialRegion={initialRegion} showsUserLocation>
          {places.map((place) => (
            <Marker
              key={place.place_id}
              coordinate={{
                latitude: place.geometry.location.lat,
                longitude: place.geometry.location.lng,
              }}
              title={place.name}
              description={place.formatted_address}
              pinColor={Colors.primary}
            />
          ))}
        </MapView>

        {/* Loading overlay on initial fetch */}
        {loading && places.length === 0 && (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.mapLoadingText}>Finding stores…</Text>
          </View>
        )}

        {/* Error state */}
        {error && places.length === 0 && (
          <View style={styles.mapLoadingOverlay}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* Results list */}
        <FlatList
          data={places}
          keyExtractor={(item) => item.place_id}
          renderItem={renderPlaceItem}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={renderListFooter}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  No stores found nearby. Try a different food item.
                </Text>
              </View>
            ) : null
          }
          style={styles.resultsList}
          contentContainerStyle={styles.resultsContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  };

  // ─── Modal ───────────────────────────────────────────────────────────────────

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              🗺️ Where to buy
            </Text>
            {foodItem ? (
              <Text style={styles.headerFoodItem} numberOfLines={1}>
                {foodItem}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Close map"
          >
            <X size={22} color={Colors.on_surface} />
          </TouchableOpacity>
        </View>

        {/* Body */}
        {renderContent()}
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? Spacing.lg : Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface_container_low,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outline_variant,
    gap: Spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.label_md,
    color: Colors.on_surface_variant,
  },
  headerFoodItem: {
    fontFamily: FontFamily.body_bold,
    fontSize: FontSize.title_sm,
    color: Colors.on_surface,
    textTransform: 'capitalize',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface_container,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Centered states (requesting / denied)
  centeredState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['2xl'],
    gap: Spacing.md,
  },
  stateTitle: {
    fontFamily: FontFamily.body_bold,
    fontSize: FontSize.title_md,
    color: Colors.on_surface,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  stateSubtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.body_sm,
    color: Colors.on_surface_variant,
    textAlign: 'center',
    lineHeight: FontSize.body_sm * 1.5,
  },
  settingsButton: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.button_primary,
  },
  settingsButtonText: {
    fontFamily: FontFamily.body_bold,
    fontSize: FontSize.label_lg,
    color: Colors.on_primary,
  },

  // Map + results layout
  mapContainer: {
    flex: 1,
  },
  map: {
    height: '45%',
  },
  mapLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(242,249,234,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  mapLoadingText: {
    fontFamily: FontFamily.body_medium,
    fontSize: FontSize.body_sm,
    color: Colors.on_surface,
  },
  errorText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.body_sm,
    color: Colors.error,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },

  // Results list
  resultsList: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  resultsContent: {
    paddingBottom: Spacing['3xl'],
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outline_variant,
  },
  resultsTitle: {
    fontFamily: FontFamily.body_bold,
    fontSize: FontSize.title_sm,
    color: Colors.on_surface,
  },
  resultsCount: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.label_sm,
    color: Colors.on_surface_variant,
  },

  // Place item
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface_container,
    gap: Spacing.md,
  },
  placeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary_container,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  placeTextWrap: {
    flex: 1,
  },
  placeName: {
    fontFamily: FontFamily.body_bold,
    fontSize: FontSize.body_md,
    color: Colors.on_surface,
    marginBottom: 2,
  },
  placeAddress: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.label_sm,
    color: Colors.on_surface_variant,
    lineHeight: FontSize.label_sm * 1.4,
  },
  placeArrow: {
    flexShrink: 0,
  },

  // Empty state
  emptyState: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.body_sm,
    color: Colors.on_surface_variant,
    textAlign: 'center',
  },

  // Footer
  footerLoader: {
    marginVertical: Spacing.lg,
  },
  loadMoreButton: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.lg,
    backgroundColor: Colors.primary_container,
    paddingVertical: Spacing.md,
    borderRadius: Radius.button_secondary,
    alignItems: 'center',
  },
  loadMoreText: {
    fontFamily: FontFamily.body_bold,
    fontSize: FontSize.label_lg,
    color: Colors.on_primary_container,
  },
});
