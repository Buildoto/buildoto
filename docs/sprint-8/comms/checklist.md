# Checklist launch v1.0 — ordre + dates

*Source de vérité pour la semaine de launch. Imprimer ou garder ouvert en permanence entre J-7 et J+7. Tous les horaires en **CET**. J0 = premier lundi ou mardi où le user se sent prêt (pas de date imposée — ne pas publier un vendredi).*

---

## J-7 (vendredi précédent)

- [ ] **Lire une dernière fois chaque draft comms/** et ajuster le ton à ta voix.
- [ ] **Tourner la vidéo démo 45-60 s.** Iphone + micro externe, pas de post-prod lourde. 1h max.
- [ ] **DM préalable** à 10-20 alphas clés + proches du milieu archi :
  ```
  Salut, la v1.0 de Buildoto sort mardi prochain. Si tu peux jeter un
  œil en live au site et à l'app le jour-J, tester, et éventuellement
  relayer sur LinkedIn, tu me rendrais un énorme service. Aucun objectif
  chiffré — juste des yeux bienveillants + honnêtes. Merci.
  ```
- [ ] **Vérifier la liste presse** dans `press-email-template.md` : chaque journaliste est-il encore dans sa publication ? Articles récents lus ?
- [ ] **Préparer la GitHub release** en draft : tag `v1.0.0`, body = contenu de `release-notes-v1.0.md`, binaires uploadés (Mac/Win/Linux), *ne pas publier*.

## J-3 (vendredi)

- [ ] **Dry-run complet** : prendre un Mac vierge, télécharger depuis la release draft (lien direct), suivre le guide /install, exécuter, onboarding Choose AI → Buildoto AI → première génération. Noter tous les frictions.
- [ ] **Fixer les frictions bloquantes** uniquement. Pas de micro-optimisation UI ce week-end.
- [ ] **Planifier 4 h libres** dans l'agenda du J+1 entre 16:00 et 20:00 CET (permanence HN).
- [ ] **Couper les notifs non-critiques** pour la semaine (Slack, emails, Discord). Seul le téléphone reste.

## J-1 (lundi soir, veille de launch)

- [ ] **Uploader les binaires finaux** sur la GitHub release (draft).
- [ ] **Vérifier le site déployé en prod** : /install, /pricing, /ai, /faq, /, /changelog. Chaque lien cliqué.
- [ ] **Vérifier que app.buildoto.com accepte les signups**. Créer un compte test, supprimer après.
- [ ] **Envoyer la vidéo démo** à 2-3 personnes de confiance pour sanity check.
- [ ] **Se coucher tôt.** J0 est une longue journée.

---

## J0 (jour du launch — lundi ou mardi)

### 08:00 — préparation
- [ ] Café. Pas d'alcool avant J+3. Pas blague.
- [ ] Vérifier qu'aucune régression n'est arrivée durant la nuit (email Sentry/GitHub).
- [ ] Ouvrir dashboard PostHog + GitHub release analytics + Supabase.

### 09:00 — passage en prod
- [ ] **Publier la GitHub release `v1.0.0`** → passe de *draft* à *latest*.
- [ ] Vérifier que `buildoto.com` pointe bien vers la dernière build du site avec les bons liens v1.0.0.
- [ ] Tweeter en privé (pour toi) l'URL de la release, ça sert de timestamp si quelqu'un questionne la date.

### 09:30 — LinkedIn
- [ ] **Publier le post LinkedIn** (version A ou B, cf. `linkedin.md`).
- [ ] **Épingler le commentaire** avec lien /install immédiatement après.
- [ ] Répondre aux 10 premiers commentaires en < 30 min (fenêtre d'engagement algo).

### 10:30 — Forum FreeCAD
- [ ] **Publier le post** forum.freecad.org (cf. `forum-freecad.md`).
- [ ] Ajouter le thread dans tes bookmarks, ouvrir en onglet permanent.
- [ ] Répondre à toute question technique en < 1 h.

### 11:00 — 16:00 — réactivité LinkedIn/FreeCAD
- [ ] Répondre à tous les commentaires / DM.
- [ ] Prendre note des bugs remontés dans un fichier `launch-bugs.md` (pas dans GitHub issues pour ne pas faire dériver le focus ce jour-là).

### Fin de journée
- [ ] Bilan rapide à 20:00 : nb downloads, nb signups, mentions, bugs critiques.
- [ ] Si critique bloquant → décider si patch J+1 matin.

---

## J+1 (mardi ou mercredi)

### 07:00 PT (16:00 CET) — Hacker News
- [ ] **Vérifier** que le dernier déploiement site est stable (HN tape fort).
- [ ] **Publier le Show HN** (cf. `hn-show.md`). URL = buildoto.com.
- [ ] **Poster le commentaire #1** immédiatement après (anticipe FAQ).
- [ ] **Tenir 4 h** : répondre à chaque commentaire top-level en < 20 min.
- [ ] Surveiller `hnrankings.info` + `news.ycombinator.com/show` pour la position.

### 20:00 CET — bilan HN
- [ ] Si front page top 30 → tenir permanence encore 1-2 h.
- [ ] Si post meurt → archiver, passer à autre chose. Pas de drama.

---

## J+2 (mercredi ou jeudi)

### Matin — Reddit
- [ ] **r/freecad** (cf. `reddit-freecad.md`) — flair « Discussion ».
- [ ] 2-3 h plus tard : **r/BIM** (cf. `reddit-bim.md`).
- [ ] Fin de journée : **r/architecture** (cf. `reddit-arch.md`) **uniquement si** compte avec historique sur la sub. Sinon sauter cette étape.

### Après-midi — X/Twitter
- [ ] **Publier le thread** (cf. `twitter-thread.md`). Vidéo démo au T1, GIF sources au T4.
- [ ] **Épingler** sur le profil.

### Soir
- [ ] Monitoring : répondre aux commentaires Reddit pendant 2 h.
- [ ] Si un influenceur AEC like/RT → DM remerciement dans les 2 h.

---

## J+3 à J+5 — presse

- [ ] **Un email presse par jour** maximum. Jamais plus. Personnaliser chacun.
- [ ] Liste dans `press-email-template.md` : AEC Magazine, Archicad Blog, CAD Magazine, Le Moniteur, Architosh.
- [ ] Envoyer depuis `s.mignot@beforbuild.com` (domaine établi).
- [ ] Noter réponses dans `launch-press-tracker.md` (à créer localement).

---

## J+7 — rétrospective

### Mesurer
- [ ] Installs GitHub release (assets download count).
- [ ] Signups `app.buildoto.com` (PostHog + Supabase).
- [ ] Funnel : signup → connexion Buildoto AI → première génération.
- [ ] Mentions externes (Google Alerts + manuel : HN, Twitter, forums AEC).
- [ ] Bugs GitHub issues depuis J0.

### Décider
- [ ] **Mode maintenance** (les chiffres suffisent, pas de push supplémentaire) → priorité = fixes + v1.1 prep.
- [ ] **Amplifier un canal** qui a cartonné (ex. si r/freecad → continuer à y être actif, pas promotionnel).
- [ ] **Débloquer budget ads modeste** (< 500 €/mois) sur le canal avec meilleur taux de conversion organique.
- [ ] **Follow-up presse** aux journalistes qui n'ont pas répondu : *un seul* message de relance, 3 lignes.

### Se reposer
- [ ] Prendre 1 jour off. Vraiment. Tu l'as mérité.

---

## Règles de discipline

- ✋ **Ne jamais publier sous le coup de l'émotion** (positive ou négative). Attendre 1 h après rédaction.
- ✋ **Ne jamais promettre une feature dans un commentaire public.** « C'est sur la roadmap » suffit.
- ✋ **Ne jamais critiquer un concurrent nommé.** Même si provoqué.
- ✋ **Ne jamais upvoter soi-même sur HN.** Ban immédiat.
- ✋ **Ne jamais demander des upvotes.** Ban immédiat HN + Reddit.
- ✋ **Ne pas enchaîner les canaux le même jour** sauf J0 (LinkedIn + FreeCAD forum, déjà). HN et Reddit doivent respirer séparément.

---

## En cas de pépin

| Problème | Action |
|---|---|
| Bug bloquant remonté sur HN 1 h après publication | Commenter « fixing now, update in X min », shipper un patch release, commenter le lien |
| Le site tombe (trafic HN) | Vercel/Cloudflare devrait tenir. Si pas : page statique minimale, retweet de l'incident, transparence |
| Critique très visible factuellement fausse | Répondre calme + sources. Ne pas éditer l'original (dérive). |
| Post retiré par un mod Reddit | Pas drama. Passer à la sub suivante. |
| Burnout à J+3 | Couper. Personne ne mourra si on ne poste pas sur Reddit aujourd'hui. |
