# Constellation — Audit Contenu v2
## Raw Elegance / Scientific · 2026

Références de positionnement : Claude, OpenAI, Perplexity, Vercel.

---

## 1. Diagnostic du ton actuel

### Ce qui fonctionne
- L'identité visuelle (ambre, fond sombre, typographie italique editoriale) est déjà dans la bonne direction.
- Le concept de "cartographie sémantique" est porteur et différenciant.
- L'animation de boot ajoute un moment de rituel appréciable avant l'entrée dans l'outil.

### Ce qui pose problème
L'usage de **faux code** (`CONNEXE OS v2.6`, `COORD //`, `SYS.READY // SEMANTIC.ENGINE`, `NODES: 14`, `DEPTH: 3`) produit l'effet inverse de la crédibilité visée. Ce registre terminal-pastiche est aujourd'hui associé aux projets étudiants ou aux side-projects de développeurs qui imitent une esthétique plutôt qu'ils ne l'habitent.

Les produits de référence (Claude, Vercel, Perplexity) ont tous en commun la même décision : **ils ne simulent pas une interface système.** Leur UI copy est sobre, humaine, précise — et c'est cela qui inspire confiance.

**Problèmes spécifiques :**

| Pattern | Exemple actuel | Effet perçu |
| :--- | :--- | :--- |
| Faux OS | `CONNEXE OS v2.6` | Gadget, pas sérieux |
| Séparateurs décoratifs | `MODE // DARK AMBRE`, `COORD //` | Ruine la typographie, mimétisme |
| Uppercase systématique | Tous les labels en capitales | Crie, fatigue l'oeil, nuit à la lisibilité |
| Jargon technique inflationniste | `GÉNÉRATION DU RÉSEAU COGNITIF INITIAL` | Prétentieux, pas plus clair |
| Status labels creux | `NODES: 14`, `DEPTH: 3` | Developer debug data, pas une UX |
| Phrases descriptives littérales | `Cartographie sémantique tridimensionnelle de la pensée artificielle` | Trop long, trop explicatif |
| Error message dramatisé | `Lien rompu dans la constellation...` | Sentimentalisme hors contexte |

---

## 2. Nouveau positionnement éditorial

**Un outil de pensée, pas une interface de jeu de rôle.**

Constellation doit s'affirmer comme un instrument de travail intellectuel sérieux, avec la même assurance que Perplexity ou Claude : pas d'explications superflues, pas d'esthétique mimétique, une confiance tranquille dans la valeur de ce qui est construit.

### Principes directeurs

1. **Minuscules ou Sentence Case** — L'uppercase généralisé appartient aux années 2010. En 2026, le bas de casse bien typographié est la marque du raffinement.
2. **Économie de mots** — Chaque mot à l'écran doit justifier sa présence. Si le mot peut être retiré sans perte d'information, il est retiré.
3. **Précision scientifique, pas jargon** — Un mot précis vaut mille qualificatifs. `Concept` plutôt que `impulsion de départ`. `Relations` plutôt que `réseau cognitif`.
4. **Aucun texte décoratif** — Les `//`, `▶`, `COORD`, `ERR:` décoratifs sont à supprimer ou à réduire à des icônes SVG.
5. **Le boot peut rester — mais comme geste, pas comme récit** — Un boot minimaliste (2-3 lignes courtes, pas de narration) est acceptable comme moment de rituel. Il ne doit pas chercher à raconter un monde.

---

## 3. Table de remplacement — V2

### 3.1 Boot Sequence

L'objectif : un boot qui pose un contexte fonctionnel minimal, puis laisse la place à l'interface. Pas de narration, pas de lore.

| Ligne | Texte actuel | V2 recommandé | Note |
| :--- | :--- | :--- | :--- |
| Boot 1 | `CONNEXE OS v2.6` | `Constellation` | Le nom suffit. |
| Boot 2 | `LOADING SEMANTIC ENGINE...` | `Loading semantic index` | Sentence case, verbe d'action neutre. |
| Boot 3 | `MAPPING SYSTEM: READY` | *(supprimer)* | Redondant avec le passage à l'interface. |
| Boot 4 | `▶ ENTER` | *(supprimer ou remplacer par un fade simple)* | Le CTA ici est superflu, l'interface s'ouvre automatiquement. |

> **Alternative boot ultra-minimaliste (recommandée) :** Une seule ligne `Constellation` qui fade-in, puis l'interface principale apparaît. Le silence est un signal de confiance.

---

### 3.2 Écran d'accueil

