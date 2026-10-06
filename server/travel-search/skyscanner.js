import https from 'node:https';

function requestJson(url,options={}){return new Promise((resolve,reject)=>{const req=https.request(url,{method:options.method||'GET',headers:{'Accept':'application/json',...(options.headers||{})}},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>{try{const d=JSON.parse(body);if(res.statusCode>=400)reject(new Error(d.message||d.error||'provider_http_error'));else resolve(d)}catch(e){reject(new Error('provider_invalid_json'))})})});req.on('error',reject);if(options.body)req.write(options.body);req.end()})}

export async function searchSkyscannerFlights(request){
 const key=process.env.SKYSCANNER_API_KEY;
 if(!key)throw new Error('SKYSCANNER_API_KEY not configured');
 const base=process.env.SKYSCANNER_API_BASE_URL||'https://partners.api.skyscanner.net/apiservices/v3';
 const dep=new Date(request.departure_at);
 const body={query:{market:request.constraints?.market||'MA',locale:request.constraints?.locale||'fr-FR',currency:request.constraints?.currency||'EUR',queryLegs:[{originPlaceId:{iata:request.origin},destinationPlaceId:{iata:request.destination},dateTime:{year:dep.getUTCFullYear(),month:dep.getUTCMonth()+1,day:dep.getUTCDate()}}],adults:request.travelers_count||1}};
 const data=await requestJson(base+'/flights/live/search/create',{method:'POST',headers:{'x-api-key':key,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const itineraries=data.content?.results?.itineraries||{};
 return Object.values(itineraries).slice(0,10).map((it,i)=>({sourceName:'Skyscanner',sourceUrl:'https://www.skyscanner.net/',origin:request.origin,destination:request.destination,departureAt:null,arrivalAt:null,durationMinutes:null,priceAmount:Number(it.pricingOptions?.[0]?.price?.amount||0)||null,currency:request.constraints?.currency||'EUR',carrier:null,cabin:null,baggage:null,externalReference:it.id||String(i),rawPayload:it}));
}
