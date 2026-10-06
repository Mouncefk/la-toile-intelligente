-- V30.1 — First Living Tourism Platform

CREATE TABLE IF NOT EXISTS v30_pro_profiles (
 id BIGSERIAL PRIMARY KEY,
 country_iso3 TEXT NOT NULL,
 territory_key TEXT REFERENCES v30_territories(territory_key) ON DELETE SET NULL,
 name TEXT NOT NULL,
 pro_type TEXT NOT NULL,
 specialties TEXT[] NOT NULL DEFAULT '{}',
 audiences TEXT[] NOT NULL DEFAULT '{}',
 service_area TEXT[] NOT NULL DEFAULT '{}',
 verified BOOLEAN NOT NULL DEFAULT false,
 active BOOLEAN NOT NULL DEFAULT true,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS v30_pro_network_links (
 id BIGSERIAL PRIMARY KEY,
 source_pro_id BIGINT NOT NULL REFERENCES v30_pro_profiles(id) ON DELETE CASCADE,
 target_pro_id BIGINT NOT NULL REFERENCES v30_pro_profiles(id) ON DELETE CASCADE,
 relationship TEXT NOT NULL,
 score NUMERIC(6,2) NOT NULL DEFAULT 0,
 reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
 UNIQUE(source_pro_id,target_pro_id,relationship)
);
CREATE TABLE IF NOT EXISTS v30_trip_records (
 id BIGSERIAL PRIMARY KEY,
 traveler_id BIGINT,
 session_id BIGINT REFERENCES v30_traveler_sessions(id) ON DELETE SET NULL,
 record_type TEXT NOT NULL CHECK(record_type IN ('reservation','document','memory','favorite')),
 title TEXT NOT NULL,
 territory_key TEXT REFERENCES v30_territories(territory_key) ON DELETE SET NULL,
 start_at TIMESTAMPTZ,
 end_at TIMESTAMPTZ,
 status TEXT,
 payload JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v30_trip_records_traveler ON v30_trip_records(traveler_id,record_type);
CREATE INDEX IF NOT EXISTS idx_v30_trip_records_territory ON v30_trip_records(territory_key);
CREATE TABLE IF NOT EXISTS v30_health_profiles (
 traveler_id BIGINT PRIMARY KEY,
 allergies TEXT[] NOT NULL DEFAULT '{}',
 blood_type TEXT,
 important_treatments TEXT[] NOT NULL DEFAULT '{}',
 emergency_contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
 reference_doctor JSONB NOT NULL DEFAULT '{}'::jsonb,
 reference_establishment JSONB NOT NULL DEFAULT '{}'::jsonb,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS v30_emergency_contacts (
 id BIGSERIAL PRIMARY KEY,
 traveler_id BIGINT NOT NULL,
 label TEXT NOT NULL,
 name TEXT NOT NULL,
 phone TEXT,
 relationship TEXT,
 priority INT NOT NULL DEFAULT 1,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS v30_vault_access_policy (
 item_type TEXT PRIMARY KEY,
 visibility TEXT NOT NULL DEFAULT 'private' CHECK(visibility='private'),
 institutional_aggregate BOOLEAN NOT NULL DEFAULT false,
 professional_share_allowed BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO v30_vault_access_policy(item_type,visibility,institutional_aggregate,professional_share_allowed) VALUES
('memory','private',false,false),
('document','private',false,false),
('reservation','private',false,false),
('health','private',false,false),
('emergency','private',false,false),
('favorite','private',false,false)
ON CONFLICT(item_type) DO UPDATE SET visibility='private',institutional_aggregate=false,professional_share_allowed=false;
CREATE TABLE IF NOT EXISTS v30_institutional_events (
 id BIGSERIAL PRIMARY KEY,
 country_iso3 TEXT,
 territory_key TEXT,
 event_type TEXT NOT NULL,
 tourism_tag TEXT,
 climate_key TEXT,
 month INT,
 aggregate_value NUMERIC,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS v30_traveler_profiles (
 session_id BIGINT PRIMARY KEY REFERENCES v30_traveler_sessions(id) ON DELETE CASCADE,
 traveler_type TEXT,
 age_group TEXT,
 mobility_level TEXT,
 party_type TEXT,
 party_size INT,
 children_ages INT[] NOT NULL DEFAULT '{}',
 budget_level TEXT,
 pace TEXT,
 duration_days INT,
 accessibility_needs TEXT[] NOT NULL DEFAULT '{}',
 preferences TEXT[] NOT NULL DEFAULT '{}',
 constraints TEXT[] NOT NULL DEFAULT '{}',
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS v30_conditions_context (
 territory_key TEXT PRIMARY KEY REFERENCES v30_territories(territory_key) ON DELETE CASCADE,
 observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 temperature_c NUMERIC(5,2),
 precipitation_probability NUMERIC(5,2),
 wind_kmh NUMERIC(6,2),
 condition_code TEXT,
 source TEXT NOT NULL DEFAULT 'pending',
 status TEXT NOT NULL DEFAULT 'not_available' CHECK(status IN ('not_available','available','stale')),
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE IF NOT EXISTS v30_tourism_climate_rules (
 tourism_tag TEXT NOT NULL,
 climate_key TEXT NOT NULL,
 hemisphere TEXT NOT NULL,
 preferred_months INT[] NOT NULL DEFAULT '{}',
 weight NUMERIC(5,2) NOT NULL DEFAULT 1,
 rationale_fr TEXT NOT NULL,
 PRIMARY KEY(tourism_tag,climate_key,hemisphere)
);
INSERT INTO v30_tourism_climate_rules(tourism_tag,climate_key,hemisphere,preferred_months,weight,rationale_fr) VALUES
('balneaire','mediterranean','north',ARRAY[5,6,7,8,9],1.00,'Le climat méditerranéen est particulièrement favorable aux activités littorales pendant la belle saison.'),
('balneaire','oceanic','north',ARRAY[6,7,8],0.90,'La saison estivale est généralement la plus adaptée au littoral océanique.'),
('montagne','mountain','north',ARRAY[6,7,8,12,1,2],1.00,'Les activités de montagne dépendent fortement de la saison et de l’altitude.'),
('desert','arid','north',ARRAY[3,4,5,10,11,12,1,2],1.00,'Les périodes tempérées sont généralement plus confortables pour l’exploration désertique.'),
('culture','mediterranean','north',ARRAY[1,2,3,4,5,9,10,11,12],0.90,'Le patrimoine culturel est souvent plus confortable hors des fortes chaleurs estivales.'),
('culture','oceanic','north',ARRAY[1,2,3,4,5,6,9,10,11,12],0.90,'Le patrimoine culturel reste accessible sur une large partie de l’année.'),
('artisanat','mediterranean','north',ARRAY[1,2,3,4,5,9,10,11,12],0.90,'Les savoir-faire et ateliers peuvent être recherchés toute l’année, avec un confort accru hors forte chaleur.'),
('gastronomie','mediterranean','north',ARRAY[1,2,3,4,5,9,10,11,12],0.95,'La gastronomie est valorisée par les saisons de produits et les périodes de découverte culturelle.'),
('senior','mediterranean','north',ARRAY[3,4,5,9,10,11],0.95,'Les périodes tempérées peuvent favoriser un séjour plus confortable pour les seniors.'),
('family','oceanic','north',ARRAY[6,7,8],0.95,'La période estivale facilite de nombreuses activités familiales littorales et de plein air.'),
('nature','mountain','north',ARRAY[5,6,7,8,9],0.95,'Les conditions de nature et de randonnée sont fortement saisonnières en montagne.'),
('echanges_culturels','oceanic','north',ARRAY[3,4,5,6,7,8,9,10],0.90,'Les échanges culturels bénéficient d’une programmation étendue sur l’année.'),
('colonies_vacances','oceanic','north',ARRAY[6,7,8],1.00,'Les colonies de vacances sont particulièrement liées aux périodes de vacances scolaires estivales.')
ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS v30_climate_seasons (
 climate_key TEXT NOT NULL,
 hemisphere TEXT NOT NULL CHECK(hemisphere IN ('north','south','equatorial')),
 month_start INT NOT NULL CHECK(month_start BETWEEN 1 AND 12),
 month_end INT NOT NULL CHECK(month_end BETWEEN 1 AND 12),
 season_fr TEXT NOT NULL,
 tourism_context TEXT[] NOT NULL DEFAULT '{}',
 PRIMARY KEY(climate_key,hemisphere,month_start)
);
INSERT INTO v30_climate_seasons(climate_key,hemisphere,month_start,month_end,season_fr,tourism_context) VALUES
('mediterranean','north',3,5,'Printemps',ARRAY['culture','nature','artisanat','city_break']),
('mediterranean','north',6,8,'Été',ARRAY['balneaire','montagne','family']),
('mediterranean','north',9,11,'Automne',ARRAY['culture','gastronomie','nature']),
('mediterranean','north',12,2,'Hiver',ARRAY['culture','senior','montagne']),
('oceanic','north',3,5,'Printemps',ARRAY['nature','culture','family']),
('oceanic','north',6,8,'Été',ARRAY['balneaire','family','nature']),
('oceanic','north',9,11,'Automne',ARRAY['culture','nature','gastronomie']),
('oceanic','north',12,2,'Hiver',ARRAY['culture','heritage','senior']),
('mountain','north',3,5,'Printemps',ARRAY['nature','adventure']),
('mountain','north',6,8,'Été',ARRAY['montagne','nature','family']),
('mountain','north',9,11,'Automne',ARRAY['nature','montagne','culture']),
('mountain','north',12,2,'Hiver',ARRAY['ski','montagne','family']),
('arid','north',3,5,'Printemps',ARRAY['desert','adventure','culture']),
('arid','north',6,8,'Été',ARRAY['culture','nightlife','senior']),
('arid','north',9,11,'Automne',ARRAY['desert','adventure','artisanat']),
('arid','north',12,2,'Hiver',ARRAY['desert','culture','nature']),
('mediterranean','south',3,5,'Automne',ARRAY['culture','gastronomie','nature']),
('mediterranean','south',6,8,'Hiver',ARRAY['culture','senior','montagne']),
('mediterranean','south',9,11,'Printemps',ARRAY['culture','nature','artisanat']),
('mediterranean','south',12,2,'Été',ARRAY['balneaire','family','nature']),
('equatorial','equatorial',1,12,'Toute l’année',ARRAY['nature','culture','adventure','family'])
ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS v30_geography_nodes (
 id BIGSERIAL PRIMARY KEY,
 node_key TEXT NOT NULL UNIQUE,
 parent_key TEXT REFERENCES v30_geography_nodes(node_key) ON DELETE SET NULL,
 node_type TEXT NOT NULL CHECK(node_type IN ('world','hemisphere','continent','country','region','territory')),
 name_fr TEXT NOT NULL,
 country_iso3 TEXT,
 hemisphere TEXT CHECK(hemisphere IN ('north','south','equatorial')),
 climate_zones TEXT[] NOT NULL DEFAULT '{}',
 latitude DOUBLE PRECISION,
 longitude DOUBLE PRECISION,
 active BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO v30_geography_nodes(node_key,parent_key,node_type,name_fr,hemisphere,climate_zones) VALUES
('WORLD',NULL,'world','Monde',NULL,ARRAY['polar','temperate','mediterranean','tropical','arid','equatorial']),
('HEMISPHERE_NORTH','WORLD','hemisphere','Hémisphère nord','north',ARRAY['polar','temperate','mediterranean','arid','tropical']),
('HEMISPHERE_SOUTH','WORLD','hemisphere','Hémisphère sud','south',ARRAY['polar','temperate','mediterranean','arid','tropical']),
('HEMISPHERE_EQUATORIAL','WORLD','hemisphere','Zone équatoriale','equatorial',ARRAY['equatorial','tropical'])
ON CONFLICT(node_key) DO NOTHING;
INSERT INTO v30_geography_nodes(node_key,parent_key,node_type,name_fr,country_iso3,hemisphere,climate_zones,latitude,longitude)
SELECT 'COUNTRY_MAR','HEMISPHERE_NORTH','country','Maroc','MAR','north',ARRAY['mediterranean','arid','mountain'],31.7917,-7.0926
WHERE NOT EXISTS(SELECT 1 FROM v30_geography_nodes WHERE node_key='COUNTRY_MAR');
INSERT INTO v30_geography_nodes(node_key,parent_key,node_type,name_fr,country_iso3,hemisphere,climate_zones,latitude,longitude)
SELECT 'COUNTRY_FRA','HEMISPHERE_NORTH','country','France','FRA','north',ARRAY['oceanic','mediterranean','mountain','continental'],46.2276,2.2137
WHERE NOT EXISTS(SELECT 1 FROM v30_geography_nodes WHERE node_key='COUNTRY_FRA');
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

-- V30.45 — temporal solution constraints
CREATE TABLE IF NOT EXISTS v30_solution_time_constraints (
 id BIGSERIAL PRIMARY KEY,
 solution_id BIGINT NOT NULL REFERENCES v30_solutions(id) ON DELETE CASCADE,
 min_days INTEGER,
 max_days INTEGER,
 lead_time_hours INTEGER NOT NULL DEFAULT 0,
 active BOOLEAN NOT NULL DEFAULT true,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 CHECK (min_days IS NULL OR min_days > 0),
 CHECK (max_days IS NULL OR max_days >= COALESCE(min_days,1)),
 CHECK (lead_time_hours >= 0)
);
CREATE INDEX IF NOT EXISTS idx_v30_solution_time_constraints_solution ON v30_solution_time_constraints(solution_id,active);

-- V30.46 — proposal composition
CREATE TABLE IF NOT EXISTS v30_stay_proposal_templates (
 id BIGSERIAL PRIMARY KEY,
 territory_key TEXT NOT NULL REFERENCES v30_territories(territory_key) ON DELETE CASCADE,
 name_fr TEXT NOT NULL,
 proposal_type TEXT NOT NULL DEFAULT 'composed_stay',
 active BOOLEAN NOT NULL DEFAULT true,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_v30_stay_proposal_templates_territory ON v30_stay_proposal_templates(territory_key,active);


CREATE INDEX IF NOT EXISTS idx_v30_health_territory ON v30_health_safety_points(territory_key,service_type);
INSERT INTO v30_territories(country_iso3,territory_key,name_fr,region_type,latitude,longitude,climate_zone,hemisphere,tourism_tags) VALUES
('MAR','MAR','Maroc','country',31.7917,-7.0926,'Mediterranean / Arid / Mountain','north',ARRAY['culture','heritage','artisanat','desert','balneaire','montagne','gastronomie','senior','family']),
('MAR','RABAT','Rabat','city',34.0209,-6.8416,'Mediterranean','north',ARRAY['culture','heritage','artisanat','family','senior']),
('MAR','MARRAKECH','Marrakech','city',31.6295,-7.9811,'Arid / Semi-arid','north',ARRAY['culture','heritage','artisanat','gastronomie','senior']),
('MAR','MERZOUGA','Merzouga','locality',31.0801,-4.0134,'Arid / Desert','north',ARRAY['desert','adventure','culture']),
('MAR','OUARZAZATE','Ouarzazate','city',30.9335,-6.9370,'Arid / Mountain','north',ARRAY['desert','culture','heritage']),
('MAR','AGADIR','Agadir','city',30.4278,-9.5981,'Mediterranean / Coastal','north',ARRAY['balneaire','senior','family','nature']),
('MAR','ESSAOUIRA','Essaouira','city',31.5085,-9.7595,'Coastal','north',ARRAY['balneaire','artisanat','culture','surf']),
('MAR','IFRANE','Ifrane','city',33.5228,-5.1100,'mountain','north',ARRAY['montagne','nature','family','senior']),
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

-- V30.15 Pro→Pro pilot network: generic ecosystem profiles, no real-world identities/contact data.
INSERT INTO v30_pro_profiles(country_iso3,territory_key,name,pro_type,specialties,audiences,service_area,verified,metadata) VALUES
('MAR','MARRAKECH','Réseau hébergement Marrakech','hebergement',ARRAY['hébergement','senior','family'],ARRAY['senior','family'],ARRAY['MARRAKECH'],true,'{"pilot":true}'::jsonb),
('MAR','MARRAKECH','Réseau artisanat Marrakech','artisanat',ARRAY['artisanat','culture','heritage'],ARRAY['senior','family'],ARRAY['MARRAKECH'],true,'{"pilot":true}'::jsonb),
('MAR','MARRAKECH','Réseau guides Marrakech','guide',ARRAY['culture','heritage','artisanat'],ARRAY['senior','family'],ARRAY['MARRAKECH'],true,'{"pilot":true}'::jsonb),
('MAR','MERZOUGA','Réseau désert Merzouga','experience',ARRAY['desert','nature','adventure'],ARRAY['adult','family'],ARRAY['MERZOUGA'],true,'{"pilot":true}'::jsonb),
('MAR','AGADIR','Réseau balnéaire Agadir','experience',ARRAY['balneaire','nature','senior'],ARRAY['senior','family'],ARRAY['AGADIR'],true,'{"pilot":true}'::jsonb),
('MAR','RABAT','Réseau culture Rabat','culture',ARRAY['culture','heritage','senior'],ARRAY['senior','family'],ARRAY['RABAT'],true,'{"pilot":true}'::jsonb),
('MAR','CASABLANCA','Réseau tourisme Casablanca','tourisme',ARRAY['culture','gastronomie','urbain'],ARRAY['senior','family'],ARRAY['CASABLANCA'],true,'{"pilot":true}'::jsonb),
('MAR','TANGER','Réseau tourisme Tanger','tourisme',ARRAY['culture','balneaire','artisanat'],ARRAY['senior','family'],ARRAY['TANGER'],true,'{"pilot":true}'::jsonb),
('FRA','PARIS','Réseau culture Paris','culture',ARRAY['culture','heritage','gastronomie'],ARRAY['senior','family'],ARRAY['PARIS'],true,'{"pilot":true}'::jsonb),
('FRA','PROVENCE','Réseau gastronomie Provence','gastronomie',ARRAY['gastronomie','artisanat','culture'],ARRAY['senior','family'],ARRAY['PROVENCE'],true,'{"pilot":true}'::jsonb),
('FRA','ALPES','Réseau montagne Alpes','experience',ARRAY['montagne','nature','adventure'],ARRAY['family','senior'],ARRAY['ALPES'],true,'{"pilot":true}'::jsonb),
('FRA','BRETAGNE','Réseau littoral Bretagne','experience',ARRAY['balneaire','nature','culture'],ARRAY['family','senior'],ARRAY['BRETAGNE'],true,'{"pilot":true}'::jsonb)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS v30_pro_opportunities (
 id BIGSERIAL PRIMARY KEY,
 source_pro_id BIGINT NOT NULL REFERENCES v30_pro_profiles(id) ON DELETE CASCADE,
 territory_key TEXT REFERENCES v30_territories(territory_key) ON DELETE SET NULL,
 opportunity_type TEXT NOT NULL,
 title TEXT NOT NULL,
 description TEXT,
 specialties TEXT[] NOT NULL DEFAULT '{}',
 audiences TEXT[] NOT NULL DEFAULT '{}',
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed','draft')),
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO v30_pro_opportunities(source_pro_id,territory_key,opportunity_type,title,description,specialties,audiences,metadata)
SELECT p.id,'MARRAKECH','co_creation','Créer une expérience artisanat + patrimoine','Associer découverte des savoir-faire, médiation culturelle et expérience territoriale.',ARRAY['artisanat','culture','heritage'],ARRAY['senior','family'],'{"pilot":true}'::jsonb FROM v30_pro_profiles p WHERE p.name='Réseau artisanat Marrakech'
AND NOT EXISTS (SELECT 1 FROM v30_pro_opportunities o WHERE o.title='Créer une expérience artisanat + patrimoine');
INSERT INTO v30_pro_opportunities(source_pro_id,territory_key,opportunity_type,title,description,specialties,audiences,metadata)
SELECT p.id,'TANGER','cultural_exchange','Échange culturel Méditerranée','Construire une offre d’échange culturel reliant acteurs locaux, patrimoine et découverte des savoir-faire.',ARRAY['culture','artisanat','balneaire'],ARRAY['family','senior'],'{"pilot":true}'::jsonb FROM v30_pro_profiles p WHERE p.name='Réseau tourisme Tanger'
AND NOT EXISTS (SELECT 1 FROM v30_pro_opportunities o WHERE o.title='Échange culturel Méditerranée');
INSERT INTO v30_pro_opportunities(source_pro_id,territory_key,opportunity_type,title,description,specialties,audiences,metadata)
SELECT p.id,'AGADIR','combined_offer','Offre balnéaire adaptée aux seniors','Associer expérience littorale, accompagnement et services adaptés au public senior.',ARRAY['balneaire','senior','nature'],ARRAY['senior'],'{"pilot":true}'::jsonb FROM v30_pro_profiles p WHERE p.name='Réseau balnéaire Agadir'
AND NOT EXISTS (SELECT 1 FROM v30_pro_opportunities o WHERE o.title='Offre balnéaire adaptée aux seniors');

CREATE TABLE IF NOT EXISTS v30_b2b_calls (
 id BIGSERIAL PRIMARY KEY,
 source_pro_id BIGINT NOT NULL REFERENCES v30_pro_profiles(id) ON DELETE CASCADE,
 territory_key TEXT REFERENCES v30_territories(territory_key) ON DELETE SET NULL,
 call_type TEXT NOT NULL CHECK (call_type IN ('tender','interest','partnership','subcontracting','supplier','skills')),
 title TEXT NOT NULL,
 description TEXT NOT NULL,
 requirements TEXT[] NOT NULL DEFAULT '{}',
 specialties TEXT[] NOT NULL DEFAULT '{}',
 audiences TEXT[] NOT NULL DEFAULT '{}',
 target_countries TEXT[] NOT NULL DEFAULT '{}',
 languages TEXT[] NOT NULL DEFAULT '{}',
 budget_level TEXT,
 response_deadline TIMESTAMPTZ,
 status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft','open','closed','awarded')),
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS v30_b2b_responses (
 id BIGSERIAL PRIMARY KEY,
 call_id BIGINT NOT NULL REFERENCES v30_b2b_calls(id) ON DELETE CASCADE,
 responder_pro_id BIGINT NOT NULL REFERENCES v30_pro_profiles(id) ON DELETE CASCADE,
 message TEXT NOT NULL,
 proposal JSONB NOT NULL DEFAULT '{}'::jsonb,
 match_score NUMERIC(6,2),
 status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','shortlisted','accepted','rejected','withdrawn')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(call_id,responder_pro_id)
);
CREATE TABLE IF NOT EXISTS v30_b2b_call_matches (
 id BIGSERIAL PRIMARY KEY,
 call_id BIGINT NOT NULL REFERENCES v30_b2b_calls(id) ON DELETE CASCADE,
 professional_id BIGINT NOT NULL REFERENCES v30_pro_profiles(id) ON DELETE CASCADE,
 score NUMERIC(6,2) NOT NULL DEFAULT 0,
 reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
 notified_at TIMESTAMPTZ,
 status TEXT NOT NULL DEFAULT 'suggested',
 UNIQUE(call_id,professional_id)
);

CREATE TABLE IF NOT EXISTS v30_b2b_call_events (
 id BIGSERIAL PRIMARY KEY,
 call_id BIGINT NOT NULL REFERENCES v30_b2b_calls(id) ON DELETE CASCADE,
 actor_pro_id BIGINT REFERENCES v30_pro_profiles(id) ON DELETE SET NULL,
 event_type TEXT NOT NULL CHECK (event_type IN ('published','updated','response_submitted','shortlisted','accepted','rejected','closed')),
 response_id BIGINT REFERENCES v30_b2b_responses(id) ON DELETE SET NULL,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v30_b2b_events_call ON v30_b2b_call_events(call_id,created_at);

CREATE TABLE IF NOT EXISTS v30_pro_collaboration_signals (
 id BIGSERIAL PRIMARY KEY,
 source_pro_id BIGINT NOT NULL REFERENCES v30_pro_profiles(id) ON DELETE CASCADE,
 target_pro_id BIGINT NOT NULL REFERENCES v30_pro_profiles(id) ON DELETE CASCADE,
 signal_type TEXT NOT NULL CHECK (signal_type IN ('awarded','repeat','co_creation','complementarity','territorial')),
 signal_score NUMERIC(8,2) NOT NULL DEFAULT 0,
 evidence_count INTEGER NOT NULL DEFAULT 1,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(source_pro_id,target_pro_id,signal_type)
);
CREATE TABLE IF NOT EXISTS v30_pro_collaboration_summary (
 source_pro_id BIGINT NOT NULL REFERENCES v30_pro_profiles(id) ON DELETE CASCADE,
 target_pro_id BIGINT NOT NULL REFERENCES v30_pro_profiles(id) ON DELETE CASCADE,
 collaboration_score NUMERIC(8,2) NOT NULL DEFAULT 0,
 collaboration_count INTEGER NOT NULL DEFAULT 0,
 last_collaboration_at TIMESTAMPTZ,
 strengths TEXT[] NOT NULL DEFAULT '{}',
 PRIMARY KEY(source_pro_id,target_pro_id)
);

CREATE TABLE IF NOT EXISTS v30_pro_opportunity_signals (
 id BIGSERIAL PRIMARY KEY,
 territory_key TEXT REFERENCES v30_territories(territory_key) ON DELETE SET NULL,
 source_pro_id BIGINT REFERENCES v30_pro_profiles(id) ON DELETE CASCADE,
 target_pro_id BIGINT REFERENCES v30_pro_profiles(id) ON DELETE CASCADE,
 signal_type TEXT NOT NULL CHECK (signal_type IN ('complementary_offer','unserved_need','cross_border','repeat_pattern','emerging_cluster')),
 title TEXT NOT NULL,
 rationale TEXT NOT NULL,
 suggested_action TEXT NOT NULL,
 score NUMERIC(8,2) NOT NULL DEFAULT 0,
 status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested','reviewed','accepted','dismissed')),
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO v30_pro_opportunity_signals(territory_key,source_pro_id,target_pro_id,signal_type,title,rationale,suggested_action,score,metadata)
SELECT 'MARRAKECH',a.id,b.id,'complementary_offer','Artisanat + patrimoine : complémentarité détectée','Les profils artisanat et guide partagent le même territoire et des spécialités complémentaires.','Proposer une mise en relation pour co-construire une expérience.',92,'{"pilot":true}'::jsonb
FROM v30_pro_profiles a JOIN v30_pro_profiles b ON a.territory_key=b.territory_key AND a.id<>b.id
WHERE a.name='Réseau artisanat Marrakech' AND b.name='Réseau guides Marrakech'
AND NOT EXISTS (SELECT 1 FROM v30_pro_opportunity_signals s WHERE s.title='Artisanat + patrimoine : complémentarité détectée');
CREATE INDEX IF NOT EXISTS idx_v30_pro_signals_territory ON v30_pro_opportunity_signals(territory_key,status,score DESC);

ALTER TABLE v30_b2b_calls ADD COLUMN IF NOT EXISTS geographic_scope TEXT NOT NULL DEFAULT 'local' CHECK (geographic_scope IN ('local','regional','national','international','global'));
ALTER TABLE v30_b2b_calls ADD COLUMN IF NOT EXISTS target_regions TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE v30_b2b_calls ADD COLUMN IF NOT EXISTS target_continents TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE v30_b2b_calls ADD COLUMN IF NOT EXISTS target_territories TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS v30_b2b_geo_scopes (
 id BIGSERIAL PRIMARY KEY,
 scope_key TEXT UNIQUE NOT NULL,
 scope_type TEXT NOT NULL CHECK (scope_type IN ('local','regional','national','international','global')),
 name_fr TEXT NOT NULL,
 country_iso3 TEXT,
 region_keys TEXT[] NOT NULL DEFAULT '{}',
 continent_keys TEXT[] NOT NULL DEFAULT '{}',
 description TEXT
);
INSERT INTO v30_b2b_geo_scopes(scope_key,scope_type,name_fr,description) VALUES
('LOCAL','local','Local','Même territoire ou zone de proximité.'),
('REGIONAL','regional','Régional','Territoires appartenant à une même région géographique.'),
('NATIONAL','national','National','Ensemble du territoire national.'),
('INTERNATIONAL','international','International','Plusieurs pays ciblés par l’émetteur.'),
('GLOBAL','global','Mondial','Ouverture mondiale du réseau professionnel.')
ON CONFLICT(scope_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS v30_b2b_geo_membership (
 scope_key TEXT NOT NULL REFERENCES v30_b2b_geo_scopes(scope_key) ON DELETE CASCADE,
 node_key TEXT NOT NULL REFERENCES v30_geography_nodes(node_key) ON DELETE CASCADE,
 PRIMARY KEY(scope_key,node_key)
);
INSERT INTO v30_b2b_geo_membership(scope_key,node_key) VALUES
('GLOBAL','WORLD'),('GLOBAL','HEMISPHERE_NORTH'),('GLOBAL','HEMISPHERE_SOUTH'),('GLOBAL','HEMISPHERE_EQUATORIAL'),
('NATIONAL','COUNTRY_MAR'),('NATIONAL','COUNTRY_FRA'),
('REGIONAL','COUNTRY_MAR'),('REGIONAL','COUNTRY_FRA')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS v30_transport_search_links (
 id BIGSERIAL PRIMARY KEY,
 mode TEXT NOT NULL CHECK (mode IN ('air','sea')),
 name_fr TEXT NOT NULL,
 url_template TEXT NOT NULL,
 scope TEXT NOT NULL DEFAULT 'global',
 active BOOLEAN NOT NULL DEFAULT true,
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
INSERT INTO v30_transport_search_links(mode,name_fr,url_template,scope) VALUES
('air','Recherche de vols','https://www.google.com/travel/flights','global'),
('air','Recherche de vols — Skyscanner','https://www.skyscanner.net/transport/flights/','global'),
('sea','Recherche de traversées maritimes','https://www.directferries.com/','global')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS v30_transport_options (
 id BIGSERIAL PRIMARY KEY,
 traveler_id TEXT,
 session_id BIGINT REFERENCES v30_traveler_sessions(id) ON DELETE SET NULL,
 mode TEXT NOT NULL CHECK (mode IN ('air','sea')),
 source_name TEXT,
 source_url TEXT,
 origin TEXT NOT NULL,
 destination TEXT NOT NULL,
 departure_at TIMESTAMPTZ,
 return_at TIMESTAMPTZ,
 duration_minutes INTEGER,
 price_amount NUMERIC(12,2),
 currency TEXT,
 reference_text TEXT,
 payload JSONB NOT NULL DEFAULT '{}'::jsonb,
 status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate','selected','rejected')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v30_transport_options_session ON v30_transport_options(session_id,created_at);

CREATE TABLE IF NOT EXISTS v30_travel_search_requests (
 id BIGSERIAL PRIMARY KEY,
 traveler_id TEXT,
 session_id BIGINT REFERENCES v30_traveler_sessions(id) ON DELETE SET NULL,
 search_type TEXT NOT NULL CHECK (search_type IN ('air','sea','air_sea')),
 mode TEXT NOT NULL CHECK (mode IN ('assisted','automatic')),
 origin TEXT,
 destination TEXT,
 departure_at TIMESTAMPTZ,
 return_at TIMESTAMPTZ,
 travelers_count INTEGER,
 constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
 status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','searching','results_ready','completed','cancelled')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS v30_travel_search_results (
 id BIGSERIAL PRIMARY KEY,
 request_id BIGINT NOT NULL REFERENCES v30_travel_search_requests(id) ON DELETE CASCADE,
 source_name TEXT NOT NULL,
 source_url TEXT,
 result_type TEXT NOT NULL CHECK (result_type IN ('air','sea')),
 origin TEXT,
 destination TEXT,
 departure_at TIMESTAMPTZ,
 arrival_at TIMESTAMPTZ,
 duration_minutes INTEGER,
 price_amount NUMERIC(12,2),
 currency TEXT,
 carrier TEXT,
 cabin TEXT,
 baggage TEXT,
 external_reference TEXT,
 raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
 status TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('candidate','selected','rejected')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v30_travel_search_requests_traveler ON v30_travel_search_requests(traveler_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_v30_travel_search_results_request ON v30_travel_search_results(request_id,price_amount);

CREATE TABLE IF NOT EXISTS v30_travel_constraints (
 id BIGSERIAL PRIMARY KEY,
 traveler_id TEXT,
 session_id BIGINT REFERENCES v30_traveler_sessions(id) ON DELETE SET NULL,
 constraint_type TEXT NOT NULL,
 source_type TEXT NOT NULL DEFAULT 'traveler_selected',
 source_id BIGINT,
 value JSONB NOT NULL DEFAULT '{}'::jsonb,
 active BOOLEAN NOT NULL DEFAULT true,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_v30_travel_constraints_session ON v30_travel_constraints(session_id,active);
