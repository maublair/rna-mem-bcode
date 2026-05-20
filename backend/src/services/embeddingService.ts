import { createClient } from 'redis';

export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379',
});

redisClient.on('error', (err: any) => console.error('Redis Client Error', err));

export async function getEmbedding(text: string): Promise<number[]> {
  const cacheKey = `embed:${Buffer.from(text).toString('base64').substring(0, 100)}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for embeddings');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: text,
      model: 'text-embedding-3-small',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API Error: ${error}`);
  }

  const result = await response.json();
  const embedding = result.data[0].embedding;

  await redisClient.setEx(cacheKey, 86400, JSON.stringify(embedding));
  return embedding;
}

export default { getEmbedding };
