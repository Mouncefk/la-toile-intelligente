# La Toile V21 — AI Recommendation & Decision Support Engine

V21 ajoute une couche d'IA de recommandation transversale.

## Principe

L'IA :
- comprend le contexte ;
- propose des options ;
- explique les raisons ;
- expose les éléments de preuve disponibles ;
- présente des alternatives ;
- apprend des retours explicites.

L'IA ne prend pas la décision finale à la place du voyageur, du professionnel ou de l'institution.

## Cas initiaux

### Voyageur
- options de destinations correspondant à une intention ;
- expériences compatibles ;
- services à proximité ;
- Santé & Sécurité ;
- alternatives selon contraintes.

### Professionnel
- demandes prioritaires à examiner ;
- opportunités Radar pertinentes ;
- partenaires Pro→Pro potentiels ;
- suggestions d'amélioration du profil/offre.

### Institution
- signaux territoriaux ;
- tendances ;
- pistes d'action ;
- scénarios d'analyse, toujours présentés comme suggestions.

## API

POST /api/ai/v21/sessions
POST /api/ai/v21/sessions/:sessionId/recommend
GET  /api/ai/v21/sessions/:sessionId/recommendations
POST /api/ai/v21/recommendations/:recommendationId/feedback
