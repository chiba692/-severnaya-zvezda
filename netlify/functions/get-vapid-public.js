exports.handler = async () => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify({
      VAPID_PUBLIC_KEY_EXISTS: typeof process.env.VAPID_PUBLIC_KEY,
VAPID_PUBLIC_KEY_LENGTH: process.env.VAPID_PUBLIC_KEY
  ? process.env.VAPID_PUBLIC_KEY.length
  : 0,
      VAPID_PRIVATE_KEY: !!process.env.VAPID_PRIVATE_KEY,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SECRET_KEY: !!process.env.SUPABASE_SECRET_KEY,
      TEST_PUSH: !!process.env.TEST_PUSH
    })
  };
};
