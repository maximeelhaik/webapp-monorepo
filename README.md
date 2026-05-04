# Architecture Monorepo IA 🚀

Bienvenue dans le projet **Template d'Application IA** refactorisé en **Monorepo** avec des espaces de travail (NPM Workspaces). Cette architecture vous permet de gérer et de développer plusieurs applications indépendantes dans le même dépôt tout en partageant un socle commun de fonctions essentielles.

---

## 📁 Structure du Monorepo

```text
├── apps/
│   └── app1/            # Première application complète (Précédente application principale)
│       ├── api/         # Routes Serverless (Vercel Edge) de l'application
│       ├── src/         # Code source frontend de l'application
│       ├── index.html   # Fichier HTML pour Vite
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   └── core/            # Socle Commun (Partagé entre les applications)
│       ├── src/
│       │   ├── theme.ts # Configuration centrale des thèmes
│       │   └── gemini.ts # Helper pour l'initialisation et l'appel à l'API Gemini
│       └── package.json
│
├── api/                 # Proxy de l'API à la racine (Forwarde les requêtes vers apps/app1)
├── package.json         # Configuration racine des espaces de travail (Workspaces)
├── tsconfig.json        # Configuration TypeScript globale avec alias
└── vercel.json          # Configuration Vercel de la racine pour app1
```

---

## 🛠️ Gestion des Applications et des Packages

### 1. Socle Commun (`packages/core`)
Le dossier `packages/core` gère toutes les fonctions communes, types, configurations de thèmes et les appels d'API (ex: initialisation du client `@google/genai`). Pour importer le socle commun dans une application :
```ts
import { getAiInstance, THEMES } from "@new-app-ia/core";
```

### 2. Ajouter une nouvelle application
Pour ajouter un nouveau site/application dans le monorepo :
1. Créez un nouveau dossier dans `apps/` (ex: `apps/app2`).
2. Ajoutez un fichier `package.json` en y listant `@new-app-ia/core` dans vos `dependencies`.
3. Créez le dossier `src/` avec vos composants et pages spécifiques.
4. Créez votre fichier `vite.config.ts` en pointant les alias vers `@new-app-ia/core` de la même manière que pour `app1`.

---

## 🚀 Développement Local & Déploiement

### Commandes Globales (Depuis la racine)

#### Démarrer en Développement
```bash
npm run dev
```
Démarre la première application (`app1`) sur `http://localhost:3000`.

#### Tester localement avec Vercel Dev
```bash
npx vercel dev
```
Exécute la CLI Vercel en local à la racine pour simuler l'environnement de production.

#### Compiler l'Application Principale
```bash
npm run build
```
Compile l'application `app1` dans `apps/app1/dist`.

---

## 🤖 Guide pour l'IA (Pour de futurs assistants)

> [!NOTE]
> **Instructions pour l'assistant IA lisant ce projet :**
> *   **Modèles d'IA :** Utilisez le modèle Gemini défini dans `.env` (variable `GEMINI_MODEL`).
> *   **Streaming :** Toutes les réponses de l'IA longues doivent utiliser la logique de **Streaming** du socle commun (`packages/core`).
> *   **Gestion de code :** Les éléments réutilisables ou fonctions globales de backend / frontend doivent être déclarés dans `packages/core/` pour éviter les duplications.
