-- V33.10 — installation integrity guard
DO $$
DECLARE
  required_table TEXT;
BEGIN
  FOREACH required_table IN ARRAY ARRAY[
    'v32_geo_nodes',
    'v32_geo_climate_profiles',
    'v32_seasonal_windows',
    'v32_trip_component_selections',
    'v32_trip_scenario_selections',
    'v32_trip_component_revisions',
    'v32_trip_recalculation_events',
    'v32_trip_optimization_snapshots',
    'v32_trip_improvement_feedback'
  ]
  LOOP
    IF to_regclass('public.' || required_table) IS NULL THEN
      RAISE EXCEPTION 'V33.10 installation integrity failure: missing table %', required_table;
    END IF;
  END LOOP;
END $$;
