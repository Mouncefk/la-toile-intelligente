# V27 — Validation

## Objectif
Valider le parcours orchestré avant toute fusion de V27 vers `main`.

## Chaîne fonctionnelle
1. `POST /api/experience/v27/session` — création de session et première qualification.
2. `PATCH /api/experience/v27/session/:id/qualify` — qualification progressive.
3. `POST /api/experience/v27/session/:id/request` — création de la demande V12.
4. `POST /api/experience/v27/request/:id/match` — matching géographique V11 + persistance.
5. `POST /api/experience/v27/request/:id/dispatch` — diffusion V12, avec confirmation explicite.
6. `GET /api/experience/v27/request/:id/responses` — collecte des réponses professionnelles.
7. `POST /api/experience/v27/request/:id/compare` — comparaison de réponses appartenant à la demande.
8. `POST /api/experience/v27/request/:id/decision` — décision explicite du voyageur.
9. `POST /api/experience/v27/session/:id/handoff` — passage au coffre/voyage après décision confirmée.

## Garde-fous attendus

| Test | Résultat attendu |
|---|---|
| Session sans `rawText` | HTTP 400 |
| Dispatch avec `confirmed=false` | HTTP 400 |
| Comparaison avec liste vide | HTTP 400 |
| Comparaison avec réponse d'une autre demande | HTTP 400 |
| Décision `selected` sans `responseId` | HTTP 400 |
| Décision sans confirmation | HTTP 400 |
| Handoff sans décision confirmée | HTTP 400 |
| Handoff avec décision confirmée | autorisé |
| Handoff créant une réservation automatiquement | interdit : aucune réservation n'est créée par V27 |

## Test contractuel
Le fichier `scripts/test-v27-contract.mjs` vérifie les contrats HTTP de base.

Exécution :

```powershell
$env:V27_BASE_URL="http://localhost:4300/api/experience/v27"
node scripts/test-v27-contract.mjs
```

Le test contractuel nécessite un serveur V27 accessible. Il ne remplace pas le test d'intégration avec PostgreSQL/PostGIS.

## Critère de fusion
Ne fusionner V27 dans `main` qu'après validation du parcours complet sur une base PostgreSQL/PostGIS réelle, avec au minimum :
- une demande voyageur ;
- plusieurs professionnels compatibles ;
- plusieurs réponses ;
- une comparaison ;
- une décision confirmée ;
- un handoff vers le coffre ;
- éventuellement la création d'un voyage ;
- vérification qu'aucune réservation n'est créée implicitement.
