const CLINIC_TIMEZONE = 'Europe/Moscow';

const SCHEDULE = {
  0: null,
  1: { start: '10:00', end: '17:00' },
  2: { start: '10:00', end: '17:00' },
  3: { start: '10:00', end: '17:00' },
  4: { start: '10:00', end: '17:00' },
  5: { start: '10:00', end: '17:00' },
  6: { start: '10:00', end: '16:00' }
};

function getMoscowNow() {
  return new Date(
    new Date().toLocaleString('en-US', {
      timeZone: CLINIC_TIMEZONE
    })
  );
}

function getTodayString() {
  const now = getMoscowNow();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-');
}

function parseMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return (
    String(hours).padStart(2, '0') +
    ':' +
    String(mins).padStart(2, '0')
  );
}

function getDayOfWeek(dateString) {
  const [year, month, day] =
    dateString.split('-').map(Number);

  return new Date(
    year,
    month - 1,
    day
  ).getDay();
}

function isFirstSaturday(dateString) {
  const [year, month, day] =
    dateString.split('-').map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

  return date.getDay() === 6 && day <= 7;
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

  try {
    const params = event.queryStringParameters || {};

    const date = params.date;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type':
            'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          error: 'Некорректная дата'
        })
      };
    }

    const today = getTodayString();

    if (date < today) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type':
            'application/json; charset=utf-8',
          'Cache-Control': 'no-store'
        },
        body: JSON.stringify({
          date,
          slots: [],
          type: 'regular'
        })
      };
    }

    const dayOfWeek = getDayOfWeek(date);
    const schedule = SCHEDULE[dayOfWeek];

    if (!schedule) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type':
            'application/json; charset=utf-8',
          'Cache-Control': 'no-store'
        },
        body: JSON.stringify({
          date,
          slots: [],
          type: 'regular'
        })
      };
    }

    const bookingType =
      isFirstSaturday(date)
        ? 'traumatologist'
        : 'regular';

    const supabaseUrl =
      process.env.SUPABASE_URL;

    const secretKey =
      process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !secretKey) {
      throw new Error(
        'Supabase environment variables are missing'
      );
    }

    const headers = {
      'apikey': secretKey,
      'Authorization': `Bearer ${secretKey}`
    };

    const bookingsResponse =
      await fetch(
        `${supabaseUrl}/rest/v1/bookings` +
        `?booking_date=eq.${encodeURIComponent(date)}` +
        `&booking_type=eq.${encodeURIComponent(bookingType)}` +
        `&select=booking_time`,
        {
          method: 'GET',
          headers
        }
      );

    if (!bookingsResponse.ok) {
      console.error(
        'Bookings query error:',
        await bookingsResponse.text()
      );

      return {
        statusCode: 500,
        headers: {
          'Content-Type':
            'application/json; charset=utf-8'
        },
        body: JSON.stringify({
          error: 'Не удалось получить расписание'
        })
      };
    }

    const bookings =
      await bookingsResponse.json();

    const occupied = new Set(
      bookings.map(function (booking) {
        return String(booking.booking_time)
          .slice(0, 5);
      })
    );

    const start = parseMinutes(schedule.start);
    const end = parseMinutes(schedule.end);

    const slots = [];

    for (
      let minutes = start;
      minutes < end;
      minutes += 20
    ) {
      const time = formatTime(minutes);

      if (!occupied.has(time)) {
        slots.push(time);
      }
    }

    // Для сегодняшнего дня скрываем
    // уже прошедшие слоты.
    if (date === today) {
      const now = getMoscowNow();

      const currentMinutes =
        now.getHours() * 60 +
        now.getMinutes();

      return {
        statusCode: 200,
        headers: {
          'Content-Type':
            'application/json; charset=utf-8',
          'Cache-Control': 'no-store'
        },
        body: JSON.stringify({
          date,
          type: bookingType,
          slots: slots.filter(function (time) {
            return parseMinutes(time) > currentMinutes;
          })
        })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type':
          'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      },
      body: JSON.stringify({
        date,
        type: bookingType,
        slots
      })
    };

  } catch (error) {
    console.error(
      'Available slots error:',
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
