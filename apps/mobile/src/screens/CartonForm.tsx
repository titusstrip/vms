/**
 * Création d'une fiche produit (carton), en deux temps : la fiche, puis la
 * proposition de la relier à un emplacement.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  addCarton,
  cartonTitle,
  cartonsWithReference,
  findExistingCode,
  moveCarton,
  nextCartonCode,
} from '../domain/inventory';
import { useInventory } from '../state/InventoryContext';
import { LocationPicker } from '../ui/LocationPicker';
import { ProductCard } from '../ui/ProductCard';
import { Button, ErrorText, Field, SectionTitle } from '../ui/components';
import { errorMessage } from '../ui/dialogs';
import { parseNumberInput } from '../ui/format';
import { CartonRow } from '../ui/rows';
import { colors, radius, spacing } from '../ui/theme';

export function CartonForm({
  initialCode,
  laterLabel = 'Plus tard',
  onDone,
  onOpenExisting,
}: {
  /** Code-barres déjà scanné, à associer à la nouvelle fiche. */
  initialCode?: string;
  /** Libellé du bouton qui reporte le choix de l'emplacement. */
  laterLabel?: string;
  /** Appelé une fois la fiche créée, rangée (`placed`) ou non. */
  onDone: (code: string, placed: boolean) => void;
  /** Appelé quand l'utilisateur préfère ouvrir la fiche déjà reliée à ce code-barres. */
  onOpenExisting: (code: string) => void;
}) {
  const { state, apply } = useInventory();
  const [code, setCode] = useState(() => initialCode ?? nextCartonCode(state));
  const [reference, setReference] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState<string | null>(null);
  /** Code de la fiche créée : on passe alors au choix de l'emplacement. */
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  const created = createdCode ? state.cartons[createdCode] : undefined;
  if (created) {
    const place = (locationCode: string) => {
      try {
        apply((current) => moveCarton(current, created.code, locationCode, new Date().toISOString()));
        onDone(created.code, true);
      } catch (caught) {
        setError(errorMessage(caught));
      }
    };
    return (
      <>
        <View style={styles.notice}>
          <SectionTitle>Fiche créée</SectionTitle>
          <Text style={styles.noticeTitle}>{cartonTitle(created)}</Text>
          {created.name ? <Text style={styles.text}>{created.name}</Text> : null}
        </View>
        <Text style={styles.question}>Où ranger ce carton ?</Text>
        <ErrorText message={error} />
        <LocationPicker onPick={place} />
        <Button label={laterLabel} variant="secondary" onPress={() => onDone(created.code, false)} />
      </>
    );
  }

  const existing = code.trim() ? findExistingCode(state, code) : null;
  const sameReference = cartonsWithReference(state, reference);

  const submit = () => {
    try {
      let createdCarton: string | null = null;
      apply((current) => {
        const next = addCarton(
          current,
          { code, reference, name, quantity: parseNumberInput(quantity) },
          new Date().toISOString(),
        );
        createdCarton = Object.keys(next.cartons).find((key) => !current.cartons[key]) ?? null;
        return next;
      });
      setError(null);
      setCreatedCode(createdCarton);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  return (
    <>
      <Field
        label="Référence produit"
        placeholder="Ex. HDMI-2M"
        hint="C'est elle qui s'affiche quand on scanne le carton."
        value={reference}
        onChangeText={setReference}
        autoCapitalize="characters"
        autoFocus
      />
      {sameReference.length > 0 ? (
        <View style={styles.notice}>
          <SectionTitle>Référence déjà en stock</SectionTitle>
          <Text style={styles.text}>
            {sameReference.length} carton(s) portent déjà cette référence. Créez une nouvelle fiche seulement
            s'il s'agit d'un autre carton du même produit.
          </Text>
          {sameReference.slice(0, 5).map((carton) => (
            <CartonRow key={carton.code} carton={carton} onPress={() => onOpenExisting(carton.code)} />
          ))}
        </View>
      ) : null}
      <Field label="Nom du produit" placeholder="Ex. Câbles HDMI 2 m" value={name} onChangeText={setName} />
      <Field
        label="Quantité (facultatif)"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
      />
      <Field
        label="Code-barres"
        hint={
          initialCode
            ? 'Code scanné sur le carton : il sera relié à cette fiche.'
            : "Généré automatiquement pour l'étiquette ; remplacez-le si le carton a déjà un code-barres."
        }
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
      />
      {existing?.kind === 'carton' ? (
        <View style={[styles.notice, styles.noticeWarning]}>
          <SectionTitle>Code-barres déjà enregistré</SectionTitle>
          <ProductCard carton={existing.carton} />
          <Button label="Ouvrir cette fiche" onPress={() => onOpenExisting(existing.carton.code)} />
        </View>
      ) : null}
      {existing?.kind === 'location' ? (
        <ErrorText message={`Ce code est celui de l'emplacement ${existing.location.name}.`} />
      ) : null}
      <ErrorText message={error} />
      <Button label="Créer la fiche" onPress={submit} disabled={existing !== null} />
    </>
  );
}

const styles = StyleSheet.create({
  notice: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  noticeWarning: { backgroundColor: colors.warningSoft, borderColor: colors.warning },
  noticeTitle: { fontSize: 24, fontWeight: '800', color: colors.text },
  question: { fontSize: 18, fontWeight: '700', color: colors.text },
  text: { fontSize: 15, color: colors.muted, lineHeight: 21 },
});
