# Mini Entrepôt

Application mobile de gestion de mini-entrepôt (réserve, box, arrière-boutique) : on étiquette les
cartons et les emplacements avec des codes-barres, puis on scanne pour savoir où se trouve chaque
carton, sans perdre de temps à chercher.

## Ce que fait l'application

- **Fiches produit** : chaque carton a une référence et un nom de produit, affichés quand on scanne
  son code-barres (généré automatiquement, ou code déjà présent sur le carton).
- **Emplacements** créés à l'unité ou en série (`A-01-1`, `A-01-2`…), avec une couleur de repérage.
- **Imprimer les étiquettes** sur une étiqueteuse, au format du rouleau (40 × 30, 50 × 30, 62 × 29,
  100 × 50, 100 × 150 mm ou sur mesure), une étiquette par page.
- **Scanner** avec la caméra du téléphone (lecture confirmée avant validation) ou avec n'importe quelle douchette / terminal d'entrepôt
  en mode clavier (Bluetooth ou USB).
- **Ranger** : scanner un carton puis son emplacement, ou un emplacement puis tous les cartons à y
  mettre.
- **Retrouver** un carton ou un emplacement avec la barre de recherche globale, sans créer de
  doublon : un code-barres déjà connu renvoie à sa fiche et à son emplacement.
- **Sauvegarder / restaurer** l'inventaire dans un fichier.

Les données sont enregistrées sur le téléphone ; l'application fonctionne sans réseau.

## Installer l'application

### Sur un téléphone Android (le plus simple)

1. Sur le téléphone, ouvrir la page **Releases** du dépôt GitHub et télécharger `mini-entrepot.apk`
   (version « Mini Entrepôt — dernière version Android »).
2. Ouvrir le fichier téléchargé et accepter l'installation (Android demande d'autoriser
   l'installation depuis le navigateur la première fois).

L'APK est reconstruit automatiquement à chaque modification du code (voir
`.github/workflows/android.yml`).

### En mode développement (Android ou iPhone, avec un ordinateur)

1. Installer [Node.js](https://nodejs.org) (version LTS) sur l'ordinateur.
2. Télécharger le projet (bouton **Code → Download ZIP** sur GitHub) et le décompresser.
3. **Windows** : double-cliquer sur `lancer.bat` dans le dossier décompressé.
   **Mac / Linux** : ouvrir un terminal **dans ce dossier**, puis `npm ci` et `npm run dev:mobile`.
4. Installer **Expo Go** sur le téléphone et scanner le QR code affiché (téléphone et ordinateur sur
   le même Wi-Fi).

> Les commandes `npm` doivent être lancées dans le dossier du projet (celui qui contient
> `package.json`), sinon npm répond « Could not read package.json ».

## Vérifications

```bash
npm test          # tests de la logique métier
npm run typecheck # contrôle des types TypeScript
npm audit         # vulnérabilités connues des dépendances
```

## Structure

- `apps/mobile` — application Expo (React Native + TypeScript)
- `docs/` — [guide d'utilisation](docs/guide-utilisation.md), [architecture](docs/architecture.md)
  et [sécurité](docs/securite.md)
- `.github/workflows/android.yml` — tests, audit et construction de l'APK
- `lancer.bat` — lancement en un double-clic sous Windows
