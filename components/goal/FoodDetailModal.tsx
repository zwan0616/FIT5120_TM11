/**
 * FoodDetailModal - Modal component for displaying expanded food card details
 * Shows a food item in a large card format with explanation when clicked.
 * Includes an inline map section below the food details to find nearby stores.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from '../map/MapView';
import * as Location from 'expo-location';
import { X, MapPin, Navigation } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Radius } from '../../constants/radius';
import { FontSize, FontFamily } from '../../constants/fonts';
import { usePlacesSearch } from '../../hooks/usePlacesSearch';
import type { Place } from '../../services/placesSearch';
import { getCachedLocation, setCachedLocation } from '../../services/locationCache';

// ─── Photo URL helper ─────────────────────────────────────────────────────────

function getPhotoUrl(photoName: string, maxWidth = 400): string {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${apiKey}`;
}

export interface FoodDetailData {
  name: string;
  description: string;
  image: string;
  explanation?: string;
  cn_code?: number;
  category?: string;
}

interface Props {
  visible: boolean;
  food: FoodDetailData | null;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function openInGoogleMaps(place: Place) {
  const url = place.googleMapsUri;
  Linking.openURL(url).catch(() => {
    const fallback = `https://www.google.com/maps/search/?api=1&query=${place.location.latitude},${place.location.longitude}`;
    Linking.openURL(fallback);
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FoodDetailModal({ visible, food, onClose }: Props) {
  const [locationStatus, setLocationStatus] = useState<
    'idle' | 'requesting' | 'granted' | 'denied'
  >('idle');
  const [userLatitude, setUserLatitude] = useState<number | null>(null);
  const [userLongitude, setUserLongitude] = useState<number | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  // Request location when modal becomes visible.
  // Uses a 2-minute in-memory cache to avoid repeated GPS calls.
  useEffect(() => {
    if (!visible) {
      return;
    }

    let cancelled = false;

    const requestLocation = async () => {
      // Check cache first
      const cached = getCachedLocation();
      if (cached) {
        setUserLatitude(cached.latitude);
        setUserLongitude(cached.longitude);
        setLocationStatus('granted');
        return;
      }

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

        setCachedLocation(loc.coords.latitude, loc.coords.longitude);
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
    foodItem: locationStatus === 'granted' ? (food?.name ?? null) : null,
    latitude: userLatitude,
    longitude: userLongitude,
  });

  const handleClose = useCallback(() => {
    setLocationStatus('idle');
    setUserLatitude(null);
    setUserLongitude(null);
    onClose();
  }, [onClose]);

  // ─── Map section ─────────────────────────────────────────────────────────────

  const renderMapSection = () => {
    if (locationStatus === 'idle' || locationStatus === 'requesting') {
      return (
        <View style={styles.mapLoadingState}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.mapLoadingText}>Getting your location…</Text>
        </View>
      );
    }

    if (locationStatus === 'denied') {
      return (
        <View style={styles.mapDeniedState}>
          <MapPin size={28} color={Colors.outline} />
          <Text style={styles.mapDeniedTitle}>Location access needed</Text>
          <Text style={styles.mapDeniedSubtitle}>
            Enable location in Settings to find nearby stores.
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

    // granted
    return (
      <View style={styles.mapGrantedContainer}>
        {/* Map */}
        <View style={styles.mapWrapper}>
          <MapView
            style={styles.map}
            initialRegion={
              userLatitude !== null && userLongitude !== null
                ? {
                    latitude: userLatitude,
                    longitude: userLongitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }
                : undefined
            }
            showsUserLocation={true}
            toolbarEnabled={false}
          >
            {places.map((place) => (
              <Marker
                key={place.id}
                coordinate={{
                  latitude: place.location.latitude,
                  longitude: place.location.longitude,
                }}
                title={place.displayName.text}
                description={place.formatted_address}
                pinColor={selectedPlaceId === place.id ? Colors.secondary : Colors.primary}
                onPress={() => setSelectedPlaceId(place.id)}
              />
            ))}
          </MapView>
          {loading && places.length === 0 && (
            <View style={styles.mapLoadingOverlay}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.mapLoadingText}>Finding nearby stores…</Text>
            </View>
          )}
        </View>

        {/* Results header */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>Search Results</Text>
          {places.length > 0 && (
            <Text style={styles.resultsCount}>{places.length} found</Text>
          )}
        </View>

        {/* Error */}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Empty state */}
        {!loading && !error && places.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No stores found nearby.</Text>
          </View>
        )}

        {/* Results list — selected card floats to top */}
        {[...places].sort((a, b) => {
          if (a.id === selectedPlaceId) return -1;
          if (b.id === selectedPlaceId) return 1;
          return 0;
        }).map((place) => {
          const firstPhoto = place.photos?.[0];
          const photoUrl = firstPhoto ? getPhotoUrl(firstPhoto.name) : null;
          const isSelected = selectedPlaceId === place.id;
          return (
            <TouchableOpacity
              key={place.id}
              style={[styles.placeCard, isSelected && styles.placeCardSelected]}
              activeOpacity={0.75}
              onPress={() => openInGoogleMaps(place)}
              accessibilityRole="button"
              accessibilityLabel={`Open ${place.displayName.text} in Google Maps`}
            >
              {/* Text content */}
              <View style={styles.placeCardContent}>
                <Text style={styles.placeName} numberOfLines={1}>
                  {place.displayName.text}
                </Text>
                <Text style={styles.placeAddress} numberOfLines={2}>
                  {place.formatted_address}
                </Text>
                <View style={styles.placeCardFooter}>
                  <Navigation size={12} color={Colors.primary} />
                  <Text style={styles.placeCardLink}>Open in Maps</Text>
                </View>
              </View>
              {/* Photo */}
              {photoUrl ? (
                <Image
                  source={{ uri: photoUrl }}
                  style={styles.placeCardPhoto}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.placeCardPhotoPlaceholder}>
                  <MapPin size={24} color={Colors.outline} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Load more / footer loader */}
        {loading && places.length > 0 && (
          <ActivityIndicator
            color={Colors.primary}
            size="small"
            style={styles.footerLoader}
          />
        )}
        {hasMore && !loading && (
          <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore} activeOpacity={0.8}>
            <Text style={styles.loadMoreText}>Load More</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (!food) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <FlatList
          style={styles.modalContent}
          contentContainerStyle={styles.modalContentInner}
          keyboardShouldPersistTaps="handled"
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <>
              {/* Header with close button */}
              <View style={styles.header}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>SUPER POWER FOOD</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  activeOpacity={0.7}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <X size={28} color="#36392c" />
                </TouchableOpacity>
              </View>

              {/* Food Name */}
              <Text style={styles.foodName}>{food.name}</Text>

              {/* Food Image */}
              <View style={styles.imageContainer}>
                <Image source={{ uri: food.image }} style={styles.image} resizeMode="cover" />
              </View>

              {/* Explanation/Reason */}
              {food.explanation && (
                <View style={styles.explanationContainer}>
                  <Text style={styles.explanationTitle}>{"Why it's great:"}</Text>
                  <Text style={styles.explanationText}>{food.explanation}</Text>
                </View>
              )}

              {/* Map section divider */}
              <View style={styles.mapSectionDivider}>
                <MapPin size={16} color={Colors.primary} />
                <Text style={styles.mapSectionTitle}>
                  Where to buy {food.name}
                </Text>
              </View>

              {/* Inline map + results */}
              {renderMapSection()}
            </>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#f1f5f9',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  modalContentInner: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#36392c',
    marginBottom: 20,
  },
  imageContainer: {
    height: 200,
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#fff',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  explanationContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4CAF50',
    marginBottom: 8,
  },
  explanationText: {
    fontSize: 15,
    color: '#36392c',
    fontWeight: '600',
    lineHeight: 22,
  },

  // Map section
  mapSectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.outline_variant,
  },
  mapSectionTitle: {
    fontFamily: FontFamily.body_bold,
    fontSize: FontSize.title_sm,
    color: Colors.on_surface,
    textTransform: 'capitalize',
  },

  // Location requesting / denied states
  mapLoadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    justifyContent: 'center',
  },
  mapLoadingText: {
    fontFamily: FontFamily.body_medium,
    fontSize: FontSize.body_sm,
    color: Colors.on_surface_variant,
  },
  mapDeniedState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  mapDeniedTitle: {
    fontFamily: FontFamily.body_bold,
    fontSize: FontSize.title_sm,
    color: Colors.on_surface,
    marginTop: Spacing.xs,
  },
  mapDeniedSubtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.body_sm,
    color: Colors.on_surface_variant,
    textAlign: 'center',
    lineHeight: FontSize.body_sm * 1.5,
  },
  settingsButton: {
    marginTop: Spacing.md,
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

  // Map granted
  mapGrantedContainer: {
    borderRadius: Radius.card,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.outline_variant,
    paddingBottom: Spacing.md
  },
  mapWrapper: {
    height: 220,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(242,249,234,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
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
  errorText: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.body_sm,
    color: Colors.error,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
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

  // Place card
  placeCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.card,
    backgroundColor: Colors.surface_bright,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.outline_variant,
  },
  placeCardSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.primary_container,
  },
  placeCardContent: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  placeName: {
    fontFamily: FontFamily.body_bold,
    fontSize: FontSize.body_md,
    color: Colors.on_surface,
  },
  placeAddress: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.label_sm,
    color: Colors.on_surface_variant,
    lineHeight: FontSize.label_sm * 1.4,
  },
  placeCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  placeCardLink: {
    fontFamily: FontFamily.body_bold,
    fontSize: FontSize.label_sm,
    color: Colors.primary,
  },
  placeCardPhoto: {
    width: 96,
    height: 96,
    flexShrink: 0,
  },
  placeCardPhotoPlaceholder: {
    width: 96,
    height: 96,
    flexShrink: 0,
    backgroundColor: Colors.surface_container,
    alignItems: 'center',
    justifyContent: 'center',
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
