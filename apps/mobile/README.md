# Mini Entrepôt — application mobile

Application Expo (React Native + TypeScript). Voir le [README principal](../../README.md) pour la
présentation et [docs/](../../docs) pour le guide d'utilisation et l'architecture.

## Scripts

- `npm start` — serveur de développement Expo (QR code pour Expo Go)
- `npm run android` / `npm run ios` — ouvrir sur un appareil ou un émulateur
- `npm run web` — ouvrir dans le navigateur
- `npm test` — tests unitaires de `src/domain`
- `npm run typecheck` — contrôle des types

## Organisation du code

- `src/domain` — logique métier pure et testée (codes-barres, inventaire, scans, étiquettes)
- `src/state` — état global et enregistrement local
- `src/services` — impression et sauvegarde (accès aux fonctions du téléphone)
- `src/ui` — composants et thème partagés
- `src/screens` — les quatre écrans : Scanner, Cartons, Emplacements, Réglages
