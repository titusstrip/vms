import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { cartonTitle } from './domain/inventory';
import { CartonDetail } from './screens/CartonDetail';
import { CartonsScreen } from './screens/CartonsScreen';
import { LocationDetail } from './screens/LocationDetail';
import { LocationsScreen } from './screens/LocationsScreen';
import { ScanScreen } from './screens/ScanScreen';
import { SearchResults, SearchTarget } from './screens/SearchResults';
import { SettingsScreen } from './screens/SettingsScreen';
import { InventoryProvider, useInventory } from './state/InventoryContext';
import { Button, SearchInput, Sheet } from './ui/components';
import { colors, spacing } from './ui/theme';

const TABS = [
  { key: 'scan', label: 'Scanner', title: 'Scanner', Screen: ScanScreen },
  { key: 'cartons', label: 'Cartons', title: 'Cartons', Screen: CartonsScreen },
  { key: 'locations', label: 'Emplacements', title: 'Emplacements', Screen: LocationsScreen },
  { key: 'settings', label: 'Réglages', title: 'Réglages', Screen: SettingsScreen },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function App() {
  return (
    <SafeAreaProvider>
      <InventoryProvider>
        <StatusBar style="dark" />
        <Shell />
      </InventoryProvider>
    </SafeAreaProvider>
  );
}

function Shell() {
  const { state, ready } = useInventory();
  const [active, setActive] = useState<TabKey>('scan');
  const [query, setQuery] = useState('');
  /** Fiche ouverte depuis la recherche globale. */
  const [opened, setOpened] = useState<SearchTarget | null>(null);
  const tab = TABS.find((candidate) => candidate.key === active) ?? TABS[0];
  const searching = query.trim().length > 0;

  const openedCarton = opened?.kind === 'carton' ? state.cartons[opened.code] : undefined;
  const openedLocation = opened?.kind === 'location' ? state.locations[opened.code] : undefined;

  const closeSearch = () => {
    setQuery('');
    Keyboard.dismiss();
  };

  return (
    <SafeAreaView style={styles.app}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          {searching ? 'Recherche' : tab.title}
        </Text>
        <View style={styles.searchRow}>
          <SearchInput
            accessibilityLabel="Recherche globale"
            placeholder="Rechercher un produit ou un emplacement"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            style={styles.search}
          />
          {searching ? <Button label="Effacer" variant="secondary" compact onPress={closeSearch} /> : null}
        </View>
      </View>

      <View style={styles.body}>
        {!ready ? (
          <ActivityIndicator style={styles.loading} color={colors.primary} />
        ) : searching ? (
          <SearchResults query={query} onOpen={setOpened} />
        ) : (
          <tab.Screen />
        )}
      </View>

      <View style={styles.tabBar} accessibilityRole="tablist">
        {TABS.map((item) => {
          const selected = !searching && item.key === active;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => {
                closeSearch();
                setActive(item.key);
              }}
              style={styles.tab}
            >
              <View style={[styles.tabIndicator, selected && styles.tabIndicatorSelected]} />
              <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Sheet
        visible={Boolean(openedCarton || openedLocation)}
        title={openedCarton ? cartonTitle(openedCarton) : (openedLocation?.code ?? '')}
        onClose={() => setOpened(null)}
      >
        {openedCarton ? (
          <CartonDetail key={openedCarton.code} carton={openedCarton} onDeleted={() => setOpened(null)} />
        ) : openedLocation ? (
          <LocationDetail
            key={openedLocation.code}
            location={openedLocation}
            onDeleted={() => setOpened(null)}
            onOpenCarton={(code) => setOpened({ kind: 'carton', code })}
          />
        ) : null}
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  search: { flex: 1, minHeight: 44 },
  body: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tab: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 6 },
  tabIndicator: { position: 'absolute', top: 0, height: 3, width: '60%', backgroundColor: 'transparent' },
  tabIndicatorSelected: { backgroundColor: colors.primary },
  tabLabel: { fontSize: 14, fontWeight: '600', color: colors.muted },
  tabLabelSelected: { color: colors.primary },
});
