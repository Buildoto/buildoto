# Security Policy

## Supported Versions

Buildoto est en pré-version alpha. Seule la dernière release alpha reçoit des correctifs de
sécurité.

| Version | Supportée |
|---|---|
| `0.1.x-alpha` | ✅ |
| < `0.1.0-alpha.0` | ❌ |

## Reporting a Vulnerability

Merci de **ne pas** ouvrir d'issue GitHub publique pour une vulnérabilité. Contactez plutôt :

**Email** : s.mignot@beforbuild.com (clé GPG à venir)

Incluez :
- Description du problème
- Étapes pour reproduire (PoC si possible)
- Impact estimé (RCE, exfiltration, DoS, etc.)
- Votre nom / pseudo pour attribution (optionnel)

## Scope

- Application Electron Buildoto (main + renderer + preload)
- Sidecar FreeCAD lancé par Buildoto
- Vitrine `buildoto.com` et docs `docs.buildoto.com`

**Hors scope** :
- Providers IA tiers (Anthropic, OpenAI, Mistral…) — leur sécurité est leur responsabilité
- Serveurs MCP installés par l'utilisateur (configurés dans ses réglages)
- Système d'exploitation hôte

## Response SLA

- Accusé de réception : sous 3 jours ouvrés
- Évaluation initiale : sous 7 jours
- Correctif : selon gravité (critical < 7 jours, high < 30 jours)

## Disclosure Policy

Nous suivons la **coordinated disclosure** : une fois un correctif publié, nous publions un
avis de sécurité (GHSA) et mentionnons le reporter sauf demande contraire.
