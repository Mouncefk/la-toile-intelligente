const url=process.env.V28_FEEDBACK_TEST_URL||'http://localhost:4300/api/ai/v21/recommendations/999999999/feedback';
const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({feedback:'utile'})});
if(r.status!==404)throw new Error('recommendation existence check failed');
const r2=await fetch(process.env.V28_FEEDBACK_TEST_URL||url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({})});
if(r2.status!==400)throw new Error('feedback validation failed');
console.log('V28.7 feedback API validation passed.');