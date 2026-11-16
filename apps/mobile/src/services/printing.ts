/**
 * Impression des étiquettes via le système d'impression du téléphone
 * (AirPrint sur iOS, services d'impression sur Android, boîte de dialogue du
 * navigateur sur le web), ou export PDF vers l'application du fabricant.
 */
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { LabelItem, buildLabelsHtml, labelSizeInPoints } from '../domain/labels';
import { DomainError, LabelSettings } from '../domain/types';

function assertNotEmpty(items: LabelItem[]): void {
  if (items.length === 0) {
    throw new DomainError('Aucune étiquette à imprimer.');
  }
}

/** Sur le web, on imprime le document d'étiquettes dans un cadre invisible. */
function printHtmlOnWeb(html: string): void {
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.srcdoc = html;
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 60_000);
  };
  document.body.appendChild(frame);
}

export async function printLabels(items: LabelItem[], settings: LabelSettings): Promise<void> {
  assertNotEmpty(items);
  const html = buildLabelsHtml(items, settings);
  if (Platform.OS === 'web') {
    printHtmlOnWeb(html);
    return;
  }
  await Print.printAsync({ html, ...labelSizeInPoints(settings) });
}

/** Génère un PDF (une étiquette par page) et ouvre la feuille de partage. */
export async function shareLabelsPdf(items: LabelItem[], settings: LabelSettings): Promise<void> {
  assertNotEmpty(items);
  if (Platform.OS === 'web') {
    // Le navigateur propose « Enregistrer au format PDF » dans sa boîte d'impression.
    printHtmlOnWeb(buildLabelsHtml(items, settings));
    return;
  }
  const { uri } = await Print.printToFileAsync({
    html: buildLabelsHtml(items, settings),
    ...labelSizeInPoints(settings),
  });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: 'Étiquettes',
  });
}
