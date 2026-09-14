import { Redis } from '@upstash/redis';

// Vercel Environment Variables (UPSTASH_REDIS_REST_URL & TOKEN) থেকে অটোকানেক্ট হবে
const redis = Redis.fromEnv();

export default async function handler(req, res) {
  // Query Parameter থেকে Short ID নেওয়া
  const { id } = req.query;

  if (!id) {
    return res.status(400).send('Missing Link Identifier');
  }

  try {
    // Redis Database থেকে ID দিয়ে আসল URL খোঁজা
    const originalUrl = await redis.get(id);

    if (originalUrl) {
      // ব্রাউজার ক্যাশিং বন্ধ রাখা যাতে প্রতিটা ক্লিক গণনা করা যায়
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      // HTTP 302 Found রিডাইরেক্ট (ব্রাউজারকে মূল সাইটে পাঠিয়ে দেওয়া)
      return res.redirect(302, originalUrl);
    } else {
      // লিঙ্ক খুঁজে না পাওয়া গেলে ৪০৪ রেসপন্স
      return res.status(404).send(`
