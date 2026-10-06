# V28.3 — Territory + Matching

V28.3 poursuit V28.2 et ajoute le passage réel de la demande qualifiée vers le territoire puis le matching V11.

## Parcours

1. Demande qualifiée.
2. Création réelle de traveler_requests_v12 via Experience Core V27.
3. Passage à l'étape Territory.
4. Le territoire sélectionné fournit les coordonnées de recherche dans l'interface prototype.
5. Le voyageur choisit le rayon.
6. La Toile appelle POST /api/experience/v27/request/:id/match.
7. Le moteur V11 recherche les professionnels géographiques compatibles et retourne distance, service, score explicable et raisons.
8. Les résultats sont présentés au voyageur sans sélection automatique.
9. La diffusion aux professionnels reste une étape séparée et nécessite une confirmation explicite.

## Principes

- Le matching organise et explique ; il ne décide pas.
- La diffusion n'est pas automatique.
- Aucun prix n'est choisi par la plateforme.
- Le rayon est contrôlé par le parcours.
- V26/main restent inchangés.

## Note prototype

Les coordonnées de territoire utilisées par l'UI V28.3 sont actuellement une table de correspondance de démonstration pour les pays/territoires déjà présents dans le prototype. La source géographique mondiale doit être branchée au moteur géographique avant la généralisation de cette partie à tous les territoires.
