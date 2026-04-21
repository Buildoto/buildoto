# Sprint 8 · A.1 — Alpha learnings

*Version : draft Sprint 8 — relecture humaine requise avant d'être cité dans les release notes ou le site vitrine.*

Cette synthèse rassemble ce qui est remonté de l'alpha privée (`0.1.0-alpha` → `0.9.x-beta`, sprints 1-7) auprès des premiers testeurs architectes / FreeCAD power-users. Elle alimente :

- Les angles des **release notes v1.0** (A.4).
- Le contenu de la **page FAQ** du site (Phase J).
- Les arguments de la **page pricing** (Phase J).
- Les garde-fous honnêtes du kit comms (Phase K) — ne pas vendre ce qu'on ne livre pas.

---

## 1. Ce qui a marché

### 1.1 L'agent sur un vrai projet FreeCAD (sprint 1)
Dès les premières alphas, le flow « décris ce que tu veux → l'agent modifie le `.FCStd` → tu vois la 3D se mettre à jour » a été identifié comme le **moment aha**. Aucun user n'a posé la question « mais pourquoi utiliser un agent plutôt qu'une macro ? » après avoir essayé.

**Action :** mettre cette démo en hero vidéo du site. Un GIF loop de 10s suffit — pas de vidéo de 5 minutes.

### 1.2 Le sidecar FreeCAD qui survit aux crashs
Les testeurs ont apprécié que quand FreeCAD plante (ce qui arrive), l'app redémarre le sidecar et reprend. Un archi a écrit : *« je ne perds plus 15 minutes de travail à chaque segfault sur un Assembly4 un peu lourd »*.

### 1.3 Le choix de provider IA
Pouvoir brancher Claude, GPT, Mistral, Ollama, OpenRouter — apprécié. Plusieurs users ont leur abonnement Claude pro déjà en place, et n'ont pas voulu « encore un abonnement ». Confirme la décision Sprint 8 de **ne jamais forcer Buildoto AI** dans l'onboarding.

### 1.4 L'intégration Git (sprint 2)
Le pattern « projet = repo » a rassuré les users techniques (dev + archi). Le commit auto après une modif agent leur donne un filet de sécurité qu'aucun outil CAD ne propose.

---

## 2. Ce qui n'a pas marché

### 2.1 L'onboarding API key
Demander une clé OpenAI/Anthropic dès la 2ème étape du wizard a perdu ~30 % des users selon la télémétrie PostHog (step 2 → step 3 = drop-off majeur). Deux raisons :
- Certains ne savaient pas où récupérer la clé (malgré le lien).
- D'autres voulaient « juste essayer » avant d'investir.

**Action Sprint 8 :** Step 2 devient « Choose AI » avec Buildoto AI (essai gratuit 100 req) en tête — le user qui clique obtient une démo en < 2 minutes sans copier-coller de clé.

### 2.2 La découverte de FreeCAD en arrière-plan
Plusieurs users pensaient que Buildoto *remplaçait* FreeCAD. Question récurrente : *« est-ce que je dois quand même installer FreeCAD ? »*. Non, le sidecar bundlé s'en occupe, mais ce n'était pas clair.

**Action :** page AI + page pricing doivent expliquer l'architecture en une phrase (« Buildoto embarque FreeCAD — aucune installation tierce »).

### 2.3 L'absence de retour sur les sources
Quand l'agent cite une norme de construction, aucun user ne sait d'où ça vient. Résultat : la confiance s'érode, ils cross-check ailleurs. C'est **le** feedback qui a déclenché la priorité haute des sources RAG visibles (Phase G de ce sprint).

### 2.4 Le status invisible du quota
Dans la beta Sprint 7, le quota mensuel est enforcé côté `buildoto-ai` mais **rien ne l'affiche** dans l'app. Un user a fait 100 requêtes en 2 h, pris le 429 sans comprendre. Justifie le status bar permanent (Phase F).

### 2.5 L'agent qui fait trop (ou pas assez)
Quelques testeurs ont remonté que l'agent ouvre parfois 4 fichiers pour une modif simple, ou à l'inverse ne voit pas un contexte évident. C'est un problème OpenCode + de prompting système — **pas adressé dans Sprint 8**. À inscrire dans la roadmap v1.1.

### 2.6 Le Linux AppImage sans raccourci menu
L'AppImage tourne mais ne s'enregistre pas dans le menu desktop. Workaround docuemnté mais friction réelle. Possibilité d'intégrer `AppImageLauncher` — à évaluer après v1.0.

---

## 3. Top 5 demandes alpha (ordre de fréquence)

1. **Montrer d'où l'IA tient ses infos.** → Phase G.
2. **Savoir combien il me reste / ce que ça va me coûter.** → Phase F.
3. **Connexion à Buildoto AI sans coller une clé dans un champ.** → Phase E.
4. **Une page qui explique la différence entre Buildoto AI et « juste utiliser Claude ».** → Phase J (page `/ai`).
5. **Linux plus first-class** (deb / flatpak + raccourci menu). → **différé v1.1**.

---

## 4. Ce qu'on ne peut pas résoudre dans Sprint 8 — à dire publiquement

Le kit de comms doit assumer ces limites (honnêteté > survente) :

- **Pas de collaboration temps-réel.** Un projet = un user. Multi-seat (« Teams ») prévu v1.2 si traction.
- **RAG corpus francophone partiel.** Wiki FreeCAD + OpenCASCADE sont en anglais. Code de la construction FR oui, mais DTU partiels. Mention explicite dans la FAQ.
- **Pas d'export IFC automatique.** FreeCAD l'exporte via menu File ; l'agent ne pilote pas encore ça nativement.
- **Hallucinations résiduelles.** Même avec RAG, l'IA peut citer une source à l'appui d'un propos qu'elle invente. Le drawer « sources » doit toujours être complété par une vérification humaine — on le dit dans le tooltip.

---

## 5. Métrique alpha (pour rétrospective interne, pas pour comms publique)

*(chiffres à compléter par le user avant la v1.0 — PostHog dashboard `Buildoto · Alpha Funnel`)*

- Installations totales : `___`
- Users actifs ≥ 3 sessions : `___`
- Step 2 → Step 3 conversion : `___ %`
- Requêtes agent / user / semaine (médiane) : `___`
- Top provider utilisé : `___`
- NPS alpha (sondage envoyé à J+14) : `___`

À remplir avant de publier les comms Phase K pour pouvoir mentionner « X premières installations » si les chiffres sont flatteurs, ou rester silencieux sinon.
