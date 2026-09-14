import { Redis } from '@upstash/redis';
import { customAlphabet } from 'nanoid';

const redis = Redis.fromEnv();
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 7);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'Valid URL array is required.' });
    }

    const host = req.headers.host || 'your-domain.vercel.app';
    const protocol = req.headers['x-forwarded-proto'] || 'https';

    const results = [];
    const pipeline = redis.pipeline();

    for (const originalUrl of urls) {
      const cleanUrl = originalUrl.trim();
      if (!cleanUrl) continue;

      const shortId = nanoid();
      pipeline.set(shortId, cleanUrl);

      // কোনো গুগল প্রেফিক্স ছাড়াই সরাসরি আপনার লিংক জেনারেট হবে
      const directShortUrl = `\({protocol}://\){host}/r/${shortId}`;

      results.push({
        originalUrl: cleanUrl,
        shortId,
        shortUrl: directShortUrl
      });
    }

    await pipeline.exec();
    return res.status(200).json({ success: true, count: results.length, data: results });

  } catch (error) {
    console.error('Shorten API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
