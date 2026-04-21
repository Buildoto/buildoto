# Sprint 4 — UI polish checklist

Panel-by-panel pass. Each row: current state, target, copy (French), implementation note. Referenced by spec §5.

---

## Empty states

| Panel | Trigger | Copy (title / description) | CTA | File |
|---|---|---|---|---|
| Messages | `messages.length === 0` | "Pose la première question à l'agent." / "Décris ce que tu veux construire — ou demande-lui un plan avant de lancer la construction." | "Voir un exemple" → open `examples/01-cube/` in docs | `components/agent/messages-panel.tsx` |
| Modeler viewport | `gltfBase64 === null` | "Aucun modèle à afficher." / "L'agent construira ici les objets FreeCAD." | none (purely informational) | `components/viewport/viewport-panel.tsx` |
| Git panel | `commits.length === 0` | "Aucun commit pour l'instant." / "Les modifications de l'agent génèrent un commit automatique." | "Faire un commit manuel" → opens commit dialog | `components/git/git-panel.tsx` |
| Project panel | `activeProjectId === null` | "Aucun projet ouvert." / "Crée ou ouvre un projet pour commencer." | "Nouveau projet" → palette `project:create` | `components/project/project-panel.tsx` |
| MCP settings | `mcpServers.length === 0` | "Aucun serveur MCP configuré." / "Connecte des serveurs MCP pour étendre les capacités de l'agent (fetch, filesystem, etc.)." | "Ajouter un serveur" → opens McpEditor | `components/layout/settings-dialog.tsx` (MCP tab) |

All use shared component `<EmptyState illustration={...} title={...} description={...} action={...} />` from `components/feedback/empty-state.tsx`.

---

## Loading states

| Panel | Trigger | Visual | File |
|---|---|---|---|
| Messages | `isRunning && lastMessage.role !== 'assistant'` | 3-dot pulse below last message, label "L'agent réfléchit…" | `components/agent/messages-panel.tsx` |
| Viewport | `freecadStatus.state === 'booting'` | Centered spinner + "Démarrage du moteur FreeCAD…" + progress bar if `progress` field present | `components/viewport/viewport-panel.tsx` |
| Viewport | Tool call in flight | Subtle top bar "Exécution: {toolName}…" with indeterminate progress | same |
| Git panel | `isPushing \|\| isCommitting` | Inline spinner next to commit button, disable until done | `components/git/git-panel.tsx` |
| Settings | API key validation | Inline spinner in the "Valider" button; disable during call | `components/layout/settings-dialog.tsx` |

Shared: `<LoadingSkeleton variant="messages" \| "viewport" \| "list" \| "inline" />` from `components/feedback/loading-skeleton.tsx` (wraps shadcn Skeleton).

---

## Error states

Two patterns:

### Inline banner (`<ErrorBanner />`)

Use when the error invalidates the panel itself.

| Condition | Panel | Copy | Recovery action |
|---|---|---|---|
| API key invalid (401 from provider) | Messages (top) | "Clé API refusée par {provider}. Vérifie-la dans les réglages." | Button "Ouvrir les réglages" |
| FreeCAD sidecar crashed (`state === 'crashed'`) | Viewport | "Le moteur FreeCAD s'est arrêté." | Button "Redémarrer" |
| Project path missing (disk unplugged, folder deleted) | Project panel | "Projet introuvable à {path}." | Buttons "Retrouver" (path picker) / "Fermer le projet" |
| MCP server spawn failure | Settings MCP tab | "Serveur {name} introuvable: {error}." | Button "Modifier" / "Supprimer" |
| Git push rejected (diverged branch) | Git panel | "Le push a été refusé: la branche a divergé." | Button "Voir les détails" opens modal with resolution options |

### Toast (`sonner`)

Use when the error is transient/recoverable and doesn't require persistent visibility.

