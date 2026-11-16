/** Export et import d'une sauvegarde complète de l'inventaire (fichier JSON). */
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { parseState, serializeState } from '../domain/inventory';
import { InventoryState } from '../domain/types';

function backupFileName(now: Date): string {
  return `mini-entrepot-${now.toISOString().slice(0, 10)}.json`;
}

export async function exportBackup(state: InventoryState): Promise<void> {
  const json = serializeState(state);
  const name = backupFileName(new Date());
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, name);
  if (file.exists) {
    file.delete();
  }
  file.create();
  file.write(json);
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Sauvegarde' });
}

/** Renvoie l'inventaire lu dans le fichier choisi, ou null si l'utilisateur annule. */
export async function pickBackup(): Promise<InventoryState | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || result.assets.length === 0) {
    return null;
  }
  const asset = result.assets[0];
  const json = Platform.OS === 'web' && asset.file ? await asset.file.text() : await new File(asset.uri).text();
  return parseState(json);
}
