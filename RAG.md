# RAG, Vectorisation et Pinecone — Guide du projet

## Vue d’ensemble
Le RAG (Retrieval-Augmented Generation) combine recherche sémantique et génération. Ici, vos PDF sont découpés (chunking), vectorisés (embeddings), indexés dans Pinecone, puis interrogés: une requête est vectorisée et comparée aux vecteurs des documents pour renvoyer les passages pertinents.

## Comment ça fonctionne dans ce repo
- Chargement PDF: `lib/services/pdf.ts` lit `./pdf`, extrait le texte avec `pdf-parse`, puis le découpe (1000 caractères, chevauchement 200).
- Embeddings: `lib/services/embedding.ts` appelle l’API OpenAI Embeddings en lots pour éviter les limites (env `OPENAI_EMBED_BATCH`). Modèle par défaut: `text-embedding-3-small` (1536 dims).
- Index Pinecone: `lib/services/pinecone.ts` crée si besoin un index serverless (`spec.serverless`) et l’utilise pour upsert/query.
- API:
  - `POST /api/rag/index`: indexe tous les PDF (chunk → embed → upsert).
  - `POST /api/rag/search`: embed la requête → `query` Pinecone → renvoie les meilleurs passages.
- UI minimale: `app/[locale]/rag/page.tsx` permet d’indexer et de chercher depuis le navigateur.

## Détails techniques
- Vectorisation (embeddings): conversion de texte en vecteur dense où proximités ≈ similarités sémantiques. Mesure: cosinus.
- Chunking: limite la longueur, améliore le rappel et réduit les coûts. Paramètres actuels: 1000/200 (taille/overlap).
- Pinecone: base de données vectorielle serverless. Index typé `cosine`, dimension 1536, créé automatiquement selon `PINECONE_CLOUD`/`PINECONE_REGION`.

## Utilisation
- Placez vos PDF dans `./pdf`.
- Démarrez: `npm run dev`, ouvrez `/en/rag` (ou `/fr/rag`).
- Cliquez « Index PDFs » puis lancez des requêtes.

## Variables d’environnement (principales)
- `OPENAI_API_KEY`, `OPENAI_EMBEDDING_MODEL` (par défaut `text-embedding-3-small`), `OPENAI_EMBED_BATCH`.
- `PINECONE_API_KEY`, `PINECONE_INDEX`, `PINECONE_DIMENSION` (= 1536), `PINECONE_CLOUD`, `PINECONE_REGION`.

## Améliorations et optimisations
- Chunking meilleur: découpage par paragraphes/titres, détection de pages, stockage du numéro de page/titre en metadata.
- Recherche hybride: combiner BM25/keyword + vectoriel, ou re-ranker (ex: LLM ou cross-encoder) pour améliorer la précision.
- Génération augmentée: ajouter un endpoint « answer » qui assemble les passages pertinents et génère une réponse sourcée (citations vers `source` + page).
- Incrémental: hacher le contenu d’un chunk pour éviter de ré-indexer des doublons; endpoint « clear index »/« stats ».
- Coûts & perf: ajuster `OPENAI_EMBED_BATCH`, taille/overlap des chunks, choisir un modèle d’embeddings adapté (qualité/coût), compresser/filtrer le texte (nettoyage, déduplication).
- Multi-tenant: utiliser des namespaces Pinecone par utilisateur/projet.
- Observabilité: logs, métriques (temps d’embed/upsert/query), retries, rate limiting.
