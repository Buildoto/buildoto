# Kickoff Claude Code — Buildoto Sprint 4
*Polish + Packaging + Onboarding + Release Alpha publique*

---

## 1. Contexte

**Sprint 4 de Buildoto — fin de Phase 1.** Après sprints 1 à 3, tu as une app fonctionnelle avec tous les éléments techniques : agent multi-provider, FreeCAD intégré, viewer three.js, GitHub, tools étendus. Mais ce n'est pas encore un produit **prêt à être utilisé par quelqu'un d'autre que toi**.

Ce sprint transforme le prototype en **alpha publique open-source** : polish UX, onboarding guidé, installeurs signés, site vitrine, documentation, canaux de feedback.

À la fin : tu publies Buildoto v0.1.0-alpha sur GitHub Releases avec installeurs téléchargeables, annonce sur les forums FreeCAD, Hacker News, LinkedIn.

---

## 2. Mission de ce sprint

- **Installeurs propres** pour macOS, Windows, Linux (signés quand possible)
- **Onboarding guidé** qui amène un inconnu à sa première génération en < 5 minutes
- **Documentation** basique (README, getting started, exemples)
- **Site vitrine** statique (Cloudflare Pages) avec download links
- **Télémétrie anonyme** (opt-in) pour mesurer adoption et crashes
- **Canaux de feedback** : Discord, Discussions GitHub, Issues
- **Auto-update** pour que les utilisateurs alpha aient toujours la dernière version

---

## 3. Stack ajoutée ce sprint

- **electron-updater** + **electron-builder** avec provider GitHub Releases
- **Sentry** pour les crash reports (opt-in)
- **PostHog** ou **Plausible** pour la télémétrie d'usage (opt-in)
- **Astro** pour le site vitrine statique
- **VitePress** ou **Mintlify** pour la doc
- **Apple Developer Certificate** (100 $/an) pour signer macOS
- **Code signing certificate Windows** (150-400 $/an — EV recommandé pour éviter SmartScreen warning)
- **Linux : pas de signing requis**, AppImage + .deb + .rpm suffisent

---

## 4. Onboarding guidé (critique)

Premier lancement, parcours en 5 écrans max :

1. **Welcome** : logo Buildoto, tagline "Vibe building with FreeCAD", 2-3 phrases d'explication, bouton "Démarrer"
2. **Choix du modèle IA** :
   - Option A : *"Utiliser mon propre fournisseur"* → saisir API key Claude/OpenAI/Mistral/etc.
   - Option B : *"Utiliser Ollama en local"* → détecter Ollama, lister modèles, choisir (llama 3, qwen, etc.)
   - Option C : *"S'abonner à Buildoto AI"* → redirection site (phase 2, désactivé en alpha)
3. **GitHub (optionnel)** : "Connectez GitHub pour versionner vos projets" ou "Plus tard"
4. **Projet de démarrage** :
   - "Créer un projet vide"
   - "Ouvrir un exemple" → clone un repo d'exemple depuis GitHub `Buildoto/examples-logement-collectif`
5. **Prêt** : "Voici votre première session. Essayez : 'Crée un cube de 2 mètres'." → focus sur le chat input

**Principe :** chaque étape est skippable, avec un mode "J'explore par moi-même" qui saute directement à l'app.

---

## 5. Polish UX

- **Raccourcis clavier** : Cmd/Ctrl+K (command palette), Cmd/Ctrl+N (new project), Cmd/Ctrl+O (open project), Cmd/Ctrl+Enter (send message), Tab (basculer Build/Plan), Cmd/Ctrl+Shift+P (command palette style VS Code)
- **Command palette** (cmdk lib) : toutes les actions accessibles au clavier
- **Theme sombre/clair** : auto selon OS + override manuel
- **Empty states** soignés sur tous les écrans vides
- **Loading states** : skeleton loaders, progress bars pour générations longues
- **Error states** : messages d'erreur clairs en cas de FreeCAD crash, API down, etc.
- **Notifications système** : "Génération terminée" si la fenêtre n'est pas focus
- **Settings dialog** regroupé et clair : Profil, Modèles IA, GitHub, MCP, Avancé

---

## 6. Packaging et distribution

### macOS

- Fichier `.dmg` signé avec certificat Apple Developer
- Notarization via `xcrun notarytool` (obligatoire pour macOS 10.15+)
- Build universel (Intel + Apple Silicon) ou deux builds séparés

### Windows

- Installeur `.exe` (NSIS via electron-builder) ou MSI
- Code signing avec certificat EV (idéalement — évite warning SmartScreen)
- Si pas de budget EV : certificat standard, warning SmartScreen s'atténue après ~50 téléchargements

### Linux

- `.AppImage` (universel, pas de dépendances)
- `.deb` (Debian/Ubuntu)
- `.rpm` (Fedora/RHEL)
- Pas de signing nécessaire

### GitHub Releases

- Release notes auto-générées depuis commits (via `release-please` ou manuel)
- Liens directs dans le README principal
- Binaires uploadés sur Releases (pas dans le repo)

### Auto-update

