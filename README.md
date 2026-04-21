# Buildoto

**L'IDE pour la construction.** Un agent IA qui pilote FreeCAD, Git natif, GitHub intégré — une seule fenêtre, votre machine.

[![CI](https://github.com/buildoto/buildoto/actions/workflows/ci.yml/badge.svg)](https://github.com/buildoto/buildoto/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-34-47848f)](https://www.electronjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)](https://www.typescriptlang.org/)

## Téléchargement

Voir [buildoto.com](https://buildoto.com) ou les [GitHub Releases](https://github.com/buildoto/buildoto/releases) pour les `.dmg` / `.exe` / `.AppImage`.

> ⚠️ **Alpha non signé** : macOS Gatekeeper et Windows SmartScreen affichent un avertissement au premier lancement. Voir la [documentation d'installation](https://docs.buildoto.com/installation).

## Fonctionnalités

- **Agent IA multi-provider** — Anthropic, OpenAI, Mistral, Google, OpenRouter, Ollama (local)
- **23 outils FreeCAD structurés** — Part, Arch (BIM), Draft, Spreadsheet, Sketcher
- **Git natif + GitHub OAuth** — commit/push/pull depuis l'app, Device Flow (pas de browser embarqué)
- **Modes Plan / Build** — lecture seule vs écriture, bascule `Tab`
- **Serveurs MCP** — extensibilité via Model Context Protocol
- **100% local par défaut** — aucune télémétrie sans opt-in explicite

## Prérequis

- **macOS** 11+ / **Windows** 10+ / **Linux** glibc 2.31+
- Une clé API provider (ou un modèle Ollama local pour fonctionner offline)

## Quickstart développeur

```bash
git clone https://github.com/buildoto/buildoto.git
cd buildoto
pnpm install     # télécharge FreeCAD pour votre OS au postinstall
pnpm dev         # Electron + Vite HMR
```

Voir [`CONTRIBUTING.md`](./CONTRIBUTING.md) pour le workflow complet.

## Architecture

Monorepo pnpm :

| Package | Rôle |
|---|---|
| `packages/main` | Processus Electron main (Node), sidecar FreeCAD, IPC handlers |
| `packages/renderer` | UI React 19 + Tailwind 4 + shadcn/ui |
| `packages/shared` | Types IPC + protocoles (source de vérité) |
| `vendor/opencode-core` | Core agent multi-provider vendored |
| `apps/site` | Vitrine Astro (buildoto.com) |
| `apps/docs` | Documentation VitePress (docs.buildoto.com) |
| `examples/` | Projets exemples prêts à essayer |

Détails dans [`CLAUDE.md`](./CLAUDE.md).

## Liens

- 🌐 **Site** : [buildoto.com](https://buildoto.com)
- 📚 **Docs** : [docs.buildoto.com](https://docs.buildoto.com)
- 🐛 **Issues** : [github.com/buildoto/buildoto/issues](https://github.com/buildoto/buildoto/issues)
- 🔒 **Sécurité** : [`SECURITY.md`](./SECURITY.md)
- 🤝 **Contribuer** : [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- 📝 **Changelog** : [`CHANGELOG.md`](./CHANGELOG.md)

## Licence

[MIT](./LICENSE) © Buildoto contributors
