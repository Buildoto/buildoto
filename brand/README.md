# Buildoto Brand Kit

Assets visuels pour Buildoto. Spec complète dans `docs/sprint-4/brand-kit.md`.

## Structure attendue

```
brand/
├── logo-wordmark.svg          # "Buildoto" + mark, variante claire
├── logo-wordmark-dark.svg     # variante sombre
├── logo-mark.svg              # mark compact (sans texte)
├── icon.png                   # 1024×1024 source pour electron-icon-builder
├── favicon.svg
├── og-card.png                # 1200×630 pour les vitrines
├── onboarding/
│   ├── welcome.svg
│   ├── api-key.svg
│   ├── github.svg
│   ├── project.svg
│   └── tour.svg
└── screenshots/
    ├── agent.png
    ├── viewport.png
    └── history.png
```

## Pipeline icônes

`scripts/generate-icons.ts` consomme `brand/icon.png` et produit `build/icon.icns`,
`build/icon.ico`, `build/icons/*.png` via `electron-icon-builder`.

## Palette

- Primary : `#2563EB` (blue-600)
- Accent : `#14B8A6` (teal-500)

## Typographie

- Inter (UI)
- JetBrains Mono (code / agent)

Self-hostés via Fontsource dans le renderer.

## Statut actuel

Assets à produire. Tant qu'ils ne sont pas livrés, `scripts/generate-icons.ts` est no-op et
electron-builder utilise ses défauts (icône générique). La vitrine Astro et les docs VitePress
utilisent des placeholders `/favicon.svg` et `/og.png` qui doivent être remplacés avant le premier
déploiement Cloudflare Pages.
