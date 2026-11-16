/** Liste, création (à l'unité ou en série) et fiche des emplacements. */
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  addLocation,
  addLocationSeries,
  cartonsAt,
  locationSeriesCodes,
  normalizeCode,
  removeLocation,
  searchLocations,
} from '../domain/inventory';
import { locationLabel } from '../domain/labels';
import { StorageLocation } from '../domain/types';
import { useInventory } from '../state/InventoryContext';
import { Barcode } from '../ui/Barcode';
import { LabelActions } from '../ui/LabelActions';
import { Badge, Button, EmptyState, ErrorText, Field, SearchInput, SectionTitle, Sheet } from '../ui/components';
import { confirm, errorMessage } from '../ui/dialogs';
import { colors, radius, spacing } from '../ui/theme';

type FormMode = 'single' | 'series' | null;

export function LocationsScreen() {
  const { state } = useInventory();
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<FormMode>(null);
  const [openCode, setOpenCode] = useState<string | null>(null);

  const locations = useMemo(() => searchLocations(state, query), [state, query]);
  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const carton of Object.values(state.cartons)) {
      if (carton.locationCode) {
        result[carton.locationCode] = (result[carton.locationCode] ?? 0) + 1;
      }
    }
    return result;
  }, [state.cartons]);
  const total = Object.keys(state.locations).length;
  const openLocation = openCode ? state.locations[openCode] : undefined;

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <SearchInput
          accessibilityLabel="Rechercher un emplacement"
          placeholder="Rechercher un emplacement"
          value={query}
          onChangeText={setQuery}
        />
        <View style={styles.actions}>
          <View style={styles.grow}>
            <Button label="Nouvel emplacement" onPress={() => setForm('single')} />
          </View>
          <Button label="Créer une série" variant="secondary" onPress={() => setForm('series')} />
        </View>
      </View>

      <FlatList
        data={locations}
        keyExtractor={(location) => location.code}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable accessibilityRole="button" onPress={() => setOpenCode(item.code)} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowCode}>{item.code}</Text>
              {item.label ? (
                <Text style={styles.rowText} numberOfLines={1}>
                  {item.label}
                </Text>
              ) : null}
            </View>
            <Badge label={`${counts[item.code] ?? 0} carton(s)`} />
          </Pressable>
        )}
        ListEmptyComponent={
          total === 0 ? (
            <EmptyState
              title="Aucun emplacement"
              message="Créez vos étagères et niveaux, imprimez leurs étiquettes et collez-les sur place."
            />
          ) : (
            <EmptyState title="Aucun résultat" message="Aucun emplacement ne correspond à cette recherche." />
          )
        }
        ListFooterComponent={
          locations.length > 1 ? (
            <LabelActions
              items={locations.map(locationLabel)}
              printLabel={`Imprimer ces ${locations.length} étiquettes`}
            />
          ) : undefined
        }
      />

      {/* Une seule fenêtre pour les formulaires puis la fiche : pas de modales superposées. */}
      <Sheet
        visible={form !== null || Boolean(openLocation)}
        title={
          form === 'single'
            ? 'Nouvel emplacement'
            : form === 'series'
              ? "Série d'emplacements"
              : (openLocation?.code ?? '')
        }
        onClose={() => {
          setForm(null);
          setOpenCode(null);
        }}
      >
        {form === 'single' ? (
          <LocationForm
            onCreated={(code) => {
              setForm(null);
              setOpenCode(code);
            }}
          />
        ) : form === 'series' ? (
          <SeriesForm onDone={() => setForm(null)} />
        ) : openLocation ? (
          <LocationDetail key={openLocation.code} location={openLocation} onDeleted={() => setOpenCode(null)} />
        ) : null}
      </Sheet>
    </View>
  );
}

function LocationForm({ onCreated }: { onCreated: (code: string) => void }) {
  const { apply } = useInventory();
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    try {
      apply((current) => addLocation(current, { code, label }, new Date().toISOString()));
      onCreated(normalizeCode(code));
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  return (
    <>
      <Field
        label="Code de l'emplacement"
        placeholder="Ex. A-01-2"
        hint="Allée, travée, niveau… C'est ce code qui sera imprimé en code-barres."
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoFocus
      />
      <Field
        label="Description (facultatif)"
        placeholder="Ex. Étagère du fond, niveau 2"
        value={label}
        onChangeText={setLabel}
      />
      <ErrorText message={error} />
      <Button label="Créer l'emplacement" onPress={submit} />
    </>
  );
}

function SeriesForm({ onDone }: { onDone: () => void }) {
  const { apply } = useInventory();
  const [aisle, setAisle] = useState('A');
  const [bays, setBays] = useState('3');
  const [levels, setLevels] = useState('4');
  const [error, setError] = useState<string | null>(null);

  const input = { aisle, bays: Number(bays), levels: Number(levels) };
  let preview = '';
  try {
    const codes = locationSeriesCodes(input);
    preview = `${codes.length} emplacements : de ${codes[0]} à ${codes[codes.length - 1]}`;
  } catch {
    preview = '';
  }

  const submit = () => {
    try {
      apply((current) => addLocationSeries(current, input, new Date().toISOString()).state);
      onDone();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  return (
    <>
      <Field label="Allée ou étagère" value={aisle} onChangeText={setAisle} autoCapitalize="characters" />
      <Field label="Nombre de travées" value={bays} onChangeText={setBays} keyboardType="number-pad" />
      <Field label="Niveaux par travée" value={levels} onChangeText={setLevels} keyboardType="number-pad" />
      {preview ? <Text style={styles.preview}>{preview}</Text> : null}
      <ErrorText message={error} />
      <Button label="Créer la série" onPress={submit} />
    </>
  );
}

function LocationDetail({ location, onDeleted }: { location: StorageLocation; onDeleted: () => void }) {
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
      {location.label ? <Text style={styles.rowText}>{location.label}</Text> : null}
      <LabelActions items={[locationLabel(location)]} />

      <View style={styles.contents}>
        <SectionTitle>{`Cartons présents (${cartons.length})`}</SectionTitle>
        {cartons.length === 0 ? <Text style={styles.rowText}>Aucun carton à cet emplacement.</Text> : null}
        {cartons.map((carton) => (
          <View key={carton.code} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowCode}>{carton.code}</Text>
              {carton.description ? <Text style={styles.rowText}>{carton.description}</Text> : null}
            </View>
            {carton.quantity !== null ? <Badge label={`× ${carton.quantity}`} /> : null}
          </View>
        ))}
      </View>

      <ErrorText message={error} />
      <Button label="Supprimer l'emplacement" variant="danger" onPress={remove} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  grow: { flex: 1 },
  toolbar: { padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
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
  preview: { fontSize: 15, color: colors.text, fontWeight: '600' },
  contents: { gap: spacing.sm },
});
