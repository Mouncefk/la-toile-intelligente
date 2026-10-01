import express from 'express';

export const v27Router = express.Router();

function normalizeIntent(input = {}) {
  const intent = input.intent || {};
  return { activity:intent.activity||null, travelerProfile:intent.travelerProfile||null, companion:intent.companion||null, safety:Boolean(intent.safety), location:intent.location||null, dates:intent.dates||null, pace:intent.pace||null };
}
function missing(intent) { const m=[]; if(!intent.activity)m.push('activity'); if(!intent.location)m.push('location'); if(!intent.dates)m.push('dates'); return m; }

v27Router.post('/session',(req,res)=>{ const intent=normalizeIntent(req.body); const m=missing(intent); res.status(201).json({version:'27.0.0',stage:'intent',intent,missingFields:m,next:m.length?'qualification':'matching'}); });
v27Router.post('/request',(req,res)=>{ const intent=normalizeIntent(req.body); res.status(201).json({version:'27.0.0',request:{rawText:req.body.rawText||'',intent,status:'qualified',decision:null,next:'matching'}}); });
v27Router.post('/handoff',(req,res)=>{ const {requestId=null,travelerId=null,tripId=null,confirmed=false}=req.body; if(!confirmed)return res.status(400).json({error:'explicit_confirmation_required',message:'La décision ou action importante doit être confirmée par le voyageur.'}); res.status(201).json({version:'27.0.0',stage:'journey_handoff',requestId,travelerId,tripId,status:'confirmed'}); });
v27Router.get('/flow',(_req,res)=>res.json({version:'27.0.0',flow:['globe','country','intent','qualification','territory','matching','professional_responses','comparison','traveler_decision','vault','journey'],principle:'traveler_decides'}));
