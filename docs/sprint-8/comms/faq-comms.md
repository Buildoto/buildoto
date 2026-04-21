# Kit de réponse — questions & critiques attendues

*Préparé pour que le user ait des réponses prêtes face aux commentaires dans les 48 h suivant le launch. Ne pas copier-coller bêtement — adapter au ton du canal (HN = factuel, r/architecture = humain, LinkedIn = professionnel).*

---

## Critiques attendues

### 1. « C'est juste un wrapper autour de Claude »

**Réponse :**
> Le wrapper est la partie difficile. FreeCAD a 23 outils exposés derrière un protocole WebSocket typé avec auto-restart sur segfault (qui arrive souvent sur les gros Assembly4). Ça a pris 3 sprints de dev. La partie LLM est échangeable — vous pouvez tourner Ollama en local si vous ne voulez pas de cloud. L'intégration Git + le RAG avec sources vérifiables + la boucle d'outils sont ce qui le rend utile au quotidien.

### 2. « Pourquoi pas juste une extension FreeCAD ? »

**Réponse :**
> Trois raisons :
> - Distribution : FreeCAD addon manager a une friction élevée pour les utilisateurs AEC non-techniques.
> - Contrôle du FS + Git + keychain : ce qu'une extension Python FreeCAD ne peut pas faire proprement (sandbox limitée).
> - Isolation : un agent IA qui plante ne doit pas crasher FreeCAD. Le sidecar externe rend les deux processus indépendants.
>
> Cela dit, j'ai envisagé une extension en parallèle pour des cas plus simples (batch scripts sans UI). C'est roadmap v1.2.

### 3. « Open source comment exactement ? »

**Réponse :**
> L'app desktop est MIT, code public sur GitHub, vous pouvez fork, modifier, redistribuer, auto-héberger. Ce qui n'est pas open source : le service Buildoto AI hébergé (API + RAG + modèles). C'est un produit commercial clairement séparé. Vous n'êtes jamais obligé de l'utiliser — l'app fonctionne aussi avec Claude/GPT/Mistral/Ollama si vous préférez.

### 4. « Ça va remplacer les architectes ? »

**Réponse :**
> Non, et je ne le veux pas. Je suis architecte depuis 20 ans. L'IA est utile pour la géométrie répétitive, les scripts techniques, la veille rapide sur une norme — c'est-à-dire 30 % du temps administratif qui nous bouffe. Les 70 % qui restent (jugement, contexte, client, créativité) restent humains. Si votre pratique se résume aux 30 %, alors oui vous êtes en danger — mais ça, ce n'était pas Buildoto, c'était l'industrie qui changeait.

### 5. « Privacy ? Vous enregistrez quoi sur vos serveurs ? »

**Réponse :**
> Côté service Buildoto AI : les requêtes transitent chiffrées, ne sont stockées que pendant le traitement (latence + audit technique — minutes, pas heures). Pas de fine-tuning sur vos prompts, jamais. Compteur d'usage stocké (nombre de requêtes par mois, pas leur contenu).
>
> Côté app : rien ne sort de votre machine sauf les requêtes IA elles-mêmes. Vos fichiers .FCStd restent locaux. Les clés API dans le trousseau OS (keytar), jamais en clair.
>
> Politique complète : buildoto.com/privacy

### 6. « Pourquoi vos binaires ne sont-ils pas signés ? »

**Réponse :**
> Certificat Apple Developer ~99 $/an, certificat EV Windows ~200 $/an. On a décidé de reporter cette dépense jusqu'aux premiers revenus pour garder la gratuité de l'app crédible. Les binaires sont reproductibles depuis le code public et les empreintes SHA-256 sont publiées dans chaque release GitHub. Le guide sur /install explique comment passer l'avertissement de l'OS en un clic. On signera dès qu'on peut se le permettre.

### 7. « Ça vaut 19 €/mois pour juste un LLM ? »

