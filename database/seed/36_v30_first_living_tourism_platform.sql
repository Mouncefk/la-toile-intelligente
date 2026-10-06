-- V30.1 — First Living Tourism Platform
CREATE TABLE IF NOT EXISTS v30_pilot_territories (
 country_iso3 TEXT PRIMARY KEY,
 pilot_role TEXT NOT NULL CHECK(pilot_role IN ('primary','secondary','future')),
 name_fr TEXT NOT NULL,
 continent TEXT,
 hemisphere TEXT NOT NULL,
 rationale TEXT,
 active BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO v30_pilot_territories(country_iso3,pilot_role,name_fr,continent,hemisphere,rationale) VALUES
('MAR','primary','Maroc','Africa','north','Premier laboratoire complet : littoral, montagne, désert, culture, artisanat et gastronomie.'),
('FRA','secondary','France','Europe','north','Validation européenne : océanique, méditerranéen, alpin, patrimoine et diversité territoriale.')
ON CONFLICT(country_iso3) DO UPDATE SET pilot_role=EXCLUDED.pilot_role,name_fr=EXCLUDED.name_fr,continent=EXCLUDED.continent,hemisphere=EXCLUDED.hemisphere,rationale=EXCLUDED.rationale,active=true;
CREATE TABLE IF NOT EXISTS v30_traveler_sessions (
 id BIGSERIAL PRIMARY KEY, traveler_id BIGINT, country_iso3 TEXT NOT NULL DEFAULT 'MAR',
 territory_key TEXT, stage TEXT NOT NULL DEFAULT 'globe' CHECK(stage IN ('globe','territory','intent','solutions','compare','vault')),
 anonymous BOOLEAN NOT NULL DEFAULT true, metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS v30_traveler_intents (
 id BIGSERIAL PRIMARY KEY, session_id BIGINT NOT NULL REFERENCES v30_traveler_sessions(id) ON DELETE CASCADE,
 raw_text TEXT NOT NULL, intent JSONB NOT NULL DEFAULT '{}'::jsonb, confidence NUMERIC(5,4), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS v30_territories (
 id BIGSERIAL PRIMARY KEY, country_iso3 TEXT NOT NULL, territory_key TEXT NOT NULL UNIQUE, name_fr TEXT NOT NULL,
 region_type TEXT NOT NULL DEFAULT 'region', latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
 climate_zone TEXT, hemisphere TEXT NOT NULL DEFAULT 'north', tourism_tags TEXT[] NOT NULL DEFAULT '{}',
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb, active BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS v30_solutions (
 id BIGSERIAL PRIMARY KEY, territory_key TEXT NOT NULL REFERENCES v30_territories(territory_key) ON DELETE CASCADE,
 solution_type TEXT NOT NULL CHECK(solution_type IN ('experience','professional','health_safety','mobility','accommodation','culture','artisanat','senior','family')),
 title TEXT NOT NULL, description TEXT, provider_name TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION,
 specialties TEXT[] NOT NULL DEFAULT '{}', audience TEXT[] NOT NULL DEFAULT '{}', availability TEXT,
 public_contact JSONB NOT NULL DEFAULT '{}'::jsonb, active BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS v30_health_safety_points (
 id BIGSERIAL PRIMARY KEY, territory_key TEXT NOT NULL REFERENCES v30_territories(territory_key) ON DELETE CASCADE,
 service_type TEXT NOT NULL CHECK(service_type IN ('medicine','pharmacy','security','emergency')), name TEXT NOT NULL,
 description TEXT, latitude DOUBLE PRECISION, longitude DOUBLE PRECISION, public_contact JSONB NOT NULL DEFAULT '{}'::jsonb, active BOOLEAN NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS v30_matches (
 id BIGSERIAL PRIMARY KEY, session_id BIGINT NOT NULL REFERENCES v30_traveler_sessions(id) ON DELETE CASCADE,
 solution_id BIGINT NOT NULL REFERENCES v30_solutions(id) ON DELETE CASCADE, score NUMERIC(6,2) NOT NULL,
 reasons JSONB NOT NULL DEFAULT '[]'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(session_id,solution_id)
);
CREATE TABLE IF NOT EXISTS v30_vault_items (
 id BIGSERIAL PRIMARY KEY, traveler_id BIGINT, session_id BIGINT REFERENCES v30_traveler_sessions(id) ON DELETE SET NULL,
 item_type TEXT NOT NULL CHECK(item_type IN ('memory','document','reservation','health','emergency','favorite')),
 title TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}'::jsonb, privacy_class TEXT NOT NULL DEFAULT 'private' CHECK(privacy_class='private'),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v30_territories_country ON v30_territories(country_iso3);
CREATE INDEX IF NOT EXISTS idx_v30_solutions_territory ON v30_solutions(territory_key,solution_type);
CREATE INDEX IF NOT EXISTS idx_v30_health_territory ON v30_health_safety_points(territory_key,service_type);
INSERT INTO v30_territories(country_iso3,territory_key,name_fr,region_type,latitude,longitude,climate_zone,hemisphere,tourism_tags) VALUES
('MAR','MAR','Maroc','country',31.7917,-7.0926,'Mediterranean / Arid / Mountain','north',ARRAY['culture','heritage','artisanat','desert','balneaire','montagne','gastronomie','senior','family']),
('MAR','RABAT','Rabat','city',34.0209,-6.8416,'Mediterranean','north',ARRAY['culture','heritage','artisanat','family','senior']),
('MAR','MARRAKECH','Marrakech','city',31.6295,-7.9811,'Arid / Semi-arid','north',ARRAY['culture','heritage','artisanat','gastronomie','senior']),
('MAR','MERZOUGA','Merzouga','locality',31.0801,-4.0134,'Arid / Desert','north',ARRAY['desert','adventure','culture']),
('MAR','OUARZAZATE','Ouarzazate','city',30.9335,-6.9370,'Arid / Mountain','north',ARRAY['desert','culture','heritage']),
('MAR','AGADIR','Agadir','city',30.4278,-9.5981,'Mediterranean / Coastal','north',ARRAY['balneaire','senior','family','nature']),
('MAR','ESSAOUIRA','Essaouira','city',31.5085,-9.7595,'Coastal','north',ARRAY['balneaire','artisanat','culture','surf']),
('MAR','IFRANE','Ifrane','city',33.5228,-5.1100,'Mountain / Mediterranean','north',ARRAY['montagne','nature','family','senior']),
('MAR','CASABLANCA','Casablanca','city',33.5731,-7.5898,'Coastal / Mediterranean','north',ARRAY['culture','heritage','gastronomie','business','artisanat','family','senior']),
('MAR','TANGER','Tanger','city',35.7595,-5.8340,'Mediterranean / Coastal','north',ARRAY['balneaire','culture','heritage','artisanat','gastronomie','echanges_culturels','family','senior'])
ON CONFLICT(territory_key) DO UPDATE SET name_fr=EXCLUDED.name_fr,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,climate_zone=EXCLUDED.climate_zone,tourism_tags=EXCLUDED.tourism_tags;
INSERT INTO v30_solutions(territory_key,solution_type,title,description,provider_name,specialties,audience,availability) VALUES
('MARRAKECH','experience','Médina & artisanat','Découverte guidée du patrimoine vivant et des ateliers d’artisans.','Réseau local La Toile',ARRAY['Artisanat','Culture & Patrimoine'],ARRAY['family','senior'],'Selon calendrier'),
('MARRAKECH','culture','Patrimoine de Marrakech','Parcours culturel adaptable au rythme du voyageur.','Réseau culturel La Toile',ARRAY['Culture & Patrimoine'],ARRAY['family','senior'],'Selon calendrier'),
('MERZOUGA','experience','Désert & bivouac','Expérience dans le désert avec adaptation du rythme et accompagnement local.','Professionnels tourisme La Toile',ARRAY['Désert','Aventure'],ARRAY['adult','family'],'Selon conditions'),
('ESSAOUIRA','artisanat','Artisanat d’Essaouira','Rencontres et ateliers avec des artisans locaux.','Réseau artisanat La Toile',ARRAY['Artisanat'],ARRAY['family','senior'],'Sur réservation'),
('AGADIR','experience','Séjour balnéaire','Solutions balnéaires et activités douces à proximité.','Réseau tourisme La Toile',ARRAY['Balnéaire','Nature'],ARRAY['senior','family'],'Selon saison'),
('IFRANE','experience','Montagne & nature','Découverte de montagne et nature, avec options adaptées aux familles et seniors.','Réseau tourisme La Toile',ARRAY['Montagne','Nature'],ARRAY['senior','family'],'Selon saison'),
('RABAT','culture','Culture & patrimoine','Parcours patrimoine, culture et artisanat dans la capitale.','Réseau culturel La Toile',ARRAY['Culture & Patrimoine','Artisanat'],ARRAY['senior','family'],'Selon calendrier')
ON CONFLICT DO NOTHING;
INSERT INTO v30_health_safety_points(territory_key,service_type,name,description) VALUES
('MARRAKECH','medicine','Soins médicaux à proximité','Orientation vers les établissements médicaux publics et privés du territoire.'),
('MARRAKECH','pharmacy','Pharmacies à proximité','Recherche de pharmacies et services pharmaceutiques disponibles.'),
('MARRAKECH','security','Sécurité locale','Orientation vers les services de sécurité et points d’assistance.'),
('MERZOUGA','medicine','Assistance médicale territoriale','Orientation vers les structures de soins du territoire élargi.'),
('MERZOUGA','security','Sécurité & assistance désert','Orientation vers les services d’assistance adaptés au territoire.'),
('AGADIR','medicine','Soins médicaux à proximité','Orientation vers les établissements médicaux du territoire.'),
('AGADIR','pharmacy','Pharmacies à proximité','Recherche de pharmacies disponibles.'),
('AGADIR','security','Sécurité locale','Orientation vers les services de sécurité et assistance.'),
('RABAT','medicine','Soins médicaux à proximité','Orientation vers les établissements médicaux du territoire.'),
('RABAT','pharmacy','Pharmacies à proximité','Recherche de pharmacies disponibles.'),
('RABAT','security','Sécurité locale','Orientation vers les services de sécurité et assistance.')
ON CONFLICT DO NOTHING;

-- France pilot: same global core, distinct territory/context data.
INSERT INTO v30_territories(country_iso3,territory_key,name_fr,region_type,latitude,longitude,climate_zone,hemisphere,tourism_tags) VALUES
('FRA','FRA','France','country',46.2276,2.2137,'Oceanic / Mediterranean / Mountain / Continental','north',ARRAY['culture','heritage','artisanat','gastronomie','balneaire','montagne','nature','senior','family','colonies_vacances','echanges_culturels']),
('FRA','PARIS','Paris','city',48.8566,2.3522,'Oceanic / Temperate','north',ARRAY['culture','heritage','gastronomie','artisanat','senior','family']),
('FRA','BRETAGNE','Bretagne','region',48.2020,-2.9326,'Oceanic','north',ARRAY['balneaire','nature','culture','artisanat','family']),
('FRA','PROVENCE','Provence','region',43.9352,6.0679,'Mediterranean','north',ARRAY['balneaire','culture','gastronomie','artisanat','senior']),
('FRA','ALPES','Alpes','region',45.9237,6.8694,'Mountain / Alpine','north',ARRAY['montagne','nature','adventure','family','senior']),
('FRA','PYRENEES','Pyrénées','region',42.7500,1.5000,'Mountain','north',ARRAY['montagne','nature','adventure','family']),
('FRA','NORMANDIE','Normandie','region',49.1829,0.3707,'Oceanic','north',ARRAY['heritage','culture','nature','family','senior']),
('FRA','OCCITANIE','Occitanie','region',43.8927,2.2820,'Mediterranean / Oceanic / Mountain','north',ARRAY['culture','heritage','balneaire','nature','gastronomie'])
ON CONFLICT(territory_key) DO UPDATE SET name_fr=EXCLUDED.name_fr,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude,climate_zone=EXCLUDED.climate_zone,tourism_tags=EXCLUDED.tourism_tags;

INSERT INTO v30_solutions(territory_key,solution_type,title,description,provider_name,specialties,audience,availability) VALUES
('PARIS','culture','Paris culture & patrimoine','Parcours culturels et patrimoine adaptables au rythme du voyageur.','Réseau culturel La Toile France',ARRAY['Culture & Patrimoine'],ARRAY['family','senior'],'Selon calendrier'),
('BRETAGNE','experience','Littoral & patrimoine breton','Découverte du littoral, des paysages et du patrimoine vivant.','Réseau tourisme La Toile France',ARRAY['Balnéaire','Nature','Culture'],ARRAY['family','senior'],'Selon saison'),
('PROVENCE','experience','Provence : culture & gastronomie','Expériences autour des villages, savoir-faire et gastronomie.','Réseau tourisme La Toile France',ARRAY['Culture','Gastronomie','Artisanat'],ARRAY['family','senior'],'Selon saison'),
('ALPES','experience','Montagne & nature dans les Alpes','Activités de montagne avec options adaptées aux familles et aux seniors.','Réseau montagne La Toile France',ARRAY['Montagne','Nature'],ARRAY['family','senior'],'Selon saison'),
('PYRENEES','experience','Pyrénées & aventure douce','Découverte de la montagne et de la nature.','Réseau montagne La Toile France',ARRAY['Montagne','Nature','Aventure'],ARRAY['family','adult'],'Selon saison'),
('NORMANDIE','culture','Normandie & mémoire','Patrimoine, histoire et paysages littoraux.','Réseau culturel La Toile France',ARRAY['Culture & Patrimoine','Nature'],ARRAY['family','senior'],'Selon calendrier'),
('OCCITANIE','artisanat','Savoir-faire & artisanat d’Occitanie','Rencontres avec les savoir-faire et productions artisanales locales.','Réseau artisanat La Toile France',ARRAY['Artisanat','Culture'],ARRAY['family','senior'],'Sur réservation');

INSERT INTO v30_health_safety_points(territory_key,service_type,name,description) VALUES
('PARIS','medicine','Soins médicaux à proximité','Orientation vers les structures de soins du territoire.'),
('PARIS','pharmacy','Pharmacies à proximité','Recherche de pharmacies et services pharmaceutiques disponibles.'),
('PARIS','security','Sécurité locale','Orientation vers les services de sécurité et assistance.'),
('BRETAGNE','medicine','Soins médicaux à proximité','Orientation vers les structures de soins du territoire.'),
('BRETAGNE','pharmacy','Pharmacies à proximité','Recherche de pharmacies disponibles.'),
('BRETAGNE','security','Sécurité locale','Orientation vers les services de sécurité et assistance.'),
('ALPES','medicine','Assistance médicale montagne','Orientation vers les structures médicales et services adaptés au territoire.'),
('ALPES','pharmacy','Pharmacies à proximité','Recherche de pharmacies disponibles.'),
('ALPES','security','Sécurité montagne','Orientation vers les services de sécurité et assistance.'),
('PROVENCE','medicine','Soins médicaux à proximité','Orientation vers les structures de soins du territoire.'),
('PROVENCE','pharmacy','Pharmacies à proximité','Recherche de pharmacies disponibles.'),
('PROVENCE','security','Sécurité locale','Orientation vers les services de sécurité et assistance.')
ON CONFLICT DO NOTHING;


INSERT INTO v30_solutions(territory_key,solution_type,title,description,provider_name,specialties,audience,availability) VALUES
('CASABLANCA','culture','Casablanca : culture & métropole','Découverte de la culture, du patrimoine urbain et des savoir-faire de la métropole.','Réseau tourisme La Toile Maroc',ARRAY['Culture & Patrimoine','Artisanat'],ARRAY['family','senior'],'Selon calendrier'),
('CASABLANCA','experience','Casablanca : séjour urbain','Solutions urbaines combinant culture, gastronomie, loisirs et découverte locale.','Réseau tourisme La Toile Maroc',ARRAY['Culture','Gastronomie'],ARRAY['family','senior'],'Selon saison'),
('TANGER','experience','Tanger : Méditerranée & cultures','Découverte du littoral, du patrimoine et des influences culturelles de Tanger.','Réseau tourisme La Toile Maroc',ARRAY['Balnéaire','Culture & Patrimoine'],ARRAY['family','senior'],'Selon saison'),
('TANGER','artisanat','Tanger : artisanat & savoir-faire','Rencontres autour des savoir-faire et de l’artisanat local.','Réseau artisanat La Toile Maroc',ARRAY['Artisanat','Culture'],ARRAY['family','senior'],'Sur réservation')
ON CONFLICT DO NOTHING;
INSERT INTO v30_health_safety_points(territory_key,service_type,name,description) VALUES
('CASABLANCA','medicine','Soins médicaux à proximité','Orientation vers les structures de soins du territoire.'),
('CASABLANCA','pharmacy','Pharmacies à proximité','Recherche de pharmacies et services pharmaceutiques disponibles.'),
('CASABLANCA','security','Sécurité locale','Orientation vers les services de sécurité et assistance.'),
('TANGER','medicine','Soins médicaux à proximité','Orientation vers les structures de soins du territoire.'),
('TANGER','pharmacy','Pharmacies à proximité','Recherche de pharmacies et services pharmaceutiques disponibles.'),
('TANGER','security','Sécurité locale','Orientation vers les services de sécurité et assistance.')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE VIEW v30_globe_entry AS
SELECT country_iso3,COUNT(*) FILTER(WHERE region_type='country') countries,COUNT(*) FILTER(WHERE region_type<>'country') territories,
ARRAY_AGG(DISTINCT hemisphere) hemispheres,ARRAY_AGG(DISTINCT climate_zone) FILTER(WHERE climate_zone IS NOT NULL) climate_zones
FROM v30_territories GROUP BY country_iso3;
