# Sécurité

Aucun logiciel ne peut être garanti « sans vulnérabilité » ; ce document décrit ce qui est fait pour
réduire les risques et ce qui reste à la charge de l'utilisateur.

## Mesures en place

- **Aucun serveur, aucun compte, aucun réseau.** Les données restent sur le téléphone. L'APK Android
  ne demande pas la permission `INTERNET` : l'application ne peut rien envoyer à l'extérieur.
- **Permissions minimales** : caméra (scan) et vibreur uniquement. Micro et stockage externe sont
  explicitement retirés (`app.json` → `android.blockedPermissions`).
- **Dépendances** : `npm audit` ne signale aucune vulnérabilité connue, et il est rejoué à chaque
  construction (un échec bloque la publication de l'APK). Le squelette d'API inutilisé et Jest, qui
  apportaient des alertes, ont été retirés.
- **Données saisies ou scannées** : les codes sont limités aux caractères ASCII imprimables et à
  24 caractères ; les textes sont échappés avant d'être insérés dans le HTML des étiquettes.
- **Fichiers de sauvegarde** : traités comme non fiables. Taille limitée à 5 Mo, chaque champ est
  revalidé et reconstruit, les champs inconnus sont ignorés (`parseState`, couvert par des tests).
- **Sauvegarde Android automatique désactivée** (`allowBackup: false`) : l'inventaire n'est pas copié
  vers le cloud à l'insu de l'utilisateur.

## Limites connues

- **Signature de l'APK** : l'APK publié est signé avec la clé de test générée pendant la
  construction, ce qui suffit pour une installation manuelle. Pour une diffusion sur le Play Store,
  ou pour garantir que les mises à jour viennent bien de vous, il faut configurer votre propre clé
  de signature.
- **Données non chiffrées par l'application** : elles sont protégées par le cloisonnement et le
  chiffrement du téléphone. Verrouillez le téléphone par code ou biométrie.
- **Fichiers de sauvegarde exportés** : ils contiennent l'inventaire en clair ; ne les partagez
  qu'avec des personnes de confiance.
- **Mode développement (Expo Go)** : le serveur de développement est accessible sur le réseau local.
  À n'utiliser que sur un Wi-Fi de confiance ; l'usage courant passe par l'APK.

## Signaler un problème

Ouvrez un ticket (« issue ») sur le dépôt GitHub en décrivant le problème et la manière de le
reproduire.
