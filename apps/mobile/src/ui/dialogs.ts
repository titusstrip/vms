/** Confirmations et messages, compatibles mobile et web. */
import { Alert, Platform } from 'react-native';

import { DomainError } from '../domain/types';

export function confirm(title: string, message: string, confirmLabel = 'Confirmer'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      { onDismiss: () => resolve(false) },
    );
  });
}

export function notify(title: string, message: string): void {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

/** Message affichable pour une erreur, métier ou technique. */
export function errorMessage(error: unknown): string {
  if (error instanceof DomainError) {
    return error.message;
  }
  console.warn(error);
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue.';
}
