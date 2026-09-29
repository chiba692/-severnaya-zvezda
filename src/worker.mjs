import * as admin_login from './functions/admin-login.js';
import * as admin_logout from './functions/admin-logout.js';
import * as admin_session from './functions/admin-session.js';
import * as audit from './functions/audit.js';
import * as availability_summary from './functions/availability-summary.js';
import * as clinic_settings from './functions/clinic-settings.js';
import * as export_bookings from './functions/export-bookings.js';
import * as get_available_slots from './functions/get-available-slots.js';
import * as get_bookings from './functions/get-bookings.js';
import * as get_vapid_public from './functions/get-vapid-public.js';
import * as health from './functions/health.js';
import * as manage_booking from './functions/manage-booking.js';
import * as price_items from './functions/price-items.js';
import * as public_booking from './functions/public-booking.js';
import * as push_test from './functions/push-test.js';
import * as save_push_subscription from './functions/save-push-subscription.js';
import * as schedule from './functions/schedule.js';
import * as send_booking from './functions/send-booking.js';
import * as services from './functions/services.js';
import {requestToEvent,resultToResponse,bindProcessEnv} from './adapter.mjs';

const ROUTES={
  'admin-login': admin_login.handler,
  'admin-logout': admin_logout.handler,
  'admin-session': admin_session.handler,
  'audit': audit.handler,
  'availability-summary': availability_summary.handler,
  'clinic-settings': clinic_settings.handler,
  'export-bookings': export_bookings.handler,
  'get-available-slots': get_available_slots.handler,
  'get-bookings': get_bookings.handler,
  'get-vapid-public': get_vapid_public.handler,
  'health': health.handler,
  'manage-booking': manage_booking.handler,
  'price-items': price_items.handler,
  'public-booking': public_booking.handler,
  'push-test': push_test.handler,
  'save-push-subscription': save_push_subscription.handler,
  'schedule': schedule.handler,
  'send-booking': send_booking.handler,
  'services': services.handler,
};

function endpointName(pathname){
  if(pathname.startsWith('/api/'))return pathname.slice('/api/'.length).split('/')[0];
  return '';
}
export default{
  async fetch(request,env){
    bindProcessEnv(env);
    const url=new URL(request.url),name=endpointName(url.pathname),handler=ROUTES[name];
    if(!handler)return new Response(JSON.stringify({error:'Not found'}),{status:404,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
    try{
      const event=await requestToEvent(request);
      const result=await handler(event,{});
      return resultToResponse(result);
    }catch(error){
      console.error('worker route',name,error?.stack||error?.message||error);
      return new Response(JSON.stringify({error:'Временная ошибка сервера'}),{status:500,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
    }
  }
};
