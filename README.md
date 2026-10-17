# 🎲🍿 Soirée

Application (APK Android + site web) pour cataloguer tes **jeux de société, films et séries**, et choisir quoi faire ce soir selon **qui est là**.

## Ce que fait l'app

| Section | Fonctions |
|---|---|
| **Collection** | Scan photo (étagère, pile de DVD, liste écrite) → Gemini reconnaît les titres et découpe chaque boîte. Vue **Étagère** (classée par type, joueurs, durée, complexité / genre, décennie, ambiance, format) ou **Inventaire** (tri, recherche). Liste de souhaits / « à voir ». |
| **Fiches** | Remplies automatiquement par l'IA : joueurs, durée, âge, complexité, **règles complètes** (but, mise en place, tour, fin, conseils, variantes), fun facts. Films/séries : synopsis, réalisateur, acteurs, durée, saisons, + affiches officielles via TMDB. Questions libres à l'IA (« comment ça marche à 2 ? »). |
| **Profils** | Un profil par personne : goûts (👍 ❤️ 👎 🚫), complexité, durée idéale, notes ⭐ qui affinent le profil. Score « Qui aimerait ? » sur chaque titre. |
| **Mélange** | 2+ profils, glissière en % (ex. 70 % Chris / 30 % conjointe) → classement + avis de l'IA + 3 découvertes hors collection. |
| **Soirée entre amis** | Nombre de personnes + temps dispo → quiz (généré par l'IA ou classique) passé de main en main → meilleurs jeux/films pour le groupe. Les invités peuvent être gardés comme profils. |
| **Outils** | Dés (d4 → d100, pièce, dés personnalisés, verrouillage), feuille de score, compteurs personnalisables, minuterie/sablier, premier joueur (doigts sur l'écran), équipes au hasard. |
| **Bilingue FR/EN** | Toute l'interface, les quiz, les fiches IA (générées dans les deux langues), les questions et suggestions. Sélecteur FR/EN sur l'accueil et dans Réglages ; bouton « Traduire » pour les fiches plus anciennes. |
| **Thème** | Sombre (par défaut), clair ou selon le système — dans Réglages. |
| **Infos gratuites** | Affiches/saisons/diffuseur des séries via **TVmaze**, images et résumés des films et jeux via **Wikipédia** — sans clé. Liens IMDb, bande-annonce, « où le voir » (JustWatch), BoardGameGeek, vidéo « comment jouer ». TMDB optionnel. |
| **Journal & prêts** | Noter chaque partie (joueurs, gagnants, scores) ou visionnement, classement des victoires, les plus joués ; suivre à qui on a prêté un jeu ou un DVD. |
| **Soirée cinéma** | Temps restant avant le dodo → film ou épisodes ? + minuterie. |
| **Comptes** | Google ou courriel (Firebase). Un **foyer** partagé : ta conjointe rejoint avec un code et voit la même collection. Mode local sans compte possible. |

---

## Installation (une seule fois, ~30 min)

### 1. GitHub
1. Crée un dépôt **public** nommé `soiree` (GitHub Pages gratuit exige un dépôt public — aucun secret n'est dans le code).
2. Téléverse tout le contenu de ce dossier (glisser-déposer sur github.com, ou via Claude Code).
3. **Settings → Pages → Source : GitHub Actions**.

### 2. Firebase (gratuit, plan Spark)
1. [console.firebase.google.com](https://console.firebase.google.com) → **Ajouter un projet** (« soiree »).
2. **Authentication → Commencer** → active **Google** et **Adresse e-mail/Mot de passe**.
   Dans *Paramètres → Domaines autorisés*, ajoute `TONUSER.github.io`.
3. **Firestore Database → Créer** (mode production, région `northamerica-northeast1` Montréal).
   Onglet **Règles** : colle le contenu de `firestore.rules` → Publier.
4. **Paramètres du projet → Tes applications → Web (</>)** → copie les 6 valeurs de `firebaseConfig`.
5. **Ajouter une application → Android** : nom du package `ca.chris.soiree`.
   Ajoute les empreintes **SHA-1 et SHA-256** du fichier `SECRETS-APK-a-garder-prive.txt`.
   Télécharge `google-services.json`.

### 3. Secrets GitHub
*Settings → Secrets and variables → Actions → New repository secret* :

| Nom | Valeur |
|---|---|
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |
| `GOOGLE_SERVICES_JSON_BASE64` | `google-services.json` encodé en base64 (voir ci-dessous) |
| `KEYSTORE_BASE64` | la longue ligne du fichier secrets |
| `KEYSTORE_PASSWORD` | le mot de passe du fichier secrets |

Encoder `google-services.json` :
- **Windows (PowerShell)** : `[Convert]::ToBase64String([IO.File]::ReadAllBytes("google-services.json")) | Set-Clipboard`
- **Mac** : `base64 -i google-services.json | pbcopy`

### 4. Lancer la compilation
Onglet **Actions → APK + site web → Run workflow** (ou tout simplement pousser un changement).
- 📱 **APK** : onglet *Releases* → `Soiree.apk` (à installer sur Android, autoriser « sources inconnues »).
- 🌐 **Site** : `https://TONUSER.github.io/soiree/`

### 5. Dans l'app
1. **Réglages → clé Gemini** ([aistudio.google.com/apikey](https://aistudio.google.com/apikey), gratuite) → *Tester et enregistrer*.
2. Optionnel : **clé TMDB** ([themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)) pour les vraies affiches et la distribution exacte.
3. **Profils → Foyer** : partage le code à ta conjointe ; elle se connecte puis *Rejoindre un autre foyer*.

> Les clés Gemini/TMDB sont enregistrées dans le foyer (Firestore, lisible seulement par ses membres). Le modèle par défaut est `gemini-flash-latest` (toujours le Flash le plus récent) ; un autre peut être choisi dans Réglages.

---

## Développement (Claude Code)
```bash
npm install
cp .env.example .env      # remplir avec la config Firebase (ou laisser vide = mode local)
npm run dev               # http://localhost:5173
npm run build             # vérifie les types + construit dist/
npm run build:preview     # démo autonome en un seul fichier HTML (dist-preview/)
```

### Structure
```
src/
  lib/       store (Firebase + local), gemini, tmdb, scoring (compatibilité/mélange), image (recadrage), vocab, quizBank, demo
  screens/   Home, Library, ItemDetail, Scan, AddManual, Suggest, Blend, Party, Tools, Profiles, Settings, Login
  components/ui.tsx
firestore.rules               règles de sécurité
.github/workflows/build.yml   APK signé + site GitHub Pages
assets/                       icône et écran de démarrage
```

### Notes techniques
- Stack : React 18 + Vite + TypeScript, Capacitor 7 (Android), Firebase Auth/Firestore, API Gemini (REST), TMDB.
- Images : vignettes recadrées depuis tes photos (JPEG compressé, stockées dans Firestore — pas besoin de Firebase Storage payant).
- Connexion Google dans l'APK : plugin natif `@capacitor-firebase/authentication` ; exige `google-services.json` + empreintes SHA de la clé de signature.
- BoardGameGeek n'est pas utilisé : son API exige depuis 2025 une application approuvée et un jeton. Gemini remplit les fiches de jeux.

---
## Déploiement actuel
- Firebase : projet `soiree-59635` (Auth Google + courriel, Firestore Montréal, règles publiées).
- Site : https://themauritian1996.github.io/soiree/
- APK : https://github.com/Themauritian1996/soiree/releases/latest
- Signature : clé CI `android-config/soiree-ci.p12` (empreintes enregistrées dans Firebase). Pour une clé privée, ajouter les secrets `KEYSTORE_BASE64` / `KEYSTORE_PASSWORD` et leurs empreintes SHA dans Firebase.
