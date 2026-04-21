# Coherence audit — post-Sprint 8, avant publication v1.0.0

*Audit statique des 3 repos Buildoto après livraison des 8 sprints. Lecture seule, aucun code modifié. Livrable : ce document.*

---

## Contexte & méthode

Chaque sprint a passé ses propres gates (type-check, lint, tests ciblés), mais les **seams entre sprints** n'avaient pas été relus ensemble. Cet audit parcourt les contrats qui traversent les frontières de sprint ou de repo — IPC, auth JWT, wire format sources, schema Supabase, versions, config release — et signale toute dérive.

Les 3 repos couverts :

| Repo | Chemin | Sprints concernés |
|---|---|---|
| Desktop Electron | `/Users/sebastienmignot/Documents/Buildoto/` | 1, 2, 3, 4, 8 |
| Portal SaaS | `/Users/sebastienmignot/Documents/buildoto-portal/` | 7, 8 |
| Inference RAG | `/Users/sebastienmignot/Documents/buildoto-ai/` | 5, 6, 8 |

Méthode : 3 agents d'exploration en parallèle, chacun ciblant une surface (app interne / contrats cross-repo / release+docs), puis vérification directe des findings critiques en relecture de code.

---

## Résumé exécutif

| Sévérité | Nombre | Effet si non corrigé avant v1.0.0 |
|---|---|---|
| 🔴 Bloquant | **1** | Révocation session desktop KO côté portail |
| 🟡 Mineur | **1** | Friction UX minime sur cas edge |
| 🟢 OK | 17 zones | — |

**Recommandation : fix A1 avant le tag `v1.0.0`.** C'est un 1-liner, testable localement en 5 min. B1 peut attendre v1.0.1 — ne bloque aucun user path nominal.

---

## Findings

### 🔴 A1 — JWT claim mismatch : `session_id` (portail) vs `sid` (desktop)

**Fichiers**

- `buildoto-portal/api/portal_api/tokens.py:59` — mint le JWT d'accès :
  ```python
  payload = {
      ...
      "plan_tier": plan_tier,
      "session_id": session_id,
  }
  ```
- `Buildoto/packages/main/src/auth/buildoto.ts:290` — le consomme :
  ```ts
  const sessionId =
    typeof claims.sid === 'string' ? claims.sid : this.session?.sessionId ?? ''
  ```

**Symptôme runtime**

Le desktop n'extrait jamais le `session_id` émis par le portail. À chaque `applyAccessToken()` (première grant, puis tous les refresh), `sessionId` retombe sur `this.session?.sessionId ?? ''`, soit :

- **Sur un cold start** (app fermée, rouverte, refresh token en keytar) : `session = undefined` → `sessionId = ''`.
- **Sur un hot refresh** (app ouverte, access expire après 5 min) : conserve la valeur précédente si elle existait. Mais puisqu'elle n'a jamais été correctement peuplée, reste `''`.

**Conséquence fonctionnelle**

La méthode `signOut()` du desktop envoie `DELETE /desktop/sessions/{id}` avec un ID vide — le portail répond 404 ou ignore. Résultat : quand un user clique « Se déconnecter » dans le Compte panel, **la session côté `desktop_sessions` reste active**. Elle continuera d'accepter des refresh jusqu'à `expires_at` (90 jours) sauf si le user révoque manuellement depuis `/settings` sur le portail.

Ce n'est pas un trou de sécurité immédiat (le refresh token est effacé du keytar au signout côté client), mais c'est un écart observable qui :

1. Salit la table `desktop_sessions` côté Supabase (orphan rows).
2. Casse la promesse de la spec Sprint 8 §3 : « si l'utilisateur se déconnecte via l'app, l'app perd l'accès immédiatement ».
3. Fait mentir la spec d'auth-flow.md (`docs/sprint-8/auth-flow.md`) qui documente une révocation server-side atomique.

**Origine probable**

