const crypto = require('crypto');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        error: 'Method not allowed'
      })
    };
  }

  try {
    const { login, password } = JSON.parse(event.body || '{}');

    const adminLogin = process.env.ADMIN_LOGIN;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const sessionSecret = process.env.ADMIN_SESSION_SECRET;

    if (!adminLogin || !adminPassword || !sessionSecret) {
      console.error('Admin environment variables are missing');

      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          error: 'Сервер авторизации не настроен'
        })
      };
    }

    if (login !== adminLogin || password !== adminPassword) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          error: 'Неверный логин или пароль'
        })
      };
    }

    const payload = JSON.stringify({
      role: 'admin',
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7
    });

    const encodedPayload = Buffer
      .from(payload)
      .toString('base64url');

    const signature = crypto
      .createHmac('sha256', sessionSecret)
      .update(encodedPayload)
      .digest('base64url');

    const token = `${encodedPayload}.${signature}`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': `admin_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`
      },
      body: JSON.stringify({
        ok: true
      })
    };

  } catch (error) {
    console.error('Admin login error:', error);

    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        error: 'Некорректный запрос'
      })
    };
  }
};
