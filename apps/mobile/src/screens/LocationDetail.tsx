/** Fiche détaillée d'un emplacement : étiquette, couleur, cartons présents. */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { cartonsAt, removeLocation, updateLocation } from '../domain/inventory';
import { locationLabel } from '../domain/labels';
import { StorageLocation } from '../domain/types';
import { useInventory } from '../state/InventoryContext';
import { Barcode } from '../ui/Barcode';
import { LabelActions } from '../ui/LabelActions';
import { Button, ErrorText, SectionTitle } from '../ui/components';
import { confirm, errorMessage } from '../ui/dialogs';
import { ColorPicker } from '../ui/locationColors';
import { CartonRow } from '../ui/rows';
import { colors, spacing } from '../ui/theme';

export function LocationDetail({
  location,
  onDeleted,
  onOpenCarton,
}: {
  location: StorageLocation;
  onDeleted: () => void;
  onOpenCarton?: (code: string) => void;
}) {
  const { state, apply } = useInventory();
  const [error, setError] = useState<string | null>(null);
  const cartons = cartonsAt(state, location.code);

  const remove = async () => {
    const detail =
      cartons.length > 0
        ? `Les ${cartons.length} carton(s) présents deviendront « non rangés ».`
        : "L'emplacement sera supprimé.";
    if (await confirm('Supprimer cet emplacement ?', detail, 'Supprimer')) {
      try {
        onDeleted();
        apply((current) => removeLocation(current, location.code, new Date().toISOString()));
      } catch (caught) {
        setError(errorMessage(caught));
      }
    }
  };

  return (
    <>
      <Barcode code={location.code} />
      {location.label ? <Text style={styles.text}>{location.label}</Text> : null}
      <LabelActions items={[locationLabel(location)]} />
      <ColorPicker
        value={location.color}
        onChange={(color) => apply((current) => updateLocation(current, location.code, { color }))}
      />

      <View style={styles.contents}>
        <SectionTitle>{`Cartons présents (${cartons.length})`}</SectionTitle>
        {cartons.length === 0 ? <Text style={styles.text}>Aucun carton à cet emplacement.</Text> : null}
        {cartons.map((carton) => (
          <CartonRow
            key={carton.code}
            carton={carton}
            onPress={onOpenCarton ? () => onOpenCarton(carton.code) : undefined}
          />
        ))}
      </View>

      <ErrorText message={error} />
      <Button label="Supprimer l'emplacement" variant="danger" onPress={remove} />
    </>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 15, color: colors.muted },
  contents: { gap: spacing.sm },
});
