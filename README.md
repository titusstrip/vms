# Mini Entrepôt

Application mobile de gestion de mini-entrepôt (réserve, box, arrière-boutique) : on étiquette les
cartons et les emplacements avec des codes-barres, puis on scanne pour savoir où se trouve chaque
carton, sans perdre de temps à chercher.

## Ce que fait l'application

- **Créer des codes-barres** pour les cartons (référence automatique `CTN-000001` ou référence libre)
  et pour les emplacements (à l'unité ou en série : `A-01-1`, `A-01-2`…).
- **Imprimer les étiquettes** sur une étiqueteuse, au format du rouleau (40 × 30, 50 × 30, 62 × 29,
  100 × 50, 100 × 150 mm ou sur mesure), une étiquette par page.
- **Scanner** avec la caméra du téléphone ou avec n'importe quelle douchette / terminal d'entrepôt
  en mode clavier (Bluetooth ou USB).
- **Ranger** : scanner un carton puis son emplacement, ou un emplacement puis tous les cartons à y
  mettre.
- **Retrouver** un carton par référence, contenu ou emplacement, avec l'historique de ses mouvements.
- **Sauvegarder / restaurer** l'inventaire dans un fichier.

Les données sont enregistrées sur le téléphone ; l'application fonctionne sans réseau.

## Démarrage

```bash
npm install
npm run dev:mobile
```

Scannez ensuite le QR code affiché avec l'application **Expo Go** (Android ou iOS), ou appuyez sur
`w` pour ouvrir la version web dans un navigateur.

## Vérifications

```bash
npm test          # tests de la logique métier
npm run typecheck # contrôle des types TypeScript
```

## Structure

- `apps/mobile` — application Expo (React Native + TypeScript)
- `apps/api` — squelette d'API NestJS, non utilisé pour l'instant (réservé à une future
  synchronisation entre plusieurs téléphones)
- `docs/` — [guide d'utilisation](docs/guide-utilisation.md) et [architecture](docs/architecture.md)