- electron-updater configuré avec GitHub Releases comme provider
- Check au démarrage, téléchargement en arrière-plan si mise à jour dispo
- Prompt utilisateur : "Mise à jour disponible, redémarrer maintenant ?"

---

## 7. Site vitrine `buildoto.com` (ou domaine équivalent)

Pages :

1. **Home** : hero avec screenshot/vidéo, tagline, "Download" button, 3-4 features clés
2. **Download** : installeurs par OS avec instructions
3. **Docs** : lien vers la doc
4. **GitHub** : lien externe
5. **Pricing** (phase 2, placeholder en alpha : "Gratuit en alpha, tarification bientôt pour le modèle AEC")
6. **Blog** (vide au lancement, pour plus tard)

Stack : **Astro** + Tailwind + shadcn, hébergé sur Cloudflare Pages. Contenu en Markdown.

---

## 8. Documentation

Structure VitePress ou similaire :

- **Getting started** : installation, first generation
- **Concepts** : agent + modeleur + Git, modèles supportés, MCP
- **Tutorials** :
  - Créer son premier mur
  - Utiliser Sketcher depuis l'agent
  - Versionner son projet avec GitHub
  - Ajouter un serveur MCP
- **API / Tools reference** : liste des tools FreeCAD exposés, avec exemples
- **Troubleshooting** : erreurs fréquentes, logs, support
- **Contributing** : guide contributeur (c'est open source)

Hébergé sur `docs.buildoto.com`.

---

## 9. Télémétrie et analytics (opt-in)

**Principes non-négociables :**
- Opt-in explicite au premier lancement, désactivable à tout moment
- Jamais d'envoi de code utilisateur, prompts, ou géométries
- Jamais d'envoi de contenu des projets

**Ce qu'on mesure (uniquement événements anonymisés) :**
- Installation, version, OS
- Provider IA utilisé (sans API key)
- Nombre de sessions, durée moyenne
- Tools les plus utilisés (noms seulement, pas d'args)
- Crashes (via Sentry)
- Erreurs FreeCAD (types, pas de contenu)

**Outils :** PostHog self-hosted ou Plausible pour l'usage, Sentry pour crashes.

---

## 10. Licence et gouvernance open source

- **Licence MIT** pour le code Buildoto (permissive, permet usage commercial)
- **Code of Conduct** (Contributor Covenant)
- **CONTRIBUTING.md** avec process de contribution
- **SECURITY.md** pour reporting de vulnérabilités
- **Template d'Issues** et de PR
- **CI GitHub Actions** :
  - Lint + test sur chaque PR
  - Build multi-OS sur les main merges
  - Release auto sur tag `v*`

---

## 11. Deliverables de ce sprint (ordre strict)

1. **Onboarding 5-écrans** implémenté et testable
2. **Theme switcher** + raccourcis clavier complets + command palette
3. **Empty/loading/error states** sur tous les panneaux principaux
4. **Setup electron-builder** : configs pour mac/win/linux, signing + notarization macOS
5. **Site vitrine Astro** déployé sur Cloudflare Pages
6. **Doc VitePress** avec getting-started + 4 tutorials min
7. **Télémétrie opt-in** + Sentry integrés avec respect strict de la privacy
8. **electron-updater** configuré et testé
9. **GitHub Actions CI/CD** : lint, test, build, release
10. **README principal du repo** : screenshots, links, pitch, getting started condensé
11. **Release v0.1.0-alpha** : tag + binaires + release notes + annonce

---

## 12. Critères d'acceptation

- [ ] Un inconnu peut télécharger Buildoto et faire sa première génération en moins de 5 minutes
- [ ] Les installeurs marchent sur mac Intel, mac ARM, Windows 10/11, Ubuntu 22+
- [ ] La signature macOS passe notarization (pas de warning Gatekeeper)
- [ ] Le site vitrine est responsive et rapide (Lighthouse > 95)
- [ ] La doc couvre au moins 4 tutoriels complets
- [ ] L'auto-update fonctionne (test avec v0.1.0 → v0.1.1)
- [ ] La télémétrie est effectivement off si l'utilisateur opt-out
- [ ] Le premier crash remonte dans Sentry avec stack trace utilisable
- [ ] Les CI GitHub Actions passent sur un PR factice

---

## 13. Ce que tu ne dois PAS faire ce sprint

- Ne pas implémenter le RAG ni Mistral (phase 2 — dans des sprints parallèles)
- Ne pas ajouter de features nouvelles. Uniquement polish + packaging.
- Ne pas sur-optimiser le site vitrine — contenu simple et clair suffit à l'alpha.
- Ne pas essayer d'atteindre la parité visuelle avec Linear ou Cursor. On polit, on ne refait pas le design.

---

## 14. Première action

Avant de coder :

1. **Plan d'onboarding détaillé** : wireframes ASCII des 5 écrans, logique de skip, states.
2. **Config electron-builder complète** pour les trois OS, avec commentaires sur les certificats requis.
3. **Plan de télémétrie** : liste exacte des événements et propriétés, avec justification de la privacy.
4. **Sitemap et wireframe** du site vitrine.
5. **Plan de release notes** et de l'annonce alpha (draft) : où on poste, avec quel angle, dans quel ordre.

**Validation avant code.**
