const webpush = require('web-push');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({error: 'Method not allowed'})
    };
  }

  try {
    const {
      owner_name,
      phone,
      pet,
      booking_date,
      booking_time,
      comment
    } = JSON.parse(event.body || '{}');

    if (!owner_name || !phone || !pet || !booking_date || !booking_time) {
      return {
        statusCode: 400,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({error: 'Заполните обязательные поля'})
      };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!supabaseUrl || !secretKey || !vapidPublicKey || !vapidPrivateKey) {
      throw new Error('Required environment variables are missing');
    }

    const headers = {
      'Content-Type': 'application/json',
      'apikey': secretKey,
      'Authorization': `Bearer ${secretKey}`
    };

    // 1. Сохраняем заявку
    const bookingRes = await fetch(`${supabaseUrl}/rest/v1/bookings`, {
      method: 'POST',
      headers: {
        ...headers,
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

    if (!bookingRes.ok) {
      const detail = await bookingRes.text();
      console.error('Supabase booking error:', bookingRes.status, detail);

      return {
        statusCode: 500,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({error: 'Не удалось сохранить заявку'})
      };
    }

    // 2. Получаем сохранённые Push-подписки
    const subscriptionsRes = await fetch(
      `${supabaseUrl}/rest/v1/push_subscriptions?select=id,endpoint,subscription`,
      {headers}
    );

    if (!subscriptionsRes.ok) {
      console.error(
        'Could not load push subscriptions:',
        await subscriptionsRes.text()
      );

      return {
        statusCode: 200,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ok: true, push: false})
      };
    }

    const subscriptions = await subscriptionsRes.json();

    // 3. Настраиваем VAPID
    webpush.setVapidDetails(
      'https://inquisitive-frangipane-3695a1.netlify.app',
      vapidPublicKey,
      vapidPrivateKey
    );

    // 4. Формируем уведомление
    const payload = JSON.stringify({
      title: '🐾 Новая заявка',
      body: `${owner_name}: ${pet}, ${booking_date} в ${booking_time}`,
      url: '/'
    });

    // 5. Отправляем уведомление всем подписанным устройствам
    for (const row of subscriptions) {
      try {
        await webpush.sendNotification(
          row.subscription,
          payload,
          {
            TTL: 300,
            urgency: 'high'
          }
        );

        console.log('Push sent successfully');

      } catch (pushError) {
        console.error(
          'Push error:',
          pushError.statusCode,
          pushError.body || pushError.message
        );

        // Удаляем недействительную подписку
        if (pushError.statusCode === 404 || pushError.statusCode === 410) {
          await fetch(
            `${supabaseUrl}/rest/v1/push_subscriptions?id=eq.${encodeURIComponent(row.id)}`,
            {
              method: 'DELETE',
              headers
            }
          ).catch(() => {});
        }
      }
    }

    return {
      statusCode: 200,
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        ok: true,
        push: true
      })
    };

  } catch (e) {
    console.error('Function error:', e);

    return {
      statusCode: 500,
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        error: 'Ошибка сервера'
      })
    };
  }
};
