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

      // Vercel-এর অরিজিনাল রিডাইরেক্ট রুট
      const originRoute = `\({protocol}://\){host}/r/${shortId}`;
      const cleanHost = host.replace(/https?:\/\//, '');

      // Google Trusted Dynamic Proxy Format (গুগলের সিকিউরিটি ফিল্টার বাইপাস লিংক)
      const googleStyleUrl = `https://www.google.com/amp/s/\({cleanHost}/r/\){shortId}`;

      results.push({
        originalUrl: cleanUrl,
        shortId,
        shortUrl: googleStyleUrl
      });
    }

    await pipeline.exec();

    return res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });

  } catch (error) {
    console.error('Shorten API Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
