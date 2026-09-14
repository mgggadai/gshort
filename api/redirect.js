import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send('Missing Link ID');
  }

  try {
    const originalUrl = await redis.get(id);

    if (originalUrl) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.redirect(302, originalUrl);
    } else {
      return res.status(404).send('404 - Short Link Not Found');
    }
  } catch (error) {
    console.error('Redirect Error:', error);
    return res.status(500).send('Internal Server Error');
  }
}
