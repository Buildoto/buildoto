# Buildoto 1.0.0 — Release notes

*Draft pour relecture humaine. Ce texte est destiné à être copié tel quel dans le body de la GitHub release et dans l'onglet « Quoi de neuf » du site.*

---

Buildoto passe en **v1.0** aujourd'hui. Après 6 mois d'alpha privée (`0.1.0-alpha` → `0.9.x-beta`), voici la première version que tu peux télécharger, installer, et utiliser en confiance sur un vrai projet architectural.

## Ce qu'est Buildoto, en une phrase

Un IDE de *vibe-building* pour architectes et ingénieurs : tu décris ce que tu veux, un agent IA manipule ton fichier FreeCAD à ta place, tu vois la 3D se mettre à jour, et Git garde la trace de tout.

## Ce qui est nouveau en v1.0

### Buildoto AI — un modèle spécialisé construction
Un abonnement optionnel (19 €/mois, 100 requêtes/mois gratuites à l'essai) te donne accès à un modèle IA spécialisé sur la construction et le BIM, avec **les sources citées à chaque réponse**. Quand l'IA dit « le DTU 20.1 impose un chaînage tous les 3,5 m », tu peux ouvrir la source directement dans l'app et vérifier.

- Connexion en un clic depuis l'app — plus de copier-coller de clé API.
- Dropdown de modèles (`buildoto-ai-v1`, `buildoto-ai-code`) selon le besoin.
- Usage et quota visibles en permanence dans la status bar.
- Panneau « Compte » dans les Paramètres avec graphe 30 jours + gestion abonnement.

Tu peux continuer à utiliser Claude, GPT, Mistral ou Ollama — Buildoto AI est une option, pas une obligation.

### Sources RAG visibles
Sous chaque réponse qui utilise la base documentaire RAG (Wiki FreeCAD, OpenCASCADE, Code de la construction, DTU) :

> ▼ 3 sources consultées

Un clic, un drawer s'ouvre avec l'extrait exact et un lien vers la source originale. L'archi peut vérifier, citer dans son dossier admin, ou juste apprendre en explorant.

### Onboarding revu
L'étape « coller ta clé API » a été remplacée par un choix éclairé : Buildoto AI, ton propre modèle, ou Ollama local. Aucune friction si tu as déjà un abonnement Claude ou OpenAI.

### Auto-update stable
Les utilisateurs alpha sont migrés automatiquement de `channel: alpha` vers `channel: stable`. Plus besoin de guetter les prereleases — les prochaines patches arriveront naturellement.

## Ce qui a mûri depuis l'alpha

- Agent OpenCode embarqué (Sprint 3) — providers Anthropic, OpenAI, Mistral, Google, Ollama, OpenRouter stables.
- Sidecar FreeCAD robuste (restart auto sur crash).
- Intégration Git + GitHub (commit auto, push/pull, PR template).
- MCP servers configurables.
- Télémétrie opt-out (PostHog EU).

## Limitations connues — on joue cartes sur table

- **Binaires non signés.** macOS te demandera un Ctrl-clic → Ouvrir au premier lancement ; Windows SmartScreen voudra un « Plus d'infos → Exécuter quand même ». La [page Installation](https://buildoto.com/install) te guide en 30 secondes. On signera quand le revenu le justifiera.
- **Corpus RAG majoritairement anglophone.** Wiki FreeCAD + OpenCASCADE sont en anglais. Le Code de la construction et le DTU sont en français mais partiels. Prochaines versions : élargissement progressif.
- **Pas de multi-user / Teams.** Un projet = un user. Versions futures si traction.
- **Linux AppImage sans intégration menu native.** Un simple `chmod +x` + double-clic lance l'app ; le raccourci desktop est à ajouter manuellement ou via AppImageLauncher.
- **L'IA peut toujours halluciner**, même avec des sources citées. La vérification humaine reste nécessaire pour tout ce qui va en dossier administratif ou en DCE.

## Merci

À tous les alpha-testeurs qui ont remonté des crashs FreeCAD, des bugs de sidecar, des UX étranges, et surtout à ceux qui ont dit « ça manque les sources ». Cette v1.0 est en grande partie votre version.

## Installation

- [macOS (Apple Silicon + Intel)](https://github.com/buildoto/buildoto/releases/latest)
- [Windows](https://github.com/buildoto/buildoto/releases/latest)
- [Linux AppImage](https://github.com/buildoto/buildoto/releases/latest)

Ou visite [buildoto.com/install](https://buildoto.com/install) pour les instructions pas-à-pas.

## Et après

Roadmap post-launch raisonnable :
- **v1.1** (3-6 mois) : retours utilisateurs, élargissement corpus RAG francophone, amélioration UX onboarding.
- **v1.2** (6-9 mois) : Buildoto AI Team (multi-seat), collaboration sur un projet partagé.
- **v1.3** (9-12 mois) : modules métier spécifiques (béton armé, charpente, plomberie) via partenariats.

Aucun de ces chiffres n'est un engagement — c'est la direction. On livre v1.0 proprement, on écoute, on itère.

---

**Changelog technique condensé** (depuis `0.1.0-alpha`) :

- feat: OpenCode agent embedding (sprint 3)
- feat: providers Anthropic, OpenAI, Mistral, Google, Ollama, OpenRouter
- feat: FreeCAD sidecar with auto-restart + WebSocket protocol
- feat: GitHub integration (simple-git + @octokit/rest) with OAuth device flow
- feat: MCP servers config UI
- feat: telemetry (Sentry + PostHog EU, opt-out)
- feat: 5-step onboarding wizard
- feat: auto-update via electron-updater (GitHub releases)
- feat: Buildoto AI as a first-class provider — deep-link auth, short JWT, sources RAG visibles (v1.0)
- feat: status bar + Compte panel with live quota (v1.0)
- feat: stable channel migration (v1.0)
- docs: site vitrine (apps/site Astro) — pricing, /ai, /install, FAQ (v1.0)

Release SHA : `<à remplir avant la publication>`
