CREATE TABLE IF NOT EXISTS v32_globe_render_profiles (
 node_type TEXT PRIMARY KEY,
 min_zoom INT NOT NULL,
 max_zoom INT NOT NULL,
 geometry_detail TEXT NOT NULL,
 show_labels BOOLEAN NOT NULL DEFAULT true,
 show_activity BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO v32_globe_render_profiles(node_type,min_zoom,max_zoom,geometry_detail,show_labels,show_activity) VALUES
('world',0,0,'coarse',false,true),
('continent',1,1,'coarse',true,true),
('country',2,2,'medium',true,true),
('region',3,3,'medium',true,true),
('territory',4,4,'fine',true,true),
('city',5,6,'full',true,true)
ON CONFLICT(node_type) DO UPDATE SET min_zoom=EXCLUDED.min_zoom,max_zoom=EXCLUDED.max_zoom,geometry_detail=EXCLUDED.geometry_detail,show_labels=EXCLUDED.show_labels,show_activity=EXCLUDED.show_activity;