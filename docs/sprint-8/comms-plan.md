# Sprint 8 · A.5 — Plan de communication launch v1.0

*Draft pour relecture. Le ton et les dates sont à valider par le user avant toute publication. Les drafts des posts eux-mêmes sont livrés en Phase K sous `docs/sprint-8/comms/*.md` (pas encore écrits à la date de ce document).*

---

## 1. Principes directeurs

- **Organique d'abord.** Aucun budget ads avant de voir si les canaux gratuits convertissent. Ça donne aussi le temps de corriger les bugs critiques post-launch.
- **Angle différent par canal.** Ne pas poster le même texte partout — HN n'est pas LinkedIn n'est pas Reddit. Chaque communauté a ses codes ; adapter ou être ignoré.
- **Honnêteté > survente.** Les limitations listées dans les release notes (binaires non signés, corpus partiel FR, pas de multi-user) sont reprises dans chaque canal technique. L'alpha a formé un noyau d'utilisateurs qui apprécient qu'on joue cartes sur table ; la v1.0 doit prolonger cette posture.
- **Zéro automatisation.** Le user poste manuellement pour pouvoir lire et répondre. Un CEO/solo-founder qui ne répond pas aux commentaires dans les 2 h sur HN perd 80 % du potentiel du post.

---

## 2. Calendrier cible

*Les dates sont nommées J0 = jour du launch officiel (à fixer par le user). Prévoir un lundi ou mardi pour HN/Reddit (trafic max).*

| Moment | Canal | Objectif | Effort perso |
|---|---|---|---|
| **J-7** | Friends + Family DMs | Prévenir 10-20 proches/alphas clés, leur demander feedback dès le lancement + éventuel relais. | 1 h |
| **J-3** | Dry-run démo vidéo | Vidéo 60 s du « moment aha » (prompt → FreeCAD se met à jour). Pas besoin d'être léché — authentique. | 2 h |
| **J-1 soir** | Upload binaires GitHub release | Release tagguée `v1.0.0` mais en *draft* ; prête à passer en public à J0 matin. | 30 min |
| **J0 09:00 CET** | Publier la release GitHub + mettre en ligne la page `/install` + passer le site en mode launch | | 15 min |
| **J0 09:30 CET** | **LinkedIn** | Public principal pour toi (20 ans archi) : architectes / bureaux d'études qui te connaissent. | 15 min + réponses |
| **J0 10:30 CET** | **Forum FreeCAD** | Communauté primaire technique, tolérante si l'app n'est pas parfaite, hostile si on over-sell. | 15 min + réponses |
| **J+1 16:00 CET** (= 7h PT, prime HN) | **Hacker News — Show HN** | Audience tech + early adopters, 2-3h de fenêtre pour trender. Je tiens la boutique pendant 4 h. | 4 h d'attention |
| **J+2 matin** | **Reddit r/freecad** puis **r/BIM** puis **r/architecture** | 1 post / sub, espacés de quelques heures. | 1 h |
| **J+2 après-midi** | **X/Twitter** thread | Moins stratégique mais sert de référence URL. | 30 min |
| **J+3 à J+7** | Emails presse AEC Magazine / Archicad Blog / autres | Template prêt, envoi manuel individualisé. 3-5 envois max. | 2 h |
| **J+7** | Rétro + ajustements | Bilan chiffré (installs, NPS, bugs remontés) + décision sur ads payantes si besoin. | 2 h |

Total effort user : **~15 h étalées sur 10 jours**, dont 4 h de tenue-de-boutique HN. C'est réaliste pour un solo founder.

---

## 3. Angles par canal

### LinkedIn
- **Angle :** « 20 ans dans l'archi → j'ai construit l'outil que j'aurais voulu. »
- **Ton :** personnel, pragmatique, pas de jargon IA.
- **CTA :** site + proposition de démo 15 min pour bureaux d'études intéressés.
- **Format :** 1 post principal + commentaire épinglé avec lien direct install.

