# Kickoff Claude Code — Buildoto Sprint 5
*Phase 2 · Corpus RAG AEC + pipeline d'ingestion*

---

## 1. Contexte

**Phase 2 démarre.** La phase 1 (sprints 1-4) a livré l'app open-source fonctionnelle. Elle peut tourner avec n'importe quel modèle IA que l'utilisateur configure. Bien.

Phase 2 construit **ta valeur monétisable** : un service *"Buildoto AI"* basé sur Mistral + RAG sur un corpus AEC soigné. L'utilisateur paie un abonnement, l'app appelle ton endpoint au lieu de ses propres API keys, et l'agent a accès à une connaissance AEC spécialisée.

Ce sprint est **la fondation data** : le corpus et le pipeline d'ingestion. Pas encore l'inférence, pas encore la facturation, pas encore l'intégration client.

**Ce sprint peut être lancé en parallèle du sprint 4** si tu as deux streams de travail.

---

## 2. Mission

Pipeline d'ingestion qui prend des sources AEC publiques/licites, les transforme en embeddings vectoriels, les stocke dans une base vectorielle prête à être interrogée par RAG.

**Sortie concrète :** une base Qdrant avec 50k-200k chunks embeddés et searchables, avec un script de test qui répond correctement à des requêtes AEC typiques en retournant les 5 chunks les plus pertinents.

---

## 3. Stack technique

- **Python 3.11+**
- **Docker Compose** pour orchestrer
- **Qdrant** (vector DB self-hosted, Rust, excellent filtrage)
- **BGE-M3** ou **intfloat/multilingual-e5-large** pour les embeddings (open source, multilingue FR/EN)
- **Scrapy** pour le crawling
- **BeautifulSoup + markdownify** pour nettoyer le HTML
- **tree-sitter-python** pour parser le code FreeCAD
- **pytest** pour tester la qualité du retrieval

---

## 4. Corpus — sources et licences

**Toutes les sources vérifiées licence AVANT ingestion. Pas de NF DTU, pas de normes payantes.**

### Sources techniques (logiciel)

| Source | Licence | Volume | Priorité |
|--------|---------|--------|----------|
| Wiki FreeCAD (`wiki.freecad.org`) | CC-BY 3.0 | ~2000 pages | Haute |
| Documentation OpenCASCADE | LGPL + CC | ~3000 pages | Haute |
| Code source FreeCAD (GitHub) | LGPL-2.1 | ~600 workbenches/macros | Haute |
| Forum FreeCAD (Q&A) | CC-BY | ~30k threads | Moyenne |
| Macros communautaires | OSS divers | ~500 macros | Haute |
| IfcOpenShell docs | LGPL | ~200 pages | Moyenne |

### Sources réglementaires (public / libre)

| Source | Licence | Priorité |
|--------|---------|----------|
| Code de l'urbanisme (Légifrance) | Licence Ouverte Etalab | Haute |
| Code de la construction et de l'habitation | Licence Ouverte | Haute |
| Arrêté accessibilité PMR 24/12/2015 | Licence Ouverte | Haute |
| Arrêté sécurité incendie habitation | Licence Ouverte | Moyenne |
| RE2020 (fascicules publics) | Licence Ouverte | Basse |

### Sources exclues

- NF DTU (copyright AFNOR) — **interdit**
- Normes ISO payantes — **interdit**
- Cours privés, livres édités — **interdit** sans licence
- Eurocodes (détails techniques) — à vérifier cas par cas

---

## 5. Architecture du pipeline

```
Crawlers        →  Cleaners        →  Chunkers
(Scrapy,           (markdownify,      (semantic + overlap,
 GitHub API,        dedup,             code-aware)
 Légifrance API)    filtering)
                                                │
                                                ▼
Metadata        ←  Embedders        ←  Chunks prêts
enrichment         (BGE-M3)
(source, lang,
 date, tags)
       │
       ▼
    Qdrant (collections par type de source)
       │
       ▼
    API /search (test harness ce sprint, API publique sprint 7)
```

