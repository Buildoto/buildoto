# Kickoff Claude Code — Buildoto Sprint 2
*Persistence + Intégration GitHub + Gestion de projets*

---

## 1. Contexte

**Sprint 2 de Buildoto.** Après sprint 1 : shell Electron unifié, agent minimal Claude, sidecar FreeCAD, viewer three.js. Un cube peut être généré par prompt.

À ce stade, rien n'est persistant : fermer l'app perd tout. Ce sprint introduit la **notion de projet**, le **versioning GitHub natif**, et la **persistence des sessions de chat**.

**Thèse clé :** l'utilisateur de Buildoto est un technicien — il comprend Git et GitHub. On ne masque pas Git, on l'intègre comme citoyen de première classe dans l'UI. Chaque projet Buildoto = un repo GitHub local (+ optionnellement remote).

---

## 2. Mission de ce sprint

L'utilisateur peut :
1. Créer un nouveau projet Buildoto (qui crée un repo Git local, éventuellement linké à un remote GitHub)
2. Ouvrir un projet existant (cloner depuis GitHub ou ouvrir un dossier local)
3. Voir ses fichiers projet (`.py`, `.FCStd`, `.md`, etc.) dans un explorateur
4. Chaque génération FreeCAD produit un fichier Python horodaté dans le projet
5. L'app auto-commit les modifications après chaque génération réussie
6. L'utilisateur peut push vers GitHub, voir l'historique, créer une branche
7. Les sessions de chat sont persistées par projet

---

## 3. Stack ajoutée

- **simple-git** (Node.js) pour les opérations Git locales
- **@octokit/rest** pour l'API GitHub (auth, create repo, PR)
- **keytar** pour stocker le GitHub token OS-keychain de façon sécurisée
- **electron-store** pour les settings et index des projets récents
- **react-arborist** ou **@tanstack/react-table** pour l'arbre de fichiers
- **monaco-editor** (ou codemirror) pour l'éditeur Python intégré

---

## 4. Architecture — nouveau concept : "Projet Buildoto"

```
Mon-Projet-Buildoto/               ← un dossier local = un projet Buildoto = un repo Git
├── .git/                           ← Git normal
├── .buildoto/                      ← config spécifique Buildoto
│   ├── config.json                 ← settings projet (modèle IA, providers, options)
│   ├── sessions/                   ← historique chats persisté
│   │   ├── session_2026-04-19_14-30.json
│   │   └── ...
│   └── cache/                      ← glTF, thumbnails, cache (dans .gitignore)
├── AGENTS.md                       ← contexte projet pour l'agent (convention OpenCode)
├── generations/                    ← Python généré par l'agent
│   ├── 2026-04-19_14-30-00_mur.py
│   ├── 2026-04-19_14-35-12_ouverture.py
│   └── ...
├── documents/                      ← documents FreeCAD (.FCStd)
│   └── main.FCStd
├── exports/                        ← IFC, glTF, PDF (dans .gitignore)
│   └── ...
└── README.md
```

**Stratégie de commit :**
- À chaque exécution réussie de Python FreeCAD, un auto-commit est fait :
  - Message : `feat: {action décrite par l'agent}` (généré par Claude comme un résumé)
  - Files : `generations/*.py`, `documents/main.FCStd`, mais PAS `exports/` ni `.buildoto/cache/`
- L'utilisateur voit la liste des commits dans le volet Git, peut checkout, créer branche, push.
- Les sessions de chat (`.buildoto/sessions/*.json`) sont **aussi committées** : traçabilité complète de "ce qu'on a dit à l'agent pour produire ce code".

---

## 5. Nouveaux volets dans l'UI

En plus d'Agent et Modeleur (sprint 1), on ajoute :

- **Volet Explorateur** (sidebar gauche) : arbre de fichiers du projet, avec icônes par type
- **Volet Éditeur** (optionnel, à côté du Modeleur) : Monaco Editor pour ouvrir un `.py` et le lire/éditer à la main
- **Volet Git** (sidebar ou bottom bar) : liste des commits, branche actuelle, bouton commit/push/pull, diff simple

Layout suggéré :

```
┌────────┬───────────────────────────────────────────┐
│        │ [Agent] [Modeleur] [Éditeur]              │
│ File   ├───────────────────────────────────────────┤
│ tree   │                                            │
│        │            Contenu du tab actif            │
│        │                                            │
│        │                                            │
├────────┴───────────────────────────────────────────┤
│ Git: main ● 3 uncommitted | [Commit] [Push] [Log] │
└────────────────────────────────────────────────────┘
```

---

## 6. Authentification GitHub

