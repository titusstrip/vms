/** Fiche produit affichée après un scan : référence et nom d'abord, code-barres en détail. */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { cartonTitle } from '../domain/inventory';
import { Carton } from '../domain/types';
import { useInventory } from '../state/InventoryContext';
import { LocationTag } from './locationColors';
import { colors, spacing } from './theme';

export function ProductCard({ carton }: { carton: Carton }) {
  const { state } = useInventory();
  const location = carton.locationCode ? state.locations[carton.locationCode] : undefined;
  return (
    <View style={styles.container}>
      <Text style={styles.reference}>{cartonTitle(carton)}</Text>
      {carton.name ? <Text style={styles.name}>{carton.name}</Text> : null}
      <View style={styles.rows}>
        <Row label="Emplacement">
          <LocationTag code={carton.locationCode} location={location} large />
        </Row>
        {carton.quantity !== null ? (
          <Row label="Quantité">
            <Text style={styles.value}>{carton.quantity}</Text>
          </Row>
        ) : null}
        {carton.reference ? (
          <Row label="Code-barres">
            <Text style={styles.detail}>{carton.code}</Text>
          </Row>
        ) : null}
      </View>
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  reference: { fontSize: 26, fontWeight: '800', color: colors.text },
  name: { fontSize: 17, color: colors.text, lineHeight: 23 },
  rows: { marginTop: spacing.sm, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  label: { fontSize: 14, color: colors.muted, fontWeight: '600' },
  value: { fontSize: 18, fontWeight: '700', color: colors.text },
  detail: { fontSize: 15, color: colors.muted },
});
