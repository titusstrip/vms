/** Choix d'un carton à ranger, avec recherche ; les cartons non rangés sont proposés d'abord. */
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { searchCartons } from '../domain/inventory';
import { useInventory } from '../state/InventoryContext';
import { SearchInput } from './components';
import { CartonRow } from './rows';
import { colors, spacing } from './theme';

const MAX_SHOWN = 30;

export function CartonPicker({
  excludeLocation,
  onPick,
}: {
  /** Les cartons déjà dans cet emplacement ne sont pas proposés. */
  excludeLocation: string;
  onPick: (cartonCode: string) => void;
}) {
  const { state } = useInventory();
  const [query, setQuery] = useState('');
  const cartons = useMemo(
    () =>
      searchCartons(state, query)
        .filter((carton) => carton.locationCode !== excludeLocation)
        .sort((a, b) => Number(a.locationCode !== null) - Number(b.locationCode !== null)),
    [state, query, excludeLocation],
  );

  return (
    <View style={styles.container}>
      <SearchInput
        accessibilityLabel="Filtrer les cartons à ranger"
        placeholder="Référence, nom ou code-barres"
        value={query}
        onChangeText={setQuery}
      />
      {cartons.slice(0, MAX_SHOWN).map((carton) => (
        <CartonRow key={carton.code} carton={carton} onPress={() => onPick(carton.code)} />
      ))}
      {cartons.length === 0 ? <Text style={styles.hint}>Aucun carton à proposer.</Text> : null}
      {cartons.length > MAX_SHOWN ? (
        <Text style={styles.hint}>{cartons.length - MAX_SHOWN} autres cartons : précisez le filtre.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  hint: { fontSize: 15, color: colors.muted, lineHeight: 21 },
});
