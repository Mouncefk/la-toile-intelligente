# La Toile V19 — Notification & Communication Engine

V19 ajoute une couche de communication transversale au Global Core.

Objectif :
- notifier les voyageurs lorsqu'une réponse professionnelle arrive ;
- notifier les professionnels lorsqu'une demande compatible est reçue ;
- notifier les acteurs B2B lorsqu'une RFQ ou un message nécessite une action ;
- notifier les institutions lorsque des signaux ou indicateurs importants sont disponibles ;
- centraliser les préférences et les canaux sans coupler chaque module à un fournisseur de messagerie.

## Événements initiaux

- traveler.response_received
- traveler.reservation_changed
- traveler.trip_event
- professional.request_received
- professional.response_selected
- professional.rfq_received
- professional.connection_request
- institution.radar_signal
- institution.dashboard_update

## Canaux

- in_app
- email
- push

Le canal et la fréquence restent contrôlés par les préférences de l'acteur.

## API

GET   /api/notifications/v19/:actorType/:actorId
POST  /api/notifications/v19/events
PATCH /api/notifications/v19/:id/read
PUT   /api/notifications/v19/preferences
