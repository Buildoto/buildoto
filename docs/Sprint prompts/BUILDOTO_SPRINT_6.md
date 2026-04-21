# Kickoff Claude Code — Buildoto Sprint 6
*Phase 2 · Inférence Mistral + RAG retrieval + system prompt enrichi*

---

## 1. Contexte

**Sprint 6 de Buildoto (Phase 2).** Après sprint 5 : un corpus AEC vectorisé dans Qdrant, du retrieval qui fonctionne.

Ce sprint construit la **couche d'inférence** : un service qui reçoit une requête agent, interroge Qdrant pour trouver les chunks pertinents, enrichit le prompt système, appelle Mistral, stream la réponse. C'est le cœur technique de ton offre payante.

---

## 2. Mission

Un service HTTP `buildoto-ai` compatible OpenAI API (endpoints `/v1/chat/completions`, `/v1/models`), qui :

1. Reçoit des requêtes en format OpenAI standard
2. Analyse les messages pour extraire des requêtes de retrieval
3. Interroge Qdrant pour obtenir les chunks pertinents
4. Injecte ces chunks dans le system prompt
5. Appelle Mistral (API ou self-hosted vLLM)
6. Stream la réponse au client
7. Logge tout pour analytics et facturation future

**Compatible OpenAI = critique** : l'app Buildoto peut alors utiliser ton service comme n'importe quel autre provider OpenAI-compatible (déjà supporté via OpenCode au sprint 3). Pas de client custom à coder dans l'app.

---

## 3. Stack technique

- **FastAPI** + **uvicorn** pour l'API HTTP
- **httpx** pour les appels Mistral (ou `mistralai` SDK officiel)
- **qdrant-client** pour interroger Qdrant
- **sentence-transformers** pour embedder les requêtes (même modèle que sprint 5)
- **tiktoken** ou tokenizer Mistral pour compter les tokens
- **structlog** pour les logs
- **redis** pour cache (requêtes répétées = retrieval évité)
- **prometheus-client** pour les métriques

---

## 4. Architecture

```
[App Buildoto]
      │
      │ POST /v1/chat/completions (OpenAI format)
      ▼
[API buildoto-ai]
      │
      ├─ 1. Extract last user message
      ├─ 2. Optional: rewrite query (HyDE or query expansion)
      ├─ 3. Embed query (BGE-M3)
      │
      ├─ 4. Qdrant search:
      │      - filtered by collection relevance
      │      - top_k = 8, MMR for diversity
      │
      ├─ 5. Rerank (optional, sprint 6+) :
      │      cross-encoder BGE-reranker-large
      │
      ├─ 6. Construct enriched system prompt:
      │      [base prompt FreeCAD]
      │      [retrieved chunks with source attribution]
      │      [user's AGENTS.md context if provided]
      │
      ├─ 7. Call Mistral API:
      │      - model: mistral-large-2 ou codestral
      │      - stream: true
      │      - tools: forwarded from request
      │
      ├─ 8. Stream response back
      │
      └─ 9. Log everything (cost, latency, tokens)
```

---

## 5. Choix du modèle Mistral

Trois options à évaluer ce sprint :

### Option A : Mistral API hosted
- `mistral-large-2` : meilleur général, coût ~6 €/Mtoken input, ~18 €/Mtoken output
- `codestral-2501` : spécialisé code, moins cher, bon pour Python FreeCAD
- **Avantage** : zéro infra à gérer, scalable automatiquement
- **Inconvénient** : coût variable, pas de contrôle fine (no customization)

### Option B : vLLM self-hosted sur GPU
- Modèle `mistralai/Mistral-Small-24B-Instruct-2501` ou `Codestral-22B`
- Déployé sur un serveur GPU (H100 80GB chez Hetzner GPU Cloud ou RunPod)
- Coût : ~800-1500 €/mois fixe, illimité en usage
- **Avantage** : coût prévisible, latence stable, contrôle total
- **Inconvénient** : ops à gérer, cold starts, scaling manuel

### Option C : hybride
- Commencer sur Mistral API (option A) pour la beta
- Switcher sur vLLM (option B) quand les coûts dépassent 1500 €/mois

**Recommandation pour ce sprint : option A.** Pas d'ops à gérer, time-to-market rapide, migration facile vers vLLM plus tard (l'API vLLM est compatible OpenAI, donc même code client).

---

## 6. Stratégie de prompt

Le system prompt final envoyé à Mistral contient trois couches :

```
# Layer 1 — Identité Buildoto AI
You are Buildoto AI, an expert assistant for AEC (Architecture, Engineering,
Construction) focused on generating Python code for FreeCAD.

Core principles:
- Always produce executable Python FreeCAD code
- Use typed parameters, named arguments, explicit imports
- Respect FreeCAD's Arch/Draft/Part/Sketcher workbench conventions
- When uncertain, retrieve documentation rather than hallucinating
- Follow French construction standards when location is FR

# Layer 2 — Contexte projet (AGENTS.md si dispo)
{agents_md_content if present}

# Layer 3 — Documentation pertinente récupérée (RAG)
Here are {n} excerpts from FreeCAD documentation and AEC regulations
relevant to your task:

## Source 1: {title} ({source_type}, license: {license})
{content}

## Source 2: ...
```

**Règles critiques :**
- Chaque chunk injecté est **attribué** (source, license) pour la transparence
- Si le retrieval ne trouve rien de pertinent (score < threshold), on NE injecte PAS de chunks (évite le noise)
- Budget tokens : max 40 % du context window pour les chunks (garde place pour conversation)

