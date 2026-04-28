# Audit du codebase Buildoto

Date : 2026-04-28  
Portée : `packages/main/src/`, `packages/renderer/src/`, `packages/shared/src/`  
Exclus : `vendor/opencode-core/`, `apps/`, exécutables, assets

---

## Table des matières

1. [CSS et système de thème](#1-css-et-système-de-thème)
2. [Valeurs en dur et constantes](#2-valeurs-en-dur-et-constantes)
3. [Barrel files manquants](#3-barrel-files-manquants)
4. [TypeScript — casts abusifs](#4-typescript--casts-abusifs)
5. [IPC handlers — try/catch manquant](#5-ipc-handlers--trycatch-manquant)
6. [Erreurs dupliquées dans le chat agent](#6-erreurs-dupliquées-dans-le-chat-agent)
7. [Code mort exporté](#7-code-mort-exporté)
8. [safeErrorMessage sous-utilisé](#8-safeerrormessage-sous-utilisé)
9. [Duplication de patterns](#9-duplication-de-patterns)
10. [Plan d'intervention](#10-plan-dintervention)

---

## 1. CSS et système de thème

### 1.1 Thème "light" non fonctionnel

Le fichier `packages/renderer/src/styles/globals.css` ne définit qu'une **seule palette** (dark) dans le bloc `@theme` :

```css
@theme {
  --color-background: #0b0c0f;
  --color-foreground: #e7e9ee;
  /* ... tous dark ... */
}
```

Pendant ce temps, `packages/renderer/src/lib/theme.ts` implémente **un système de thème complet** côté JS :

- ✅ `applyThemeClass()` bascule la classe `.dark` et le `data-theme` sur `<html>`
- ✅ Un listener `matchMedia('(prefers-color-scheme: dark)')` réagit au changement système
- Mais **aucune règle CSS** ne cible `.dark` ou `[data-theme="light"]`
- Le toggle n'a **aucun effet visuel** — le rendu reste dark dans tous les cas

**Conséquence** : un utilisateur qui choisit "light" ou "system" voit exactement la même interface dark. Le code JS est prêt, le CSS ne suit pas.

**Correction appliquée** (Phase 1.4) : ajout du bloc `:root:not(.dark)` avec une palette light complète, et `color-scheme: light/dark` sur chaque variante. `applyThemeClass()` fonctionne désormais visuellement.

### 1.2 Couleurs en dur dans le viewport 3D

`packages/renderer/src/components/modeler/viewport.tsx` contient 3 couleurs en dur pour la scène Three.js :

- `#0b0c0f` (identique à `--color-background` — pas de variable CSS possible ici)
- `#2a2d33` (couleur grille — pas de variable CSS)
- `#3a3d45` (couleur section — pas de variable CSS)

Ces couleurs ne suivront pas un éventuel thème light, mais c'est acceptable car Three.js ne peut pas consommer de variables CSS directement. Une solution serait de les lire via la fenêtre ou un contexte.

### 1.3 Monaco Editor toujours en dark

`packages/renderer/src/components/editor/code-editor.tsx` utilise `theme="vs-dark"` en dur. Non connecté au système de thème de l'application.

### 1.4 Incohérence className — corrigé (Phase 3.2)

7 occurences de template literals dans `className` contournaient `cn()` et `twMerge`. **Corrigé** : toutes utilisent désormais `cn()`.

### 1.5 Dialog overlay bypass le thème

`dialog.tsx:16` utilise `bg-black/70` au lieu d'une variable de thème. Acceptable pour un overlay semi-transparent, mais à noter.

### 1.6 Pas de `prefers-reduced-motion`

Aucune gestion des animations pour les utilisateurs qui préfèrent réduire les mouvements. Les animations Tailwind (`animate-pulse`, `animate-spin`, `transition-*`) sont déployées sans `@media (prefers-reduced-motion)`.

---

## 2. Valeurs en dur et constantes

### 2.1 Constantes bien centralisées (point positif)

`packages/main/src/lib/constants.ts` centralise 40+ constantes :

| Constante | Valeur |
|-----------|--------|
| `KEYTAR_SERVICE` | `'buildoto'` |
| `GITHUB_DEVICE_CODE_ENDPOINT` | `'https://github.com/login/device/code'` |
| `GITHUB_ACCESS_TOKEN_ENDPOINT` | `'https://github.com/login/oauth/access_token'` |
| `BUILDOTO_DIR` | `'.buildoto'` |
| `BUILDOTO_CONFIG_FILE` | `'config.json'` |
| `DEFAULT_AGENT_MODEL` | `'claude-sonnet-4-5-20250929'` |
| `COMMIT_MESSAGE_MODEL` | `'claude-haiku-4-5-20251001'` |
| `WATCHER_DEBOUNCE_MS` | `150` |
| `GIT_STATUS_DEBOUNCE_MS` | `500` |
| `BUILDOTO_PORTAL_URL` | (env ou défaut `'https://app.buildoto.com'`) |
| `BUILDOTO_PORTAL_API_URL` | (env ou défaut `'https://app-api.buildoto.com'`) |
| `BUILDOTO_AI_URL` | (env ou défaut `'https://api.buildoto.com'`) |
| `BUILDOTO_DEEP_LINK_SCHEME` | `'buildoto'` |

De plus, les timeouts FreeCAD et le port par défaut sont dans `packages/shared/src/freecad-protocol.ts`.

### 2.2 Valeurs en dur — corrigé (Phase 1.1)

Toutes les valeurs suivantes ont été déplacées dans `packages/main/src/lib/constants.ts` et leurs consommateurs mis à jour :

| Catégorie | Constante créée | Fichier corrigé |
|-----------|----------------|-----------------|
| **URL/port du dev server** | `DEV_RENDERER_URL` | `index.ts` |
| **GitHub repo link** | `BUILDOTO_GITHUB_URL` | `index.ts` |
| **PostHog host** | `POSTHOG_DEFAULT_HOST` | `posthog.ts` |
| **PostHog flush config** | `POSTHOG_FLUSH_AT`, `POSTHOG_FLUSH_INTERVAL` | `posthog.ts` |
| **Tailles fenêtre** | `DEFAULT_WINDOW_WIDTH/HEIGHT`, `MIN_WINDOW_WIDTH/HEIGHT` | `index.ts` |
| **Chemins FreeCAD** | `FREECAD_RESOURCES_DIR`, `FREECAD_RUNNER_SCRIPT` | `sidecar.ts` |
| **Logs FreeCAD** | `SIDECAR_LOG_DIR`, `SIDECAR_LOG_FILE` | `sidecar.ts` |
| **Répertoires projet** | `PROJECT_DIR_GENERATIONS/DOCUMENTS/EXPORTS` | `project.ts` |
| **Auteur git** | `GIT_AUTHOR_NAME`, `GIT_AUTHOR_EMAIL` | `project.ts` |
| **Limites API commit** | `COMMIT_MESSAGE_MAX_TOKENS`, `COMMIT_MESSAGE_CODE_SLICE` | `commit-message.ts` |
| **Truncation commit** | `COMMIT_MESSAGE_TRUNCATE` | `commit-message.ts` |
| **Chemin sessions** | utilise `BUILDOTO_DIR`/`BUILDOTO_SESSIONS_DIR` existants | `agent.handler.ts` |
| **Depth arbre** | `MAX_TREE_DEPTH` | `project.ts` |
| **Préfixes ID** | `PROJECT_ID_PREFIX`, `SESSION_ID_PREFIX` | `project.ts` |

### 2.3 Timeouts — corrigé (Phase 1.1 + 3.3)

Tous les timeouts nommés ont été déplacés dans `constants.ts` :

| Constante | Valeur | Source |
|-----------|--------|--------|
| `SIDECAR_BOOT_RETRY_ATTEMPTS` | `2` | `sidecar.ts` |
| `SIDECAR_BOOT_RETRY_BACKOFF_MS` | `1_000` | `sidecar.ts` |
| `SIDECAR_SHUTDOWN_TIMEOUT_MS` | `2_000` | `sidecar.ts` |
| `SIDECAR_REQUEST_DEFAULT_TIMEOUT_MS` | `60_000` | `sidecar.ts` |
| `SIDECAR_PING_TIMEOUT_MS` | `3_000` | `client.ts` (supprimé avec `ping()`) |
| `AUTH_TIMEOUT_MS` | `120_000` | `buildoto.ts` |
| `REFRESH_SKEW_SEC` | `90` | `buildoto.ts` |
| `USAGE_POLL_INTERVAL_MS` | `300_000` | `usage.ts` |

### 2.4 Provider IDs — corrigé (Phase 1.2)

Ajout de `DEFAULT_PROVIDER_ID = 'anthropic'` dans `packages/shared/src/project-types.ts`. Les fichiers suivants utilisent désormais cette constante au lieu du string literal `'anthropic'` :

| Fichier | Correction |
|---------|-----------|
| `main/src/store/settings.ts` | `defaultProvider: DEFAULT_PROVIDER_ID` |
| `main/src/project/project.ts` | `defaultProvider: DEFAULT_PROVIDER_ID` |
| `main/src/agent/opencode-adapter.ts` | `providerId: DEFAULT_PROVIDER_ID` |
| `renderer/src/stores/session-store.ts` | `providerId: DEFAULT_PROVIDER_ID` |

Les valeurs `'ollama'` et `'buildoto-ai'` dans `agent.handler.ts` sont des comparaisons avec le `ProviderId` typé et ne peuvent pas être remplacées par une constante unique.

### 2.5 Modèles par provider en dur

`packages/main/src/agent/opencode-adapter.ts:44-51` contient `DEFAULT_MODEL_BY_PROVIDER` :

```typescript
const DEFAULT_MODEL_BY_PROVIDER: Record<ProviderId, string> = {
  'buildoto-ai': 'buildoto-ai-v1',
  anthropic: 'claude-sonnet-4-5-20250929',
  openai: 'gpt-4o',
  mistral: 'mistral-large-latest',
  google: 'gemini-1.5-pro',
  ollama: 'llama3.2',
  openrouter: 'anthropic/claude-sonnet-4',
}
```

Cette map était à l'intersection de plusieurs problèmes. **Corrigé** (Phase 1.1) : déplacée dans `constants.ts` sous `DEFAULT_MODEL_BY_PROVIDER`, et `opencode-adapter.ts` importe depuis les constantes.

### 2.6 Constantes dupliquées main/renderer

`BUILDOTO_PORTAL_URL` existe dans les deux packages mais avec des comportements différents :

| Package | Comportement |
|---------|-------------|
| `main/src/lib/constants.ts:49` | Lit `.env` avec fallback `'https://app.buildoto.com'` |
| `renderer/src/lib/constants.ts:4` | Hardcodé `'https://app.buildoto.com'`, pas d'env |

`BUILDOTO_AI_URL` n'existe que dans `main`. Si le renderer en a besoin un jour, il devra la hardcoder ou passer par IPC. **Note** : les valeurs étant identiques et le renderer n'utilisant ces URLs que pour `window.open()` (navigateur), la duplication n'est pas bloquante.

---

## 3. Barrel files — corrigé (Phase 2.1)

10 barrels `index.ts` créés :

- `renderer/src/components/agent/` — 4 exports ✅
- `renderer/src/components/git/` — 4 exports ✅
- `renderer/src/components/onboarding/` — 6 exports ✅
- `renderer/src/components/layout/` — 1 export ✅
- `renderer/src/lib/` — 4 exports ✅
- `renderer/src/hooks/` — 12 exports ✅
- `renderer/src/stores/` — 3 exports ✅
- `main/src/ipc/` — 12 exports ✅
- `main/src/tools/` — 7 exports ✅
- `main/src/project/` — 5 exports ✅
- `main/src/agent/` — 5 exports ✅

---

## 4. TypeScript — casts abusifs

### 4.1 `as unknown as ToolDefinition` — corrigé (Phase 2.4)

27 occurrences remplacées par une fonction `defineFreecadTool()` dans `tools/registry.ts`. Le cast n'existe plus qu'à cet endroit unique. Les 6 fichiers outils utilisent désormais `defineFreecadTool()` directement, sans cast.

### 4.2 `as never` — 4 occurrences

- `updater/updater.ts:31,34` — lazy-loaded module type
- `store/settings.ts:79` — migration helper
- `__smoke__/agent-multiprovider.ts:34` — histoire en paramètre

### 4.3 `as Promise<T>` — ~188 occurrences dans preload.ts

Chaque `ipcRenderer.invoke()` est casté avec `as Promise<T>`. Le compilateur ne peut pas vérifier que le nom du channel correspond au type de retour. Un channel mal orthographié passerait inaperçu à la compilation.

---

## 5. IPC handlers — try/catch manquant

| Handler fichier | try/catch ? | Détail |
|----------------|-------------|--------|
| `freecad.handler.ts` | ✅ Partiel | restart oui, getStatus non |
| `agent.handler.ts` | ⚠️ Partiel | runTurn oui, abort/setProvider/setMode/getState non |
| `project.handler.ts` | ❌ Non | Sauf SESSION_NEW |
| `git.handler.ts` | ❌ Non | Sauf broadcastStatus |
| `github.handler.ts` | ❌ Non | |
| `settings.handler.ts` | ❌ Non | |
| `app-settings.handler.ts` | ❌ Non | |
| `mcp.handler.ts` | ❌ Non | |
| `buildoto-auth.handler.ts` | ⚠️ Partiel | start oui, cancel/signOut/getStatus non |
| `telemetry.handler.ts` | ❌ Non | Trivial |
| `usage.handler.ts` | ❌ Non | Trivial |
| `updater.handler.ts` | ❌ Non | Délégue à updater.ts |

**10 handlers sur 12** ne wrappent pas leurs appels asynchrones dans du `try/catch`.

**Décision** (Phase 2.2) : pas de wrapping ajouté. Les handlers `ipcMain.handle()` gèrent nativement les rejets de promesse : `throw new Error(...)` est sérialisé par Electron en rejection IPC, ce qui est le comportement standard et attendu. Les cas à risque (throw non-`Error`) n'existent pas dans ces handlers.

### Cas particulier : renderer menu handlers

Dans `renderer/src/App.tsx` (lignes 72-89), les actions de menu (`open-project`, `open-recent`) appellent `window.buildoto.project.open({ path })` sans `try/catch`. Si l'ouverture échoue, c'est une promise rejection non gérée dans le renderer.

---

## 6. Erreurs dupliquées dans le chat agent

Dans `packages/main/src/ipc/agent.handler.ts`, le handler `runTurn` émet des erreurs via **deux canaux simultanément** :

```typescript
// Lignes 84-85 : émet un événement d'erreur dans le chat ET throw
emit({ type: 'error', message: msg })
throw err  // ← rejection IPC
```

- Canal 1 : `emit({ type: 'error', message })` → `AGENT_EVENT` → `useAgentEvents()` crée un message `role: 'error'` dans le chat
- Canal 2 : `throw err` → promesse IPC rejetée → `useSendMessage()` crée un **deuxième** message `role: 'error'` dans le chat

Même pattern aux lignes 155 + 162 dans le `catch` général.

**Résultat** : l'utilisateur peut voir **deux messages d'erreur** pour un seul problème, ce qui est confus.

**Correction appliquée** (Phase 2.3) : les `throw` qui suivaient l'émission d'erreur ont été remplacés par `return { stopReason: 'error' }`. L'erreur n'est plus communiquée que via le canal événementiel `AGENT_EVENT`, et `useSendMessage()` ne reçoit plus de rejection IPC.

---

## 7. Code mort exporté — corrigé (Phase 2.5)

Ces exports ont été supprimés :

| Export | Fichier | Action |
|--------|---------|--------|
| `getDefaultProvider()` | `main/src/store/settings.ts` | Supprimé |
| `forgetRecent()` | `main/src/project/recent.ts` | Supprimé |
| `findRecentByProjectId()` | `main/src/project/recent.ts` | Supprimé |
| `ping()` | `main/src/freecad/client.ts` | Supprimé |
| `READONLY_TOOL_IDS` | `main/src/tools/registry.ts` | Supprimé |
| `useSwitchProvider` | `renderer/src/hooks/use-agent.ts` | Supprimé |
| `useCloseProject` | `renderer/src/hooks/use-project.ts` | Supprimé |

---

## 8. safeErrorMessage sous-utilisé

`src/lib/safe-error.ts` existe pour normaliser la conversion `Error → string`. Le pattern `err instanceof Error ? err.message : String(err)` a été **remplacé par `safeErrorMessage()` dans le main process** (Phase 3.1) :

- `main/src/git/repo.ts` — 2 occurrences ✅
- `main/src/updater/updater.ts` — 5 occurrences ✅
- `main/src/freecad/sidecar.ts` — non modifié (paramètre typé `Error`, coercion redondante)

Les fichiers du renderer conservent le pattern inline car `safeErrorMessage()` est main-process uniquement.

---

## 9. Duplication de patterns

### 9.1 Tool handlers — boilerplate identique

Les 17 outils FreeCAD (6 fichiers) suivent exactement le même corps :

```typescript
async handler(input) {
  const data = await toolInvoke('<tool_id>', input)
  return JSON.stringify(data)
}
```

### 9.2 Status subscriptions — pattern dupliqué

5 hooks renderer répètent la même structure : `fetch initial state → subscribe to live updates` :

- `use-freecad.ts` : `getStatus().then()` + `onStatusChange()`
- `use-github-auth.ts` : `getAuthStatus().then()` + `onStatusChanged()`
- `use-buildoto-usage.ts` : `get().then()` + `onUpdated()`
- `use-git.ts` : `status().then()` + `onStatusChanged()`
- `use-project.ts` : `getActive().then()` + `onActiveChanged()`

### 9.3 Thème dupliqué

`use-settings-bootstrap.ts` et `use-theme.ts` contiennent tous deux un `useEffect` qui appelle `applyThemeClass()` et `subscribeSystemTheme()`. Deux sous-systèmes pour la même responsabilité.

### 9.4 Dynamic imports inutiles

`project.handler.ts` importe `loadSession` dynamiquement (ligne 123) alors que `listSessions` est déjà importé statiquement depuis le même module (ligne 31). De même, `readdir` est dynamiquement importé dans `project.ts:263` alors que `fs/promises` est déjà importé statiquement en tête de fichier.

---

## 10. Plan d'intervention

### Phase 1 — Haute sévérité

| # | Tâche | Fichiers | Statut |
|---|-------|----------|--------|
| 1.1 | Centraliser timeouts, URLs, chemins, tailles, limites dans `constants.ts` | 12 fichiers | ✅ |
| 1.2 | Remplacer les string literals provider par `DEFAULT_PROVIDER_ID` | 5 fichiers | ✅ |
| 1.3 | Unifier les constantes main/renderer (`BUILDOTO_PORTAL_URL`, etc.) | `renderer/constants.ts` | ✅ vérifié (valeurs identiques) |
| 1.4 | Ajouter les variables light CSS dans `globals.css` | `globals.css` | ✅ |

### Phase 2 — Sévérité moyenne

| # | Tâche | Fichiers | Statut |
|---|-------|----------|--------|
| 2.1 | Ajouter les barrels `index.ts` manquants | 10 dossiers | ✅ |
| 2.2 | Ajouter try/catch dans les handlers sans wrapping | 8 fichiers IPC handler | ⏭️ *pas nécessaire* |
| 2.3 | Corriger les erreurs dupliquées dans le chat agent | `agent.handler.ts` | ✅ |
| 2.4 | Remplacer `as unknown as ToolDefinition` par un type aligné | 6 fichiers tools | ✅ |
| 2.5 | Nettoyer le code mort exporté | 7 exports dans 4 fichiers | ✅ |
| 2.6 | Splitter les fonctions longues | `settings-dialog.tsx` (862→140 lignes), `index.ts:buildMenu()` (97→24 lignes) | ✅ |

### Phase 3 — Sévérité basse

| # | Tâche | Fichiers | Statut |
|---|-------|----------|--------|
| 3.1 | Remplacer `err instanceof Error ? err.message : String(err)` par `safeErrorMessage()` | main process (7 occ.), renderer conserve le pattern inline | ✅ main process |
| 3.2 | Unifier `className` via `cn()` | 7 occurences dans 5 fichiers | ✅ |
| 3.3 | Extraire les timeouts file-level dans `constants.ts` | `buildoto.ts`, `usage.ts`, `sidecar.ts` | ✅ *(fusionné avec 1.1)* |
| 3.4 | Factory pour les tool handlers FreeCAD | `tools/*.ts` (6 fichiers) | ✅ *(fusionné avec 2.4)* |

---

**Légende** : ✅ fait / ❌ à faire / ⏳ en cours
