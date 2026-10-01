# La Toile V23 — Privacy, Consent & Data Governance Engine

V23 ajoute une couche centrale de gouvernance des données.

## Principes

- Le voyageur garde le contrôle de ses données personnelles.
- « Ma santé » reste un domaine séparé et sensible.
- Un partage doit avoir un destinataire, une finalité et un périmètre.
- Les consentements peuvent être révoqués.
- Les actions sensibles sont journalisées.
- Les analytics institutionnels restent agrégés.
- Les politiques de conservation sont explicites.

## Domaines initiaux

- traveler_health
- traveler_vault
- trip_history
- analytics_aggregated

## API

GET   /api/privacy/v23/:actorType/:actorId
POST  /api/privacy/v23/consents
PATCH /api/privacy/v23/consents/:id/revoke
POST  /api/privacy/v23/shares
PATCH /api/privacy/v23/shares/:id/end
GET   /api/privacy/v23/audit/:actorType/:actorId
