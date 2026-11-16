/** Affichage et choix de la couleur de repérage d'un emplacement. */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { LOCATION_COLORS, LocationColor, StorageLocation } from '../domain/types';
import { colors, spacing } from './theme';

export function colorHex(color: LocationColor | null | undefined): string | null {
  return LOCATION_COLORS.find((candidate) => candidate.key === color)?.hex ?? null;
}

/** Pastille de couleur + code de l'emplacement (ou « Non rangé »). */
export function LocationTag({
  code,
  location,
  large = false,
}: {
  code: string | null;
  location?: StorageLocation;
  large?: boolean;
}) {
  if (!code) {
    return (
      <View style={[styles.tag, styles.tagUnplaced]}>
        <Text style={[styles.tagLabel, large && styles.tagLabelLarge, { color: colors.warning }]}>Non rangé</Text>
      </View>
    );
  }
  const hex = colorHex(location?.color);
  return (
    <View style={styles.tag}>
      {hex ? <View style={[styles.dot, large && styles.dotLarge, { backgroundColor: hex }]} /> : null}
      <Text style={[styles.tagLabel, large && styles.tagLabelLarge]}>{location?.name ?? code}</Text>
    </View>
  );
}

/** Palette de couleurs proposée à la création ou à la modification d'un emplacement. */
export function ColorPicker({
  value,
  onChange,
}: {
  value: LocationColor | null;
  onChange: (color: LocationColor | null) => void;
}) {
  return (
    <View style={styles.picker}>
      <Text style={styles.pickerLabel}>Couleur de repérage</Text>
      <View style={styles.swatches} accessibilityRole="radiogroup">
        <Pressable
          accessibilityRole="radio"
          accessibilityLabel="Aucune couleur"
          accessibilityState={{ selected: value === null }}
          onPress={() => onChange(null)}
          style={[styles.swatch, styles.swatchNone, value === null && styles.swatchSelected]}
        >
          <Text style={styles.swatchNoneLabel}>Aucune</Text>
        </Pressable>
        {LOCATION_COLORS.map((color) => (
          <Pressable
            key={color.key}
            accessibilityRole="radio"
            accessibilityLabel={color.name}
            accessibilityState={{ selected: value === color.key }}
            onPress={() => onChange(color.key)}
            style={[styles.swatch, { backgroundColor: color.hex }, value === color.key && styles.swatchSelected]}
          >
            {value === color.key ? <Text style={styles.check}>✓</Text> : null}
          </Pressable>
        ))}
      </View>
      <Text style={styles.pickerHint}>
        {value ? LOCATION_COLORS.find((color) => color.key === value)?.name : 'Aucune couleur'} — par exemple
        une couleur par allée ou par zone.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  tagUnplaced: { backgroundColor: colors.warningSoft, borderColor: colors.warningSoft },
  tagLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  tagLabelLarge: { fontSize: 20 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotLarge: { width: 18, height: 18, borderRadius: 9 },
  picker: { gap: spacing.sm },
  pickerLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  pickerHint: { fontSize: 13, color: colors.muted },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  swatchNone: { width: 84, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
  swatchNoneLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  swatchSelected: { borderColor: colors.text, borderWidth: 3 },
  check: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
});
