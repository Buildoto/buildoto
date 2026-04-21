# Installation

Téléchargez la dernière version depuis les [GitHub Releases](https://github.com/buildoto/buildoto/releases).

## macOS (Apple Silicon / Intel)

1. Téléchargez le `.dmg` correspondant à votre architecture (`arm64` pour M-series, `x64` pour Intel).
2. Ouvrez le `.dmg` et glissez Buildoto dans `Applications`.
3. **Build non signé** : la première fois, faites clic-droit sur l'app → `Ouvrir`. Une alerte vous
   proposera d'ouvrir quand même.

::: warning
Si vous voyez « Buildoto est endommagé » : c'est Gatekeeper qui bloque un build non notarisé.
Dans un terminal :
```bash
xattr -cr /Applications/Buildoto.app
```
:::

## Windows

1. Téléchargez `Buildoto Setup 0.1.0-alpha.0.exe`.
2. Lancez l'installeur. **SmartScreen** affichera « Windows a protégé votre PC » — cliquez
   `Informations complémentaires` → `Exécuter quand même`.

## Linux (AppImage)

1. Téléchargez `Buildoto-0.1.0-alpha.0.AppImage`.
2. Rendez exécutable puis lancez :

```bash
chmod +x Buildoto-0.1.0-alpha.0.AppImage
./Buildoto-0.1.0-alpha.0.AppImage
```

## Prérequis système

- **macOS** : 11 Big Sur ou supérieur
- **Windows** : 10 ou 11, 64 bits
- **Linux** : glibc 2.31+ (Ubuntu 20.04+, Fedora 34+)
- ~1 Go d'espace disque (dont ~500 Mo pour FreeCAD bundlé)

FreeCAD est inclus dans l'application — aucune installation séparée requise.
