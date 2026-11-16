# Guide d'utilisation

## 1. Préparer la réserve

1. Le **format d'impression** se choisit au moment d'imprimer (ligne « Format d'impression » au-dessus
   du bouton Imprimer) ; un format sur mesure se règle dans l'onglet **Réglages**.
2. Onglet **Emplacements** : créer les emplacements, un par un ou avec **Créer une série**
   (ex. allée `A`, 3 travées, 4 niveaux → `A-01-1` à `A-03-4`). Chaque emplacement reçoit
   automatiquement un **code-barres à 5 chiffres** (10001, 10002…) ; son nom est imprimé au-dessus. Une **couleur de repérage** peut
   être choisie dans la palette (par exemple une couleur par allée) ; elle s'affiche partout où
   l'emplacement apparaît et se modifie depuis sa fiche.
3. **Imprimer ces N étiquettes**, puis coller chaque étiquette sur son étagère.

## 2. Créer la fiche d'un carton

Onglet **Cartons** → **Nouveau carton** : saisir la **référence produit** et le **nom du produit**.
Le code-barres est généré automatiquement ; imprimer l'étiquette depuis la fiche.

Si le carton porte déjà un code-barres (fabricant, fournisseur), le scanner depuis l'onglet Scanner
puis choisir « Créer la fiche produit » : ce code-barres est alors relié à la fiche.

Une fois la fiche créée, l'application propose de **choisir son emplacement** dans la liste (ou de
le scanner ensuite). L'emplacement se change aussi depuis la fiche du carton.

Quand on scanne un carton, l'application affiche sa fiche — référence, nom, quantité, emplacement —
et non le numéro du code-barres. On peut aussi taper la référence dans le champ de l'onglet Scanner.

## 3. Ranger (relier un carton à un emplacement)

**En scannant**, onglet **Scanner** :

- **Un carton** : scanner le carton, puis l'emplacement.
- **Plusieurs cartons au même endroit** : scanner l'emplacement, puis chaque carton ; appuyer sur
  **Terminer** à la fin.

**Sans scanner**, en touchant l'écran :

- après un scan, bouton **Ranger dans un emplacement** / **Changer d'emplacement** sur la fiche ;
- dans la fiche d'un carton (onglet Cartons ou recherche), même bouton en haut de la fiche ;
- dans la fiche d'un emplacement, bouton **Ajouter un carton ici**.

Déplacer un carton se fait de la même manière : le dernier emplacement choisi fait foi.

## 4. Retrouver un carton

La **barre de recherche** en haut de l'écran est disponible partout : taper une partie de la
référence, du nom du produit, du code-barres ou de l'emplacement. Les résultats listent les produits
(avec leur emplacement) et les emplacements ; toucher un résultat ouvre sa fiche.

On peut aussi scanner un carton pour afficher son emplacement, ou un emplacement pour voir ce qu'il
contient.

## Éviter les doublons

- Un code-barres déjà enregistré n'est jamais recréé : en le scannant, l'application affiche la
  fiche existante et son emplacement.
- Dans le formulaire de création, un code-barres déjà connu est signalé avec sa fiche, et la
  création est bloquée ; une référence déjà en stock est signalée avec l'emplacement des cartons
  concernés (plusieurs cartons d'un même produit restent possibles).
- Un même code lu en EAN-13 ou en UPC-A (avec ou sans zéro devant) est reconnu comme identique.

## Matériel

- **Caméra du téléphone** : bouton « Scanner avec la caméra ». Placer un seul code-barres dans le
  cadre et tenir le téléphone immobile : le code n'est validé qu'après plusieurs lectures
  identiques (vibration et écran vert), puis la lecture marque une courte pause.
- **Douchette ou terminal d'entrepôt** : l'appairer en mode clavier (HID). Le champ de l'onglet
  Scanner reçoit le code et le valide automatiquement (la douchette doit envoyer « Entrée » après
  le code, ce qui est le réglage d'usine habituel).
- **Étiqueteuse** : « Imprimer » utilise l'impression du téléphone (AirPrint sur iPhone, service
  d'impression du fabricant sur Android). Certaines petites étiqueteuses Bluetooth n'impriment que
  depuis leur propre application : utiliser alors le bouton **PDF** et ouvrir le fichier dans cette
  application.

## Sauvegarde

Les données restent sur le téléphone. **Réglages → Exporter une sauvegarde** crée un fichier à
conserver (e-mail, cloud…) ; **Restaurer une sauvegarde** le recharge, y compris sur un autre
téléphone.
