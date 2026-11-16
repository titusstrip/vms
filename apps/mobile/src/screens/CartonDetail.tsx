/** Fiche détaillée d'un carton : étiquette, emplacement, modification, historique. */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { cartonTitle, moveCarton, movementsOf, removeCarton, updateCarton } from '../domain/inventory';
import { cartonLabel } from '../domain/labels';
import { Carton } from '../domain/types';
import { useInventory } from '../state/InventoryContext';
import { Barcode } from '../ui/Barcode';
import { LabelActions } from '../ui/LabelActions';
import { LocationPicker } from '../ui/LocationPicker';
import { Button, ErrorText, Field, SectionTitle } from '../ui/components';
import { confirm, errorMessage } from '../ui/dialogs';
import { describeMovement, formatDateTime, parseNumberInput } from '../ui/format';
import { LocationTag } from '../ui/locationColors';
import { colors, radius, spacing } from '../ui/theme';

export function CartonDetail({ carton, onDeleted }: { carton: Carton; onDeleted: () => void }) {
  const { state, apply } = useInventory();
  const [reference, setReference] = useState(carton.reference);
  const [name, setName] = useState(carton.name);
  const [quantity, setQuantity] = useState(carton.quantity === null ? '' : String(carton.quantity));
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const movements = movementsOf(state, carton.code);
  const location = carton.locationCode ? state.locations[carton.locationCode] : undefined;
  const changed =
    reference.trim() !== carton.reference ||
    name.trim() !== carton.name ||
    parseNumberInput(quantity) !== carton.quantity;

  const run = (change: Parameters<typeof apply>[0]) => {
    setError(null);
    try {
      apply(change);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const moveTo = (locationCode: string | null) => {
    run((current) => moveCarton(current, carton.code, locationCode, new Date().toISOString()));
    setPicking(false);
  };

  const save = () =>
    run((current) =>
      updateCarton(
        current,
        carton.code,
        { reference, name, quantity: parseNumberInput(quantity) },
        new Date().toISOString(),
      ),
    );

  const remove = async () => {
    if (await confirm('Supprimer ce carton ?', `${cartonTitle(carton)} et son historique seront supprimés.`, 'Supprimer')) {
      onDeleted();
      run((current) => removeCarton(current, carton.code));
    }
  };

  return (
    <>
      <Barcode code={carton.code} />
      <LabelActions items={[cartonLabel(carton)]} />

      <View style={styles.locationBox}>
        <SectionTitle>Emplacement</SectionTitle>
        <LocationTag code={carton.locationCode} location={location} large />
        {location?.label ? <Text style={styles.text}>{location.label}</Text> : null}
        <View style={styles.locationActions}>
          <View style={styles.grow}>
            <Button
              label={picking ? 'Annuler' : carton.locationCode ? "Changer d'emplacement" : 'Choisir un emplacement'}
              variant="secondary"
              compact
              onPress={() => setPicking(!picking)}
            />
          </View>
          {carton.locationCode && !picking ? (
            <Button label="Retirer" variant="secondary" compact onPress={() => moveTo(null)} />
          ) : null}
        </View>
        {picking ? <LocationPicker selected={carton.locationCode} onPick={moveTo} /> : null}
      </View>

      <Field
        label="Référence produit"
        value={reference}
        onChangeText={setReference}
        autoCapitalize="characters"
      />
      <Field label="Nom du produit" value={name} onChangeText={setName} />
      <Field label="Quantité" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
      <ErrorText message={error} />
      {changed ? <Button label="Enregistrer" onPress={save} /> : null}

      {movements.length > 0 ? (
        <View style={styles.history}>
          <SectionTitle>Historique</SectionTitle>
          {movements.slice(0, 10).map((movement) => (
            <Text key={movement.id} style={styles.text}>
              {formatDateTime(movement.at)} — {describeMovement(movement)}
            </Text>
          ))}
        </View>
      ) : null}

      <Button label="Supprimer le carton" variant="danger" onPress={remove} />
    </>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  text: { fontSize: 15, color: colors.muted },
  locationBox: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  locationActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  history: { gap: spacing.xs },
});
