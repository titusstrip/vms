import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { CartonsScreen } from './screens/CartonsScreen';
import { LocationsScreen } from './screens/LocationsScreen';
import { ScanScreen } from './screens/ScanScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { InventoryProvider, useInventory } from './state/InventoryContext';
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
  const { ready } = useInventory();
  const [active, setActive] = useState<TabKey>('scan');
  const tab = TABS.find((candidate) => candidate.key === active) ?? TABS[0];

  return (
    <SafeAreaView style={styles.app}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          {tab.title}
        </Text>
      </View>

      <View style={styles.body}>
        {ready ? <tab.Screen /> : <ActivityIndicator style={styles.loading} color={colors.primary} />}
      </View>

      <View style={styles.tabBar} accessibilityRole="tablist">
        {TABS.map((item) => {
          const selected = item.key === active;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setActive(item.key)}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
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
