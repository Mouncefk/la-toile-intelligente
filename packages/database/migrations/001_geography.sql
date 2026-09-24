CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code char(2) NOT NULL UNIQUE CHECK (code = upper(code)), name citext NOT NULL UNIQUE, capital text
);
CREATE TABLE IF NOT EXISTS territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), country_id uuid NOT NULL REFERENCES countries(id) ON DELETE CASCADE, name citext NOT NULL,
  boundary geometry(MultiPolygon, 4326), UNIQUE (country_id, name)
);
CREATE TABLE IF NOT EXISTS places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), country_id uuid NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
  territory_id uuid REFERENCES territories(id) ON DELETE SET NULL, name citext NOT NULL, kind text NOT NULL CHECK (kind IN ('city', 'landmark', 'region')),
  location geometry(Point, 4326) NOT NULL, CHECK (ST_SRID(location) = 4326), UNIQUE (country_id, name, kind)
);
CREATE TABLE IF NOT EXISTS geographic_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), entity_type text NOT NULL CHECK (entity_type IN ('country', 'territory', 'place')),
  entity_id uuid NOT NULL, locale text NOT NULL CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'), name text NOT NULL, UNIQUE (entity_type, entity_id, locale)
);
CREATE INDEX IF NOT EXISTS territories_boundary_gist_idx ON territories USING GIST (boundary);
CREATE INDEX IF NOT EXISTS places_location_gist_idx ON places USING GIST (location);
CREATE INDEX IF NOT EXISTS places_country_id_idx ON places (country_id);