| Zone | Texte actuel | V2 recommandé | Raison |
| :--- | :--- | :--- | :--- |
| Pré-titre (SYS label) | `SYS.READY // SEMANTIC.ENGINE` | *(supprimer)* | Aucune valeur fonctionnelle, faux code. |
| Titre H1 | `Constellation` | `Constellation` | Parfait, ne pas toucher. |
| Badge version | *(vide actuellement dans le span)* | *(laisser vide ou mettre `beta`)* | Si la version doit apparaître, `beta` suffit. |
| Sous-titre | `Cartographie sémantique tridimensionnelle de la pensée artificielle` | `A 3D map of semantic relationships.` (EN) ou `Cartographie des relations sémantiques.` (FR) | Plus court, plus direct, plus honnête. |
| Placeholder input | `ENTREZ UN CONCEPT POUR INITIALISER...` | `Explore a concept` (EN) ou `Entrez un mot` (FR) | Conversation naturelle, pas une instruction système. |
| Bouton | `EXPLORER` | `Explore` ou `Go` | Minuscules, direct. |
| Suggestions | `COSMOS INTELLIGENCE ALCHIMIE MIND CYBERSPACE` | `entropy   memory   light   system   origin` | Minuscules, mots plus universels et moins "sci-fi cliché". |

---

### 3.3 État de chargement

| Zone | Texte actuel | V2 recommandé | Raison |
| :--- | :--- | :--- | :--- |
| Label de chargement | `CONNEXION EN COURS...` | `Building graph…` ou `Fetching relations…` | Fonctionnel, pas dramatique. |
| Sous-label | `GÉNÉRATION DU RÉSEAU COGNITIF INITIAL` | *(supprimer)* | Redondant. Un indicateur de chargement n'a pas besoin d'explication. |

---

### 3.4 Header (interface active)

| Zone | Texte actuel | V2 recommandé | Raison |
| :--- | :--- | :--- | :--- |
| Titre | `Constellation` | `Constellation` | Parfait. |
| Badge | *(vide)* | `beta` | Positionne honnêtement le produit. |
| Sous-titre 1 | `SYSTÈME DE CARTOGRAPHIE SÉMANTIQUE` | *(supprimer)* | Aucune valeur en contexte actif. L'outil parle de lui-même. |
| Sous-titre 2 | `COORD // [ {centerWord} ]` | `{centerWord}` en text secondaire discret | Montrer le mot actif directement, sans décoration. |
| Bouton thème | `MODE // DARK AMBRE` | `Light` / `Dark` | Simplicité absolue. |
| Placeholder search | `RECHERCHER UN CONCEPT...` | `Search` | Un seul mot suffit. |
| Bouton search | `EXPLORER` | `→` ou une icône chevron | Priorité à l'icône dans ce contexte header. |

---

### 3.5 Footer / Breadcrumb

| Zone | Texte actuel | V2 recommandé | Raison |
| :--- | :--- | :--- | :--- |
| Label breadcrumb | `PATH` | *(supprimer le label)* | Le breadcrumb lui-même est auto-explicatif. |
| Séparateur | `/` | `→` ou `·` | Plus lisible, moins "chemin de fichier". |
| Status `SCANNING...` | `SCANNING...` | `Loading` | Mot usuel, pas de jargon militaire. |
| Status `LOADED` | `LOADED` | *(supprimer ou icône ✓)* | Le graph visible prouve que c'est chargé. |
| Status `MAPPING` | `MAPPING` | *(supprimer)* | Idem. |
| `NODES: 14` | `NODES: 14` | *(supprimer ou réduire à une icône + chiffre)* | Debug data, pas une information utilisateur. |
| `DEPTH: 3` | `DEPTH: 3` | *(supprimer)* | Idem. |

---

### 3.6 Panneau contrôle labels (droite)

| Zone | Texte actuel | V2 recommandé | Raison |
| :--- | :--- | :--- | :--- |
| Label contrôle | `ÉTIQUETTES` | `Labels` | Un mot simple. |
| État off | `PAR DÉFAUT` | `Auto` | Plus juste fonctionnellement. |
| État on | `OPAQUE (100%)` | `Visible` | Clair, sans valeur numérique inutile. |

---

### 3.7 Messages d'erreur

| Zone | Texte actuel | V2 recommandé | Raison |
| :--- | :--- | :--- | :--- |
| Préfixe | `⚠ ERR: {errorMessage}` | `{errorMessage}` avec icône warning | L'icône remplace `ERR:`. |
| Message par défaut | `Lien rompu dans la constellation...` | `Something went wrong. Try again.` | Direct, non dramatique, actionnable. |

---

## 4. Décision sur le boot sequence

Deux options claires, à trancher :

**Option A — Boot supprimé**
L'application s'ouvre directement sur l'écran d'accueil avec un fade-in rapide. C'est la décision de Vercel, Linear, Perplexity. Confiance maximale. Zéro friction rituelle.



## 5. Règle d'or pour la suite

> Avant d'ajouter un label, un suffixe, un préfixe ou un séparateur dans l'interface : demandez si un utilisateur de Perplexity ou de Claude s'attendrait à le voir là. Si non, supprimez-le.

---

*Constellation Content Audit — v2 · Mai 2026*
