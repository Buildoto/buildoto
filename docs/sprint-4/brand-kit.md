# Sprint 4 — Brand kit spec

Minimal identity shipped with v0.1.0-alpha.0. Assets live in `/brand/` at repo root.

---

## Logo

### Wordmark — `brand/logo-wordmark.svg`

Text "Buildoto" in Inter Bold, 48px cap height. Kerning -2%. Accent dot on the `o` of `oto` in primary blue (`#2563EB`).

- `logo-wordmark-light.svg` — black text, blue dot. For light backgrounds.
- `logo-wordmark-dark.svg` — white text, blue dot. For dark backgrounds.

Used in: vitrine hero, docs header, README, onboarding welcome screen, settings "About" tab.

### Compact mark — `brand/logo-mark.svg`

Single stylized `B` inside a rounded square. 128×128 viewBox. Blue `#2563EB` fill, white or black letterform depending on context.

- `logo-mark-light.svg` — blue square, white B.
- `logo-mark-dark.svg` — transparent square with blue outline, blue B.

Used in: app icon (expanded to 1024×1024 PNG), favicon (rendered to SVG).

---

## Color palette

### Primary

- `--buildoto-blue-500: #3B82F6`
- `--buildoto-blue-600: #2563EB` ← primary
- `--buildoto-blue-700: #1D4ED8` (hover)

### Accent

- `--buildoto-teal-400: #2DD4BF` (dark mode)
- `--buildoto-teal-500: #14B8A6` (light mode)

### Neutral ramp (Zinc-based)

`#FAFAFA` → `#F4F4F5` → `#E4E4E7` → `#D4D4D8` → `#A1A1AA` → `#71717A` → `#52525B` → `#3F3F46` → `#27272A` → `#18181B` → `#0A0A0A`

### Semantic

- `--buildoto-success: #16A34A`
- `--buildoto-warning: #F59E0B`
- `--buildoto-error: #DC2626`
- `--buildoto-info: #0EA5E9`

Exposed as Tailwind 4 CSS variables via `packages/renderer/src/index.css`. Reused in Astro vitrine and VitePress docs for visual consistency.

---

## Typography

### UI

**Inter** — self-hosted via `@fontsource/inter`, weights 400 / 500 / 600 / 700. Variable font preferred (`@fontsource-variable/inter`) to reduce bundle size.

```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

### Code / agent messages

**JetBrains Mono** — self-hosted via `@fontsource/jetbrains-mono`, weights 400 / 600. Ligatures enabled.

```css
font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', monospace;
font-feature-settings: 'calt' 1;
```

### Scale (renderer)

- `text-xs`: 12px / 16px (`--font-xs`)
- `text-sm`: 14px / 20px
- `text-base`: 16px / 24px
- `text-lg`: 18px / 28px
- `text-xl`: 20px / 28px
- `text-2xl`: 24px / 32px
- `text-3xl`: 30px / 36px (headings H2)
- `text-4xl`: 36px / 40px (vitrine hero)

---

## Iconography

- **Primary set**: `lucide-react` (already used, ~1300 icons, consistent stroke width).
- **Custom SVGs** (onboarding illustrations only):
  - `brand/onboarding/welcome.svg` — abstract building + cube + chat bubble
  - `brand/onboarding/api-key.svg` — key + neural net motif
  - `brand/onboarding/github.svg` — octocat + branch (adapted from GitHub Octicons, MIT)
  - `brand/onboarding/project.svg` — folder + blueprint
  - `brand/onboarding/tour.svg` — compass + dashboard panels

Style: flat, 2-color (primary blue + neutral outline), ~400×300 viewBox, no gradients. Designed in Figma, exported SVG, optimized with SVGO.

---

## Favicon & app icon pipeline

Source: `brand/icon.png` (1024×1024, PNG with alpha, compact mark on colored background).

Build script: `scripts/generate-icons.ts` (wraps `electron-icon-builder`):

```
pnpm tsx scripts/generate-icons.ts
# produces:
#   build/icon.icns  (macOS, 5 sizes bundled)
#   build/icon.ico   (Windows, 6 sizes bundled)
#   build/icons/*.png (Linux, 16/32/48/64/128/256/512/1024)
```

Favicon for vitrine/docs: `brand/favicon.svg` (compact mark, no background, scales via `<link rel="icon" type="image/svg+xml">`).

---

## Social / OG card

`brand/og-card.png` — 1200×630 PNG.

Composition: wordmark left-centered, tagline below, mock screenshot of agent panel on right, buildoto-blue gradient background (`#2563EB` → `#1D4ED8`, 45°).

Used by Astro vitrine via `<meta property="og:image">` and Twitter card.

---

## Screenshots

Manually captured from dev build, placed in `brand/screenshots/`:

- `screenshot-agent.png` — full app with agent mid-conversation (wall creation prompt)
- `screenshot-viewport.png` — viewport focused on a generated building
- `screenshot-history.png` — git panel with commit list

Target: 2560×1600 (retina), PNG, lossless. README + vitrine use them.

---

## Deliverables checklist

- [ ] `brand/logo-wordmark-light.svg` + `-dark.svg`
- [ ] `brand/logo-mark-light.svg` + `-dark.svg`
- [ ] `brand/icon.png` (1024×1024 source)
- [ ] `brand/favicon.svg`
- [ ] `brand/og-card.png` (1200×630)
- [ ] `brand/onboarding/{welcome,api-key,github,project,tour}.svg`
- [ ] `brand/screenshots/screenshot-{agent,viewport,history}.png`
- [ ] Generated `build/icon.icns` + `icon.ico` + `icons/` via script
- [ ] CSS tokens committed in `packages/renderer/src/index.css`
- [ ] Fontsource deps installed in renderer package

---

## Licensing

All custom assets: MIT (matches repo license).

External sources:
- Octocat motif in `github.svg`: derived from GitHub Octicons (MIT). Credit line in `brand/README.md`.
- Inter, JetBrains Mono: SIL Open Font License 1.1.
