# Kickoff Claude Code — Buildoto Sprint 7
*Phase 2 · Stripe + abonnements + billing portal + usage metering*

---

## 1. Contexte

**Sprint 7 de Buildoto (Phase 2).** Après sprint 6 : un service Mistral+RAG fonctionnel avec API keys. Les utilisateurs peuvent s'en servir techniquement mais il n'y a ni facturation ni self-service.

Ce sprint ajoute la **couche commerciale** : Stripe, abonnements, portail utilisateur pour gérer son compte, plans tarifaires, metering précis de l'usage. À la fin, Buildoto est un vrai SaaS monétisable.

---

## 2. Mission

1. Site web utilisateur `app.buildoto.com` : sign-up, sign-in, dashboard, billing portal
2. Intégration Stripe : checkout, subscriptions, invoices
3. Metering de l'usage : chaque requête API est loggée avec tokens/cost, affichable dans le dashboard
4. Plans tarifaires simples (3 tiers à valider avec toi)
5. Page landing publique `buildoto.com` déjà faite au sprint 4 — on ajoute juste un CTA "Sign up" vers le portail

---

## 3. Stack technique

- **Frontend portail** : Vite + React + TypeScript + shadcn + TanStack Router (cohérent avec app Buildoto desktop)
- **Backend** : FastAPI (même stack que sprint 6, peut partager du code ou être séparé)
- **Auth** : Supabase Auth (email/password + OAuth GitHub/Google)
- **DB** : Supabase Postgres (les mêmes tables que sprint 6)
- **Paiement** : Stripe + `stripe-python`
- **Emails transactionnels** : Resend (simple, 3000 emails/mois gratuits)
- **Hosting** : Cloudflare Pages pour le frontend, même serveur que sprint 6 pour le backend

---

## 4. Plans tarifaires (proposition à valider)

### Plan Free
- **0 €/mois**
- Accès au modèle `buildoto-ai-v1` limité
- 100 requêtes / mois
- Pour découverte / tests

### Plan Pro
- **19 €/mois**
- Accès illimité à tous les modèles Buildoto AI
- 2000 requêtes / mois incluses
- Au-delà : facturation usage `0.02 €/requête`
- Support email
- Pour indépendants et petits cabinets

### Plan Team
- **49 €/utilisateur/mois**
- Tout Pro + requêtes illimitées
- Onboarding dédié
- Pour cabinets d'archi / BET de 3+ personnes

**Note :** ces chiffres sont à valider en fonction de ton coût marginal sur Mistral. Si Mistral-large te coûte ~0.015 € par requête moyenne, Pro à 19 € avec 2000 requêtes couvre ton coût même au max (~30 €) → tu es sur la marge mince ou négative. **À réévaluer avec les vrais coûts du sprint 6.**

---

## 5. Parcours utilisateur

### Sign-up

1. Utilisateur visite `app.buildoto.com/signup`
2. Email + password ou GitHub OAuth
3. Confirmation email (Supabase standard)
4. Après confirmation : auto-créé en plan Free, API key générée, redirect dashboard
5. Email de bienvenue avec lien pour configurer l'app desktop

### Upgrade

1. Dashboard affiche "Vous utilisez le plan Free (X/100 requêtes)"
2. Bouton "Passer au plan Pro" → Stripe Checkout (mode subscription)
3. Après paiement : webhook Stripe → MAJ plan en DB → email de confirmation
4. Dashboard reflète le nouveau plan immédiatement

### Gestion abonnement

1. "Billing portal" = iframe vers Stripe Customer Portal (hosted by Stripe)
2. L'utilisateur peut : voir factures, changer moyen paiement, annuler abonnement
3. Annulation = effective fin de cycle de facturation courant

### Downgrade / cancellation

1. Cancel = downgrade à Free à la fin de la période
2. Dashboard affiche "Votre plan Pro expire le X"
3. Si re-subscribe avant expiration : annule le downgrade

---

## 6. Configuration Stripe

### Produits à créer dans Stripe Dashboard

- Product "Buildoto AI Pro" avec Price récurrent mensuel 19 €
- Product "Buildoto AI Team" avec Price récurrent mensuel 49 € (par seat)
- Usage-based product "Additional Requests" pour over-quota (0.02 €/unité)

### Webhooks à gérer

- `checkout.session.completed` → upgrade plan
- `customer.subscription.updated` → sync plan en DB
- `customer.subscription.deleted` → downgrade Free
- `invoice.payment_failed` → envoyer email + marquer compte "payment issue"
- `invoice.paid` → rien (Stripe gère)

### Usage reporting

- À la fin de chaque mois, on rapporte à Stripe le nombre de "Additional Requests" via `stripe.SubscriptionItem.create_usage_record`
- Stripe facture automatiquement sur la facture suivante

---

## 7. Dashboard utilisateur

Pages minimales :

### `/dashboard` (home)
- Welcome + nom
- Plan actuel + quota restant
- Graphe usage 30 jours
- "Configure the desktop app" card avec API key + lien vers docs
- Lien "Upgrade" si plan Free

### `/dashboard/api-keys`
- Liste des clés API (avec prefix visible + nom + last_used)
- Bouton "Create new key"
- Bouton "Revoke" par clé

