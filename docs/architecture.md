# Architecture

## Vue d'ensemble

L'application est autonome : toutes les données vivent sur le téléphone (AsyncStorage) et aucune
connexion n'est nécessaire. Il n'y a pas de serveur : le squelette d'API du starter, inutilisé, a été
retiré pour réduire la surface d'attaque et le nombre de dépendances.

## Couches (`apps/mobile/src`)

| Dossier    | Rôle                                                                                  |
| ---------- | ------------------------------------------------------------------------------------- |
| `domain`   | Logique métier pure, sans React ni accès au téléphone. Couverte par des tests (`node --test`). |
| `state`    | `InventoryContext` : état en mémoire, chargement et enregistrement automatiques.       |
| `services` | Impression (`expo-print`), partage PDF, export / import de sauvegarde.                 |
| `ui`       | Composants réutilisables, thème, boîtes de dialogue compatibles mobile et web.         |
| `screens`  | Scanner, Cartons, Emplacements, Réglages.                                              |

Les écrans ne modifient jamais l'état directement : ils passent une fonction du domaine à
`apply(...)`. Si la règle métier échoue, elle lève une `DomainError` dont le message est affiché, et
l'état reste inchangé.

## Modèle de données

- **Emplacement** : `code`, `label`, `color` (clé de la palette `LOCATION_COLORS`, ou `null`).
- **Carton** (fiche produit) : `code` (valeur du code-barres), `reference` (référence produit,
  affichée en priorité), `name`, `quantity`, `locationCode` (ou `null` si non rangé).
- **Mouvement** : `cartonCode`, `from`, `to`, `at` — les 1000 derniers sont conservés.

Le code sert d'identifiant et il est unique tous types confondus : un scan désigne donc sans
ambiguïté soit un carton, soit un emplacement. Les codes sont normalisés en majuscules.

## Codes-barres

`domain/code128.ts` encode en **Code 128** (jeu B, ou jeu C plus compact pour les références
numériques de longueur paire). C'est le format 1D standard en logistique, lu par toutes les
douchettes et par la caméra. La même géométrie de barres sert à l'aperçu à l'écran
(`react-native-svg`) et à l'impression (SVG dans le HTML de l'étiquette).

## Enchaînement des scans

`domain/scanFlow.ts` est une petite machine à états :

- carton puis emplacement → le carton est rangé, puis retour à zéro ;
- emplacement puis cartons → chaque carton scanné est rangé dans cet emplacement (rangement en
  série) jusqu'à « Terminer » ;
- code inconnu → proposition de créer un carton ou un emplacement avec ce code.

Les lectures de la caméra passent d'abord par `domain/scanStabilizer.ts` : un code n'est validé
qu'après plusieurs lectures identiques rapprochées (3 pour un code connu, 6 pour un code inconnu),
puis la lecture est suspendue 1,5 s et le même code n'est pas relu tant qu'il reste dans le champ.
Cela élimine les lectures fantômes et les hésitations entre plusieurs codes-barres visibles.

La caméra et la douchette alimentent ensuite la même fonction `handleScan`. Une douchette en mode clavier
tape le code dans le champ de saisie puis envoie « Entrée » ; le champ garde le focus pour enchaîner.

## Impression

`domain/labels.ts` produit un document HTML avec une étiquette par page, à la taille du rouleau
(`@page { size: … }`). `services/printing.ts` l'envoie au système d'impression du téléphone
(AirPrint, services d'impression Android, boîte d'impression du navigateur) ou en fait un PDF à
partager vers l'application du fabricant de l'étiqueteuse.

## Pistes d'évolution

- synchronisation multi-téléphones (demandera un serveur et une authentification) ;
- impression directe Bluetooth (ZPL / ESC-POS) pour les étiqueteuses sans pilote système ;
- photos de cartons, inventaire tournant, export CSV.
