const url=process.env.V28_HISTORY_RECOMMEND_URL||'http://localhost:4300/api/ai/v21-history/recommend';
const invalid=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({})});
if(invalid.status!==400)throw new Error('travelerId validation failed');
console.log('V28.5 V21 history recommendation API validation passed.');
