/**
 * MapView (web)
 * Placeholder shim for react-native-maps on web.
 * Renders a styled placeholder instead of a real map.
 * Marker is a no-op component.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { Radius } from '../../constants/radius';
import { FontSize, FontFamily } from '../../constants/fonts';

// ─── Marker stub ─────────────────────────────────────────────────────────────

export function Marker(_props: {
  coordinate: { latitude: number; longitude: number };
  title?: string;
  description?: string;
  pinColor?: string;
  key?: string;
}) {
  return null;
}

// ─── MapView placeholder ──────────────────────────────────────────────────────

interface MapViewProps {
  style?: object;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  showsUserLocation?: boolean;
  children?: React.ReactNode;
}

export default function MapView({ style }: MapViewProps) {
  return (
    <View style={[styles.placeholder, style]}>
      <MapPin size={32} color={Colors.outline} />
      <Text style={styles.title}>Map not available on web</Text>
      <Text style={styles.subtitle}>Open on a mobile device to see the map.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: Colors.surface_container,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.card,
    padding: Spacing.xl,
  },
  title: {
    fontFamily: FontFamily.body_bold,
    fontSize: FontSize.body_md,
    color: Colors.on_surface_variant,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: FontSize.label_sm,
    color: Colors.outline,
    textAlign: 'center',
  },
});
