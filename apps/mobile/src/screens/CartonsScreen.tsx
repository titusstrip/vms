/** Liste, recherche, création et fiche des cartons. */
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  addCarton,
  moveCarton,
  movementsOf,
  nextCartonCode,
  normalizeCode,
  removeCarton,
  searchCartons,
  updateCarton,
} from '../domain/inventory';
import { cartonLabel } from '../domain/labels';
import { Carton } from '../domain/types';
import { useInventory } from '../state/InventoryContext';
import { Barcode } from '../ui/Barcode';
import { LabelActions } from '../ui/LabelActions';
import { Badge, Button, EmptyState, ErrorText, Field, SearchInput, SectionTitle, Sheet } from '../ui/components';
import { confirm, errorMessage } from '../ui/dialogs';
import { describeMovement, formatDateTime, parseNumberInput } from '../ui/format';
import { colors, radius, spacing } from '../ui/theme';

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
          accessibilityLabel="Rechercher un carton"
          placeholder="Rechercher : référence, contenu, emplacement"
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
              message="Créez un carton, imprimez son étiquette, puis scannez-le avec son emplacement pour le ranger."
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
        title={creating ? 'Nouveau carton' : (openCarton?.code ?? '')}
        onClose={() => {
          setCreating(false);
          setOpenCode(null);
        }}
      >
        {creating ? (
          <CartonForm
            onCreated={(code) => {
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

function CartonRow({ carton, onPress }: { carton: Carton; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <View style={styles.rowMain}>
        <Text style={styles.rowCode}>{carton.code}</Text>
        {carton.description ? (
          <Text style={styles.rowText} numberOfLines={1}>
            {carton.description}
          </Text>
        ) : null}
      </View>
      {carton.locationCode ? (
        <Badge label={carton.locationCode} tone="success" />
      ) : (
        <Badge label="Non rangé" tone="warning" />
      )}
    </Pressable>
  );
}

function CartonForm({ onCreated }: { onCreated: (code: string) => void }) {
  const { state, apply } = useInventory();
  const [code, setCode] = useState(() => nextCartonCode(state));
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('');
  const [locationCode, setLocationCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    try {
      const now = new Date().toISOString();
      apply((current) =>
        addCarton(current, { code, description, quantity: parseNumberInput(quantity), locationCode }, now),
      );
      onCreated(normalizeCode(code));
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  return (
    <>
      <Field
        label="Référence"
        hint="Proposée automatiquement ; vous pouvez saisir ou scanner la vôtre."
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
      />
      <Field
        label="Contenu"
        placeholder="Ex. Câbles HDMI 2 m"
        value={description}
        onChangeText={setDescription}
      />
      <Field
        label="Quantité (facultatif)"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
      />
      <Field
        label="Emplacement (facultatif)"
        hint="Laissez vide pour ranger le carton plus tard en le scannant."
        value={locationCode}
        onChangeText={setLocationCode}
        autoCapitalize="characters"
      />
      <ErrorText message={error} />
      <Button label="Créer le carton" onPress={submit} />
    </>
  );
}

function CartonDetail({ carton, onDeleted }: { carton: Carton; onDeleted: () => void }) {
  const { state, apply } = useInventory();
  const [description, setDescription] = useState(carton.description);
  const [quantity, setQuantity] = useState(carton.quantity === null ? '' : String(carton.quantity));
  const [error, setError] = useState<string | null>(null);
  const movements = movementsOf(state, carton.code);
  const changed =
    description.trim() !== carton.description || parseNumberInput(quantity) !== carton.quantity;

  const run = (change: Parameters<typeof apply>[0]) => {
    setError(null);
    try {
      apply(change);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const save = () =>
    run((current) =>
      updateCarton(
        current,
        carton.code,
        { description, quantity: parseNumberInput(quantity) },
        new Date().toISOString(),
      ),
    );

  const remove = async () => {
    if (await confirm('Supprimer ce carton ?', `${carton.code} et son historique seront supprimés.`, 'Supprimer')) {
      onDeleted();
      run((current) => removeCarton(current, carton.code));
    }
  };

  return (
    <>
      <Barcode code={carton.code} />
      <LabelActions items={[cartonLabel(carton)]} />

      <View style={styles.locationBox}>
        <View style={styles.rowMain}>
          <SectionTitle>Emplacement</SectionTitle>
          <Text style={styles.locationCode}>{carton.locationCode ?? 'Non rangé'}</Text>
          {carton.locationCode && state.locations[carton.locationCode]?.label ? (
            <Text style={styles.rowText}>{state.locations[carton.locationCode].label}</Text>
          ) : null}
        </View>
        {carton.locationCode ? (
          <Button
            label="Retirer"
            variant="secondary"
            compact
            onPress={() => run((current) => moveCarton(current, carton.code, null, new Date().toISOString()))}
          />
        ) : null}
      </View>

      <Field label="Contenu" value={description} onChangeText={setDescription} />
      <Field label="Quantité" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
      <ErrorText message={error} />
      {changed ? <Button label="Enregistrer" onPress={save} /> : null}

      {movements.length > 0 ? (
        <View style={styles.history}>
          <SectionTitle>Historique</SectionTitle>
          {movements.slice(0, 10).map((movement) => (
            <Text key={movement.id} style={styles.rowText}>
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
  screen: { flex: 1 },
  toolbar: { padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
  list: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 60,
  },
  rowMain: { flex: 1, gap: 2 },
  rowCode: { fontSize: 17, fontWeight: '700', color: colors.text },
  rowText: { fontSize: 15, color: colors.muted },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  locationCode: { fontSize: 24, fontWeight: '800', color: colors.text },
  history: { gap: spacing.xs },
});
