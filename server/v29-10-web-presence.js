const REQUIRED_SERVICES=[
  /agence/i,/tour[- ]?opérateur/i,/tour operator/i,/hôtel/i,/hotel/i,
  /transport touristique/i,/transport.*touris/i,/location/i,/établissement touristique/i,
  /organisateur/i
];
const RECOMMENDED_SERVICES=[
  /guide/i,/photograph/i,/activité/i,/excursion/i,/artisan/i,/bien[- ]?être/i,
  /restaurant/i,/restauration/i,/événement/i
];

function requirementFor(labels=[]){
  const text=(labels||[]).join(" ");
  if(REQUIRED_SERVICES.some(r=>r.test(text))) return "required";
  if(RECOMMENDED_SERVICES.some(r=>r.test(text))) return "recommended";
  return "optional";
}

function validateWebsiteUrl(value){
  if(!value) return {valid:false,status:"missing",reason:"url_missing"};
  let url;
  try{ url=new URL(String(value).trim()); }catch{ return {valid:false,status:"invalid",reason:"invalid_url"}; }
  if(!["https:","http:"].includes(url.protocol)) return {valid:false,status:"invalid",reason:"unsupported_protocol"};
  if(!url.hostname || !url.hostname.includes(".")) return {valid:false,status:"invalid",reason:"domain_missing"};
  return {valid:true,status:"declared",normalized:url.toString(),https:url.protocol==="https:"};
}

export function registerV29_10WebPresenceRoutes({app,pool}){
  app.get("/api/professionals/v29/:professionalId/web-presence",async(req,res)=>{
    try{
      const q=await pool.query(`SELECT p.id AS professional_id,
        COALESCE((SELECT string_agg(DISTINCT ps.label, ', ' ORDER BY ps.label)
          FROM professional_services_v11 ps WHERE ps.professional_id=p.id AND ps.active=true),'Professionnel') AS service_labels,
        w.website_url,w.requirement_level,w.status,w.verification,w.checked_at
        FROM professionals p
        LEFT JOIN professional_web_presence_v29_10 w ON w.professional_id=p.id
        WHERE p.id=$1`,[req.params.professionalId]);
      if(!q.rows[0]) return res.status(404).json({error:"professional_not_found"});
      const row=q.rows[0];
      const labels=row.service_labels?row.service_labels.split(", "):[];
      const requirement=requirementFor(labels);
      res.json({...row,requirement_level:requirement,principle:"website_requirement_depends_on_profession"});
    }catch(e){res.status(500).json({error:e.message})}
  });

  app.put("/api/professionals/v29/:professionalId/web-presence",async(req,res)=>{
    const url=req.body?.websiteUrl??req.body?.website_url??"";
    try{
      const p=await pool.query(`SELECT p.id,
        COALESCE((SELECT array_agg(DISTINCT ps.label ORDER BY ps.label)
          FROM professional_services_v11 ps WHERE ps.professional_id=p.id AND ps.active=true),'{}') AS labels
        FROM professionals p WHERE p.id=$1`,[req.params.professionalId]);
      if(!p.rows[0]) return res.status(404).json({error:"professional_not_found"});
      const requirement=requirementFor(p.rows[0].labels||[]);
      const check=validateWebsiteUrl(url);
      const status=check.valid?"declared":"invalid";
      const verification={url:check.normalized||null,https:check.https||false,method:"declaration_format_check"};
      const q=await pool.query(`INSERT INTO professional_web_presence_v29_10
        (professional_id,website_url,requirement_level,status,verification,checked_at)
        VALUES($1,$2,$3,$4,$5::jsonb,now())
        ON CONFLICT(professional_id) DO UPDATE SET website_url=EXCLUDED.website_url,
        requirement_level=EXCLUDED.requirement_level,status=EXCLUDED.status,
        verification=EXCLUDED.verification,checked_at=EXCLUDED.checked_at,updated_at=now()
        RETURNING *`,[req.params.professionalId,check.normalized||null,requirement,status,JSON.stringify(verification)]);
      res.json({...q.rows[0],valid:check.valid,principle:"declared_url_is_not_website_verification"});
    }catch(e){res.status(500).json({error:e.message})}
  });
}
