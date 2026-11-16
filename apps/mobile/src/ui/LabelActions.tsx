import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { updateLabelSettings } from '../domain/inventory';
import { LABEL_PRESETS, LabelItem, formatLabelSize } from '../domain/labels';
import { printLabels, shareLabelsPdf } from '../services/printing';
import { useInventory } from '../state/InventoryContext';
import { Button, ErrorText } from './components';
import { errorMessage } from './dialogs';
import { colors, radius, spacing } from './theme';

/** Choix du format puis boutons « Imprimer » et « PDF » pour un lot d'étiquettes. */
export function LabelActions({ items, printLabel }: { items: LabelItem[]; printLabel?: string }) {
  const { state, apply } = useInventory();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [choosingSize, setChoosingSize] = useState(false);
  const { widthMm, heightMm } = state.labelSettings;

  const run = async (action: typeof printLabels) => {
    setError(null);
    setBusy(true);
    try {
      await action(items, state.labelSettings);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const chooseSize = (width: number, height: number) => {
    apply((current) => updateLabelSettings(current, { widthMm: width, heightMm: height }));
    setChoosingSize(false);
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Format d'impression : ${formatLabelSize(state.labelSettings)}. Changer`}
        onPress={() => setChoosingSize(!choosingSize)}
        style={styles.sizeRow}
      >
        <Text style={styles.sizeLabel}>Format d'impression</Text>
        <Text style={styles.sizeValue}>{formatLabelSize(state.labelSettings)}</Text>
        <Text style={styles.sizeChange}>{choosingSize ? 'Fermer' : 'Changer'}</Text>
      </Pressable>
      {choosingSize ? (
        <View style={styles.presets}>
          {LABEL_PRESETS.map((preset) => {
            const selected = preset.widthMm === widthMm && preset.heightMm === heightMm;
            return (
              <Pressable
                key={preset.name}
                accessibilityRole="button"
                accessibilityLabel={`Format ${preset.name} mm`}
                accessibilityState={{ selected }}
                onPress={() => chooseSize(preset.widthMm, preset.heightMm)}
                style={[styles.preset, selected && styles.presetSelected]}
              >
                <Text style={[styles.presetLabel, selected && styles.presetLabelSelected]}>{preset.name}</Text>
              </Pressable>
            );
          })}
          <Text style={styles.hint}>Dimensions en mm. Un format sur mesure se règle dans l'onglet Réglages.</Text>
        </View>
      ) : null}
      <View style={styles.row}>
        <View style={styles.grow}>
          <Button
            label={printLabel ?? "Imprimer l'étiquette"}
            disabled={busy || items.length === 0}
            onPress={() => run(printLabels)}
          />
        </View>
        <Button
          label="PDF"
          variant="secondary"
          disabled={busy || items.length === 0}
          onPress={() => run(shareLabelsPdf)}
        />
      </View>
      <ErrorText message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  grow: { flex: 1 },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sizeLabel: { flex: 1, fontSize: 15, color: colors.muted },
  sizeValue: { fontSize: 15, fontWeight: '700', color: colors.text },
  sizeChange: { fontSize: 15, fontWeight: '600', color: colors.primary },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  preset: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  presetSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  presetLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  presetLabelSelected: { color: '#FFFFFF' },
  hint: { width: '100%', fontSize: 13, color: colors.muted },
});
