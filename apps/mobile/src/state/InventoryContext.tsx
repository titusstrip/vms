/**
 * État global de l'inventaire : chargé depuis le stockage local au démarrage,
 * puis enregistré automatiquement après chaque modification.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { createEmptyState, parseState, serializeState } from '../domain/inventory';
import { InventoryState } from '../domain/types';

const STORAGE_KEY = 'vms.inventory.v1';

interface InventoryContextValue {
  state: InventoryState;
  /** Faux tant que les données enregistrées n'ont pas été relues. */
  ready: boolean;
  /**
   * Applique une fonction métier pure à l'état courant. Si elle lève une
   * DomainError, l'état reste inchangé et l'erreur remonte à l'appelant.
   */
  apply: (change: (state: InventoryState) => InventoryState) => InventoryState;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<InventoryState>(createEmptyState);
  const [ready, setReady] = useState(false);
  const current = useRef(state);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (cancelled || !saved) {
          return;
        }
        current.current = parseState(saved);
        setState(current.current);
      })
      .catch((error) => console.warn('Lecture des données impossible', error))
      .finally(() => {
        if (!cancelled) {
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const apply = useCallback<InventoryContextValue['apply']>((change) => {
    const next = change(current.current);
    if (next !== current.current) {
      current.current = next;
      setState(next);
      AsyncStorage.setItem(STORAGE_KEY, serializeState(next)).catch((error) =>
        console.warn('Enregistrement des données impossible', error),
      );
    }
    return next;
  }, []);

  const value = useMemo(() => ({ state, ready, apply }), [state, ready, apply]);
  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory(): InventoryContextValue {
  const value = useContext(InventoryContext);
  if (!value) {
    throw new Error('useInventory doit être utilisé dans un InventoryProvider.');
  }
  return value;
}
