import { Redis } from '@upstash/redis';

// Environment variables থেকে স্বয়ংক্রিয়ভাবে Redis কানেক্ট হবে
const redis = Redis.fromEnv();

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).send('Missing Link Identifier');
  }

  try {
    // Redis থেকে শর্ট আইডি দিয়ে মূল URL খোঁজা
    const originalUrl = await redis.get(id);

    if (originalUrl) {
      // ক্যাশিং বন্ধ রাখতে হেডার দেওয়া (যাতে প্রতিটি ক্লিকের সঠিক হিসাব পাওয়া যায়)
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      // HTTP 302 Found রিডাইরেক্ট
      return res.redirect(302, originalUrl);
    } else {
      return res.status(404).send(`
