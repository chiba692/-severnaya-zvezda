exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({error: 'Method not allowed'})
    };
  }

  try {
    const { owner_name, phone, pet, booking_date, booking_time, comment } =
      JSON.parse(event.body || '{}');

    if (!owner_name || !phone || !pet || !booking_date || !booking_time) {
      return {
        statusCode: 400,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({error: 'Заполните обязательные поля'})
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !secretKey) {
      throw new Error('Supabase environment variables are missing');
    }

    const res = await fetch(`${supabaseUrl}/rest/v1/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': secretKey,
        'Authorization': `Bearer ${secretKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        owner_name,
        phone,
        pet,
        booking_date,
        booking_time,
        comment: comment || null
      })
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error('Supabase error:', res.status, detail);
      return {
        statusCode: 500,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({error: 'Не удалось сохранить заявку'})
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