---

## 7. Optimisations de retrieval

### Query rewriting (HyDE light)

Avant de chercher, on génère une "hypothèse" de réponse avec un petit modèle rapide (Mistral-7B ou Codestral-22B) puis on embedde l'hypothèse plutôt que la question brute. Ça améliore significativement le recall pour les questions courtes.

### Reranking

Après retrieval top_k=30 depuis Qdrant, un cross-encoder (`BAAI/bge-reranker-large`) rerank et ne garde que les top_8. Gain de précision important.

### MMR (Maximal Marginal Relevance)

Évite de retrouver 5 chunks qui disent la même chose. Diversifie les sources.

### Cache

Redis : cache les (query embedding → top_k chunk IDs) pour 1h. Les requêtes répétées évitent Qdrant.

---

## 8. Compatibilité OpenAI API

L'endpoint principal :

```
POST /v1/chat/completions

Request (standard OpenAI):
{
  "model": "buildoto-ai-v1",
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "Crée un mur de 5m avec Arch"}
  ],
  "tools": [...],
  "stream": true,
  "temperature": 0.2
}

Response: Server-Sent Events (OpenAI format)

Différence non-triviale: le system prompt est ENRICHI server-side avec RAG.
Le client ne contrôle que le system prompt "user-level".
```

**Authentification :**
- Header `Authorization: Bearer <api_key>`
- Clés API gérées dans Supabase (table `api_keys` avec `user_id`, `key_hash`, `created_at`, `last_used_at`, `quota`)
- Validation sur chaque requête (< 20 ms avec cache Redis)

**Endpoint `/v1/models` :**

Liste des modèles disponibles :
- `buildoto-ai-v1` : Mistral-large + RAG FreeCAD complet
- `buildoto-ai-code` : Codestral + RAG FreeCAD code uniquement (plus rapide, moins cher)
- Futur : `buildoto-ai-fr` : spécialisé réglementation FR

---

## 9. Observabilité

**Métriques Prometheus exposées :**
- `buildoto_ai_requests_total{model, status}` — total requêtes
- `buildoto_ai_latency_seconds{stage}` — latences (retrieval, mistral, full)
- `buildoto_ai_tokens_total{model, direction}` — tokens input/output
- `buildoto_ai_retrieval_hits{collection}` — chunks retournés par collection
- `buildoto_ai_cost_eur_total{model}` — coût cumulé

**Logs structurés structlog** :
- Chaque requête logge : user_id, model, tokens, cost, latency, retrieval_scores, mistral_finish_reason
- Échantillonnage : 100 % en alpha, 10 % plus tard pour éviter volume

Grafana dashboard à part pour la consultation.

---

## 10. Deliverables de ce sprint (ordre strict)

1. **Service FastAPI** squelette : auth, endpoints `/health`, `/v1/models`.
2. **Implémentation retrieval** : embedding query, search Qdrant, filtering par collection, MMR.
3. **Query rewriting HyDE light** : utilisation d'un petit modèle pour générer une hypothèse.
4. **Reranking cross-encoder** BGE-reranker-large.
5. **Prompt construction** avec les 3 layers (identité, contexte, RAG).
6. **Intégration Mistral API** : appels streaming, gestion tools, error handling.
7. **Endpoint `/v1/chat/completions`** compatible OpenAI avec streaming SSE.
8. **Authentification par API keys** : table Supabase, validation middleware, rate limiting par user.
9. **Métriques Prometheus + logs** structurés.
10. **Tests E2E** : scénarios "créer un mur", "comment respecter PMR", "générer un escalier" validés end-to-end depuis l'API.
11. **Docker + docker-compose** : stack complet (API + Qdrant + Redis) déployable sur un serveur.
12. **Deployment sur Hetzner ou équivalent** avec HTTPS (Caddy ou Traefik) sur un sous-domaine `api.buildoto.com`.

---

## 11. Critères d'acceptation

- [ ] `curl https://api.buildoto.com/v1/chat/completions` avec une clé valide fonctionne
- [ ] Compatible avec le client OpenAI Python SDK (`openai.OpenAI(base_url="...", api_key="...")`)
- [ ] Latence P50 < 800 ms (retrieval + first token)
- [ ] Latence P95 < 2 s
- [ ] Le streaming fonctionne de bout en bout
- [ ] Les sources RAG sont visibles dans les logs (traçabilité)
- [ ] Rate limiting : un utilisateur ne peut pas dépasser 100 req/min
- [ ] Les tests E2E passent sur les 3 scénarios définis
- [ ] Le service survit à 50 req/s sur un serveur 8 cœurs

---

## 12. Ce que tu ne dois PAS faire ce sprint

- Ne pas implémenter Stripe ou la facturation (sprint 7)
- Ne pas fine-tuner Mistral
- Ne pas intégrer le service dans l'app Buildoto (sprint 8)
- Ne pas construire un modèle propre (on utilise Mistral hosted)
- Ne pas optimiser prématurément. P95 < 2 s est largement suffisant.
- Ne pas implémenter des tools custom (l'app forward ses propres tools)

---

## 13. Première action

Avant de coder :

1. **Architecture détaillée du service** : diagramme de séquence complet d'une requête, avec timings estimés par étape.
2. **Schéma Supabase** : tables `users`, `api_keys`, `usage_logs`.
3. **Stratégie de prompt précise** : template exact du system prompt enrichi avec format d'attribution des sources.
4. **Plan de test charge** : comment tu vas simuler 50 req/s pour valider la perf.

**Validation avant tout code.**