---

## 6. Stratégies de chunking par type de source

C'est **le point critique de qualité RAG**. Un mauvais chunking = mauvais retrieval, même avec de bons embeddings.

### Pages wiki / documentation

- Split par sections H2/H3 (chaque section = un chunk)
- Taille cible : 500-1500 tokens
- Overlap : 10 % (reprise du début de section précédente)
- Metadata : titre de page, titre de section, URL source

### Code source FreeCAD

- Parser tree-sitter pour découper en fonctions/classes
- Chunk = une fonction ou classe entière avec sa docstring
- Si > 2000 tokens : split par blocs logiques internes
- Metadata : module, nom de fonction/classe, signature, docstring extraite

### Articles de loi / réglementation

- Un article = un chunk (les articles sont déjà atomiques)
- Si article très long (> 3000 tokens) : split par paragraphes numérotés
- Metadata : code (urbanisme, construction, etc.), numéro d'article, version, date d'application

### Threads forum

- Chaque Q/A = un chunk (question + meilleure réponse acceptée)
- Filtrer les threads sans réponse acceptée
- Metadata : tags, votes, date, lien

---

## 7. Arborescence du repo

```
buildoto-rag/
├── docker-compose.yml         # Qdrant + service d'ingestion
├── pyproject.toml
├── README.md
├── src/
│   └── buildoto_rag/
│       ├── __init__.py
│       ├── sources/
│       │   ├── base.py               # Interface Source
│       │   ├── freecad_wiki.py       # Scrapy spider
│       │   ├── freecad_github.py     # GitHub API + tree-sitter
│       │   ├── opencascade_docs.py
│       │   ├── legifrance.py         # API Légifrance
│       │   └── forum.py
│       ├── cleaners/
│       │   ├── html_to_markdown.py
│       │   ├── dedup.py
│       │   └── filters.py
│       ├── chunkers/
│       │   ├── markdown_sections.py
│       │   ├── python_code.py        # tree-sitter based
│       │   └── articles.py
│       ├── embedders/
│       │   ├── bge_m3.py
│       │   └── cache.py              # cache local pour éviter re-embedding
│       ├── storage/
│       │   ├── qdrant_client.py
│       │   └── schema.py             # collections Qdrant + payload schema
│       ├── pipeline.py               # orchestration
│       └── search.py                 # utilitaire de test
├── tests/
│   ├── test_chunkers.py
│   ├── test_retrieval_quality.py     # jeux de tests "golden"
│   └── fixtures/
├── scripts/
│   ├── ingest_all.py
│   ├── refresh_source.py             # re-ingère une source spécifique
│   └── evaluate_quality.py
└── eval/
    └── queries.yaml                  # 50 requêtes-test AEC avec résultats attendus
```

---

## 8. Schema Qdrant

**Une collection par type de source**, pour pouvoir filtrer/pondérer à la requête.

Collections :
- `freecad_docs` (wiki + opencascade)
- `freecad_code` (code source + macros)
- `regulation_fr` (lois FR)
- `forum_qa` (forum FreeCAD)

**Payload schéma commun** (stocké avec chaque vecteur) :

```python
{
  "source": "freecad_wiki",     # identifiant source
  "url": "https://wiki...",     # URL originale
  "title": "Arch makeWall",
  "section": "Usage",           # si applicable
  "content": "<texte chunk>",   # texte brut du chunk
  "content_md": "<markdown>",   # version markdown propre
  "language": "en",             # fr/en
  "token_count": 847,
  "ingested_at": "2026-04-19T12:00:00Z",
  "source_hash": "sha256...",   # pour dédupe lors de refresh
  "tags": ["arch", "wall", "bim"],
  "license": "CC-BY-3.0"        # pour affichage à l'utilisateur
}
```

---

## 9. Évaluation de la qualité du retrieval

