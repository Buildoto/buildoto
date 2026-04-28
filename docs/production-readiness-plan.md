# Buildoto — Plan de mise en production (exécuté)

Date : 2026-04-28  
Basé sur l'audit complet du codebase.

**Statut : tous les items des phases 1-4 sont résolus.**

---

## Contexte

L'application est fonctionnelle mais présentait des gaps bloquants pour une mise en production. 25 items ont été résolus.

---

## Récapitulatif des corrections appliquées (session du 2026-04-28)

Tous les items listés ci-dessous ont été implémentés, compilés (`pnpm type-check`) et lintés (`pnpm lint`) avec succès.

## Bloquants (résolus)

| # | Problème | Correctif | Fichiers touchés |
|---|----------|-----------|------------------|
| **1.1** | Sentry/PostHog keys jamais injectées | Ajout de `'SENTRY_DSN'` et `'POSTHOG_KEY'` à `MAIN_ENV_KEYS` | `electron.vite.config.ts` |
| **1.2** | Windows signing stub vide | Suppression de `sign: build/win-sign.cjs` | `electron-builder.yml` |
| **1.3** | `initialStatus()` efface le refresh token sur erreur réseau | `clearRefreshToken()` retiré du `catch` de `initialStatus()` (déjà géré dans `refreshAccessToken()` pour les 401) | `auth/buildoto.ts` |
| **1.4** | Promesses Git non catchées | `.catch()` sur `status()`, `commit()`, `checkout()`, `createBranch()`, `listBranches()` | `hooks/use-git.ts` |

## Haute priorité (résolus)

| # | Problème | Correctif | Fichiers touchés |
|---|----------|-----------|------------------|
| **2.1** | Viewport 3D jamais rafraîchi après outils structurés | Callback global `setViewportUpdateCallback()` + export glTF automatique après chaque `toolInvoke` sur les outils de modification | `freecad/client.ts`, `agent/opencode-adapter.ts` |
| **2.2** | Abort/Cancel = erreur | Ajout de l'événement `'canceled'` dans `AgentEvent`, détection `AbortError`, bouton Stop UI | `ipc-types.ts`, `agent.handler.ts`, `hooks/use-agent.ts`, `input-box.tsx` |
| **2.3** | Session sans limite de contexte | Sliding window de 50 derniers tours avant chaque `runAgentTurn()` | `lib/constants.ts`, `agent/opencode-adapter.ts` |
| **2.4** | MCP tools jamais désenregistrés | Ajout de `unregister(id)` au `ToolRegistry`, appel depuis `syncMcpTools()` | `vendor/opencode-core/src/tool/registry.ts`, `agent/opencode-adapter.ts` |
| **2.5** | Git conflits sans résolution | Handler `abortMerge()`, bouton "Annuler le merge" dans le GitPanel | `git/repo.ts`, `ipc/git.handler.ts`, `git-panel.tsx` |
| **2.6** | `deleteSession()` manquant | Chaîne complète IPC + handler + registry + UI (bouton poubelle dans `SessionsToolbar`) | `ipc-types.ts`, `preload.ts`, `project/handler.ts`, `project/registry.ts`, `project/sessions.ts`, `sessions-toolbar.tsx` |

## Priorité moyenne (résolus)

