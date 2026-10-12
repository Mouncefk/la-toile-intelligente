-- V32.10 — hemisphere-aware seasonal model
CREATE TABLE IF NOT EXISTS v32_seasonal_windows (
 climate_key TEXT NOT NULL REFERENCES v32_climate_regions(climate_key) ON DELETE CASCADE,
 hemisphere TEXT NOT NULL CHECK(hemisphere IN ('north','south','equatorial')),
 season_key TEXT NOT NULL,
 month_start INT NOT NULL CHECK(month_start BETWEEN 1 AND 12),
 month_end INT NOT NULL CHECK(month_end BETWEEN 1 AND 12),
 tourism_tags TEXT[] NOT NULL DEFAULT '{}',
 rationale_fr TEXT,
 PRIMARY KEY(climate_key,hemisphere,season_key)
);
INSERT INTO v32_seasonal_windows(climate_key,hemisphere,season_key,month_start,month_end,tourism_tags,rationale_fr) VALUES
('mediterranean','north','été',6,8,ARRAY['balneaire'],'Saison chaude de l’hémisphère nord.'),
('mediterranean','south','été',12,2,ARRAY['balneaire'],'Saison chaude décalée dans l’hémisphère sud.'),
('oceanic','north','été',6,8,ARRAY['family','nature'],'Période estivale du nord.'),
('oceanic','south','été',12,2,ARRAY['family','nature'],'Période estivale du sud.'),
('arid','north','saison_confort',10,3,ARRAY['desert','aventure'],'Périodes généralement plus favorables aux fortes chaleurs désertiques.'),
('arid','south','saison_confort',4,9,ARRAY['desert','aventure'],'Décalage saisonnier de l’hémisphère sud.'),
('mountain','north','été',6,9,ARRAY['montagne','nature'],'Fenêtre générale favorable selon altitude et conditions.'),
('mountain','south','été',12,3,ARRAY['montagne','nature'],'Fenêtre générale favorable selon altitude et conditions.'),
('polar','north','été',6,8,ARRAY['aventure','nature'],'Fenêtre de lumière et accessibilité généralement plus favorable.'),
('polar','south','été',12,2,ARRAY['aventure','nature'],'Fenêtre australe correspondante.')
ON CONFLICT DO NOTHING;
