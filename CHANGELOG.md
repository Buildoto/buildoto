# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.
Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versioning
[SemVer](https://semver.org/lang/fr/).

## [Unreleased]

## [0.1.0-alpha.0] — 2026-04-20

Première pré-version alpha publique. Goal : qu'un professionnel AEC puisse passer de la landing
page au premier modèle 3D en moins de 10 minutes.

### Added

- **Sprint 1 — Fondations**
  - Shell Electron 34 + Vite + React 19 + TypeScript strict + Tailwind 4 + shadcn/ui
  - Boucle agent minimale (Claude API) avec tool-use
  - Sidecar FreeCAD bundlé (macOS arm64/x64, Windows x64, Linux x64) via WebSocket local
  - Stockage sécurisé via keytar pour les clés API (jamais en clair)
  - Viewer 3D react-three-fiber (lecture seule) alimenté par l'export glTF de FreeCAD

- **Sprint 2 — Projets + Git + GitHub**
  - Gestion de projet (création, ouverture, clonage, récents)
  - Panneau Git intégré (status, stage, commit, push, pull, historique) via simple-git
  - Authentification GitHub OAuth Device Flow
  - Création automatique de repo GitHub privé à la création de projet
  - Persistance de sessions agent par projet

- **Sprint 3 — Multi-provider + OpenCode + MCP**
  - Core OpenCode vendored (`vendor/opencode-core`) pour boucle agent multi-provider
  - Support Anthropic, OpenAI, Mistral, Google, OpenRouter, Ollama
  - 23 outils FreeCAD structurés (Part, Arch, Draft, Spreadsheet, Sketcher)
  - Serveurs MCP (stdio + SSE), gérés dans les réglages
  - Modes Plan (lecture seule) / Build (lecture-écriture) bascule `Tab`

- **Sprint 4 — Polish, packaging, onboarding, alpha release** (présent)
  - Onboarding guidé en 5 étapes (Welcome + consentement, Clé API, GitHub, Projet, Tour)
  - Palette de commandes `⌘K` (cmdk)
  - Registre de raccourcis clavier centralisé
  - Composants de feedback (empty state, loading skeleton, error banner, toasts sonner)
  - Thème clair/sombre/système, persistant
  - Auto-updater `electron-updater` (channel `alpha`, opt-in)
  - Crash reporting `@sentry/electron` (opt-in, PII scrub)
  - Télémétrie PostHog Cloud EU (opt-in, ID anonyme, consentement explicite)
  - Onglet Confidentialité dans les réglages
  - Bannière de mise à jour dans l'app shell
  - Hooks electron-builder pour notarisation macOS + signature Windows (no-op alpha)
  - Entitlements Hardened Runtime macOS
  - Vitrine Astro (`apps/site`) + docs VitePress (`apps/docs`)
  - 3 exemples seedés (cube, mur+porte, pièce paramétrique)
  - Gouvernance : LICENSE (MIT), CONTRIBUTING, CODE_OF_CONDUCT, SECURITY
  - Workflows GitHub Actions : CI (PR) + Release (tag)

### Known limitations

- Builds **non signés** : macOS Gatekeeper et Windows SmartScreen nécessitent un contournement
  manuel. La signature arrivera dans une release ultérieure.
- Pas de reprise automatique de conflit Git — utiliser la CLI Git en cas de conflit.
- Le tour onboarding (étape 5) est un carousel modal, pas encore un hotspot sur le layout.
- L'auto-updater Linux AppImage nécessite la variable d'env `APPIMAGE` pour fonctionner.

[Unreleased]: https://github.com/buildoto/buildoto/compare/v0.1.0-alpha.0...HEAD
[0.1.0-alpha.0]: https://github.com/buildoto/buildoto/releases/tag/v0.1.0-alpha.0
