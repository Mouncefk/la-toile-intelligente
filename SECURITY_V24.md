# La Toile V24 — Identity, Access & Security Core

V24 ajoute la couche centrale d'identité et de sécurité.

## Objectifs

- séparer identité et profil métier ;
- gérer les rôles Voyageur / Professionnel / Institution / Admin ;
- préparer la vérification email/téléphone ;
- gérer les sessions et leur révocation ;
- préparer MFA/TOTP/WebAuthn ;
- journaliser les événements de sécurité ;
- éviter que les modules métier implémentent chacun leur propre authentification.

## Principe

Une identité peut avoir un ou plusieurs rôles selon les règles de la plateforme, mais les permissions doivent rester limitées au périmètre autorisé.

Les données sensibles restent gouvernées par V23.

## API

POST /api/auth/v24/identity
POST /api/auth/v24/session
GET  /api/auth/v24/security/:identityId
POST /api/auth/v24/mfa/enroll
POST /api/auth/v24/session/:sessionId/revoke
