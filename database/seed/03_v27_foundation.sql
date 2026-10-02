-- La Toile V27 — minimal global database foundation required by V9–V27 seeds.
-- This file makes the historical engine seeds self-contained for a fresh development database.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS countries (
  id BIGSERIAL PRIMARY KEY,
  iso3 CHAR(3) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS regions (
  id BIGSERIAL PRIMARY KEY,
  country_id BIGINT REFERENCES countries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS cities (
  id BIGSERIAL PRIMARY KEY,
  region_id BIGINT REFERENCES regions(id) ON DELETE CASCADE,
  country_id BIGINT REFERENCES countries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geom geometry(Point,4326),
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS destinations (
  id BIGSERIAL PRIMARY KEY,
  country_id BIGINT REFERENCES countries(id) ON DELETE CASCADE,
  city_id BIGINT REFERENCES cities(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geom geometry(Point,4326),
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS professionals (
  id BIGSERIAL PRIMARY KEY,
  country_id BIGINT REFERENCES countries(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geom geometry(Point,4326),
  verified BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_professionals_geom ON professionals USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_cities_geom ON cities USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_destinations_geom ON destinations USING GIST (geom);

INSERT INTO countries (iso3,name)
VALUES ('MAR','Maroc')
ON CONFLICT (iso3) DO NOTHING;

INSERT INTO regions (country_id,name)
SELECT id,'Marrakech-Safi' FROM countries WHERE iso3='MAR'
AND NOT EXISTS (
  SELECT 1 FROM regions r JOIN countries c ON c.id=r.country_id
  WHERE c.iso3='MAR' AND r.name='Marrakech-Safi'
);

INSERT INTO cities (country_id,region_id,name,latitude,longitude,geom)
SELECT c.id,r.id,'Marrakech',31.6295,-7.9811,
       ST_SetSRID(ST_MakePoint(-7.9811,31.6295),4326)
FROM countries c
JOIN regions r ON r.country_id=c.id AND r.name='Marrakech-Safi'
WHERE c.iso3='MAR'
AND NOT EXISTS (
  SELECT 1 FROM cities x WHERE x.country_id=c.id AND x.name='Marrakech'
);

INSERT INTO professionals (country_id,name,latitude,longitude,geom,verified,active)
SELECT c.id,'Professionnel de démonstration V27',31.6295,-7.9811,
       ST_SetSRID(ST_MakePoint(-7.9811,31.6295),4326),true,true
FROM countries c
WHERE c.iso3='MAR'
AND NOT EXISTS (
  SELECT 1 FROM professionals p
  WHERE p.name='Professionnel de démonstration V27'
);
