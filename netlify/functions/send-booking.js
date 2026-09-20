const webpush = require('web-push');

const CLINIC_TIMEZONE = 'Europe/Moscow';

const SCHEDULE = {
  0: null, // воскресенье
  1: {start: '10:00', end: '17:00'}, // понедельник
  2: {start: '10:00', end: '17:00'}, // вторник
  3: {start: '10:00', end: '17:00'}, // среда
  4: {start: '10:00', end: '17:00'}, // четверг
  5: {start: '10:00', end: '17:00'}, // пятница
  6: {start: '10:00', end: '16:00'}  // суббота
};

function getMoscowNow() {
  return new Date(
    new Date().toLocaleString('en-US', {
      timeZone: CLINIC_TIMEZONE
    })
  );
}

function isValidDate(dateString) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
}

function isValidTime(timeString) {
  return /^\d{2}:\d{2}$/.test(timeString);
}

function parseMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getDayOfWeek(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);

  const date = new Date(year, month - 1, day);

  return date.getDay();
}

function isFirstSaturday(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);

  const date = new Date(year, month - 1, day);

  if (date.getDay() !== 6) {
    return false;
  }

  return day <= 7;
}

function validateBookingTime(bookingDate, bookingTime, bookingType) {
  const dayOfWeek = getDayOfWeek(bookingDate);
  const schedule = SCHEDULE[dayOfWeek];

  if (!schedule) {
    return {
      valid: false,
      error: 'В этот день клиника не работает'
    };
  }

  const time = parseMinutes(bookingTime);
  const start = parseMinutes(schedule.start);
  const end = parseMinutes(schedule.end);

  if (time < start || time >= end) {
    return {
      valid: false,
      error: 'Выбранное время находится вне рабочего графика'
    };
  }

  // Только интервалы по 20 минут от начала рабочего дня.
  if ((time - start) % 20 !== 0) {
    return {
      valid: false,
      error: 'Запись возможна только с интервалом 20 минут'
    };
  }

  // Травматолог работает только в первую субботу месяца.
  if (bookingType === 'traumatologist') {
    if (!isFirstSaturday(bookingDate)) {
      return {
        valid: false,
        error: 'Травматолог принимает только в первую субботу месяца'
      };
    }
  }

  return {
    valid: true
  };
}

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
    const {
      owner_name,
      phone,
      pet,
      booking_date,
      booking_time,
      comment,
      booking_type = 'regular'
    } = JSON.parse(event.body || '{}');

    // -------------------------
    // 1. Проверяем обязательные поля
    // -------------------------

    if (
      !owner_name ||
      !phone ||
      !pet ||
      !booking_date ||
      !booking_time
    ) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          error: 'Заполните обязательные поля'
        })
      };
    }

    // Разрешаем только известные типы.
    if (
      booking_type !== 'regular' &&
      booking_type !== 'traumatologist'
    ) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          error: 'Некорректный тип записи'
        })
      };
    }

    // -------------------------
    // 2. Проверяем формат даты/времени
    // -------------------------

    if (!isValidDate(booking_date)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          error: 'Некорректная дата'
        })
      };
    }

    if (!isValidTime(booking_time)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          error: 'Некорректное время'
        })
      };
    }

    // -------------------------
    // 3. Проверяем, что дата существует
    // -------------------------

    const [year, month, day] = booking_date
      .split('-')
      .map(Number);

    const checkDate = new Date(
      year,
      month - 1,
      day
    );

    if (
      checkDate.getFullYear() !== year ||
      checkDate.getMonth() !== month - 1 ||
      checkDate.getDate() !== day
    ) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          error: 'Такой даты не существует'
        })
      };
    }

    // -------------------------
    // 4. Запрещаем прошлые даты
    // -------------------------

    const now = getMoscowNow();

    const today = formatDate(now);

    if (booking_date < today) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          error: 'Нельзя записаться на прошедшую дату'
        })
      };
    }

    // Если запись на сегодня —
    // дополнительно запрещаем прошедшее время.
    if (booking_date === today) {
      const currentMinutes =
        now.getHours() * 60 + now.getMinutes();

      const requestedMinutes =
        parseMinutes(booking_time);

      if (requestedMinutes <= currentMinutes) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: JSON.stringify({
            error: 'Это время уже прошло'
          })
        };
      }
    }

    // -------------------------
    // 5. Проверяем рабочий график
    // -------------------------

    const validation = validateBookingTime(
      booking_date,
      booking_time,
      booking_type
    );

    if (!validation.valid) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          error: validation.error
        })
      };
    }

    // -------------------------
    // 6. Переменные окружения
    // -------------------------

    const supabaseUrl =
      process.env.SUPABASE_URL;

    const secretKey =
      process.env.SUPABASE_SECRET_KEY;

    const vapidPublicKey =
      process.env.VAPID_PUBLIC_KEY;

    const vapidPrivateKey =
      process.env.VAPID_PRIVATE_KEY;

    if (
      !supabaseUrl ||
      !secretKey ||
      !vapidPublicKey ||
      !vapidPrivateKey
    ) {
      throw new Error(
        'Required environment variables are missing'
      );
    }

    const headers = {
      'Content-Type': 'application/json',
      'apikey': secretKey,
      'Authorization': `Bearer ${secretKey}`
    };

    // -------------------------
    // 7. Проверяем занятость
    // -------------------------

    const checkRes = await fetch(
      `${supabaseUrl}/rest/v1/bookings` +
      `?booking_date=eq.${encodeURIComponent(booking_date)}` +
      `&booking_time=eq.${encodeURIComponent(booking_time)}` +
      `&booking_type=eq.${encodeURIComponent(booking_type)}` +
      `&select=id`,
      {
        method: 'GET',
        headers
      }
    );

    if (!checkRes.ok) {
      console.error(
        'Supabase availability check error:',
        await checkRes.text()
      );

      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          error: 'Не удалось проверить свободное время'
        })
      };
    }

    const existingBookings =
      await checkRes.json();

    if (existingBookings.length > 0) {
      return {
        statusCode: 409,
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          error: 'Это время уже занято'
        })
      };
    }

    // -------------------------
    // 8. Сохраняем заявку
    // -------------------------

    const bookingRes = await fetch(
      `${supabaseUrl}/rest/v1/bookings`,
      {
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
          comment: comment || null,
          booking_type
        })
      }
    );

    // Уникальный индекс защищает от
    // одновременной записи двух клиентов.
    if (!bookingRes.ok) {
      const detail =
        await bookingRes.text();

      console.error(
        'Supabase booking error:',
        bookingRes.status,
        detail
      );

      if (bookingRes.status === 409) {
        return {
          statusCode: 409,
          headers: {
            'Content-Type':
              'application/json; charset=utf-8'
          },
          body: JSON.stringify({
            error: 'Это время уже занято'
          })
        };
      }

      return {
        statusCode: 500,
        headers: {
          'Content-Type':
            'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          error: 'Не удалось сохранить заявку'
        })
      };
    }

    // -------------------------
    // 9. Получаем Push-подписки
    // -------------------------

    const subscriptionsRes =
      await fetch(
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
        headers: {
          'Content-Type':
            'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          ok: true,
          push: false
        })
      };
    }

    const subscriptions =
      await subscriptionsRes.json();

    // -------------------------
    // 10. Настраиваем VAPID
    // -------------------------

    webpush.setVapidDetails(
      'https://sevzdezd.netlify.app',
      vapidPublicKey,
      vapidPrivateKey
    );

    // -------------------------
    // 11. Формируем уведомление
    // -------------------------

    const bookingTypeText =
      booking_type === 'traumatologist'
        ? 'Травматолог'
        : 'Обычная запись';

    const payload = JSON.stringify({
      title: '🐾 Новая заявка — Северная звезда',
      body:
        `${owner_name}: ${pet}, ` +
        `${booking_date} в ${booking_time} ` +
        `(${bookingTypeText})`,
      url: '/'
    });

    // -------------------------
    // 12. Отправляем Push
    // -------------------------

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

        console.log(
          'Push sent successfully'
        );

      } catch (pushError) {
        console.error(
          'Push error:',
          pushError.statusCode,
          pushError.body ||
            pushError.message
        );

        if (
          pushError.statusCode === 404 ||
          pushError.statusCode === 410
        ) {
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

    // -------------------------
    // 13. Успешный ответ
    // -------------------------

    return {
      statusCode: 200,
      headers: {
        'Content-Type':
          'application/json; charset=utf-8'
      },
      body: JSON.stringify({
        ok: true,
        push: true
      })
    };

  } catch (e) {
    console.error(
      'Function error:',
      e
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
