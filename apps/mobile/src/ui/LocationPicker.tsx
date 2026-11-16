/** Choix d'un emplacement dans la liste, avec recherche. */
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { searchLocations } from '../domain/inventory';
import { useInventory } from '../state/InventoryContext';
import { SearchInput } from './components';
import { LocationRow, countByLocation } from './rows';
import { colors, spacing } from './theme';

const MAX_SHOWN = 30;

export function LocationPicker({
  selected,
  onPick,
}: {
  selected?: string | null;
  onPick: (locationCode: string) => void;
}) {
  const { state } = useInventory();
  const [query, setQuery] = useState('');
  const locations = useMemo(() => searchLocations(state, query), [state, query]);
  const counts = useMemo(() => countByLocation(state.cartons), [state.cartons]);
  const total = Object.keys(state.locations).length;

  if (total === 0) {
    return (
      <Text style={styles.hint}>
        Aucun emplacement pour l'instant : créez-les dans l'onglet Emplacements, ou scannez une étiquette
        d'emplacement.
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      {total > 6 ? (
        <SearchInput
          accessibilityLabel="Filtrer les emplacements"
          placeholder="Filtrer les emplacements"
          value={query}
          onChangeText={setQuery}
        />
      ) : null}
      {locations.slice(0, MAX_SHOWN).map((location) => (
        <LocationRow
          key={location.code}
          location={location}
          count={counts[location.code] ?? 0}
          selected={location.code === selected}
          onPress={() => onPick(location.code)}
        />
      ))}
      {locations.length === 0 ? <Text style={styles.hint}>Aucun emplacement ne correspond.</Text> : null}
      {locations.length > MAX_SHOWN ? (
        <Text style={styles.hint}>
          {locations.length - MAX_SHOWN} autres emplacements : précisez le filtre pour les afficher.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  hint: { fontSize: 15, color: colors.muted, lineHeight: 21 },
});