### Hacker News (Show HN)
- **Angle :** technique — « open-source Electron app embeds FreeCAD via a sidecar, uses an OpenCode-derived agent loop, RAG over AEC corpus. »
- **Ton :** factuel, pas de marketing speak. HN détecte le bullshit en 2 secondes.
- **CTA :** GitHub repo + demo vidéo.
- **Anticiper** : privacy (on stocke rien côté serveur sauf usage), open-source status (l'app est OSS, le modèle Buildoto AI est un service commercial — clair), pourquoi pas juste une extension FreeCAD (le pitch UX).

### Reddit
- **r/freecad :** ton dev/user, emphase sur le sidecar + le respect de FreeCAD (« on ne le remplace pas, on l'utilise »).
- **r/BIM :** IFC export status honnête, corpus DTU/code de la construction.
- **r/architecture :** moins technique, plus UX + vidéo démo.
- **Attention aux règles** : r/freecad accepte l'auto-promo si on est transparent ; r/architecture est plus strict. Participer à la communauté avant si pas déjà le cas.

### Forum FreeCAD (FreeCAD.org)
- **Angle :** « nouveau projet qui s'appuie sur FreeCAD, voici comment, quelques questions pour la communauté. »
- **Ton :** humble, technique, pas une annonce produit.
- **CTA :** discussion ouverte + lien repo.

### X/Twitter
- **Angle :** thread 7 tweets, une idée par tweet, vidéos/GIF à tweet 1 et 4.
- **Utilité principale :** URL de référence à linker depuis les autres canaux.

### Presse AEC
- **Template email personnalisable** : qui on est (1 phrase), quoi (2 phrases), pourquoi c'est intéressant pour tes lecteurs (1 phrase), où tester (lien).
- **Cibles :** AEC Magazine, Archicad Blog, CAD Magazine, CAD User, Le Moniteur (FR).
- **Suivi** : 1 seul follow-up à J+7, après = abandon.

---

## 4. Ce qu'on ne fait PAS

- **Product Hunt J0.** PH demande une prep de 2 semaines (hunter, upvotes coordonnés, comments timed) pour un ROI discutable dans notre niche. À reporter à v1.1 quand on aura un angle fort (ex : « Teams feature launched »).
- **Cold outreach à 200 bureaux d'études.** Peu scalable, qualité faible, risque de brûler le mail.
- **Acheter des ads Google / LinkedIn.** Pas avant de savoir ce qui convertit organique.
- **Faire signer des testimonials en urgence.** Si 3 alphas veulent bien témoigner spontanément, on les cite (Phase K). Sinon on attend.
- **Participer à des podcasts le jour du launch.** L'énergie doit rester sur la réponse aux commentaires directs.

---

## 5. Kit de réponse prêt

Pour que le user ne soit pas pris au dépourvu, Phase K livre aussi un `faq-comms.md` avec :
- Réponses-type aux critiques attendues (« c'est juste un wrapper Claude ? », « pourquoi pas juste une extension FreeCAD ? », « open-source comment ? »).
- Script pour pivoter poliment si un commentaire devient hostile.
- Critères pour décider de supprimer vs ignorer un commentaire toxique.

---

## 6. Mesure

À suivre quotidiennement sur J0 → J+7 :

- Installs GitHub release (asset download counts).
- Signups `app.buildoto.com` (PostHog + Supabase).
- Sign-up → connexion Buildoto AI → première génération (funnel).
- Mentions externes (Google Alerts + manuel).
- Bugs remontés (GitHub issues + Discord).

Rétrospective J+7 décide si :
- On entre en mode maintenance tranquille → v1.1.
- On pousse un ou deux canaux qui ont bien marché (ex. si Reddit a cartonné → continuer à poster sur r/freecad).
- On débloque un budget ads modeste (< 500 €/mois) sur le canal qui a converti le mieux.
