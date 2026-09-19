exports.handler = async () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      },
      body: JSON.stringify({
        error: 'VAPID public key is missing'
      })
    };
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify({
      publicKey
    })
  };
};
