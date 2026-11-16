/** Liste, création (à l'unité ou en série) et fiche des emplacements. */
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import {
  addLocation,
  addLocationSeries,
  locationSeriesCodes,
  normalizeCode,
  searchLocations,
} from '../domain/inventory';
import { locationLabel } from '../domain/labels';
import { LocationColor } from '../domain/types';
import { useInventory } from '../state/InventoryContext';
import { LabelActions } from '../ui/LabelActions';
import { Button, EmptyState, ErrorText, Field, SearchInput, Sheet } from '../ui/components';
import { errorMessage } from '../ui/dialogs';
import { ColorPicker } from '../ui/locationColors';
import { LocationRow, countByLocation } from '../ui/rows';
import { colors, spacing } from '../ui/theme';
import { LocationDetail } from './LocationDetail';

type FormMode = 'single' | 'series' | null;

export function LocationsScreen() {
  const { state } = useInventory();
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<FormMode>(null);
  const [openCode, setOpenCode] = useState<string | null>(null);

  const locations = useMemo(() => searchLocations(state, query), [state, query]);
  const counts = useMemo(() => countByLocation(state.cartons), [state.cartons]);
  const total = Object.keys(state.locations).length;
  const openLocation = openCode ? state.locations[openCode] : undefined;

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <SearchInput
          accessibilityLabel="Filtrer les emplacements"
          placeholder="Filtrer la liste des emplacements"
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
          <LocationRow location={item} count={counts[item.code] ?? 0} onPress={() => setOpenCode(item.code)} />
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
  const [color, setColor] = useState<LocationColor | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    try {
      apply((current) => addLocation(current, { code, label, color }, new Date().toISOString()));
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
      <ColorPicker value={color} onChange={setColor} />
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
  const [color, setColor] = useState<LocationColor | null>(null);
  const [error, setError] = useState<string | null>(null);

  const input = { aisle, bays: Number(bays), levels: Number(levels), color };
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
      <ColorPicker value={color} onChange={setColor} />
      {preview ? <Text style={styles.preview}>{preview}</Text> : null}
      <ErrorText message={error} />
      <Button label="Créer la série" onPress={submit} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  grow: { flex: 1 },
  toolbar: { padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  list: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.sm },
  preview: { fontSize: 15, color: colors.text, fontWeight: '600' },
});
