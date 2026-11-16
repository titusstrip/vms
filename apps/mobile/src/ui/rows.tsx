/** Lignes de liste partagées : un carton (fiche produit) ou un emplacement. */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { cartonTitle } from '../domain/inventory';
import { Carton, StorageLocation } from '../domain/types';
import { useInventory } from '../state/InventoryContext';
import { Badge } from './components';
import { LocationTag, colorHex } from './locationColors';
import { colors, radius, spacing } from './theme';

export function CartonRow({ carton, onPress }: { carton: Carton; onPress?: () => void }) {
  const { state } = useInventory();
  const location = carton.locationCode ? state.locations[carton.locationCode] : undefined;
  return (
    <Pressable accessibilityRole="button" disabled={!onPress} onPress={onPress} style={styles.row}>
      <View style={styles.main}>
        <Text style={styles.title}>{cartonTitle(carton)}</Text>
        {carton.name ? (
          <Text style={styles.text} numberOfLines={1}>
            {carton.name}
          </Text>
        ) : null}
      </View>
      <LocationTag code={carton.locationCode} location={location} />
    </Pressable>
  );
}

export function LocationRow({
  location,
  count,
  selected = false,
  onPress,
}: {
  location: StorageLocation;
  /** Nombre de cartons présents. */
  count: number;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.row, selected && styles.rowSelected]}
    >
      <View style={[styles.stripe, { backgroundColor: colorHex(location.color) ?? colors.border }]} />
      <View style={styles.main}>
        <Text style={styles.title}>{location.name}</Text>
        <Text style={styles.text} numberOfLines={1}>
          {location.name === location.code ? location.label : `N° ${location.code}${location.label ? ` — ${location.label}` : ''}`}
        </Text>
      </View>
      <Badge label={`${count} carton(s)`} />
    </Pressable>
  );
}

/** Nombre de cartons par emplacement. */
export function countByLocation(cartons: Record<string, Carton>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const carton of Object.values(cartons)) {
    if (carton.locationCode) {
      counts[carton.locationCode] = (counts[carton.locationCode] ?? 0) + 1;
    }
  }
  return counts;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 60,
  },
  rowSelected: { borderColor: colors.primary, borderWidth: 2 },
  main: { flex: 1, gap: 2 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  text: { fontSize: 15, color: colors.muted },
  stripe: { width: 8, alignSelf: 'stretch', borderRadius: 4 },
});
