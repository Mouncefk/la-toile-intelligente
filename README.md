# La Toile — Global Core V27

V27 is the current integration branch, built on the V26 stable reference and adding the Experience Core orchestrator.

## Added in V17
- institutional profiles
- aggregated territorial indicators
- destination attractiveness signals
- tourism segment indicators
- artisanat and senior-tourism indicators
- Health & Safety visibility indicators
- trend/insight records
- explicit aggregated-only confidentiality model
- institution dashboard UI connected to the same Country Engine

## API
```text
GET  /api/institutions/v17/:institutionId/dashboard
POST /api/institutions/v17/:institutionId/metrics
POST /api/institutions/v17/:institutionId/insights
```

## Database
Run `database/seed/12_v17_institutional_dashboard.sql` after the V16 schema.

## Principle
The institutional layer observes the tourism ecosystem through aggregated indicators. It must not expose traveler-level personal or health data.

## Start
```bash
psql postgresql://latoile:latoile_dev@localhost:5432/la_toile -f database/seed/12_v17_institutional_dashboard.sql
npm install
npm run server
# in another terminal
npm run dev
```


## V18 — Radar Core
Voir `RADAR_V18.md` et `database/seed/13_v18_radar.sql`. Le Radar collecte et qualifie des signaux publics avant routage ciblé.


## V19 — Notification & Communication Engine
Voir `NOTIFICATIONS_V19.md` et `database/seed/14_v19_notifications.sql`.


## V20 — Analytics & Data Engine
Voir `ANALYTICS_V20.md` et `database/seed/15_v20_analytics.sql`.


## V21 — AI Recommendation & Decision Support
Voir `AI_V21.md` et `database/seed/16_v21_ai_recommendations.sql`.


## V22 — Trust, Verification & Quality Engine
Voir `TRUST_V22.md` et `database/seed/17_v22_trust_quality.sql`.


## V23 — Privacy, Consent & Data Governance
Voir `PRIVACY_V23.md` et `database/seed/18_v23_privacy_consent.sql`.


## V24 — Identity, Access & Security
Voir `SECURITY_V24.md` et `database/seed/19_v24_identity_security.sql`.


## V25 — Tourism Knowledge & Content Engine
Voir `KNOWLEDGE_V25.md` et `database/seed/20_v25_knowledge_content.sql`.


## V26 — Guide Virtuel / Contextual Travel Companion
Voir `GUIDE_V26.md` et `database/seed/21_v26_guide_companion.sql`.


## V27 — Experience Core

V27 ajoute un orchestrateur d'expérience transversal au-dessus des moteurs V9–V26. Le parcours cible est : Globe → Pays → Intention → Qualification → Territoire → Matching → Réponses professionnelles → Comparaison → Décision du voyageur → Coffre → Voyage.

La branche `v27-experience-core` conserve `main` intact et prépare l'intégration via `server/index-v27.js`. Endpoint V27 : `/api/experience/v27`.


## Local PostgreSQL/PostGIS

La branche V27 fournit maintenant `docker-compose.yml` pour démarrer une base PostgreSQL 16 + PostGIS. Les scripts `database/seed/` sont montés dans `/docker-entrypoint-initdb.d` et sont exécutés automatiquement lors de la **première** initialisation du volume.

```bash
git checkout v27-experience-core
git pull origin v27-experience-core
docker compose up -d
```

Pour reconstruire complètement la base locale après une initialisation incomplète :

```bash
docker compose down -v
docker compose up -d
```

Puis valider :

```bash
npm run test:v27:db
npm run test:v27:integration
```

> `docker compose down -v` supprime le volume local de cette configuration et donc la base qu'il contient. À utiliser uniquement pour une base de développement que l'on peut reconstruire à partir des seeds.
