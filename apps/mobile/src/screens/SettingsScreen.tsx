/** Format des étiquettes, sauvegarde et aide-mémoire matériel. */
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { createEmptyState, updateLabelSettings } from '../domain/inventory';
import { LABEL_PRESETS } from '../domain/labels';
import { exportBackup, pickBackup } from '../services/backup';
import { useInventory } from '../state/InventoryContext';
import { Button, ErrorText, Field, SectionTitle } from '../ui/components';
import { confirm, errorMessage, notify } from '../ui/dialogs';
import { parseNumberInput } from '../ui/format';
import { colors, radius, spacing } from '../ui/theme';

export function SettingsScreen() {
  const { state, apply } = useInventory();
  const { widthMm, heightMm } = state.labelSettings;
  const [width, setWidth] = useState(String(widthMm));
  const [height, setHeight] = useState(String(heightMm));
  const [error, setError] = useState<string | null>(null);

  const setSize = (nextWidth: number, nextHeight: number) => {
    setError(null);
    try {
      apply((current) => updateLabelSettings(current, { widthMm: nextWidth, heightMm: nextHeight }));
      setWidth(String(nextWidth));
      setHeight(String(nextHeight));
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const guarded = async (action: () => Promise<void>) => {
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const restore = () =>
    guarded(async () => {
      const restored = await pickBackup();
      if (!restored) {
        return;
      }
      const cartons = Object.keys(restored.cartons).length;
      const locations = Object.keys(restored.locations).length;
      const accepted = await confirm(
        'Remplacer les données actuelles ?',
        `La sauvegarde contient ${cartons} carton(s) et ${locations} emplacement(s). Les données actuelles seront écrasées.`,
        'Remplacer',
      );
      if (accepted) {
        apply(() => restored);
        notify('Sauvegarde restaurée', `${cartons} carton(s) et ${locations} emplacement(s) chargés.`);
      }
    });

  const erase = () =>
    guarded(async () => {
      const accepted = await confirm(
        'Tout effacer ?',
        'Tous les cartons, emplacements et mouvements seront définitivement supprimés de ce téléphone.',
        'Tout effacer',
      );
      if (accepted) {
        apply((current) => ({ ...createEmptyState(), labelSettings: current.labelSettings }));
      }
    });

  const customSize = () => setSize(parseNumberInput(width) ?? NaN, parseNumberInput(height) ?? NaN);
  const sizeChanged = parseNumberInput(width) !== widthMm || parseNumberInput(height) !== heightMm;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.section}>
        <SectionTitle>Format des étiquettes (mm)</SectionTitle>
        <View style={styles.presets}>
          {LABEL_PRESETS.map((preset) => {
            const selected = preset.widthMm === widthMm && preset.heightMm === heightMm;
            return (
              <Pressable
                key={preset.name}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setSize(preset.widthMm, preset.heightMm)}
                style={[styles.preset, selected && styles.presetSelected]}
              >
                <Text style={[styles.presetLabel, selected && styles.presetLabelSelected]}>{preset.name}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.sizeRow}>
          <View style={styles.grow}>
            <Field label="Largeur" value={width} onChangeText={setWidth} keyboardType="numeric" />
          </View>
          <View style={styles.grow}>
            <Field label="Hauteur" value={height} onChangeText={setHeight} keyboardType="numeric" />
          </View>
        </View>
        {sizeChanged ? <Button label="Appliquer ce format" onPress={customSize} /> : null}
        <Text style={styles.help}>
          Choisissez le format du rouleau chargé dans l'étiqueteuse : chaque étiquette est imprimée sur une page
          à cette taille.
        </Text>
      </View>

      <View style={styles.section}>
        <SectionTitle>Sauvegarde</SectionTitle>
        <Text style={styles.help}>
          {Object.keys(state.cartons).length} carton(s), {Object.keys(state.locations).length} emplacement(s). Les
          données sont enregistrées sur ce téléphone uniquement : exportez régulièrement une sauvegarde.
        </Text>
        <Button label="Exporter une sauvegarde" variant="secondary" onPress={() => guarded(() => exportBackup(state))} />
        <Button label="Restaurer une sauvegarde" variant="secondary" onPress={restore} />
        <Button label="Tout effacer" variant="danger" onPress={erase} />
      </View>

      <ErrorText message={error} />

      <View style={styles.section}>
        <SectionTitle>Matériel compatible</SectionTitle>
        <Text style={styles.help}>
          Codes-barres : Code 128, lisible par toutes les douchettes et terminaux d'entrepôt, et par la caméra du
          téléphone.
        </Text>
        <Text style={styles.help}>
          Douchette Bluetooth ou USB : appairez-la en mode clavier (HID), puis scannez depuis l'onglet Scanner ; le
          champ de saisie reçoit le code et le valide tout seul.
        </Text>
        <Text style={styles.help}>
          Étiqueteuse : « Imprimer » passe par l'impression du téléphone (AirPrint sur iPhone, service d'impression
          du fabricant sur Android). Si votre modèle n'imprime que depuis sa propre application, utilisez « PDF »
          et ouvrez le fichier dans cette application.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.xl },
  grow: { flex: 1 },
  section: { gap: spacing.md },
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
  sizeRow: { flexDirection: 'row', gap: spacing.md },
  help: { fontSize: 15, color: colors.muted, lineHeight: 21 },
});
