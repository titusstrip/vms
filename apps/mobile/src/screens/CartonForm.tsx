/** Formulaire de création d'une fiche produit (carton). */
import React, { useState } from 'react';

import { addCarton, nextCartonCode, normalizeCode } from '../domain/inventory';
import { useInventory } from '../state/InventoryContext';
import { Button, ErrorText, Field } from '../ui/components';
import { errorMessage } from '../ui/dialogs';
import { parseNumberInput } from '../ui/format';

export function CartonForm({
  initialCode,
  onCreated,
}: {
  /** Code-barres déjà scanné, à associer à la nouvelle fiche. */
  initialCode?: string;
  onCreated: (code: string) => void;
}) {
  const { state, apply } = useInventory();
  const [code, setCode] = useState(() => initialCode ?? nextCartonCode(state));
  const [reference, setReference] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [locationCode, setLocationCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    try {
      const now = new Date().toISOString();
      apply((current) =>
        addCarton(current, { code, reference, name, quantity: parseNumberInput(quantity), locationCode }, now),
      );
      onCreated(normalizeCode(code));
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
      <Field
        label="Emplacement (facultatif)"
        hint="Laissez vide pour ranger le carton plus tard en le scannant."
        value={locationCode}
        onChangeText={setLocationCode}
        autoCapitalize="characters"
      />
      <ErrorText message={error} />
      <Button label="Créer la fiche" onPress={submit} />
    </>
  );
}
