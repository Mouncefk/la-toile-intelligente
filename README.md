**# la-toile-intelligente**
La Toile Intelligente — plateforme mondiale de tourisme, réseau intelligent et Globe interactif
**# La Toile Intelligente**

Monorepo TypeScript strict (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) organisé autour de ****pnpm**** et ****Turborepo****. Le dépôt conserve un socle minimal : il ne contient ni Globe, ni Cesium, ni fonctionnalité métier.

**## Architecture**

- `apps/web` : application Next.js minimale qui présente La Toile Intelligente et le rôle futur du Globe.
- `apps/api` : API HTTP géographique (`GET /countries`, `GET /countries/:id`, `GET /places`, `GET /places/:id`). Elle utilise des contrats Zod et un repository, sans SQL dans les routes.
- `apps/worker` : processus de démarrage sans traitement métier.
- `packages/config`, `contracts`, `domain`, `database`, `design-system`, `geo`, `observability`, `testing` : packages sous le namespace `@la-toile-intelligente/*`.

`packages/database` utilise PostgreSQL, PostGIS, `pgcrypto`, `citext` et la couche SQL légère `pg`. La migration versionnée `migrations/001_geography.sql` crée les pays, territoires, lieux, traductions, contraintes et index GIST. Le seed idempotent comprend le Maroc (Casablanca, Rabat, Marrakesh), la France (Paris) et l'Espagne (Seville).

**## Prérequis et commandes**

```bash
corepack enable
pnpm install
cp .env.example .env
docker compose up -d postgres redis
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Scripts racine : `pnpm dev`, `build`, `lint`, `format`, `format:check`, `typecheck`, `test`, `test:e2e` et `verify`. `verify` enchaîne formatage, lint, typage, tests et build via Turbo. Les tests d'intégration PostGIS se lancent avec `DATABASE_URL` (normalement après migration et seed).

**## Docker et CI**

`docker-compose.yml`, `.env.example` et la CI emploient la même base `la_toile_intelligente`, l'utilisateur `lti`, le port PostgreSQL `5432` et Redis `6379`. La CI installe pnpm avec `pnpm/action-setup`, utilise `pnpm install --frozen-lockfile`, puis exécute migration, seed, vérifications et tests d'intégration avec PostgreSQL/PostGIS.

**## État actuel**

Fondation géographique implémentée ; la validation runtime complète dépend d'un environnement disposant de Docker et d'un accès au registre npm. Le lockfile officiel est `pnpm-lock.yaml`; aucun système de workspaces npm ou `package-lock.json` n'est utilisé.
