export async function requestToEvent(request){
  const url=new URL(request.url),headers={};
  request.headers.forEach((value,key)=>{headers[key.toLowerCase()]=value});
  headers.host=headers.host||url.host;
  headers['x-forwarded-host']=headers['x-forwarded-host']||url.host;
  if(headers['cf-connecting-ip']&&!headers['x-nf-client-connection-ip'])headers['x-nf-client-connection-ip']=headers['cf-connecting-ip'];
  const method=request.method.toUpperCase();
  const body=(method==='GET'||method==='HEAD')?'':await request.text();
  const queryStringParameters={};
  for(const [key,value] of url.searchParams)queryStringParameters[key]=value;
  return{httpMethod:method,headers,body,queryStringParameters,path:url.pathname,rawUrl:request.url,isBase64Encoded:false};
}
export function resultToResponse(result={}){
  const headers=new Headers(result.headers||{});
  headers.set('Cache-Control',headers.get('Cache-Control')||'no-store');
  headers.set('X-Content-Type-Options','nosniff');
  headers.set('X-Frame-Options','DENY');
  headers.set('Referrer-Policy','no-referrer');
  const body=result.isBase64Encoded?Uint8Array.from(Buffer.from(result.body||'','base64')):(result.body??'');
  return new Response(body,{status:Number(result.statusCode)||200,headers});
}
export function bindProcessEnv(env){
  if(!env)return;
  for(const [key,value] of Object.entries(env)){
    if(typeof value==='string'||typeof value==='number'||typeof value==='boolean')process.env[key]=String(value);
  }
}
