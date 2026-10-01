# La Toile V26 — Guide Virtuel / Contextual Travel Companion

V26 transforme la couche de connaissance et l'IA en compagnon de voyage contextuel.

## Principe

Le Guide ne remplace pas le Globe ni le moteur La Toile. Il les orchestre selon le contexte du voyageur.

Il peut comprendre :
- le pays ;
- la ville/territoire ;
- le voyage en cours ;
- les préférences ;
- les demandes précédentes ;
- les contraintes déclarées ;
- le contexte temporel.

## Il peut aider à

- comprendre une destination ;
- rechercher une expérience ;
- trouver un service à proximité ;
- retrouver une réservation ;
- rappeler une étape du voyage ;
- orienter vers Santé & Sécurité ;
- proposer des alternatives ;
- expliquer une information issue de la base de connaissance ;
- transformer une conversation en action La Toile.

## Règle fondamentale

Le Guide peut suggérer et expliquer. Les actions importantes restent confirmées par l'utilisateur.

Le nom international définitif du Guide n'est pas figé dans V26 : l'architecture utilise un identifiant fonctionnel afin de permettre une future phase de naming et de vérification de disponibilité de marque.

## API

POST /api/guide/v26/profiles
POST /api/guide/v26/sessions
POST /api/guide/v26/sessions/:sessionId/messages
GET  /api/guide/v26/sessions/:sessionId/context
POST /api/guide/v26/sessions/:sessionId/actions