- **OAuth Device Flow** GitHub (pas de web redirect, pas de serveur de callback requis — idéal pour une app desktop)
- Scope demandé : `repo` (lecture/écriture des repos privés et publics)
- Token stocké dans **keytar** (OS keychain : Keychain sur macOS, Credential Manager sur Windows, libsecret sur Linux)
- Onboarding : "Connectez votre compte GitHub" avec button qui ouvre le navigateur et affiche un device code

Alternative pour les utilisateurs qui veulent rester 100 % local : option "Pas de GitHub" → les repos sont locaux only, pas de push possible mais l'app fonctionne entièrement.

---

## 7. Deliverables de ce sprint (ordre strict)

1. **Module `projet`** côté main : classe `Projet` qui gère ouvrir, créer, détecter un projet Buildoto (présence de `.buildoto/config.json` ou init).
2. **Intégration simple-git** : wrapper autour de simple-git avec méthodes `commit(message, files)`, `log()`, `branch(name)`, `push()`, `pull()`, `status()`.
3. **Auto-commit après génération** :
   - Hook dans la boucle agentique (sprint 1) : après `executer_python_freecad` réussi, main process :
     - Écrit le Python dans `generations/{timestamp}_{slug}.py`
     - Enregistre la session mise à jour dans `.buildoto/sessions/{id}.json`
     - Appelle Claude pour générer un message de commit concis (1 ligne)
     - Git add + commit
   - Ne committe **jamais** automatiquement si le code a erreur
4. **Auth GitHub Device Flow** : module `auth/github.ts` qui gère device code, polling, stockage token keytar, refresh si besoin.
5. **Octokit integration** : helpers pour créer un repo GitHub, lier un remote à un repo local, ouvrir une PR.
6. **Volet Explorateur** (renderer) : arbre de fichiers (react-arborist), mise à jour temps réel via `chokidar` (watch filesystem), clic droit pour rename/delete/new file.
7. **Volet Git** (renderer) : liste commits, état (staged/unstaged), boutons commit/push/pull, dialogue de création de branche.
8. **Onboarding au premier lancement** :
   - Welcome screen : "Bienvenue dans Buildoto"
   - Étape 1 : saisir clé API Claude (ou skip si modèle local)
   - Étape 2 : se connecter à GitHub (ou skip pour local only)
   - Étape 3 : créer un premier projet ou cloner un projet existant
9. **Persistence des sessions** : toutes les interactions chat sont sauvegardées dans `.buildoto/sessions/{session_id}.json` avec user messages, assistant messages, tool calls, tool results. Rechargeable à l'ouverture du projet.
10. **`AGENTS.md` auto-généré** à la création d'un projet, template avec explications standard (conventions, structure, objectif du projet) — éditable par l'utilisateur.

---

## 8. Critères d'acceptation

- [ ] Créer un nouveau projet produit un dossier avec `.git`, `.buildoto/`, `AGENTS.md` et README
- [ ] Générer du Python FreeCAD auto-commit avec un message pertinent
- [ ] Le volet Explorateur montre les fichiers en temps réel (watch)
- [ ] Se connecter à GitHub en Device Flow fonctionne de bout en bout
- [ ] Créer un repo GitHub depuis l'app puis push un commit fonctionne
- [ ] Fermer et rouvrir un projet restaure la session de chat dernière
- [ ] Un utilisateur "skip GitHub" peut utiliser l'app en local seul, sans erreur
- [ ] L'arbre de fichiers est responsive même avec 500+ fichiers dans `generations/`

---

## 9. Ce que tu ne dois PAS faire ce sprint

- Ne pas implémenter un diff visuel géométrique entre versions (sprint 5)
- Ne pas implémenter l'embedding OpenCode (sprint 3)
- Ne pas implémenter le RAG ou Mistral (phase 2)
- Ne pas implémenter des features GitHub avancées : Actions, Issues, Projects (plus tard)
- Ne pas gérer les merges de branches compliqués. Merges simples seulement.
- Ne pas faire d'UI pour résoudre les conflits Git. Si conflit, ouvrir le fichier dans l'éditeur et laisser l'utilisateur résoudre à la main.

---

## 10. Première action

Avant de coder, propose-moi :

1. **Schéma JSON complet** des fichiers `.buildoto/config.json` et `.buildoto/sessions/{id}.json`.
2. **Stratégie de watch filesystem** : comment tu débonces les events chokidar pour éviter de spammer le renderer, et comment tu distingues les écritures de Buildoto lui-même (à ignorer) des écritures utilisateur.
3. **Design des trois onboarding screens** en wireframe ASCII ou description.
4. **Schéma des messages IPC** ajoutés ce sprint (projet, git, github).

**Validation avant tout code.**
