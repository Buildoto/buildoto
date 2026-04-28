# Buildoto — Gaps restants (post-audit, post-plan)

Date : 2026-04-28  
Basé sur un re-scan complet du codebase après exécution du plan de production.

---

## Contexte

25 items du plan de production ont été résolus. Ce document liste ce qui reste à faire,
identifié par un re-scan systématique de tous les composants, handlers, et scripts Python.

**16 items** au total, classés par sévérité.

---

## Groupe A — Critique (expérience utilisateur cassée)

### A1. `use-git.ts` rend les erreurs silencieuses

**Fichier** : `packages/renderer/src/hooks/use-git.ts:35-53`

`commit()`, `checkout()`, `createBranch()` retournent tous `.catch(() => null/undefined)`
sans aucun log ni notification. L'utilisateur ne voit jamais d'erreur quand ces opérations
échouent — le bouton se désactive puis se réactive, rien ne se passe.

**Fix** : logger l'erreur avec `console.warn` avant le `.catch()`, ou afficher un toast.

---

### A2. Aucun ErrorBoundary dans le viewport 3D

**Fichier** : `packages/renderer/src/components/modeler/gltf-loader.tsx`

Si le parse GLTF échoue (fichier corrompu, mémoire insuffisante), l'exception Three.js
cascade dans le Canvas et le fait crasher. Aucune barrière React ne l'attrape.

**Fix** : wrapper `<GltfScene>` dans un ErrorBoundary React avec message "Erreur d'affichage 3D".

---

### A3. `use-project.ts` bootstrap sans erreur

**Fichier** : `packages/renderer/src/hooks/use-project.ts:12-24`

```typescript
Promise.all([getActive(), listRecent()])
  .then(...)
  .finally(() => setBootstrapped(true))  // ← même en cas d'erreur
```

Si `getActive()` ou `listRecent()` échouent, le `.finally()` passe l'app en "prêt"
avec `activeProject = null` et `recentProjects = []`. L'utilisateur voit l'écran
d'accueil mais ses projets récents ont disparu sans explication.

**Fix** : catcher l'erreur, la logger, et continuer (ne pas bloquer le bootstrap).

---

### A4. 10 erreurs EN encore visibles par l'utilisateur

Les `throw new Error()` des handlers suivants atteignent le renderer en anglais :

| Fichier | Message |
|---------|---------|
| `freecad/sidecar.ts:87` | `'Unsupported platform: ...'` |
| `freecad/sidecar.ts:103` | `'freecadcmd not found...'` |
| `freecad/sidecar.ts:116` | `'runner.py not found...'` |
| `freecad/sidecar.ts:356` | `'FreeCAD sidecar not ready...'` |
| `freecad/sidecar.ts:358` | `'FreeCAD sidecar socket not connected'` |
| `freecad/client.ts:30` | `'Unexpected FreeCAD response...'` |
| `auth/buildoto.ts:239` | `'Not signed in to Buildoto AI'` |
| `store/settings.ts:158` | `'API key is empty'` |
| `store/settings.ts:232` | `'GitHub token is empty'` |
| `mcp/manager.ts:69` | `'Unknown MCP server: ...'` |

**Fix** : traduire en français.

---

### A5. `screenshot` tool enregistré mais toujours en échec

**Fichier** : `resources/freecad/handlers/introspect.py:132` + `packages/main/src/tools/introspect.ts:83-93`

L'outil `screenshot` a un schéma Zod complet et une description détaillée, mais le
handler Python lève `NotImplementedError` (GUI requise). L'agent LLM croit pouvoir
l'utiliser et échoue systématiquement.

**Fix** : retirer l'outil de `introspectTools` et du dictionnaire `TOOLS` Python,
ou ajouter une description explicite "NE MARCHE PAS EN MODE HEADLESS".

---

## Groupe B — Important (UX dégradée)

### B1. 8 composants sans état de chargement

