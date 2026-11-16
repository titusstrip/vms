import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LabelItem } from '../domain/labels';
import { printLabels, shareLabelsPdf } from '../services/printing';
import { useInventory } from '../state/InventoryContext';
import { Button, ErrorText } from './components';
import { errorMessage } from './dialogs';
import { spacing } from './theme';

/** Boutons « Imprimer » et « PDF » pour un lot d'étiquettes. */
export function LabelActions({ items, printLabel }: { items: LabelItem[]; printLabel?: string }) {
  const { state } = useInventory();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  return (
    <View style={styles.container}>
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
});