**Sans évaluation quantitative, impossible de savoir si le RAG est bon.** C'est l'étape qu'on zappe souvent par paresse — à NE PAS zapper.

**Jeu de 50 requêtes golden dans `eval/queries.yaml` :**

```yaml
- query: "Comment créer un mur avec Arch.makeWall ?"
  expected_sources_contain:
    - "wiki.freecad.org/Arch_Wall"
  expected_keywords:
    - "makeWall"
    - "Length"
    - "Height"
  min_relevance_score: 0.7

- query: "Quelle hauteur minimum sous plafond en logement ?"
  expected_sources_contain:
    - "legifrance"
  expected_keywords:
    - "2,20"
    - "caractéristique du logement"

- query: "Distance entre ouvertures en façade, code urbanisme"
  ...
```

50 requêtes réparties : 20 techniques FreeCAD, 15 géométrie/OpenCASCADE, 10 réglementaires FR, 5 edge cases.

**Métriques à suivre :**
- `recall@5` : dans les 5 premiers résultats, au moins une source attendue est présente
- `mrr@10` : Mean Reciprocal Rank (plus le bon résultat est haut, mieux c'est)
- `avg_relevance` : score cosinus moyen des top-5

Objectif v1 : `recall@5 > 0.85`, `mrr@10 > 0.6`.

---

## 10. Deliverables de ce sprint (ordre strict)

1. **Setup repo + docker-compose** : Qdrant démarré, service Python prêt, makefile ou `just` pour les commandes courantes.
2. **Schéma Qdrant** + collections créées avec leurs payload indexes (sur `source`, `language`, `tags`).
3. **Ingestion wiki FreeCAD** (source la plus riche, valide l'architecture) : crawler → cleaner → chunker → embedder → Qdrant.
4. **Test quality** : jeu de 20 requêtes-test sur wiki seul, métriques recall/MRR mesurées.
5. **Ajout code source FreeCAD** : tree-sitter + chunker code-aware.
6. **Ajout Légifrance** (code de l'urbanisme + CCH uniquement au départ).
7. **Pipeline complet orchestré** : `python scripts/ingest_all.py` lance tout et rapporte des stats.
8. **Eval harness** : `python scripts/evaluate_quality.py` tourne les 50 requêtes golden et produit un rapport.
9. **Documentation du pipeline** : README clair avec schéma, étapes, commandes pour un dev qui arrive.

---

## 11. Critères d'acceptation

- [ ] Qdrant contient au moins 50 000 chunks embeddés répartis sur les 4 collections
- [ ] `recall@5` > 0.80 sur le jeu de test de 50 requêtes
- [ ] `mrr@10` > 0.55
- [ ] Un refresh d'une source unique ne re-embedde pas les chunks inchangés (dédupe par hash)
- [ ] Les métadonnées de licence sont présentes sur 100 % des chunks (pour afficher "Source : wiki FreeCAD / CC-BY 3.0" à l'utilisateur)
- [ ] Le pipeline tourne end-to-end en < 12 heures sur une machine 16 coeurs

---

## 12. Ce que tu ne dois PAS faire ce sprint

- Ne pas exposer d'API publique (c'est sprint 7)
- Ne pas faire de fine-tuning (reste RAG-only pour l'instant)
- Ne pas intégrer le RAG dans l'app Buildoto (c'est sprint 8)
- Ne pas chercher la perfection du retrieval — un recall@5 de 0.80 est largement suffisant pour démarrer
- Ne pas ingérer de sources douteuses côté licence. Demander si incertain.

---

## 13. Première action

Avant de coder :

1. **Liste finale des sources + licences** à ingérer ce sprint, avec validation juridique rapide (je valide).
2. **Schéma Qdrant détaillé** : collections, indexes, payload JSON schema.
3. **Jeu de 50 requêtes golden** : tu proposes une première version, on itère.
4. **Plan d'orchestration** : dépendances entre étapes, stratégie de parallélisme, gestion des reprises après crash.

**Validation avant tout code.**
