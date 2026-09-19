exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Method not allowed'
      })
    };
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !secretKey) {
      throw new Error('Supabase environment variables are missing');
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/bookings?select=*&order=id.desc`,
      {
        method: 'GET',
        headers: {
          'apikey': secretKey,
          'Authorization': `Bearer ${secretKey}`
        }
      }
    );

    if (!response.ok) {
      const detail = await response.text();

      console.error(
        'Supabase bookings error:',
        response.status,
        detail
      );

      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Не удалось получить заявки'
        })
      };
    }

    const bookings = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      },
      body: JSON.stringify({
        bookings
      })
    };

  } catch (error) {

    console.error('Get bookings error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Ошибка сервера'
      })
    };
  }
};
