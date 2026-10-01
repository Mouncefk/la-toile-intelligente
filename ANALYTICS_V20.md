# La Toile V20 — Analytics & Data Engine

V20 centralise les événements utiles au pilotage de La Toile et produit des indicateurs agrégés.

## Principes

- Les données du coffre-fort voyageur ne sont pas utilisées comme données institutionnelles.
- Les données de « Ma santé » sont exclues.
- Les tableaux institutionnels consomment uniquement des indicateurs agrégés.
- Les métriques restent rattachables à un pays et, lorsque pertinent, à un territoire.
- Les insights IA doivent conserver leur niveau de confiance et leurs éléments de preuve.

## Indicateurs initiaux

- attractivité des territoires
- recherches par type de tourisme
- intérêt pour l'artisanat
- intérêt pour le tourisme senior
- demandes Santé & Sécurité
- demandes de services
- activité professionnelle
- réponses et conversions
- signaux Radar
- saisonnalité

## API

POST /api/analytics/v20/events
GET  /api/analytics/v20/country/:iso3
GET  /api/analytics/v20/institution/:institutionId
POST /api/analytics/v20/insights
