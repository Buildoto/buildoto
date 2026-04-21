# Prise en main

## 1. Onboarding

Au premier lancement, Buildoto vous guide en 5 étapes :

1. **Bienvenue** — Option de télémétrie anonyme et de rapports d'incident (opt-in, désactivés
   par défaut).
2. **Clé API** — Anthropic (Claude) par défaut. La clé est stockée dans le trousseau système
   (macOS Keychain, Windows Credential Locker, libsecret sur Linux).
3. **GitHub** — Optionnel. Connectez votre compte via Device Flow ; les projets peuvent rester
   locaux.
4. **Premier projet** — Créez un nouveau projet, clonez un repo GitHub ou ouvrez un dossier
   existant.
5. **Tour** — Les 4 zones à connaître : agent, modeleur 3D, historique Git, réglages.

## 2. Votre premier modèle

Dans le panneau **Agent**, tapez :

```
Crée un cube de 2m de côté.
```

L'agent :
1. Appelle l'outil `part_create_box` avec les dimensions.
2. FreeCAD exécute l'opération, exporte en glTF.
3. Le **modeleur** affiche le résultat.
4. Un nouveau fichier apparaît dans l'explorateur.

## 3. Commit + push

1. Allez dans le panneau **Git**.
2. Cliquez `Stage all` puis `Commit`.
3. Si GitHub est connecté : `Push`.

## 4. Exemples

Consultez les [exemples seedés](https://github.com/buildoto/buildoto/tree/main/examples) pour
des prompts prêts à copier :

- [`01-cube`](https://github.com/buildoto/buildoto/tree/main/examples/01-cube) — cube basique
- [`02-wall-door`](https://github.com/buildoto/buildoto/tree/main/examples/02-wall-door) — mur + porte
- [`03-parametric-room`](https://github.com/buildoto/buildoto/tree/main/examples/03-parametric-room) — pièce pilotée par spreadsheet
