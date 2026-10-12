-- V32.3 — reference globe root
INSERT INTO v32_geo_nodes(node_key,node_type,name,hemisphere,metadata)
VALUES('world','world','Monde','equatorial','{"source":"platform_reference","coverage":"root"}'::jsonb)
ON CONFLICT(node_key) DO NOTHING;
INSERT INTO v32_geo_nodes(node_key,node_type,name,parent_key,hemisphere,metadata) VALUES
('africa','continent','Afrique','world','equatorial','{"reference":true}'::jsonb),
('europe','continent','Europe','world','north','{"reference":true}'::jsonb),
('asia','continent','Asie','world','north','{"reference":true}'::jsonb),
('north-america','continent','Amérique du Nord','world','north','{"reference":true}'::jsonb),
('south-america','continent','Amérique du Sud','world','south','{"reference":true}'::jsonb),
('oceania','continent','Océanie','world','south','{"reference":true}'::jsonb),
('antarctica','continent','Antarctique','world','south','{"reference":true}'::jsonb)
ON CONFLICT(node_key) DO NOTHING;
