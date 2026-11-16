/**
 * Écran de scan : caméra du téléphone ou douchette (Bluetooth/USB, qui se
 * comporte comme un clavier et valide par « Entrée »).
 */
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { ComponentRef, useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, Vibration, View } from 'react-native';

import { addCarton, addLocation, cartonsAt } from '../domain/inventory';
import { EMPTY_SCAN_CONTEXT, ScanContext, ScanOutcome, handleScan } from '../domain/scanFlow';
import { useInventory } from '../state/InventoryContext';
import { Badge, Button, ErrorText, SectionTitle } from '../ui/components';
import { errorMessage } from '../ui/dialogs';
import { describeMovement, formatDateTime } from '../ui/format';
import { colors, radius, spacing } from '../ui/theme';

/** Délai pendant lequel la caméra ignore une relecture du même code. */
const SAME_CODE_DELAY_MS = 2500;

export function ScanScreen() {
  const { state, apply } = useInventory();
  const [context, setContext] = useState<ScanContext>(EMPTY_SCAN_CONTEXT);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const contextRef = useRef(context);
  const lastCameraScan = useRef({ code: '', at: 0 });

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

  const onCameraScan = ({ data }: { data: string }) => {
    const now = Date.now();
    const last = lastCameraScan.current;
    if (data === last.code && now - last.at < SAME_CODE_DELAY_MS) {
      return;
    }
    lastCameraScan.current = { code: data, at: now };
    scan(data);
  };

  const toggleCamera = async () => {
    if (cameraOn) {
      setCameraOn(false);
      return;
    }
    const granted = permission?.granted || (await requestPermission()).granted;
    if (granted) {
      setCameraOn(true);
    } else {
      setError("L'accès à la caméra a été refusé. Autorisez-le dans les réglages du téléphone.");
    }
  };

  const createFromUnknown = (kind: 'carton' | 'location', code: string) => {
    setError(null);
    try {
      const now = new Date().toISOString();
      apply((current) => (kind === 'carton' ? addCarton(current, { code }, now) : addLocation(current, { code }, now)));
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

  const instruction = context.pendingCarton
    ? `Carton ${context.pendingCarton} sélectionné : scannez son emplacement.`
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
        <View style={styles.camera}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['code128', 'code39', 'code93', 'ean13', 'ean8', 'upc_a', 'upc_e', 'itf14', 'codabar', 'qr', 'datamatrix'],
            }}
            onBarcodeScanned={onCameraScan}
          />
          <View style={styles.aim} pointerEvents="none" />
        </View>
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
          placeholder="Douchette ou saisie manuelle"
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
        <OutcomeCard outcome={outcome} onCreate={createFromUnknown} />
      ) : null}

      {state.movements.length > 0 ? (
        <View style={styles.history}>
          <SectionTitle>Derniers mouvements</SectionTitle>
          {state.movements.slice(0, 5).map((movement) => (
            <View key={movement.id} style={styles.historyRow}>
              <Text style={styles.historyCode}>{movement.cartonCode}</Text>
              <Text style={styles.historyText}>{describeMovement(movement)}</Text>
              <Text style={styles.historyDate}>{formatDateTime(movement.at)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function OutcomeCard({
  outcome,
  onCreate,
}: {
  outcome: ScanOutcome;
  onCreate: (kind: 'carton' | 'location', code: string) => void;
}) {
  const { state } = useInventory();

  switch (outcome.kind) {
    case 'carton-placed':
      return (
        <View style={[styles.card, styles.cardSuccess]}>
          <Text style={styles.cardTitle}>Carton rangé</Text>
          <Text style={styles.cardBig}>
            {outcome.carton.code} → {outcome.to}
          </Text>
          {outcome.carton.description ? <Text style={styles.cardText}>{outcome.carton.description}</Text> : null}
          {outcome.from ? <Text style={styles.cardText}>Ancien emplacement : {outcome.from}</Text> : null}
        </View>
      );
    case 'carton-already-there':
      return (
        <View style={[styles.card, styles.cardSuccess]}>
          <Text style={styles.cardTitle}>Déjà en place</Text>
          <Text style={styles.cardBig}>
            {outcome.carton.code} est déjà en {outcome.location}
          </Text>
        </View>
      );
    case 'carton-selected': {
      const carton = state.cartons[outcome.carton.code] ?? outcome.carton;
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Carton</Text>
          <Text style={styles.cardBig}>{carton.code}</Text>
          {carton.description ? <Text style={styles.cardText}>{carton.description}</Text> : null}
          {carton.quantity !== null ? <Text style={styles.cardText}>Quantité : {carton.quantity}</Text> : null}
          {carton.locationCode ? (
            <Badge label={`Emplacement : ${carton.locationCode}`} tone="success" />
          ) : (
            <Badge label="Non rangé" tone="warning" />
          )}
        </View>
      );
    }
    case 'location-selected': {
      const cartons = cartonsAt(state, outcome.location.code);
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Emplacement</Text>
          <Text style={styles.cardBig}>{outcome.location.code}</Text>
          {outcome.location.label ? <Text style={styles.cardText}>{outcome.location.label}</Text> : null}
          <Text style={styles.cardText}>
            {cartons.length === 0 ? 'Aucun carton ici.' : `${cartons.length} carton(s) :`}
          </Text>
          {cartons.map((carton) => (
            <Text key={carton.code} style={styles.cardListItem}>
              • {carton.code}
              {carton.description ? ` — ${carton.description}` : ''}
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
              <Button label="Nouveau carton" onPress={() => onCreate('carton', outcome.code)} />
            </View>
            <View style={styles.grow}>
              <Button label="Nouvel emplacement" variant="secondary" onPress={() => onCreate('location', outcome.code)} />
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
  camera: { height: 240, borderRadius: radius, overflow: 'hidden', backgroundColor: '#000', justifyContent: 'center' },
  aim: { height: 2, marginHorizontal: spacing.xl, backgroundColor: '#F04438' },
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
  historyRow: {
    backgroundColor: colors.surface,
    borderRadius: radius,
    padding: spacing.md,
    gap: 2,
  },
  historyCode: { fontSize: 15, fontWeight: '700', color: colors.text },
  historyText: { fontSize: 15, color: colors.text },
  historyDate: { fontSize: 13, color: colors.muted },
});