### `/dashboard/usage`
- Graphe détaillé (requêtes/jour sur 90 jours)
- Breakdown par modèle utilisé
- Export CSV

### `/dashboard/billing`
- Plan actuel + prix
- Bouton "Open Stripe portal" (iframe ou redirect)
- Historique des factures (synchronisé depuis Stripe)

### `/dashboard/settings`
- Email, password change, 2FA (via Supabase)
- Préférences email (marketing, product updates)
- Delete account (soft-delete initial, hard-delete 30 jours)

---

## 8. Schema DB (nouvelles tables Supabase)

```sql
-- Profile utilisateur (étend auth.users)
create table profiles (
  id uuid primary key references auth.users(id),
  display_name text,
  stripe_customer_id text unique,
  plan text not null default 'free',  -- 'free' | 'pro' | 'team'
  plan_current_period_end timestamptz,
  created_at timestamptz default now()
);

-- API keys
create table api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  name text not null,
  key_prefix text not null,          -- 'bld_abc' (visible)
  key_hash text not null,            -- sha256 du secret complet
  created_at timestamptz default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index api_keys_user_id_idx on api_keys(user_id);
create index api_keys_key_hash_idx on api_keys(key_hash) where revoked_at is null;

-- Usage logs (une ligne par requête API)
create table usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  api_key_id uuid references api_keys(id),
  model text not null,
  tokens_input int not null,
  tokens_output int not null,
  cost_eur numeric(10, 6) not null,  -- coût marginal côté Buildoto
  latency_ms int,
  created_at timestamptz default now()
);

create index usage_logs_user_id_created_at_idx on usage_logs(user_id, created_at desc);

-- Quota check rapide (vue matérialisée rafraîchie chaque heure)
create materialized view user_usage_current_month as
select
  user_id,
  count(*) as request_count,
  sum(tokens_input + tokens_output) as total_tokens,
  sum(cost_eur) as total_cost_eur
from usage_logs
where created_at >= date_trunc('month', now())
group by user_id;

create unique index on user_usage_current_month(user_id);
```

**RLS** : policies strictes — un user ne voit que ses propres `api_keys` et `usage_logs`.

---

## 9. Deliverables de ce sprint (ordre strict)

1. **Frontend app.buildoto.com** : squelette Vite + React + shadcn + TanStack Router + auth Supabase
2. **Sign-up / sign-in** : email + GitHub OAuth + confirmation flow
3. **Dashboard avec 5 pages** (home, api-keys, usage, billing, settings)
4. **Schéma DB complet** : profiles, api_keys, usage_logs, policies RLS, vue usage_current_month
5. **Migration des api_keys du sprint 6** : les clés générées ad-hoc deviennent gérables dans le portail
6. **Stripe integration** :
   - Products + prices créés via script (idempotent)
   - Checkout flow
   - Webhook handler FastAPI avec signature validation
   - Customer Portal embed
   - Usage reporting (additional requests)
7. **Emails transactionnels** via Resend : welcome, payment success, payment failed, subscription cancelled
8. **Quota enforcement** : middleware FastAPI sur l'API Buildoto AI qui vérifie le quota avant d'accepter une requête
9. **Dev/staging/prod** : 3 environnements Stripe + Supabase séparés
10. **Documentation utilisateur** : "How to use Buildoto AI with your desktop app" avec screenshots

---

## 10. Critères d'acceptation

- [ ] Un utilisateur peut s'inscrire, voir son dashboard, générer une API key, la coller dans l'app desktop, et faire une requête réussie
- [ ] Upgrade au plan Pro via Stripe Checkout fonctionne end-to-end (paiement test → webhook → plan mis à jour en < 30 s)
- [ ] Un utilisateur Free qui atteint 100 requêtes reçoit 429 avec message clair "Plan limit reached"
- [ ] Un utilisateur Pro à 2000 requêtes continue mais chaque requête additionnelle est loggée comme over-quota
- [ ] La facture de fin de mois pour un utilisateur Pro qui a dépassé inclut la ligne "Additional Requests"
- [ ] Cancel d'un abonnement : utilisateur retrouve son plan Free à la fin du cycle
- [ ] Aucune RLS leak : un user A ne peut pas voir les api_keys ou usage_logs d'un user B
- [ ] Les emails transactionnels arrivent sous 30 s

---

## 11. Ce que tu ne dois PAS faire ce sprint

- Ne pas construire une page landing publique (déjà faite au sprint 4)
- Ne pas intégrer le portail dans l'app desktop (sprint 8)
- Ne pas implémenter de features team (multi-seat) si tu veux simplifier. On peut repousser "Team" à une v2.
- Ne pas gérer les remboursements manuels. Via Stripe Dashboard quand un cas arrive.
- Ne pas intégrer d'analytics marketing autres que ce qu'on a déjà (PostHog).

---

## 12. Première action

Avant de coder :

1. **Validation des plans tarifaires** avec toi, en fonction des coûts marginaux mesurés au sprint 6.
2. **Wireframes des 5 pages dashboard** (ASCII ou description détaillée).
3. **Schéma DB validé** : je relis les migrations avant application.
4. **Config Stripe** : liste des products/prices à créer + plan de webhooks.
5. **Plan de test complet** : scénarios end-to-end qui prouvent que l'intégralité du funnel fonctionne.

**Validation avant code.**
