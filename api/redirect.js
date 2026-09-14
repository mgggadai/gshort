import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send('Missing Link Identifier');
  }

  try {
    // Fetch original URL from Upstash Redis
    const originalUrl = await redis.get(id);

    if (originalUrl) {
      // Redirect with 302 Found
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.redirect(302, originalUrl);
    } else {
      return res.status(404).send('
