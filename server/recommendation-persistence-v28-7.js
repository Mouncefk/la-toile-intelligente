export function buildV21RecommendationPayload({context,recommendations,travelerId}={}){
 return {
  version:'28.7',
  travelerId:Number(travelerId),
  context,
  recommendations:recommendations.map(r=>({
   type:r.type||r.id,
   title:r.title,
   explanation:r.explanation||'La Toile propose cette possibilité comme aide à la décision.',
   evidence:r.evidence||{},
   confidence:r.confidence??null,
   alternatives:r.alternatives||[]
  })),
  principle:'assist_not_decide'
 };
}
export function normalizeV21Feedback(body={}){
 const feedback=String(body.feedback||'').trim();
 if(!feedback)return {error:'feedback_required'};
 return {feedback,reason:body.reason?String(body.reason).trim():null};
}