| Composant | Problème |
|-----------|----------|
| `commit-list.tsx` | Affiche "Aucun commit" pendant le chargement (confondu avec l'état vide) |
| `branch-switcher.tsx` | Dropdown vide pendant `listBranches()` |
| `file-tree.tsx` | Arbre vide pendant `listTree()` |
| `viewport.tsx` | `<Suspense fallback={null}>` = rien pendant le chargement GLTF |
| `gltf-loader.tsx` | Retourne `null` pendant le parse |
| `code-editor.tsx` | Éditeur blanc pendant `readFile()` |
| `update-banner.tsx` | Retourne `null` pendant `checking` |
| `git-panel.tsx` | Affiche "Propre" pendant `useGitStatus()` |

**Fix** : ajouter `LoadingSkeleton` ou spinner dans chaque composant.

---

### B2. 5 composants sans état d'erreur

| Composant | Problème |
|-----------|----------|
| `commit-list.tsx` | Pas de `.catch()` sur `log()` |
| `file-tree.tsx` | Pas de `.catch()` sur `listTree()` |
| `gltf-loader.tsx` | Erreur de parse loggée dans console seulement |
| `code-editor.tsx` | Pas de `.catch()` sur `readFile()` |
| `sessions-toolbar.tsx` | Pas de `.catch()` sur `session.list()` |

**Fix** : ajouter `.catch()` avec toast ou état d'erreur dans chaque cas.

---

### B3. `file-tree.tsx` : ni chargement, ni vide, ni erreur

**Fichier** : `packages/renderer/src/components/explorer/file-tree.tsx`

Le composant le plus sous-équipé : pas de skeleton, pas de message "dossier vide",
pas de message d'erreur. Si l'IPC échoue, l'arbre reste silencieusement vide.

**Fix** : ajouter loading skeleton + empty state + error state.

---

### B4. `console.log('[freecad stdout]', line)` bruyant en prod

**Fichier** : `packages/main/src/freecad/sidecar.ts:264`

Chaque ligne de stdout de FreeCAD est imprimée dans la console. En production,
cela peut générer des centaines de lignes inutiles.

**Fix** : remplacer par `console.debug` ou supprimer.

---

### B5. Python sketcher : `import Part` sans garde

**Fichier** : `resources/freecad/handlers/sketcher.py:6`

```python
import Part  # type: ignore
```

Tous les autres handlers utilisent `try/except Exception: Part = None`. Si `Part`
n'est pas disponible, sketcher.py crashe au chargement et emporte tout le package
de handlers.

**Fix** : ajouter le try/except comme dans les autres handlers.

---

### B6. Python sketcher : `ValueError` au lieu de `LookupError`

**Fichier** : `resources/freecad/handlers/sketcher.py:69,71`

Les autres handlers utilisent `raise LookupError(...)` pour les objets inconnus,
ce qui est capté par le runner et mappé en `OBJECT_NOT_FOUND`. Les `ValueError`
du sketcher passent par le handler générique `PYTHON_EXCEPTION`.

**Fix** : remplacer `ValueError` par `LookupError`.

---

## Groupe C — Polish

### C1. Temp file non nettoyé sur exception dans export_gltf

**Fichier** : `resources/freecad/handlers/introspect.py:106-112`

`os.remove(tmp)` n'est pas dans un bloc `finally`. Si `Import.export()` lève une
exception, le fichier temporaire fuit.

**Fix** : déplacer `os.remove` dans un `finally`.

---

### C2. Code mort `PLANE_MAP` et variable `base` dans sketcher.py

**Fichier** : `resources/freecad/handlers/sketcher.py:8-12,18`

La variable `base` est assignée mais jamais utilisée. Les vecteurs dans `PLANE_MAP`
sont conceptuellement incorrects (XY → Vector(0,0,0) ?).

**Fix** : supprimer le code mort.

---

### C3. `part_boolean` et `part_extrude` ne retournent pas `label`

**Fichier** : `resources/freecad/handlers/part.py:85,108`

Tous les autres outils de création retournent `label` dans leur réponse. Ces deux-là
non. Incohérence pour l'agent LLM.

**Fix** : ajouter `"label": obj.Label` dans les retours.

---

### C4. `sketcher_close_sketch` ne retourne pas `label`

**Fichier** : `resources/freecad/handlers/sketcher.py:73`

Idem — `object_id` est retourné mais pas `label`.

**Fix** : ajouter `"label": obj.Label`.

---

### C5. `arch_create_wall` et `arch_create_floor` ignorent `material`

**Fichier** : `resources/freecad/handlers/arch.py`

Le paramètre `material` est défini dans le schéma TypeScript mais jamais lu dans
le handler Python. L'agent passe de la matière qui est silencieusement ignorée.

**Fix** : soit implémenter l'application du matériau, soit retirer du schéma TS.

---

### C6. Noms de clés inconsistants `data_base64` vs `data`

**Fichier** : `resources/freecad/handlers/introspect.py:104` vs `runner.py:105`

Les deux chemins d'export GLTF (tool_invoke via `introspect.py` vs message direct
via `runner.py`) retournent des noms de clés différents pour les données binaires.

**Fix** : unifier le nom de clé.

---

## Récapitulatif

| Groupe | Nb items | Effort estimé |
|--------|----------|---------------|
| **A — Critique** | 5 | ~4h |
| **B — Important** | 6 | ~6h |
| **C — Polish** | 6 | ~2h |
| **Total** | **16** | **~12h** |

Le fichier `docs/production-readiness-plan.md` reste la référence canonique pour
ce qui a déjà été fait. Ce document liste les 16 items restants identifiés après
exécution du plan.
