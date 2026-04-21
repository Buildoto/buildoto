# Sprint 8 · A.2 — Flow d'authentification desktop ↔ portal

*Version : draft Sprint 8. Référencé par Phase C (portal endpoints), Phase D (page `/authorize`), Phase E (deep-link & provider desktop).*

## 1. Objectif

Permettre à l'app desktop Buildoto de se connecter à un compte `app.buildoto.com` sans que l'utilisateur ait à copier-coller de clé API. Le flow doit :

- Ne **jamais** exposer la clé longue (`bak_…`) dans le desktop.
- Survivre à une déconnexion côté portail (l'utilisateur révoque → l'app perd l'accès en moins de 5 min).
- Fonctionner sur macOS, Windows, Linux (AppImage).
- Résister aux rebonds malveillants via PKCE + `state`.

Le pattern retenu est **OAuth 2.0 installed-app avec PKCE S256 + code one-shot + refresh token**. Aucun client secret stocké dans l'app (c'est un client public).

---

## 2. Acteurs + secrets

| Acteur | Rôle | Secret utilisé |
|---|---|---|
| **Desktop** (`Buildoto`) | Génère `state` + `code_verifier`, capte le deep link, détient le refresh token. | Rien de partagé (client public). |
| **Portal web** (`app.buildoto.com`) | Affiche la page `/authorize`, recueille le consentement. | Supabase session JWT du user. |
| **Portal API** (`app-api.buildoto.com`) | Mint les codes, échange contre tokens, révoque. | `SUPABASE_JWT_SECRET` (signature access JWT). |
| **Buildoto AI** (`api.buildoto.com`) | Vérifie l'access JWT. | `SUPABASE_JWT_SECRET` (partagé avec portal). |
| **Supabase** | Auth du user sur le portail. | `SUPABASE_JWT_SECRET` (HS256). |

Le fait que les 3 services Python partagent `SUPABASE_JWT_SECRET` permet au JWT access minté par portal-api d'être vérifié par buildoto-ai sans ajout de clé. Rotation future = rotation simultanée des 3.

---

## 3. Diagramme de séquence (happy path)

```
Desktop              Browser               Portal web          Portal API          Supabase          Buildoto AI
   |                    |                     |                   |                   |                   |
   | 1. génère state,   |                     |                   |                   |                   |
   |    code_verifier,  |                     |                   |                   |                   |
   |    code_challenge  |                     |                   |                   |                   |
   |                    |                     |                   |                   |                   |
   | 2. shell.openExternal("https://app.buildoto.com/authorize?app=desktop&state=…&code_challenge=…&redirect_uri=buildoto://auth")
   |───────────────────►|                     |                   |                   |                   |
   |                    | 3. GET /authorize?…                     |                   |                   |
   |                    |────────────────────►|                   |                   |                   |
   |                    |                     | 4. si pas loggé: redirect /login      |                   |
   |                    |◄────────────────────│                   |                   |                   |
   |                    |     (login via Supabase Auth UI)        |                   |                   |
   |                    |─────────────────────────────────────────────────────────────►|                   |
   |                    |                     | ◄─────────── session Supabase ─────────|                   |
   |                    |                     |                   |                   |                   |
   |                    | 5. render page consent                  |                   |                   |
   |                    |◄────────────────────│                   |                   |                   |
   |                    |                     |                   |                   |                   |
   |                    | 6. user clique "Autoriser"              |                   |                   |
   |                    |                                         |                   |                   |
   |                    | 7. POST /desktop/authorize/grant (Bearer: Supabase JWT)     |                   |
   |                    |────────────────────────────────────────►|                   |                   |
   |                    |                                         | 8. vérifie JWT, crée auth_code (sha256 hash en DB, TTL 10 min)
   |                    |                                         |───────────────────────────────────────►   (INSERT desktop_auth_codes)
   |                    | 9. { redirect_url: "buildoto://auth?code=…&state=…" }       |                   |
   |                    |◄────────────────────────────────────────│                   |                   |
   |                    |                                         |                   |                   |
   |                    | 10. window.location = redirect_url      |                   |                   |
   |                    |                                                                                 |
   |                    | 11. OS intercepte buildoto:// → app desktop                                     |
   | 12. open-url / second-instance event                                                                 |
   |◄───────────────────│                                         |                   |                   |
   |                    |                                         |                   |                   |
   | 13. vérifie state (match)                                    |                   |                   |
   |                                                                                                      |
   | 14. POST /desktop/token { code, code_verifier }                                  |                   |
   |────────────────────────────────────────────────────────────►|                   |                   |
   |                                                              | 15. vérifie PKCE : sha256(verifier)==code_challenge
   |                                                              |     atomique : UPDATE desktop_auth_codes SET consumed_at=now() WHERE id=? AND consumed_at IS NULL RETURNING user_id
   |                                                              | 16. INSERT desktop_sessions, mint JWT access + refresh opaque
   | 17. { access_token: "eyJ…" (5 min), refresh_token: "dst_…" (90 j), expires_in: 300 }                |
   |◄─────────────────────────────────────────────────────────────│                   |                   |
   |                                                                                                      |
   | 18. stocke refresh_token via keytar('buildoto', 'buildoto-ai-refresh')                              |
   | 19. cache access_token en mémoire (TTL 4min30s, renew à T-30s)                                      |
   |                                                                                                      |
   | 20. POST /v1/chat/completions (Authorization: Bearer <access JWT>)                                  |
   |─────────────────────────────────────────────────────────────────────────────────────────────────►|
   |                                                                                  | 21. middleware : _looks_like_jwt → jwt.decode(SUPABASE_JWT_SECRET, aud="buildoto-ai")
   |                                                                                  |     → AuthContext(user_id, plan_tier)
   | 22. 200 + SSE stream + event: sources                                                              |
   |◄─────────────────────────────────────────────────────────────────────────────────────────────────│
```

