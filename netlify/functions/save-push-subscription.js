exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({error: 'Method not allowed'})
    };
  }

  try {
    const subscription = JSON.parse(event.body || '{}');

    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return {
        statusCode: 400,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({error: 'Invalid push subscription'})
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !secretKey) {
      throw new Error('Supabase environment variables are missing');
    }

    const res = await fetch(
      `${supabaseUrl}/rest/v1/push_subscriptions?on_conflict=endpoint`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': secretKey,
          'Authorization': `Bearer ${secretKey}`,
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          subscription
        })
      }
    );

    if (!res.ok) {
      const detail = await res.text();
      console.error('Supabase push subscription error:', res.status, detail);

      return {
        statusCode: 500,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({error: 'Не удалось сохранить подписку'})
      };
    }

    return {
      statusCode: 200,
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ok: true})
    };

  } catch (e) {
    console.error(e);

    return {
      statusCode: 500,
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({error: 'Ошибка сервера'})
    };
  }
};