| Condition | Level | Copy |
|---|---|---|
| Network timeout (any IPC → provider/github) | `error` | "Réseau indisponible. Réessaie." |
| Clipboard write failure | `info` | "Impossible de copier dans le presse-papier." |
| Tool execution error (non-fatal) | `warning` | "L'outil {name} a échoué: {message}. L'agent peut réessayer." |
| Auto-update check failed | `info` | "Mise à jour indisponible pour le moment." |
| MCP tool invocation failed | `warning` | "Outil MCP {name}: {error}." |
| Commit succeeded | `success` | "Commit créé: {sha.slice(0,7)}" |
| Update downloaded | `success` | "Mise à jour v{version} prête. Redémarrer pour installer." (with action button) |

Policy: errors from TanStack Query mutations default to `toast.error(err.message)`; handlers can override via `onError` for specific channels.

---

## Keyboard shortcuts

Source of truth: `packages/renderer/src/lib/shortcuts.ts`. Mac modifier = `⌘`, Win/Linux = `Ctrl`.

| Action | Mac | Win/Linux | Scope |
|---|---|---|---|
| Ouvrir la palette de commandes | `⌘K` | `Ctrl+K` | global |
| Envoyer le message | `⌘↵` | `Ctrl+Enter` | agent input focused |
| Basculer mode Build ↔ Plan | `Tab` | `Tab` | agent input focused |
| Nouveau projet | `⌘N` | `Ctrl+N` | global |
| Ouvrir un projet | `⌘O` | `Ctrl+O` | global |
| Ouvrir les réglages | `⌘,` | `Ctrl+,` | global |
| Fermer le projet | `⌘W` | `Ctrl+W` | global |
| Basculer le thème | `⌘⇧T` | `Ctrl+Shift+T` | global |
| Afficher les logs FreeCAD | `⌘⇧L` | `Ctrl+Shift+L` | global |
| Quitter | `⌘Q` | (menu) | global |

Global listener attached at `App.tsx` root, respects input focus (`event.target instanceof HTMLInputElement` etc.).

Palette displays all of these in a "Raccourcis" section at the bottom.

---

## Theme token audit

Tailwind 4 with CSS variables. Dark mode via `@custom-variant dark (&:is(.dark *))` on `<html>`.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--color-background` | `#FFFFFF` | `#0A0A0A` | app shell |
| `--color-foreground` | `#0A0A0A` | `#FAFAFA` | primary text |
| `--color-card` | `#FFFFFF` | `#111111` | panel surface |
| `--color-muted` | `#F4F4F5` | `#1A1A1A` | subtle surface |
| `--color-muted-foreground` | `#71717A` | `#A1A1AA` | secondary text |
| `--color-border` | `#E4E4E7` | `#27272A` | dividers |
| `--color-input` | `#FFFFFF` | `#0A0A0A` | form controls |
| `--color-primary` | `#2563EB` | `#60A5FA` | CTAs |
| `--color-primary-foreground` | `#FFFFFF` | `#0A0A0A` | text on primary |
| `--color-accent` | `#14B8A6` | `#2DD4BF` | highlights |
| `--color-destructive` | `#DC2626` | `#EF4444` | errors |
| `--color-ring` | `#2563EB` | `#60A5FA` | focus ring |

Audit existing components:
- All hard-coded colors (e.g. `text-gray-500`, `bg-white`) replaced with tokens.
- `ViewportPanel` three.js background color switches via `useTheme`.
- FreeCAD glTF material tint follows theme (lighten in light mode, darken in dark — optional polish).

---

## Accessibility pass

- Every icon-only button has an `aria-label`.
- Focus ring visible on all interactive elements (`focus-visible:ring-2 focus-visible:ring-primary`).
- Color contrast: run `axe-core` dev-tools pass on each panel, fix any contrast < 4.5:1 for text.
- Modal dialogs trap focus (shadcn Dialog already does this).
- Escape closes: command palette, dialogs, onboarding skip confirmation.
- Tab order in onboarding: inputs → Valider → Continuer.
- Screen reader: onboarding progress announced ("Étape 2 sur 5 — Configuration des clés API").

---

## Animation policy

- Respect `prefers-reduced-motion`: disable non-essential transitions.
- Onboarding step transitions: 150ms fade + 4px translate.
- Toast enter: 200ms slide.
- Command palette: 100ms fade, no translate.
- No bouncy / long / decorative animations.