Drift entre `docs/sprint-8/auth-flow.md` (qui a pu référencer `sid` comme raccourci pour « session ID »), et l'implémentation finale de `tokens.py` qui a préféré le nom explicite `session_id`. Les deux repos ont été implémentés en Phase C (portail) et Phase E (desktop) sans cross-check final.

**Deux correctifs possibles**

| Option | Fichier | Diff | Impact |
|---|---|---|---|
| **Côté portail** *(recommandé)* | `tokens.py:59` | `"session_id"` → `"sid"` | 1 ligne. Les nouveaux JWT fonctionnent. Aucune migration nécessaire (les JWT vivent 5 min). Zéro autre consumer n'utilise ce claim. |
| Côté desktop | `buildoto.ts:290` | `claims.sid` → `claims.session_id` | 1 ligne symétrique. Mais oblige à re-builder les binaires v1.0 si déjà taggés. |

**Recommandation** : corriger côté portail. Le rayon d'impact est plus petit (zéro rebuild desktop), et `sid` est le nom standard dans les JWT (RFC 7519 §4.1.7 & conventions OIDC).

---

### 🟡 B1 — `providerId` default hardcodé `'anthropic'` malgré la nouvelle reco Buildoto AI

**Fichier** : `Buildoto/packages/main/src/agent/opencode-adapter.ts:83`

```ts
this.state = {
  mode: 'default',
  providerId: 'anthropic',
  model: PROVIDER_DEFAULT_MODELS.anthropic,
}
```

**Contexte**

Sprint 1 avait `anthropic` comme seul provider — logique. Sprint 3 a ajouté les autres providers dans le registry. Sprint 8 a introduit `buildoto-ai` comme **recommandation** de l'onboarding (`step-choose-ai.tsx` le place en premier avec badge « Recommandé »). Le state initial de l'adapter n'a pas suivi.

**Impact**

