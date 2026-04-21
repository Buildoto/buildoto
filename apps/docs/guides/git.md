# Git et GitHub

Chaque projet Buildoto est un dépôt Git. Le panneau **Git** affiche :
- Le statut (fichiers modifiés, stagés, untracked)
- L'historique des commits
- La branche active

## Connecter GitHub

1. `⌘+,` → onglet `Fournisseurs` → pas besoin de clé pour Git
2. Dans l'onboarding étape 3, ou en commande palette : `GitHub — Connecter le compte`
3. Buildoto ouvre le **Device Flow** GitHub : copiez le code, collez-le sur github.com/login/device
4. Votre token est stocké chiffré sur votre machine

## Créer un commit depuis l'agent

L'agent peut proposer un commit :

```
Commit les changements avec le message "ajoute une porte au mur nord"
```

Il vérifie que les fichiers sont cohérents, stage les modifications, puis crée le commit.

## Push / Pull

- **Push** : bouton dans le panneau Git, ou l'agent peut le faire si vous le demandez.
- **Pull** : bouton refresh dans le panneau Git.

Les conflits ne sont pas encore auto-résolus dans l'alpha — utilisez la ligne de commande Git
en cas de conflit.
