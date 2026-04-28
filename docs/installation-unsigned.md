# Installation des builds non signés

Buildoto est open-source et distribué **sans signature de code** (pas de licence
Apple Developer ni de certificat Windows EV). Cela signifie que chaque OS affiche
un avertissement au premier lancement. Voici comment contourner ces avertissements
en toute sécurité.

> **Pourquoi non signé ?** Les licences de signature coûtent 99 $/an (Apple) et
> plusieurs centaines de dollars (Windows EV) — un budget que le projet n'a pas
> encore. En attendant, les builds sont vérifiables : le code source est public,
> les workflows CI sont transparents, et les checksums SHA256 sont publiés dans
> chaque GitHub Release.

---

## macOS

### À l'ouverture : « Buildoto ne peut pas être ouvert car le développeur n'a pas pu être vérifié. »

**Solution simple** (une fois) :

1. Ouvrir le Terminal
2. Exécuter :
   ```bash
   xattr -cr /Applications/Buildoto.app
   ```
3. Lancer Buildoto normalement depuis le Dock ou Spotlight

**Solution alternative** (clic droit) :

1. Ouvrir le Finder
2. Aller dans le dossier Applications
3. **Clic droit** sur Buildoto.app → **Ouvrir**
4. Cliquer sur **Ouvrir** dans la boîte de dialogue

Cette seconde méthode n'a besoin d'être faite qu'une fois — les prochaines
ouvertures fonctionneront normalement.

---

## Windows

### Au téléchargement : « Windows a protégé votre PC »

1. Cliquer sur **Plus d'informations**
2. Cliquer sur **Exécuter quand même**

### Lors de l'installation : « Windows a protégé votre PC »

1. Cliquer sur **Oui** dans la fenêtre de contrôle de compte d'utilisateur (UAC)
2. L'installateur NSIS s'exécute normalement

---

## Linux

Aucune manipulation nécessaire. Les AppImages ne sont pas signées mais
n'ont pas de mécanisme de blocage.

---

## Vérification de l'intégrité

Chaque release GitHub inclut un checksum SHA256 du fichier `.dmg`, `.exe`,
ou `.AppImage`. Pour vérifier :

```bash
# macOS
shasum -a 256 ~/Downloads/Buildoto-*.dmg

# Comparer avec le SHA256 publié dans la release GitHub
```

---

## Questions fréquentes

### Est-ce sûr ?

Oui. Le code source est entièrement visible sur GitHub. Les builds CI sont
reproductibles (`pnpm build` génère le même résultat depuis le code source).
Aucune télémétrie n'est envoyée sans consentement explicite.

### Pourquoi ne pas signer avec un certificat auto-signé ?

Les certificats auto-signés ne contournent ni Gatekeeper ni SmartScreen —
les avertissements persistent. Seuls les certificats délivrés par Apple
et les autorités de certification Windows reconnues les suppriment.

### Est-ce que l'auto-update fonctionne sans signature ?

Oui. `electron-updater` utilise les GitHub Releases comme source et fonctionne
indépendamment de la signature. Les mises à jour sont téléchargées et installées
normalement.
