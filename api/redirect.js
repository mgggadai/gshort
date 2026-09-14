import { Redis } from '@upstash/redis';
import { customAlphabet } from 'nanoid';

// Environment variables থেকে স্বয়ংক্রিয়ভাবে Redis কানেক্ট হবে
const redis = Redis.fromEnv();

// Base62 ধরনের ৭ অক্ষরের ইউনিক আলফানিউমেরিক আইডি জেনারেটর
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 7);

export default async function handler(req, res) {
  // কেবল POST রিকোয়েস্ট অ্যালাউ করা হবে
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'At least one valid URL is required.' });
    }

    // প্রতি রিকোয়েস্টে সর্বোচ্চ ৫০টি লিঙ্ক শর্ট করার লিমিট
    if (urls.length > 50) {
      return res.status(400).json({ error: 'Bulk limit exceeded! Maximum 50 URLs allowed per request.' });
    }

    const host = req.headers.host || 'your-domain.vercel.app';
    const protocol = req.headers['x-forwarded-proto'] || 'https';

    const results = [];
    const pipeline = redis.pipeline(); // দ্রুত ডাটা সেভ করার জন্য Upstash Pipeline

    for (const originalUrl of urls) {
      const cleanUrl = originalUrl.trim();
      if (!cleanUrl) continue;

      const shortId = nanoid();
      
      // Redis-এ key-value হিসেবে সেভ করার জন্য পাইপলাইনে যুক্ত করা
      pipeline.set(shortId, cleanUrl);

      // Vercel রিডাইরেক্ট রুট
      const shortRoute = `\({protocol}://\){host}/r/${shortId}`;
      
      // গুগল শেয়ার ফরম্যাটের URL তৈরি
      const googleStyleUrl = `https://www.google.com/url?q=${encodeURIComponent(shortRoute)}`;

      results.push({
        originalUrl: cleanUrl,
        shortId,
        shortUrl: googleStyleUrl
      });
    }

    // একটি মাত্র HTTP রিকোয়েস্টে Redis-এ সব সেভ করা
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
