import { Redis } from '@upstash/redis';
import { customAlphabet } from 'nanoid';

const redis = Redis.fromEnv();

// Base62 ধরনের ৭ অক্ষরের আলফানিউমেরিক আইডি
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 7);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { urls } = req.body; // Expects array of strings: ["http://...", "http://..."]

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'At least one valid URL is required.' });
    }

    if (urls.length > 50) {
      return res.status(400).json({ error: 'Bulk limit exceeded! Max 50 URLs allowed per request.' });
    }

    const host = req.headers.host || 'your-domain.vercel.app';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    
    const results = [];
    const pipeline = redis.pipeline(); // Upstash pipeline for fast bulk insertion

    for (const originalUrl of urls) {
      const cleanUrl = originalUrl.trim();
      if (!cleanUrl) continue;

      const shortId = nanoid();
      pipeline.set(shortId, cleanUrl);

      // Construct Google Redirect Wrapped Link
      const shortRoute = `\({protocol}://\){host}/r/${shortId}`;
      const googleStyleUrl = `https://www.google.com/url?q=${encodeURIComponent(shortRoute)}`;

      results.push({
        originalUrl: cleanUrl,
        shortId,
        shortUrl: googleStyleUrl
      });
    }

    // Execute pipeline to Redis in a single HTTP request
    await pipeline.exec();

    return res.status(200).json({ success: true, count: results.length, data: results });

  } catch (error) {
    console.error('Shorten Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
