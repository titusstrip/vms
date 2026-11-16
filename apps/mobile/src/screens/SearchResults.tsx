/** Résultats de la recherche globale : fiches produit et emplacements. */
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { searchCartons, searchLocations } from '../domain/inventory';
import { useInventory } from '../state/InventoryContext';
import { EmptyState, SectionTitle } from '../ui/components';
import { CartonRow, LocationRow, countByLocation } from '../ui/rows';
import { spacing } from '../ui/theme';

const MAX_PER_SECTION = 30;

export type SearchTarget = { kind: 'carton' | 'location'; code: string };

export function SearchResults({ query, onOpen }: { query: string; onOpen: (target: SearchTarget) => void }) {
  const { state } = useInventory();
  const cartons = useMemo(() => searchCartons(state, query), [state, query]);
  const locations = useMemo(() => searchLocations(state, query), [state, query]);
  const counts = useMemo(() => countByLocation(state.cartons), [state.cartons]);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {cartons.length === 0 && locations.length === 0 ? (
        <EmptyState
          title="Aucun résultat"
          message="Aucun produit ni emplacement ne correspond. Vérifiez la référence, le nom ou le code."
        />
      ) : null}
      {cartons.length > 0 ? <SectionTitle>{`Produits (${cartons.length})`}</SectionTitle> : null}
      {cartons.slice(0, MAX_PER_SECTION).map((carton) => (
        <CartonRow key={carton.code} carton={carton} onPress={() => onOpen({ kind: 'carton', code: carton.code })} />
      ))}
      {locations.length > 0 ? <SectionTitle>{`Emplacements (${locations.length})`}</SectionTitle> : null}
      {locations.slice(0, MAX_PER_SECTION).map((location) => (
        <LocationRow
          key={location.code}
          location={location}
          count={counts[location.code] ?? 0}
          onPress={() => onOpen({ kind: 'location', code: location.code })}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.sm },
});
