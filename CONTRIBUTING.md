# Contribuer à Buildoto

Merci de vouloir contribuer ! Buildoto est un projet open-source (MIT) en cours de développement.

## Setup

```bash
git clone https://github.com/buildoto/buildoto.git
cd buildoto
pnpm install        # postinstall télécharge FreeCAD pour votre OS
pnpm dev            # lance Electron + Vite
```

**Prérequis** : Node.js ≥ 20.18, pnpm ≥ 9.12.

## Architecture

Monorepo pnpm :
- `packages/main` — processus Electron main (Node.js), sidecars FreeCAD, IPC
- `packages/renderer` — UI React 19 + Tailwind 4 + shadcn
- `packages/shared` — types IPC + protocoles (source de vérité)
- `vendor/opencode-core` — lib vendored multi-provider AI
- `apps/site` — vitrine Astro (buildoto.com)
- `apps/docs` — documentation VitePress (docs.buildoto.com)
- `examples/` — projets exemples

Voir [`CLAUDE.md`](./CLAUDE.md) pour les conventions de code détaillées.

## Workflow

1. **Branche** : `git checkout -b feat/xyz` depuis `develop`
2. **Code** : respectez la règle "anglais pour tout identifiant, français pour les libellés UI"
3. **Vérifs locales** : `pnpm type-check && pnpm lint && pnpm build`
4. **Commit** : format Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
5. **PR vers `develop`** : templates automatiques, CI obligatoire

## Style de commit

```
<type>(<scope>): <sujet en impératif>

<corps optionnel — expliquer le pourquoi, pas le quoi>
```

Types : `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, `ci`, `build`.

## Branches

- `main` — releases publiées uniquement
- `develop` — intégration
- `feat/*`, `fix/*`, `chore/*` — travail

**Jamais de push direct sur `main`.** Les releases sont créées via tag depuis `develop` après
review.

## Exécuter les tests

```bash
pnpm smoke              # smoke test FreeCAD (cube)
pnpm smoke:project      # smoke project + git
pnpm smoke:agent        # smoke agent multi-provider (nécessite une clé)
```

## Divulgation de sécurité

Voir [`SECURITY.md`](./SECURITY.md).

## Code of Conduct

Voir [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md).
