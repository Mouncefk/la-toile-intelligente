# La Toile V22 — Trust, Verification & Quality Engine

V22 ajoute une couche de confiance transparente.

## Objectif

Donner au voyageur et aux professionnels des informations structurées sur :
- l'état de vérification d'un acteur ;
- les contrôles réalisés ;
- la qualité observable ;
- la fraîcheur des vérifications ;
- les éléments ayant contribué au résumé de confiance.

## Niveaux de vérification initiaux

- unverified
- pending
- basic_verified
- verified
- verified_expired

La plateforme ne transforme pas automatiquement un niveau de vérification en jugement global sur un professionnel. Les éléments factuels doivent rester consultables.

## API

GET  /api/trust/v22/:actorType/:actorId
POST /api/trust/v22/:actorType/:actorId/checks
POST /api/trust/v22/:actorType/:actorId/recalculate
GET  /api/trust/v22/:actorType/:actorId/snapshot
