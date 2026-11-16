/**
 * Écran de scan : caméra du téléphone ou douchette (Bluetooth/USB, qui se
 * comporte comme un clavier et valide par « Entrée »).
 */
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { ComponentRef, useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, Vibration, View } from 'react-native';

import { addLocation, cartonTitle, cartonsAt, normalizeCode } from '../domain/inventory';
import { EMPTY_SCAN_CONTEXT, ScanContext, ScanOutcome, handleScan } from '../domain/scanFlow';
import { DEFAULT_STABILIZER_OPTIONS, ScanStabilizer } from '../domain/scanStabilizer';
import { useInventory } from '../state/InventoryContext';
import { Button, ErrorText, SectionTitle, Sheet } from '../ui/components';
import { errorMessage } from '../ui/dialogs';
import { describeMovement, formatDateTime } from '../ui/format';
import { LocationTag } from '../ui/locationColors';
import { ProductCard } from '../ui/ProductCard';
import { colors, radius, spacing } from '../ui/theme';
import { CartonForm } from './CartonForm';

export function ScanScreen() {
  const { state, apply } = useInventory();
  const [context, setContext] = useState<ScanContext>(EMPTY_SCAN_CONTEXT);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  /** Code que la caméra vient de valider, affiché pendant la pause de lecture. */
  const [confirmed, setConfirmed] = useState<string | null>(null);
  /** Code-barres inconnu pour lequel on crée une fiche produit. */
  const [newProductCode, setNewProductCode] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const contextRef = useRef(context);
  const stateRef = useRef(state);
  stateRef.current = state;
  const stabilizer = useRef(new ScanStabilizer()).current;
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (confirmTimer.current) {
        clearTimeout(confirmTimer.current);
      }
    },
    [],
  );

  const updateContext = (next: ScanContext) => {
    contextRef.current = next;
    setContext(next);
  };

  const scan = useCallback(
    (rawCode: string) => {
      setError(null);
      try {
        let result: ReturnType<typeof handleScan> | undefined;
        apply((current) => {
          result = handleScan(current, contextRef.current, rawCode, new Date().toISOString());
          return result.state;
        });
        if (!result || result.outcome.kind === 'empty') {
          return;
        }
        updateContext(result.context);
        setOutcome(result.outcome);
        Vibration.vibrate(result.outcome.kind === 'unknown' ? [0, 80, 80, 80] : 60);
      } catch (caught) {
        setError(errorMessage(caught));
      }
    },
    [apply],
  );

  const submitTyped = () => {
    scan(typed);
    setTyped('');
    inputRef.current?.focus();
  };

  /** La caméra envoie des lectures en rafale : seules les lectures confirmées sont traitées. */
  const onCameraRead = ({ data }: { data: string }) => {
    const code = normalizeCode(data);
    const inventory = stateRef.current;
    const known = Boolean(inventory.cartons[code] || inventory.locations[code]);
    const accepted = stabilizer.push(code, Date.now(), known);
    if (!accepted) {
      return;
    }
    setConfirmed(accepted);
    if (confirmTimer.current) {
      clearTimeout(confirmTimer.current);
    }
    confirmTimer.current = setTimeout(() => setConfirmed(null), DEFAULT_STABILIZER_OPTIONS.pauseMs);
    scan(accepted);
  };

  const toggleCamera = async () => {
    if (cameraOn) {
      setCameraOn(false);
      setConfirmed(null);
      return;
    }
    const granted = permission?.granted || (await requestPermission()).granted;
    if (granted) {
      stabilizer.reset();
      setCameraOn(true);
    } else {
      setError("L'accès à la caméra a été refusé. Autorisez-le dans les réglages du téléphone.");
    }
  };

  const createLocation = (code: string) => {
    setError(null);
    try {
      apply((current) => addLocation(current, { code }, new Date().toISOString()));
      scan(code);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const reset = () => {
    updateContext(EMPTY_SCAN_CONTEXT);
    setOutcome(null);
    setError(null);
    inputRef.current?.focus();
  };

  const pending = context.pendingCarton ? state.cartons[context.pendingCarton] : undefined;
  const instruction = pending
    ? `${cartonTitle(pending)} sélectionné : scannez son emplacement.`
    : context.activeLocation
      ? `Emplacement ${context.activeLocation} actif : scannez les cartons à y ranger.`
      : 'Scannez un carton ou un emplacement.';

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.instruction}>
        <Text style={styles.instructionText}>{instruction}</Text>
        {context.pendingCarton || context.activeLocation ? (
          <Button label="Terminer" variant="secondary" compact onPress={reset} />
        ) : null}
      </View>

      {cameraOn ? (
        <>
          <View style={styles.camera}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{
                // Formats fiables uniquement : les autres provoquent des lectures fantômes.
                barcodeTypes: ['code128', 'ean13', 'ean8', 'upc_a', 'qr', 'datamatrix'],
              }}
              onBarcodeScanned={onCameraRead}
            />
            {confirmed ? (
              <View style={styles.confirmed} pointerEvents="none">
                <Text style={styles.confirmedMark}>✓</Text>
                <Text style={styles.confirmedCode}>{confirmed}</Text>
              </View>
            ) : (
              <View style={styles.frame} pointerEvents="none" />
            )}
          </View>
          <Text style={styles.cameraHint}>
            Placez un seul code-barres dans le cadre et tenez le téléphone immobile jusqu'à la vibration.
          </Text>
        </>
      ) : null}
      <Button
        label={cameraOn ? 'Arrêter la caméra' : 'Scanner avec la caméra'}
        variant={cameraOn ? 'secondary' : 'primary'}
        onPress={toggleCamera}
      />

      <View style={styles.wedge}>
        <TextInput
          ref={inputRef}
          accessibilityLabel="Code scanné ou saisi"
          style={styles.wedgeInput}
          value={typed}
          onChangeText={setTyped}
          onSubmitEditing={submitTyped}
          // Le champ garde le focus après « Entrée » pour enchaîner les scans à la douchette.
          submitBehavior="submit"
          blurOnSubmit={false}
          placeholder="Douchette, code ou référence"
          placeholderTextColor={colors.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          returnKeyType="done"
        />
        <Button label="Valider" variant="secondary" onPress={submitTyped} disabled={!typed.trim()} />
      </View>

      <ErrorText message={error} />
      {outcome ? (
        <OutcomeCard outcome={outcome} onCreateProduct={setNewProductCode} onCreateLocation={createLocation} />
      ) : null}

      {state.movements.length > 0 ? (
        <View style={styles.history}>
          <SectionTitle>Derniers mouvements</SectionTitle>
          {state.movements.slice(0, 5).map((movement) => {
            const carton = state.cartons[movement.cartonCode];
            return (
              <View key={movement.id} style={styles.historyRow}>
                <Text style={styles.historyCode}>{carton ? cartonTitle(carton) : movement.cartonCode}</Text>
                <Text style={styles.historyText}>{describeMovement(movement)}</Text>
                <Text style={styles.historyDate}>{formatDateTime(movement.at)}</Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <Sheet visible={newProductCode !== null} title="Nouvelle fiche produit" onClose={() => setNewProductCode(null)}>
        {newProductCode !== null ? (
          <CartonForm
            initialCode={newProductCode}
            onCreated={(code) => {
              setNewProductCode(null);
              scan(code);
            }}
          />
        ) : null}
      </Sheet>
    </ScrollView>
  );
}

function OutcomeCard({
  outcome,
  onCreateProduct,
  onCreateLocation,
}: {
  outcome: ScanOutcome;
  onCreateProduct: (code: string) => void;
  onCreateLocation: (code: string) => void;
}) {
  const { state } = useInventory();

  switch (outcome.kind) {
    case 'carton-placed':
    case 'carton-already-there':
    case 'carton-selected': {
      // La fiche est relue dans l'inventaire pour refléter les modifications ultérieures.
      const carton = state.cartons[outcome.carton.code] ?? outcome.carton;
      const placed = outcome.kind !== 'carton-selected';
      return (
        <View style={[styles.card, placed && styles.cardSuccess]}>
          <Text style={styles.cardTitle}>
            {outcome.kind === 'carton-placed'
              ? 'Carton rangé'
              : outcome.kind === 'carton-already-there'
                ? 'Déjà à cet emplacement'
                : 'Fiche produit'}
          </Text>
          <ProductCard carton={carton} />
          {outcome.kind === 'carton-placed' && outcome.from ? (
            <Text style={styles.cardText}>Ancien emplacement : {outcome.from}</Text>
          ) : null}
        </View>
      );
    }
    case 'location-selected': {
      const location = state.locations[outcome.location.code] ?? outcome.location;
      const cartons = cartonsAt(state, location.code);
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Emplacement</Text>
          <LocationTag code={location.code} location={location} large />
          {location.label ? <Text style={styles.cardText}>{location.label}</Text> : null}
          <Text style={styles.cardText}>
            {cartons.length === 0 ? 'Aucun carton ici.' : `${cartons.length} carton(s) :`}
          </Text>
          {cartons.map((carton) => (
            <Text key={carton.code} style={styles.cardListItem}>
              • {cartonTitle(carton)}
              {carton.name ? ` — ${carton.name}` : ''}
            </Text>
          ))}
        </View>
      );
    }
    case 'unknown':
      return (
        <View style={[styles.card, styles.cardWarning]}>
          <Text style={styles.cardTitle}>Code inconnu</Text>
          <Text style={styles.cardBig}>{outcome.code}</Text>
          <Text style={styles.cardText}>Ce code n'est pas encore enregistré. Que représente-t-il ?</Text>
          <View style={styles.cardActions}>
            <View style={styles.grow}>
              <Button label="Créer la fiche produit" onPress={() => onCreateProduct(outcome.code)} />
            </View>
            <View style={styles.grow}>
              <Button label="Nouvel emplacement" variant="secondary" onPress={() => onCreateLocation(outcome.code)} />
            </View>
          </View>
        </View>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  grow: { flex: 1 },
  instruction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radius,
    padding: spacing.md,
  },
  instructionText: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text, lineHeight: 22 },
  camera: {
    height: 260,
    borderRadius: radius,
    overflow: 'hidden',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: { width: '82%', height: 110, borderWidth: 3, borderColor: '#FFFFFF', borderRadius: radius },
  confirmed: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(6, 118, 71, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  confirmedMark: { fontSize: 56, fontWeight: '800', color: '#FFFFFF' },
  confirmedCode: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  cameraHint: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  wedge: { flexDirection: 'row', gap: spacing.sm },
  wedgeInput: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardSuccess: { backgroundColor: colors.successSoft, borderColor: colors.success },
  cardWarning: { backgroundColor: colors.warningSoft, borderColor: colors.warning },
  cardTitle: { fontSize: 13, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  cardBig: { fontSize: 22, fontWeight: '800', color: colors.text },
  cardText: { fontSize: 15, color: colors.text, lineHeight: 21 },
  cardListItem: { fontSize: 15, color: colors.text },
  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  history: { gap: spacing.sm, marginTop: spacing.sm },
  historyRow: { backgroundColor: colors.surface, borderRadius: radius, padding: spacing.md, gap: 2 },
  historyCode: { fontSize: 15, fontWeight: '700', color: colors.text },
  historyText: { fontSize: 15, color: colors.text },
  historyDate: { fontSize: 13, color: colors.muted },
});
