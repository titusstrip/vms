/** Liste, recherche, création et fiche des cartons. */
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { cartonTitle, searchCartons } from '../domain/inventory';
import { cartonLabel } from '../domain/labels';
import { useInventory } from '../state/InventoryContext';
import { LabelActions } from '../ui/LabelActions';
import { Button, EmptyState, SearchInput, Sheet } from '../ui/components';
import { CartonRow } from '../ui/rows';
import { spacing } from '../ui/theme';
import { CartonDetail } from './CartonDetail';
import { CartonForm } from './CartonForm';

export function CartonsScreen() {
  const { state } = useInventory();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [openCode, setOpenCode] = useState<string | null>(null);

  const cartons = useMemo(() => searchCartons(state, query), [state, query]);
  const total = Object.keys(state.cartons).length;
  const openCarton = openCode ? state.cartons[openCode] : undefined;

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <SearchInput
          accessibilityLabel="Filtrer les cartons"
          placeholder="Filtrer la liste des cartons"
          value={query}
          onChangeText={setQuery}
        />
        <Button label="Nouveau carton" onPress={() => setCreating(true)} />
      </View>

      <FlatList
        data={cartons}
        keyExtractor={(carton) => carton.code}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => <CartonRow carton={item} onPress={() => setOpenCode(item.code)} />}
        ListEmptyComponent={
          total === 0 ? (
            <EmptyState
              title="Aucun carton"
              message="Créez la fiche d'un carton (référence et nom du produit), imprimez son étiquette, puis scannez-le avec son emplacement pour le ranger."
            />
          ) : (
            <EmptyState title="Aucun résultat" message="Aucun carton ne correspond à cette recherche." />
          )
        }
        ListFooterComponent={
          cartons.length > 1 ? (
            <LabelActions
              items={cartons.map(cartonLabel)}
              printLabel={`Imprimer ces ${cartons.length} étiquettes`}
            />
          ) : undefined
        }
      />

      {/* Une seule fenêtre pour le formulaire puis la fiche : pas de modales superposées. */}
      <Sheet
        visible={creating || Boolean(openCarton)}
        title={creating ? 'Nouveau carton' : openCarton ? cartonTitle(openCarton) : ''}
        onClose={() => {
          setCreating(false);
          setOpenCode(null);
        }}
      >
        {creating ? (
          <CartonForm
            onDone={(code) => {
              setCreating(false);
              setOpenCode(code);
            }}
            onOpenExisting={(code) => {
              setCreating(false);
              setOpenCode(code);
            }}
          />
        ) : openCarton ? (
          <CartonDetail key={openCarton.code} carton={openCarton} onDeleted={() => setOpenCode(null)} />
        ) : null}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  toolbar: { padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
  list: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
});
