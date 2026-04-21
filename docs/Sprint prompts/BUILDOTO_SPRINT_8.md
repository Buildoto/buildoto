# Kickoff Claude Code — Buildoto Sprint 8
*Phase 2 · Intégration Buildoto AI dans l'app desktop + launch v1*

---

## 1. Contexte

**Sprint 8 de Buildoto (Phase 2, final).** Après sprint 7 : le portail utilisateur et Stripe sont en place. Les utilisateurs peuvent souscrire, obtenir une API key, l'utiliser via cURL.

Mais l'app desktop (sprints 1-4) ne connaît pas encore Buildoto AI. L'utilisateur peut le configurer manuellement comme provider "OpenAI-compatible custom endpoint" (ça marche déjà parce qu'on respecte l'API OpenAI au sprint 6), mais l'expérience n'est pas guidée. Ce sprint fait de Buildoto AI un **provider first-class** dans l'app, avec un onboarding fluide.

À la fin de ce sprint, tu lances **Buildoto v1.0** : passage de l'alpha à la version stable, annonce publique, début de la vente.

---

## 2. Mission

1. Provider "Buildoto AI" natif dans l'app desktop : login via compte Buildoto, récupération automatique d'API key, sélection de modèle
2. Affichage de l'usage dans l'app (quota restant, indicateur de coût)
3. Onboarding modifié pour proposer Buildoto AI comme option recommandée
4. Sources RAG visibles dans l'UI : l'utilisateur voit quelles doc ont informé la réponse de l'agent (transparence + valeur perçue)
5. Launch public v1.0 : site mis à jour, communication, pricing page, documentation

---

## 3. Provider Buildoto AI dans l'app

### Auth flow dans l'app