**Réponse :**
> Ça ne vaut pas 19 € si vous avez déjà un abonnement Claude pro et voulez juste un wrapper. L'app est gratuite pour ce cas-là — branchez votre clé.
>
> Les 19 €, c'est pour Buildoto AI spécifiquement : un modèle Mistral Large avec RAG sur corpus AEC (DTU, Eurocode, FreeCAD wiki, OpenCASCADE), 2000 requêtes/mois, priorité de file, sources vérifiables. C'est un produit distinct d'un accès générique à un LLM.
>
> Free tier à 100 requêtes/mois existe justement pour tester avant de décider.

### 8. « Encore un projet archi qui va mourir dans 6 mois »

**Réponse :**
> J'ai auto-financé 18 mois de développement avant de sortir v1.0. Le code est MIT, donc même si je disparais demain, le projet peut continuer sans moi. Si vous voulez minimiser le risque : utilisez l'app sans Buildoto AI (votre clé Claude/GPT), comme ça votre dépendance à mon business est zéro. Si Buildoto AI vous apporte de la valeur, l'abonnement soutient le dev. Pas de promesses, juste des actes.

### 9. « Pourquoi FreeCAD et pas Revit/Archicad ? »

**Réponse :**
> Trois raisons :
> - Revit/Archicad ne permettent pas le scripting qu'on peut donner à un agent (API limitée, propriétaire, dépendante de la version).
> - Pour faire du vrai open source il faut que la base soit open.
> - FreeCAD a suffisamment mûri (surtout depuis la 1.0) pour devenir pertinent en production, même s'il reste imparfait.
>
> Si votre pratique tourne à 100 % sur Revit, Buildoto n'est pas pour vous aujourd'hui. Mais pour IFC round-trip ou projets personnels, c'est une vraie option.

### 10. « L'IA a inventé une règle et je l'ai utilisée dans un dossier client — vous êtes responsable ? »

**Réponse :**
> Non, et c'est pour ça que les sources sont affichées sous chaque réponse et que nos CGU rappellent la responsabilité professionnelle. L'AI Act européen va dans le même sens : pour les décisions à impact réglementaire, un humain qualifié doit valider. Le drawer sources vous donne le passage exact — si vous ne l'avez pas vérifié avant d'intégrer dans un livrable, c'est un problème de process, pas un problème de Buildoto.
>
> Concrètement : traiter l'IA comme un stagiaire brillant mais débutant — jamais le laisser signer à votre place.

---

## Script pour pivoter si ton hostile

Si un commentaire devient agressif ou part en troll :

```
Merci du retour. Je comprends le point. On est en v1.0 — beaucoup à
améliorer. Si vous voulez creuser, je prends 15 min en DM — je préfère
les conversations directes aux débats de fil, je réponds toujours mieux.
```

Puis ne pas répondre au même commentateur plus d'une fois dans le thread. Laisser la communauté gérer.

## Critères pour supprimer vs ignorer vs répondre

| Commentaire | Action |
|---|---|
| Critique factuelle (même dure) | **Répondre** — factuel, sans défensive |
| Bug report explicite | **Répondre** — remercier, demander issue GitHub |
| Question de fond (business, privacy, tech) | **Répondre** — long, avec liens |
| Trolling personnel (attaque physique, diffamation) | **Ignorer + signaler mod** |
| Spam / promo concurrent | **Ignorer** (ne pas répondre = ne pas amplifier) |
| Commentaire factuellement faux | **Répondre** — rectifier poliment avec source |
| Commentaire passif-agressif répété | **Ignorer après 1 réponse** |

**Jamais supprimer un commentaire critique légitime.** Ça se voit et ça tue la crédibilité. Supprimer uniquement le spam et la diffamation.

---

## Mantras pour garder la tête froide

- Le premier jour est le pire. La traction se mesure à J+7.
- Un trolleur vaut 0.1 utilisateur. 10 utilisateurs qui lurkent valent 1 trolleur. Parler aux lurkers.
- L'honnêteté radicale est le moat en 2026. Personne n'attend la perfection — on attend la sincérité sur ce qui ne marche pas.
- Si ça devient trop émotionnel, fermer l'onglet 2 h. Les commentaires ne partent pas.
