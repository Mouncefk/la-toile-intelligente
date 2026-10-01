-- La Toile V17 — Institutional Dashboard & Aggregated Insights
CREATE TABLE IF NOT EXISTS institutional_profiles_v17 (
  id BIGSERIAL PRIMARY KEY,
  institution_id BIGINT,
  country_id BIGINT REFERENCES countries(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  institution_type TEXT NOT NULL DEFAULT 'tourism_institution',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS institutional_metrics_v17 (
  id BIGSERIAL PRIMARY KEY,
  institution_id BIGINT REFERENCES institutional_profiles_v17(id) ON DELETE CASCADE,
  country_id BIGINT REFERENCES countries(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  metric_key TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  dimension JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS institutional_insights_v17 (
  id BIGSERIAL PRIMARY KEY,
  institution_id BIGINT REFERENCES institutional_profiles_v17(id) ON DELETE CASCADE,
  country_id BIGINT REFERENCES countries(id) ON DELETE SET NULL,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inst_metrics_country_period
ON institutional_metrics_v17(country_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_inst_metrics_key
ON institutional_metrics_v17(metric_key);

CREATE OR REPLACE VIEW institutional_dashboard_v17 AS
SELECT
  m.country_id,
  m.metric_key,
  SUM(m.metric_value) AS total_value,
  MIN(m.period_start) AS first_period,
  MAX(m.period_end) AS last_period
FROM institutional_metrics_v17 m
GROUP BY m.country_id, m.metric_key;

-- Demonstration-only aggregated indicators. No traveler-level data is exposed.
INSERT INTO institutional_metrics_v17
  (institution_id,country_id,period_start,period_end,metric_key,metric_value,dimension)
SELECT NULL,c.id,current_date-29,current_date,'destination_interest',120,
       jsonb_build_object('destination','Marrakech')
FROM countries c WHERE c.iso3='MAR'
AND NOT EXISTS (SELECT 1 FROM institutional_metrics_v17 WHERE metric_key='destination_interest' AND country_id=c.id);

INSERT INTO institutional_metrics_v17
  (institution_id,country_id,period_start,period_end,metric_key,metric_value,dimension)
SELECT NULL,c.id,current_date-29,current_date,'artisanat_interest',68,
       jsonb_build_object('category','Artisanat')
FROM countries c WHERE c.iso3='MAR'
AND NOT EXISTS (SELECT 1 FROM institutional_metrics_v17 WHERE metric_key='artisanat_interest' AND country_id=c.id);

INSERT INTO institutional_metrics_v17
  (institution_id,country_id,period_start,period_end,metric_key,metric_value,dimension)
SELECT NULL,c.id,current_date-29,current_date,'senior_tourism_interest',44,
       jsonb_build_object('segment','Tourisme senior')
FROM countries c WHERE c.iso3='MAR'
AND NOT EXISTS (SELECT 1 FROM institutional_metrics_v17 WHERE metric_key='senior_tourism_interest' AND country_id=c.id);
