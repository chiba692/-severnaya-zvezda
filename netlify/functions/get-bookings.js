const crypto = require('crypto');

function verifySession(event) {
  const cookies = event.headers.cookie || event.headers.Cookie || '';

  const match = cookies.match(
    /(?:^|;\s*)admin_session=([^;]+)/
  );

  if (!match) {
    return false;
  }

  const token = match[1];

  const parts = token.split('.');

  if (parts.length !== 2) {
    return false;
  }

  const encodedPayload = parts[0];
  const receivedSignature = parts[1];

  const sessionSecret =
    process.env.ADMIN_SESSION_SECRET;

  if (!sessionSecret) {
    console.error(
      'ADMIN_SESSION_SECRET is missing'
    );

    return false;
  }

  const expectedSignature = crypto
    .createHmac(
      'sha256',
      sessionSecret
    )
    .update(encodedPayload)
    .digest('base64url');

  if (receivedSignature.length !== expectedSignature.length) {
    return false;
  }

  if (
    !crypto.timingSafeEqual(
      Buffer.from(receivedSignature),
      Buffer.from(expectedSignature)
    )
  ) {
    return false;
  }

  try {

    const payload = JSON.parse(
      Buffer.from(
        encodedPayload,
        'base64url'
      ).toString('utf8')
    );

    if (
      payload.role !== 'admin'
    ) {
      return false;
    }

    if (
      !payload.exp ||
      Date.now() > payload.exp
    ) {
      return false;
    }

    return true;

  } catch (error) {

    console.error(
      'Session payload error:',
      error
    );

    return false;
  }
}


exports.handler = async (event) => {

  if (event.httpMethod !== 'GET') {

    return {
      statusCode: 405,

      headers: {
        'Content-Type':
          'application/json; charset=utf-8'
      },

      body: JSON.stringify({
        error: 'Method not allowed'
      })
    };

  }


  /* ПРОВЕРКА АВТОРИЗАЦИИ */

  if (!verifySession(event)) {

    return {
      statusCode: 401,

      headers: {
        'Content-Type':
          'application/json; charset=utf-8',
        'Cache-Control':
          'no-store'
      },

      body: JSON.stringify({
        error: 'Требуется авторизация'
      })
    };

  }


  try {

    const supabaseUrl =
      process.env.SUPABASE_URL;

    const secretKey =
      process.env.SUPABASE_SECRET_KEY;


    if (
      !supabaseUrl ||
      !secretKey
    ) {

      throw new Error(
        'Supabase environment variables are missing'
      );

    }


    const response = await fetch(
      `${supabaseUrl}/rest/v1/bookings?select=*&order=id.desc`,
      {
        method: 'GET',

        headers: {
          'apikey': secretKey,
          'Authorization':
            `Bearer ${secretKey}`
        }
      }
    );


    if (!response.ok) {

      const detail =
        await response.text();

      console.error(
        'Supabase bookings error:',
        response.status,
        detail
      );


      return {
        statusCode: 500,

        headers: {
          'Content-Type':
            'application/json; charset=utf-8'
        },

        body: JSON.stringify({
          error:
            'Не удалось получить заявки'
        })
      };

    }


    const bookings =
      await response.json();


    return {
      statusCode: 200,

      headers: {
        'Content-Type':
          'application/json; charset=utf-8',

        'Cache-Control':
          'no-store'
      },

      body: JSON.stringify({
        bookings
      })
    };


  } catch (error) {

    console.error(
      'Get bookings error:',
      error
    );


    return {
      statusCode: 500,

      headers: {
        'Content-Type':
          'application/json; charset=utf-8'
      },

      body: JSON.stringify({
        error: 'Ошибка сервера'
      })
    };

  }

};