Sur le path nominal (user fait l'onboarding, choisit son provider) : **aucun**. `setProvider()` remplace l'état initial avant que l'agent soit utilisé.

Sur un path edge (user saute l'onboarding via menu « Nouveau projet » avant configuration, ou reset manuel du settings store) : l'app démarre avec `providerId='anthropic'` sans clé configurée. Le premier turn échoue silencieusement jusqu'à ce que le user ouvre Settings → Fournisseurs.

**Suggestion**

Deux options, aucune urgente pour v1.0 :

- **Garder** `anthropic` comme fallback — stable pour les users alpha avec clé déjà configurée.
- **Basculer** sur `buildoto-ai` — cohérent avec la reco, mais déclenche un flow d'auth si le user n'est pas connecté.

Documenter le choix dans un commentaire, reporter à v1.0.1 ou v1.1. Pas un blocker.

---

## Zones vérifiées sans finding

### Desktop (Buildoto/)

| Zone | Preuve |
|---|---|
| **IPC contract** | 29 `IpcChannels.*` dans `packages/shared/src/ipc-types.ts` — tous ont un handler main (`packages/main/src/ipc/*.handler.ts`), une exposition preload (`preload.ts`), un appel renderer. Aucun orphelin. |
| **Preload surface** | `Window.buildoto` (type dans `ipc-types.ts:426-532`) matche exactement `contextBridge.exposeInMainWorld` (`preload.ts:74-253`). |
| **Onboarding** | 5 steps (welcome/choose-ai/github/first-project/tour) importés, range 1–5 respecté, `clampStep` cohérent. Zéro référence à l'ancien `step-api-key.tsx` supprimé Sprint 8. |
| **Sources RAG (Phase G)** | `sourcesByMessageId` dans `session-store.ts:31`, cleanup sur `clear()` (ligne 91), propagation `attachSourcesToLastAssistant` en reverse-walk correct. |
| **Stores Zustand** | 3 stores (`settings`, `project`, `session`) — aucune duplication d'état. |
| **English-only rule** | Identifiants code 100 % EN. Français uniquement dans UI strings (autorisé CLAUDE.md §0). |
| **Security invariants** | `contextIsolation: true`, `nodeIntegration: false`, keys en keytar (jamais electron-store), refresh token en keytar, zéro `ipcRenderer` exposé au renderer. |

### Cross-repo contracts

| Zone | Preuve |
|---|---|
| **JWT signature** | HS256 des deux côtés, `SUPABASE_JWT_SECRET` partagé, `aud="buildoto-ai"` — `tokens.py:32,48,61` vs `middleware.py:63,86,92`. |
| **Plan tier claim** | Minted (`tokens.py:58`), lu côté desktop (`buildoto.ts:287-288`), extrait côté buildoto-ai (`middleware.py:101`). Default `"free"` partout sur claim absent. |
| **Model IDs** | `buildoto-ai-v1` + `buildoto-ai-code` — allow-list serveur (`registry.py:23-26`) = liste exposée desktop (`providers/buildoto-ai.ts`). |
| **Quota headers** | `X-Quota-Limit/Used/Remaining` émis par `quota_middleware.py:64-66`, lus tel quel par `usage.ts:77-79`. Endpoint `/v1/usage` retourne `{plan_tier, limit, used, remaining}` aligné avec le consumer desktop. |
| **Sources wire format** | Header `X-Buildoto-Sources: base64(JSON)` (`chat.py:365`) + SSE `event: sources` (`chat.py:208`) — `parseSourcesHeader` (`buildoto-sources.ts:16`) et `readSourcesFromSse` (`buildoto-sources.ts:84,89`) matchent. Top-10, title 120 chars, champs `{title, url, license, excerpt}` identiques. Type `BuildotoRagSource` partagé via `ipc-types.ts:382-387`. |
| **Deep link** | Scheme `buildoto://` cohérent : `electron-builder.yml:30` + `buildoto.ts:58` + redirect portail. Query params `code` + `state` alignés (`desktop_auth.py:107` ↔ `buildoto.ts:183,195`). |
| **OAuth endpoints** | `POST /desktop/token` body `{code, code_verifier}` match (`desktop_auth.py:122-124` ↔ `buildoto.ts:268`). `POST /desktop/token/refresh` body `{refresh_token}` match (`desktop_auth.py:228-229` ↔ `buildoto.ts:235`). |
| **Supabase schema** | `desktop_sessions` + `desktop_auth_codes` dans `buildoto-portal/docs/sprint-8/supabase-schema.sql` — colonnes consommées par `desktop_auth.py` présentes (`supabase-schema.sql:24-34, 54-63`). |

### Release + site + docs

| Zone | Preuve |
|---|---|
| **Versions** | Tous les `package.json` à `1.0.0`. `electron-builder.yml:75-76` sur `channel: stable`, `releaseType: release`. `updater.ts:70` force `autoUpdater.channel = 'stable'` runtime pour migration alpha→stable. |
| **Site pages** | 7 pages (`index`, `install`, `pricing`, `ai`, `faq`, `changelog`, `privacy`) toutes sur `v1.0.0`. Liens internes résolvent. Domaine `buildoto.com` constant (pas de drift `.app`). Artefacts `Buildoto-1.0.0-*.{dmg,exe,AppImage}` bien référencés. |
| **Release config** | `protocols: [{schemes: [buildoto]}]` déclaré, `asarUnpack: resources/**` pour sidecar FreeCAD, `extraResources: resources/freecad/${os}-${arch}` aligné avec `scripts/postinstall.ts:18,66`. |
| **Comms drafts** | 10 fichiers sous `docs/sprint-8/comms/`. Pricing cohérent (Free 100 req / Pro 19 €/mois 2000 req) dans tous les drafts. URLs uniformes `buildoto.com` + `app.buildoto.com`. Feature claims (23 outils FreeCAD, 2 modèles Buildoto AI) traçables dans le code. |
| **Sprint-8 artefacts** | Les 5 mandatoires présents : `alpha-learnings.md`, `auth-flow.md`, `wireframes.md`, `release-notes-v1.0.md`, `comms-plan.md`. |

---

## Ce que cet audit NE couvre pas

Pour que le user ait une idée claire des angles morts :

- **Pas de test d'intégration runtime.** Les contrats sont validés par lecture statique, pas en exécutant un flow OAuth complet + première génération + affichage de sources end-to-end. Recommandé en tâche séparée avant publication (voir annexe « smoke test ci-dessous »).
- **Pas d'audit sécurité externe.** Pas de SAST/DAST, pas de fuzzing du parser SSE, pas de review pentest des endpoints portail. Spec Sprint 8 ne l'exigeait pas.
- **Pas de perf.** Latence de `/v1/chat/completions` sous charge, temps de boot Electron, mémoire du sidecar FreeCAD — non mesurés.
- **Pas de relecture orthographe/style des drafts comms.** Le contenu (pricing, URLs, feature claims) est vérifié ; le ton et la fluidité restent à la charge du user avant publication.
- **Pas de vérification légale.** Licence du sidecar FreeCAD bundlé (LGPL ↔ MIT) : à confirmer avec un juriste si le user veut du confort. La doc forum-FreeCAD mentionne ce point comme « à préparer ».

---

## Annexe A — commandes de relecture ciblée

Après fix, le user peut re-vérifier sans relancer l'audit complet :

```bash
# A1 — JWT claim name (après fix côté portail, doit retourner la nouvelle valeur)
rg '"sid"|"session_id"' /Users/sebastienmignot/Documents/buildoto-portal/api/portal_api/tokens.py
rg 'claims\.(sid|session_id)' /Users/sebastienmignot/Documents/Buildoto/packages/main/src/auth/buildoto.ts

# B1 — default provider
rg "providerId: '" /Users/sebastienmignot/Documents/Buildoto/packages/main/src/agent/opencode-adapter.ts

# Sanity — versions uniformes
rg '"version":' /Users/sebastienmignot/Documents/Buildoto/package.json /Users/sebastienmignot/Documents/Buildoto/packages/*/package.json /Users/sebastienmignot/Documents/Buildoto/apps/*/package.json

# Sanity — aucune régression sur le scheme deep-link
rg 'buildoto://' /Users/sebastienmignot/Documents/Buildoto/packages/main/src /Users/sebastienmignot/Documents/buildoto-portal/web/src /Users/sebastienmignot/Documents/Buildoto/electron-builder.yml
```

## Annexe B — smoke test end-to-end suggéré avant tag v1.0.0

Sur un Mac vierge (ou VM) sans données Buildoto préexistantes :

1. Build `pnpm package:mac-arm64`. Installer le `.dmg`.
2. Lancer, valider Gatekeeper via Ctrl-clic.
3. Onboarding → Step 2 → « Buildoto AI » → login portail.
4. Vérifier que le deep link `buildoto://auth?code=…&state=…` ouvre l'app et peuple le panneau Compte.
5. Première génération : prompt « crée un cube de 1m ». Attendre la réponse + vérifier que le cube apparaît dans le viewport + commit Git créé.
6. Cliquer sur le drawer sources sous une réponse factuelle → au moins 1 source listée avec titre + excerpt + lien cliquable.
7. Status bar : pill « Buildoto AI · Plan Free · X / 100 ce mois ». Cohérence avec le portail.
8. Settings → Compte → « Se déconnecter ». Vérifier côté portail `/settings` que la session desktop est bien marquée `revoked_at` non-null.  
   **(C'est le point qui casse actuellement à cause d'A1.)**

Si le point 8 échoue, c'est la signature du bug A1. Après fix côté portail et re-mint d'un nouveau JWT, le point 8 doit passer sans rebuild desktop.

---

*Audit généré le 2026-04-21.*
