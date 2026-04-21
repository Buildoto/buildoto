# Sprint 8 · A.3 — Wireframes

*Version : draft. ASCII volontairement grossier — l'intention plus que le pixel final. Référencé par Phases E (auth desktop), F (status bar + Compte), G (sources RAG), H (onboarding).*

---

## 1. Status bar (enrichie) — Phase F

Zone existante en bas de `app-shell.tsx`. On rajoute le pill Buildoto AI à gauche du pill FreeCAD.

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  Maison_Durand  ·  ⎇ main                                                    Projet  │
│                                                                                      │
│  [éditeur / modeler / chat]                                                          │
│                                                                                      │
├──────────────────────────────────────────────────────────────────────────────────────┤
│  ● Buildoto AI · Pro · 1 247 / 2 000 ce mois    ● FreeCAD ready    ● Clé API         │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

États du pill Buildoto AI :

| État | Couleur | Texte |
|---|---|---|
| Non connecté | gris | `○ Buildoto AI · Non connecté` (clic → démarre l'auth) |
| Connecté < 80 % | vert | `● Buildoto AI · Pro · 1 247 / 2 000 ce mois` |
| 80–99 % | orange | `● Buildoto AI · Pro · 1 620 / 2 000 ⚠` |
| ≥ 100 % Free | rouge | `● Buildoto AI · Free · Quota dépassé — Upgrade` (clic → `/billing`) |
| ≥ 100 % Pro (overage) | orange | `● Buildoto AI · Pro · 2 147 / 2 000 (+147 facturés)` |
| API injoignable | gris barré | `◌ Buildoto AI · Indisponible` |

---

## 2. Onglet « Compte » dans Settings — Phase F

Settings dialog actuel = 4 tabs (Fournisseurs · MCP · Apparence · Confidentialité). On insère **Compte** en position 1, avant Fournisseurs.

```
┌─ Paramètres ─────────────────────────────────────────────────────────────────┐
│                                                                              │
│  [ Compte ]  [ Fournisseurs ]  [ MCP ]  [ Apparence ]  [ Confidentialité ]   │
│                                                                              │
│  ──────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  Connecté en tant que                                                        │
│    sebastien@buildoto.com                                                    │
│    Sébastien Mignot                                                          │
│                                                                              │
│  Plan actuel                                                                 │
│    ●  Pro · 19 €/mois · renouvelé le 15 mai 2026                             │
│    [ Gérer l'abonnement ↗ ]                                                  │
│                                                                              │
│  Usage ce mois-ci                                                            │
│    1 247 / 2 000 requêtes    ████████░░░░  62 %                              │
│                                                                              │
│    Derniers 30 jours :                                                       │
│    ┌──────────────────────────────────────────────────────────────────┐      │
│    │                              ▃▅▆▂▄▇▅▃                            │      │
│    │              ▂▁▃▄▅▆▅▃▁▂▄▅▆█▇▆                                    │      │
│    │  ▁▂▃▃▂▁▁▁▂▃▄                                                     │      │
│    └──────────────────────────────────────────────────────────────────┘      │
│    22 mars                                                      20 avr.      │
│                                                                              │
│  Clés API                                                                    │
│    [ Voir mes clés API ↗ ]                                                   │
│                                                                              │
│  ──────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  [ Se déconnecter de Buildoto AI ]                                           │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

Flèche `↗` = lien qui ouvre le portail dans le navigateur via `shell.openExternal`.

---

## 3. Sources RAG sous un message assistant — Phase G

Dans le panneau chat, sous un message `assistant` qui a reçu des sources :

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Assistant                                                                  │
│                                                                             │
│  Pour un mur porteur en parpaing de 20 cm, le DTU 20.1 impose un            │
│  chaînage horizontal tous les 3,5 m ou à chaque plancher. L'épaisseur       │
│  minimale des joints est de 1 cm et le mortier doit atteindre M10…          │
│                                                                             │
│  ▼ 3 sources consultées                                                     │
│    • Wiki FreeCAD — Arch_Wall                 CC-BY 3.0                     │
│    • DTU 20.1 · §4.2 — chaînages              Licence Ouverte               │
│    • Code de la construction · R111-1         Licence Ouverte               │
└─────────────────────────────────────────────────────────────────────────────┘
```

Clic sur une source → drawer (shadcn `Sheet`) depuis la droite :

```
                               ┌────────────────────────────────────────┐
                               │  ✕                                     │
                               │                                        │
                               │  DTU 20.1 · §4.2 — chaînages           │
                               │  Licence Ouverte · [lien source]       │
                               │                                        │
                               │  ─────────────────────────────────────  │
                               │                                        │
                               │  "Les chaînages horizontaux doivent    │
                               │  être disposés au niveau de chaque     │
                               │  plancher ou tous les 3,5 m s'il n'y   │
                               │  a pas de plancher. Ils assurent la    │
                               │  solidarisation des murs porteurs…"    │
                               │                                        │
                               │  [extrait tronqué — 420 mots]          │
                               │                                        │
                               │  [ Ouvrir la source complète ↗ ]       │
                               └────────────────────────────────────────┘
```

---

## 4. Onboarding — Step 2 « Choose AI » — Phase H

Remplace l'ancienne « API Key ». 3 cards empilées sur desktop, une seule colonne sur les écrans étroits.

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Buildoto — bienvenue, étape 2 / 5                                         │
│                                                                            │
│  Choisis comment alimenter ton agent IA                                    │
│  Tu pourras toujours changer plus tard dans Paramètres → Fournisseurs.     │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  ⭐  Buildoto AI                                        Recommandé   │  │
│  │                                                                      │  │
│  │  Modèle spécialisé construction + BIM.                               │  │
│  │  Sources citées à chaque réponse.                                    │  │
│  │  Essai gratuit — 100 requêtes / mois.                                │  │
│  │  Puis 19 €/mois.                                                     │  │
│  │                                                                      │  │
│  │  [ Se connecter ou créer un compte ]                                 │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │     Utiliser mon propre modèle                                       │  │
│  │                                                                      │  │
│  │  Claude, GPT-4, Mistral, Ollama, OpenRouter.                         │  │
│  │  Si tu as déjà un abonnement chez eux.                               │  │
│  │                                                                      │  │
│  │  [ Configurer ]                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │     Local (Ollama)                                                   │  │
│  │                                                                      │  │
│  │  100 % offline, aucun cloud, gratuit.                                │  │
│  │  Requiert Ollama installé sur ton poste.                             │  │
│  │                                                                      │  │
│  │  [ Configurer ]                                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  [ Passer cette étape ]                       [ ← précédent ]   [ suivant ]│
└────────────────────────────────────────────────────────────────────────────┘
```

Après un clic sur « Se connecter » (card Buildoto AI) :
- Le navigateur s'ouvre sur `app.buildoto.com/authorize?…`.
- Pendant ce temps, l'écran affiche un spinner avec « En attente de ton autorisation… » et un bouton « Annuler ».
- Dès que le deep-link revient, l'écran passe automatiquement à step 3, avec bandeau vert « Connecté comme sebastien@… ».

---

## 5. Page consent `/authorize` du portail — Phase D

Route `/authorize`, user déjà loggé :

```
┌──────────────────────────────────────────────────────────────────────┐
│  Buildoto                                              sebastien@… ▾ │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│                  Autoriser Buildoto Desktop ?                        │
│                                                                      │
│   L'application Buildoto Desktop (v1.0.0) demande l'accès à ton      │
│   compte Buildoto AI.                                                │
│                                                                      │
│   Elle pourra :                                                      │
│     • Utiliser ton quota d'inférence.                                │
│     • Lire ton plan actuel et ton usage mensuel.                     │
│                                                                      │
│   Elle ne pourra pas :                                               │
│     • Accéder à ta facturation Stripe.                               │
│     • Créer ou révoquer tes clés API (bak_).                         │
│                                                                      │
│   Tu pourras révoquer cet accès à tout moment depuis Paramètres      │
│   → Sessions desktop.                                                │
│                                                                      │
│        [ Annuler ]                           [ Autoriser ]           │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 6. Section « Sessions desktop » dans portal settings — Phase D

```
┌─ Paramètres ─────────────────────────────────────────────────────────┐
│  …                                                                   │
│                                                                      │
│  Sessions desktop actives                                            │
│                                                                      │
│  Ces sessions peuvent utiliser ton quota via l'app Buildoto.         │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Buildoto 1.0.0 · macOS arm64                                   │ │
│  │  Créée le 20 avril · utilisée il y a 4 min              [ ✕ ]  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │  Buildoto 1.0.0 · Windows x64                                   │ │
│  │  Créée le 18 avril · utilisée il y a 3 jours            [ ✕ ]  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```