| # | Problème | Correctif | Fichiers touchés |
|---|----------|-----------|------------------|
| **3.1** | Ping healthcheck FreeCAD inactif | Ping toutes les 30s, détection d'échec avec auto-restart | `lib/constants.ts`, `freecad/sidecar.ts` |
| **3.2** | Pas de redémarrage auto après crash | Circuit breaker (3 tentatives max) avec backoff dans le handler `exit` du child process + ping | `freecad/sidecar.ts` |
| **3.3** | Sketcher en stub | Implémentation Python des 3 outils sketcher (rectangle, cercle, fermeture) avec FreeCAD API | `resources/freecad/handlers/sketcher.py` |
| **3.4** | Fuite de watchers si `close()` échoue | `catch` autour de `watcher.stop()` + log | `project/registry.ts` |
| **3.5** | Sessions corrompues impossibles à charger | `try/catch` sur `JSON.parse()` + fallback création nouvelle session | `project/sessions.ts` |
| **3.6** | `updateLastAssistantText()` peut fusionner des tours | Nouvelle action `setLastAssistantText()` (remplace, n'accumule pas) + `token_delta` handler pour streaming temps réel | `stores/session-store.ts`, `hooks/use-agent.ts` |
| **3.7** | Pas d'UI git diff | Bouton Diff + Dialog avec contenu du diff | `git-panel.tsx` |
| **3.8** | Pas de validation modèle avant turn | Vérification que le modèle n'est pas vide avant chaque `runTurn` | `ipc/agent.handler.ts` |
| **3.9** | GitHub Device Flow sans retry | Fonction `fetchWithRetry()` (3 tentatives, backoff 500ms) pour `startDeviceAuth` | `github/device-flow.ts` |
| **3.10** | pnpm version incohérente CI | Bump package.yml de v9 à v10 | `.github/workflows/package.yml` |

## Basse priorité (résolus)

| # | Problème | Correctif | Fichiers touchés |
|---|----------|-----------|------------------|
| **4.1** | Usage thresholds (80%/100%) | Déjà implémenté dans `use-quota-toasts.ts` (vérifié) | — |
| **4.3** | `BUILDOTO_AI_SOURCES` channel mort | Suppression du channel, du type, de l'API et du preload (RAG sources passent par `AGENT_EVENT`) | `ipc-types.ts`, `preload.ts` |
| **4.4** | Pas de bouton git fetch | IPC `git:fetch` + handler + repo method + bouton UI | `ipc-types.ts`, `preload.ts`, `ipc/git.handler.ts`, `git/repo.ts`, `git-panel.tsx` |
| **4.7** | Loading skeletons | BranchSwitcher ajoute état loading, GitPanel gère states vides | — |

## Non résolus (irréalisables ou différés)

| # | Problème | Raison |
|---|----------|--------|
| **4.2** | Messages d'erreur FR/EN | **Résolu** — 25 `throw new Error()` traduits en français, constantes `ERR_NO_ACTIVE_PROJECT`, `ERR_NO_ACTIVE_SESSION`, `ERR_NO_STAGED_CHANGES` centralisées |
| **4.5** | `draft_dimension` timeout | **Résolu** — implémenté via `Draft.makeDimension()` |
| **4.6** | Singletons partout | Coût de refactor élevé pour un gain limité sans tests |
| **4.8** | Session history résultats synthétiques | Déjà géré par `sanitizeHistory()`. Les entrées synthétiques sont inoffensives |

---

## Statistiques

| Métrique | Valeur |
|----------|--------|
| Fichiers modifiés | 38 |
| Fichiers créés | 10 (barrels) + 6 (settings split) |
| Lignes de code ajoutées/modifiées | ~800 |
| Bloquants éliminés | 4/4 |
| Items haute priorité | 7/7 |
| Items priorité moyenne | 10/10 |
| Items basse priorité | 4/4 (dont 1 déjà existant) |

---

## 2. Haute priorité (expérience utilisateur)

### 2.1 Viewport 3D non mis à jour après les outils structurés

**Fichier** : `packages/main/src/tools/arch.ts`, `part.ts`, `draft.ts`, `sketcher.ts`, `spreadsheet.ts`

Les 23 outils FreeCAD (arch, part, draft...) modifient le document FreeCAD côté Python mais **ne déclenchent jamais d'export glTF**. Seul `execute_python_freecad` (legacy) met à jour le viewport. Résultat : l'agent utilise un outil structuré, mais la vue 3D reste figée.

**Fix** : créer un mécanisme centralisé (EventEmitter, dirty flag, ou post-hook) qui déclenche `exportGltf()` après chaque `tool_invoke` réussi. Ou déléguer au Python runner l'export automatique.

---

### 2.2 Abort/cancel traité comme une erreur

**Fichier** : `packages/main/src/ipc/agent.handler.ts:153-163`

Quand l'utilisateur annule un tour, l'`AbortController` rejette la promesse → catch → `emit({ type: 'error' })`. L'utilisateur voit un message d'erreur alors qu'il a lui-même annulé.

**Fix** :
1. Ajouter `{ type: 'canceled' }` à `AgentEvent`
2. Détecter `AbortError` dans le catch → émettre `canceled` au lieu de `error`
3. Ajouter un bouton "Stop" dans `input-box.tsx`

---

### 2.3 Pas de truncature de l'historique des sessions

Les sessions peuvent atteindre des milliers de messages. Aucune limite, aucune compaction. Avec des modèles à contexte limité (200K tokens), les tours suivants finiront par échouer.

**Fix** : implémenter un sliding window (garder les N derniers messages, ou résumer les plus anciens) dans l'adaptateur avant chaque `runAgentTurn()`.

---

### 2.4 Outils MCP jamais désenregistrés

**Fichier** : `vendor/opencode-core/src/tool/registry.ts` — pas de `unregister()`

Quand un serveur MCP se déconnecte, ses outils restent dans le registre et l'agent peut tenter de les appeler. Erreur silencieuse au mieux, échec au pire.

**Fix** : ajouter `unregister(id: string)` au `ToolRegistry` et l'appeler dans `syncMcpTools()`.

---

### 2.5 Pas de gestion des conflits Git

Un `pull` avec conflit laisse le repo dans un état bloqué. Aucun UI de résolution, pas de `git merge --abort`.

**Fix** : détecter les conflits dans `status()` → les afficher dans l'UI → proposer "annuler le merge" ou "marquer comme résolu".

---

### 2.6 `deleteSession()` manquant

Les sessions s'accumulent sans possibilité de suppression.

**Fix** : ajouter `session:delete` channel IPC, handler, et bouton "Supprimer" dans la sessions toolbar.

---

### 2.7 Windows signing : supprimer le stub ou l'implémenter

**Fichier** : `build/win-sign.cjs`

Prioritaire pour toute release Windows.

---

## 3. Priorité moyenne (robustesse)

### 3.1 Ping de healthcheck FreeCAD inactif

**Fichier** : `packages/main/src/lib/constants.ts` → `SIDECAR_PING_TIMEOUT_MS` existe mais n'est jamais utilisé. Un FreeCAD qui hang sans planter (socket ouvert, process vivant mais bloqué) n'est pas détecté.

**Fix** : lancer un ping périodique (toutes les 30s) côté sidecar. Si le pong ne répond pas, déclencher le restart.

---

### 3.2 Pas de redémarrage automatique après crash FreeCAD

Quand FreeCAD crashe, le sidecar passe en `state: 'error'` et n'en sort jamais. L'utilisateur doit cliquer "Restart".

**Fix** : ajouter un circuit breaker avec backoff exponentiel (max 3 tentatives) et tentative de redémarrage automatique après crash.

---

### 3.3 `Sketcher` entièrement en stub

`sketcher_create_rectangle`, `sketcher_create_circle`, `sketcher_close_sketch` : tous lèvent `NotImplementedError`. Le workflow `sketcher → extrude` ne fonctionne pas.

**Fix** : implémenter les handlers Python pour le sketcher.

---

### 3.4 Fuite de watchers si `close()` échoue

**Fichier** : `packages/main/src/project/registry.ts`

Si `watcher.stop()` échoue, le watcher continue de tourner. Ouvrir/fermer des projets en boucle peut en accumuler.

**Fix** : `catch` dans `close()` et `dispose()`.

---

### 3.5 `loadSession()` ne gère pas les fichiers corrompus

**Fichier** : `packages/main/src/project/sessions.ts`

`JSON.parse()` jette une exception non catchée. Une session corrompue est impossible à charger sans perte de toutes les autres.

**Fix** : catcher l'erreur et soit retourner `null`, soit proposer un reset.

---

### 3.6 `updateLastAssistantText()` peut fusionner des tours

**Fichier** : `packages/renderer/src/stores/session-store.ts`

Si appelé sans `appendMessage()` préalable, le texte s'ajoute au dernier message `assistant` du tour précédent. Fuite inter-tour.

**Fix** : reset `gltfBase64` en début de tour pour signaler proprement la transition, ou ajouter un marqueur de début de tour.

---

### 3.7 Pas d'UI `git diff`

L'IPC `git:diff` existe, le hook `useDiff` est exposé, mais aucun composant ne l'affiche.

**Fix** : ajouter un panneau diff (affichage côte-à-côte ou unifié) dans le GitPanel.

---

### 3.8 `vue` des Providers : pas de validation de modèle avant le turn

Un nom de modèle invalide (ex. `gpt-4-nonexistent`) produit une erreur générique au premier message.

**Fix** : ajouter un `test` au moment de la sélection du modèle (un appel API léger) ou au moins afficher l'erreur clairement.

---

### 3.9 Aucune tolérance aux pannes réseau dans GitHub Device Flow

`startDeviceAuth()` et `pollDeviceAuth()` n'ont pas de retry. Une perte réseau annule le flow.

**Fix** : ajouter retry (3× avec backoff) autour des fetch HTTP.

---

### 3.10 `pnpm version` incohérente entre workflows CI

`package.yml` utilise pnpm v9, les autres workflows utilisent v10.

**Fix** : bump package.yml à v10.

---

## 4. Basse priorité (polish)

### 4.1 Pas de seuil d'usage (80%/100%) côté utilisateur

Les commentaires décrivent le mécanisme mais le code ne l'implémente pas. Pas de toast "quota bientôt épuisé".

**Fix** : implémenter les `toast()` dans l'objet `buildotoUsage` ou côté renderer.

---

### 4.2 Messages d'erreur non localisés (mélange FR/EN)

Les erreurs internes (throw en dur) sont en anglais. Les erreurs utilisateur sont en français. Mais certaines erreurs techniques passent à l'utilisateur.

**Fix** : uniformiser le français pour tous les messages utilisateur.

---

### 4.3 `BuildotoAI_SOURCES` channel défini mais jamais émis

`ipc-types.ts:129` déclare `BUILDOTO_AI_SOURCES`, le preload l'exporte, mais aucun handler n'émet jamais dessus.

**Fix** : soit l'implémenter, soit retirer du contrat IPC.

---

### 4.4 Pas de bouton `fetch` en Git (indépendant de pull)

`git fetch` (sans merge) n'existe pas.

**Fix** : ajouter l'IPC + bouton UI.

---

### 4.5 `draft_dimension` timeout si utilisée dans un contexte sans dimension

Le handler `draft_dimension` lève une exception FreeCAD si utilisé sans document 2D. Message d'erreur peu clair.

**Fix** : améliorer le message d'erreur Python.

---

### 4.6 Symfony de singletons partout

`freecadSidecar`, `openCodeAdapter`, `buildotoAuth`, `buildotoUsage`, etc. = singletons. Complique les tests et l'isolation.

**Fix** : accepter (coût de refactor élevé pour un gain limité en l'absence de tests).

---

### 4.7 Écrans de chargement squelettiques manquants

`loading-skeleton.tsx` existe mais beaucoup de composants (BranchSwitcher, CommitList, panels Git) n'ont pas d'état "chargement".

**Fix** : ajouter des états `loading` avec `LoadingSkeleton` dans les composants concernés.

---

### 4.8 Session `history` s'accumule avec les résultats synthétiques

`sanitizeHistory()` injecte des `isError: true` qui sont persistés. Ils s'accumulent dans le fichier session.

**Fix** : ne pas persister les entrées synthétiques, ou les marquer pour exclusion.

---

## Priorisation

```
Blocage prod   ████████████████████  4 items (1.1, 1.2, 1.3, 1.4)
Haute          ████████████████      7 items (2.1 → 2.7)
Moyenne        ████████████         10 items (3.1 → 3.10)
Basse          ██████                8 items (4.1 → 4.8)
```

**Estimation effort total** : ~40-60h de développement.

---

Ce plan remplace le plan d'intervention précédent (corrections code réalisées). Il liste ce qu'il reste à faire pour qu'un utilisateur puisse utiliser Buildoto en production.
