# La Toile V25 — Tourism Knowledge & Content Engine

V25 ajoute la couche de connaissance touristique structurée.

## Types d'entités initiaux

- destination
- place
- heritage
- culture
- craft
- gastronomy
- experience
- event
- nature
- mountain
- desert
- beach
- senior_tourism
- health_safety
- practical_info

## Principes

Le contenu est séparé de la géographie et des profils professionnels.

Chaque contenu peut être :
- multilingue ;
- rattaché à une source ;
- daté ;
- révisé ;
- relié à d'autres entités ;
- classifié par la taxonomie La Toile.

Cela permet au même moteur de servir le Globe, le Guide virtuel, la recherche, l'IA et les pages pays.

## API

GET  /api/knowledge/v25/search
GET  /api/knowledge/v25/entity/:id
POST /api/knowledge/v25/entities
POST /api/knowledge/v25/entities/:id/content
POST /api/knowledge/v25/entities/:id/relations