1. Dans Settings → AI Providers, "Buildoto AI" apparaît en haut de liste avec badge "Recommandé"
2. Button "Connect" → ouvre le navigateur sur `app.buildoto.com/authorize?app=desktop&callback=buildoto://auth`
3. Utilisateur s'authentifie (ou s'inscrit) sur le portail
4. Redirect vers `buildoto://auth?token=...` (deep link capté par l'app Electron)
5. L'app stocke le token (keytar) et l'utilise pour faire des requêtes

### Flow de requête

- L'app n'envoie plus l'API key brute dans l'en-tête — elle échange le token d'auth contre un JWT court (5 min) via `app.buildoto.com/token` puis utilise ce JWT
- Le JWT est auto-renouvelé par l'app avant expiration
- **Bénéfice** : si l'utilisateur se déconnecte via le portail, l'app perd l'accès immédiatement (pas besoin de révoquer manuellement)

### Sélection de modèle

- Dropdown des modèles disponibles avec description + pricing info
- Auto-sélection du modèle selon le plan (Pro → `buildoto-ai-v1`, Free → `buildoto-ai-free`)
- Badge "Upgrade required" si le modèle nécessite un plan supérieur

---

## 4. Affichage de l'usage

### Status bar en bas de l'app

Ligne d'info permanente :
```
● Connected to Buildoto AI · Plan Pro · 1,247 / 2,000 requests this month
```

### Panneau "Account" dans Settings

- Email + nom
- Plan actuel + prix
- Graphe usage 30 jours (léger, pas besoin d'aller sur le portail pour ça)
- Button "Manage subscription" → ouvre le portail dans le navigateur

### Warning quotas

- À 80 % du quota : notification in-app "Vous avez utilisé 80 % de votre quota mensuel"
- À 100 % : bannière rouge "Quota dépassé — Upgrade ou attendez le mois prochain"
- Si plan Pro avec usage-based : indicateur discret "Requêtes au-delà du quota : X (facturées 0.02 €/unité)"

---

## 5. Sources RAG visibles

Un des bénéfices tangibles de Buildoto AI vs un modèle générique : **la traçabilité des sources**. On l'expose.

Dans le panneau de chat, sous chaque message assistant qui a utilisé du RAG :

```
▼ 3 sources consultées
  • Wiki FreeCAD — Arch_Wall (CC-BY 3.0) [link]
  • OpenCASCADE docs — BRepBuilderAPI (LGPL) [link]
  • Code de la construction — Article R111-1 (Licence Ouverte) [link]
```

Clic sur une source → drawer avec le chunk complet récupéré + lien externe vers la source originale.

**Valeur utilisateur :** l'architecte peut vérifier que l'IA ne hallucine pas une norme, citer la source dans son dossier administratif, apprendre en explorant les sources.

**Implémentation technique :** le service Buildoto AI (sprint 6) renvoie déjà les chunks utilisés dans un header custom `X-Buildoto-Sources` ou en fin de stream SSE.

---

## 6. Onboarding modifié

Le sprint 4 définit un onboarding à 5 écrans. L'écran 2 (choix du modèle) est modifié :

```
Choisissez comment alimenter votre agent IA :

┌─────────────────────────────────────┐
│ ⭐ Buildoto AI (recommandé)          │
│ Modèle spécialisé construction      │
│ Essai gratuit 100 requêtes          │
│ Après : 19 €/mois                   │
│ [ Se connecter / S'inscrire ]       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Utiliser mon propre modèle          │
│ Claude, GPT, Mistral, etc.          │
│ [ Configurer ]                      │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Local (Ollama)                      │
│ 100% offline, gratuit               │
│ [ Configurer ]                      │
└─────────────────────────────────────┘
```

Le path "Buildoto AI" est mis en avant mais jamais forcé. Open-source = respect de la liberté utilisateur.

---

## 7. Launch v1.0

### Préparatifs release

- Bump version `0.9.x-beta` → `1.0.0`
- Changelog complet depuis la v0.1.0-alpha
- Release notes soignées pour les forums et communautés
- Binaires signés et notarized sur les 3 OS
- Auto-update pre-configuré pour les utilisateurs alpha

### Site vitrine

- Section "Pricing" activée (était placeholder au sprint 4)
- Page "AI" dédiée présentant Buildoto AI : spécialisé, RAG, sources, pourquoi c'est différent
- Testimonials : au moins 3 alpha users qui acceptent de témoigner
- Case studies : 1-2 projets réalisés avec Buildoto en alpha

### Communication

- Annonce LinkedIn (ton réseau promoteur + archi via 20 ans d'expérience)
- Post forum FreeCAD (communauté primaire technique)
- Post Hacker News / Show HN ("Show HN: Buildoto — Vibe-building with FreeCAD and AI")
- Post Reddit r/freecad, r/BIM, r/architecture
- Thread Twitter/X avec vidéo de démo
- Demande review à 2-3 influencers YouTube AEC / CAD
- Newsletter AEC Magazine, Archicad Blog, etc. (tenter press release)

### Support

- Discord server Buildoto (déjà créé au sprint 4)
- Email support@buildoto.com → routé vers ta boîte en v1
- FAQ enrichie avec les questions types ressorties de l'alpha

---

## 8. Deliverables de ce sprint (ordre strict)

1. **Auth flow Buildoto AI** : deep link `buildoto://auth`, token management, JWT renewal.
2. **Provider "Buildoto AI"** ajouté dans l'OpenCode adapter (sprint 3) comme first-class provider.
3. **Status bar d'usage** en bas de l'app desktop.
4. **Panneau Account dans Settings** avec graphe + gestion abonnement.
5. **Affichage des sources RAG** sous les messages assistant, avec drawer détaillé.
6. **Onboarding modifié** : écran modèle IA avec Buildoto AI en premier.
7. **Notifications et warnings de quota**.
8. **Auto-update migration** : utilisateurs alpha reçoivent la v1.0 automatiquement.
9. **Mise à jour site vitrine + pricing + page AI**.
10. **Release notes complètes** et plan de communication exécutable.
11. **Release v1.0.0** : tag, binaires signés, release notes.
12. **Communication exécutée** : au minimum LinkedIn + forum FreeCAD + Hacker News.

---

## 9. Critères d'acceptation

- [ ] Un nouvel utilisateur peut télécharger Buildoto, s'inscrire à Buildoto AI, et faire sa première génération en moins de 5 minutes
- [ ] Le deep link `buildoto://auth` fonctionne sur les 3 OS
- [ ] Le quota restant s'affiche en temps réel dans le status bar
- [ ] Les sources RAG sont visibles sous chaque message assistant qui en a utilisé
- [ ] Un utilisateur Pro qui dépasse son quota voit bien la facturation "Additional Requests" reflétée dans son portail
- [ ] Les utilisateurs alpha reçoivent la v1.0 via auto-update sans action manuelle
- [ ] Le site vitrine est à jour avec pricing visible et fonctionnel
- [ ] Au moins un post public de lancement est publié (LinkedIn ou HN ou Forum)

---

## 10. Ce que tu ne dois PAS faire ce sprint

- Ne pas essayer d'attirer les utilisateurs en payant des ads. Launch organique + communauté d'abord.
- Ne pas implémenter un programme de referral / affiliation (v1.1 si traction).
- Ne pas ajouter de nouvelles fonctionnalités non-critiques. L'objectif est un launch propre, pas un feature dump.
- Ne pas promettre ce que le produit ne fait pas. L'alpha a dû te remonter les limites — sois honnête dessus en public.

---

## 11. Première action

Avant de coder :

1. **Revue des apprentissages de l'alpha** : ce qui a marché, ce qui n'a pas, ce que les alpha users demandent en priorité. Influence directement ce sprint.
2. **Design précis de l'auth flow Buildoto AI** (diagramme de séquence complet).
3. **Wireframe du panneau Account** et du bandeau sources RAG.
4. **Draft des release notes v1.0** : je relis et on itère avant publication.
5. **Plan de communication** : dates exactes, canaux, angles, et qui poste quoi.

**Validation avant code.**

---

## 12. Après ce sprint

Une fois v1.0 lancée, la roadmap post-launch raisonnable :

- *v1.1 (3-6 mois)* : retours utilisateurs, features top-requested, amélioration RAG avec nouveau corpus
- *v1.2 (6-9 mois)* : Buildoto AI Team (multi-seat), collaboration partagée
- *v1.3 (9-12 mois)* : intégration directe avec modules industriels spécifiques (béton armé, charpente, plomberie détaillée) via partenariats
- *v2 (12-18 mois)* : fine-tune d'un modèle Mistral custom si le RAG plafonne
- *v2+* : ton fork FreeCAD React UI s'intègre enfin dans Buildoto (remplace le FreeCAD stock)

Mais rien de tout cela n'est à décider maintenant. Livre v1.0 proprement, écoute les utilisateurs, itère.
