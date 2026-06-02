import neo4j from 'neo4j-driver';

const uri = process.env.NEO4J_URI || 'bolt://rna-neo4j:7687';
const user = process.env.NEO4J_USER || 'neo4j';
const password = process.env.NEO4J_PASSWORD;
const authMode = (process.env.NEO4J_AUTH || '').toLowerCase();

const driver =
  authMode === 'none' || !password
    ? neo4j.driver(uri)
    : neo4j.driver(uri, neo4j.auth.basic(user, password));

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

export const runQuery = async (cypher: string, params?: any, timeoutMs = 5000) => {
  const session = driver.session();
  try {
    const result = await withTimeout(session.run(cypher, params), timeoutMs, 'neo4j query');
    return result;
  } finally {
    await session.close();
  }
};

export async function verifyNeo4jConnectivity() {
  return driver.verifyConnectivity();
}

export default {
  driver,
  runQuery,
  verifyNeo4jConnectivity,
};
