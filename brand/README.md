# Buildoto Brand Kit

Assets visuels pour Buildoto.

## Fichiers

| Fichier | Source | Usage |
|---------|--------|-------|
| `icon-source.png` | `icon-buildoto.png` | Icône applicative (macOS .icns, Windows .ico, Linux .png) |
| `logo-wordmark.png` | `logo-buildoto.png` | Logo complet pour site web et docs |
| `icon.svg` | Placeholder SVG | Fallback si le PNG source n'est pas disponible |

## Pipeline icônes

`scripts/generate-icons.ts` consomme `brand/icon-source.png` et produit :
- `build/icon.icns` — macOS
- `build/icon-1024.png` — source pour Windows .ico (auto-converti par electron-builder)
- `build/icons/*.png` — Linux (64, 128, 256, 512 px)

Lancer la génération :
```bash
npx tsx scripts/generate-icons.ts
```

Les icônes sont regénérées automatiquement avant chaque `pnpm package:*` (via `postinstall`).

## Palette

- Primary : `#2563EB` (blue-600)
- Accent : `#14B8A6` (teal-500)

## Typographie

- Inter (UI)
- JetBrains Mono (code / agent)