---

## 4. Champs `desktop_sessions` + `desktop_auth_codes`

### `desktop_auth_codes` (codes one-shot, TTL 10 min)
| Champ | Type | Note |
|---|---|---|
| `id` | uuid | PK |
| `code_hash` | text | sha256 hex du code brut (64 chars) |
| `user_id` | uuid | FK `auth.users` |
| `code_challenge` | text | PKCE S256 b64url |
| `redirect_uri` | text | doit commencer par `buildoto://` |
| `device_hint` | text | user-agent / plateforme, pour l'UI sessions |
| `expires_at` | timestamptz | `now() + interval '10 minutes'` |
| `consumed_at` | timestamptz | set par l'UPDATE atomique du `/desktop/token` |
| `created_at` | timestamptz | default `now()` |

Cron pg_cron hebdo supprime les rows `expires_at < now() - interval '7 days'`.

### `desktop_sessions` (refresh tokens actifs)
| Champ | Type | Note |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | FK `auth.users`, index |
| `device_hint` | text | ex. "Buildoto 1.0.0 macOS arm64" |
| `refresh_token_hash` | text | sha256 hex du refresh brut |
| `expires_at` | timestamptz | `now() + interval '90 days'` |
| `revoked_at` | timestamptz | null = actif |
| `last_used_at` | timestamptz | bump à chaque refresh |
| `created_at` | timestamptz | default `now()` |

Unique index sur `refresh_token_hash` WHERE `revoked_at IS NULL`.

---

## 5. Cas d'erreur

| Cas | Qui détecte | Comportement |
|---|---|---|
| User ferme la page `/authorize` sans cliquer | Desktop | Timeout 2 min → toast « Authentification annulée ». |
| User clique « Annuler » | Portal web | Redirect `buildoto://auth?error=access_denied&state=…`. Desktop affiche un message clair, retour à l'onboarding. |
| `state` différent entre démarrage et retour | Desktop | Rejette le deep link silencieusement (tentative d'injection possible), toast « Lien d'authentification invalide ». |
| Code expiré (> 10 min) | Portal API | 400 `{error: "code_expired"}`. Desktop propose de recommencer. |
| Code déjà consommé | Portal API | 400 `{error: "code_used"}`. Cas d'une attaque replay — pareil, recommencer. |
| PKCE mismatch | Portal API | 400 `{error: "pkce_mismatch"}`. |
| Refresh révoqué côté portal | Portal API | 401 `{error: "refresh_revoked"}`. Desktop clear keytar, reset UI à « Non connecté ». |
| Refresh expiré (> 90 j) | Portal API | 401 `{error: "refresh_expired"}`. Même chose. |
| Access JWT expiré en plein milieu d'une requête | Buildoto AI | 401. Desktop catch, renouvelle via `/refresh`, retry la requête une fois. |
| Tous les services down | Desktop | Provider Buildoto AI affiché « Indisponible » dans la status bar ; les autres providers continuent. |

---

## 6. Ce que l'access JWT contient

```json
{
  "iss": "buildoto-portal",
  "sub": "<user_id uuid>",
  "aud": "buildoto-ai",
  "exp": 1713700000,
  "iat": 1713699700,
  "plan_tier": "pro",
  "session_id": "<desktop_sessions.id>"
}
```

- `aud` = `buildoto-ai` (buildoto-ai refuse les JWT sans ce claim — isole le token des JWTs Supabase qui ont `aud="authenticated"`).
- `plan_tier` évite un aller-retour Supabase à chaque requête côté quota middleware. Rafraîchi à chaque `/refresh` (donc au plus toutes les 5 min).
- `session_id` permet la révocation ciblée sans invalider tous les tokens du user (futur : blacklist Redis `revoked:<session_id>` avec TTL 5 min).

---

## 7. Résumé des endpoints créés

| Méthode + chemin | Auth | Rôle |
|---|---|---|
| `POST /desktop/authorize/grant` | Supabase JWT (SPA) | Mint code one-shot après consentement |
| `POST /desktop/token` | Public | Échange code + code_verifier → {access, refresh} |
| `POST /desktop/token/refresh` | Public (refresh_token en body) | Renouvelle access JWT |
| `DELETE /desktop/sessions/{id}` | Supabase JWT (SPA) | Révoque une session |
| `GET /me/sessions` | Supabase JWT (SPA) | Liste les sessions actives |
