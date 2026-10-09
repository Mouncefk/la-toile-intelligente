# La Toile — version d’essai V30.1

> **État du candidat d’essai :** la validation GitHub V30 est verte sur le commit `a3f6dc16c748a95c75b09213f2c86f359ae91fc2`. Cela valide le build et le contrat API automatisé, mais ne constitue pas à lui seul une recette complète de l’interface par un utilisateur.

## Démarrer une instance locale

Prérequis : Node.js/npm et Docker avec Docker Compose.

1. Installer les dépendances :
   ```bash
   npm install
   ```
2. Démarrer PostgreSQL/PostGIS et ses scripts d’initialisation :
   ```bash
   docker compose up -d
   ```
   Les scripts de `database/seed` sont exécutés automatiquement uniquement lors de la première initialisation du volume PostgreSQL.
3. Dans un premier terminal, démarrer l’API :
   ```bash
   npm run server
   ```
4. Dans un second terminal, démarrer l’interface :
   ```bash
   npm run dev
   ```
5. Ouvrir l’adresse V30 explicitement : `http://localhost:5173/?v30=1` (sans `?v30=1`, l’entrée actuelle affiche encore l’interface historique V27). L’API écoute par défaut sur le port `4300` et Vite transmet les requêtes `/api` vers cette API.

### Vérifications rapides

- Santé de l’API : `http://localhost:4300/api/health`
- Parcours V30 : `http://localhost:4300/api/platform/v30/flow`
- Interface V30 : `http://localhost:5173/?v30=1`

### Scénario de recette manuelle

1. Ouvrir l’interface V30 et vérifier que les territoires se chargent sans erreur API.
2. Choisir un territoire pilote et vérifier que les solutions, le contexte climatique et Santé & Sécurité se mettent à jour.
3. Saisir une intention, puis explorer les propositions disponibles.
4. Comparer jusqu’à trois possibilités et vérifier que les raisons de compatibilité et les indicateurs Santé & Sécurité sont visibles.
5. Créer un projet de voyage, enregistrer des dates ou une fenêtre flexible, puis lancer l’analyse de préparation.
6. Vérifier que transport et hébergement manquants sont signalés, et qu’aucune réservation n’est créée automatiquement.
7. Répéter au minimum pour un territoire marocain et un territoire français. Signaler tout écran vide, erreur API ou donnée manifestement incohérente.
- Compilation de production : `npm run build`
- Test du parcours V30 (nécessite une base initialisée et accessible) : `npm run test:v30:first-platform`

La connexion PostgreSQL par défaut est `postgresql://latoile:latoile_dev@localhost:5432/la_toile`. Pour un environnement différent, définir `DATABASE_URL` avant de lancer le serveur.

**Prudence avec les données locales :** `docker compose down -v` supprime le volume de la base et toutes les données locales qu’il contient. Ne l’utiliser que si cette suppression est volontaire.

## Périmètre et limites de cette version d’essai

Cette version sert à vérifier le parcours et les fondations API V30. Elle ne doit pas être considérée comme une plateforme commerciale complète : la couverture mondiale réelle, la qualité des données professionnelles, la recette intégrale de l’interface, les paiements et les réservations en production restent à vérifier ou à finaliser selon leur périmètre.

---

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
