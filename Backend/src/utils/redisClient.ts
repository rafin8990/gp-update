import { createClient, RedisClientType } from 'redis';
import config from '../config';
let client: RedisClientType | null = null;
let isConnected = false;

async function connect(): Promise<void> {
  if (isConnected && client) {
    return;
  }

  try {
    client = createClient({
      url: config.redis_url,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: retries => (retries > 2 ? false : 500),
      },
    });

    client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      isConnected = false;
    });

    client.on('connect', () => {
      console.log('🔌 Redis socket connected');
    });

    client.on('ready', () => {
      console.log('✅ Redis is ready');
      isConnected = true;
    });

    client.on('disconnect', () => {
      console.log('❌ Disconnected from Redis');
      isConnected = false;
    });

    await Promise.race([
      client.connect(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
      ),
    ]);

    try {
      await client.ping();
      isConnected = true;
    } catch (err) {
      isConnected = false;
      console.error('⚠️  Redis ping failed after connect:', err);
    }
  } catch (error) {
    isConnected = false;
    if (client) {
      try {
        await client.disconnect();
      } catch {
        // ignore cleanup errors
      }
      client = null;
    }
    console.error('Failed to connect to Redis:', error);
    console.log('⚠️  Continuing without Redis - some features may be limited');
  }
}

async function disconnect(): Promise<void> {
  if (client && isConnected) {
    await client.disconnect();
    isConnected = false;
  }
}

async function set(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (!client || !isConnected) {
    console.log('⚠️  Redis not available - skipping set operation');
    return;
  }
  if (ttlSeconds) {
    await client.setEx(key, ttlSeconds, value);
  } else {
    await client.set(key, value);
  }
}

async function get(key: string): Promise<string | null> {
  if (!client || !isConnected) {
    console.log('⚠️  Redis not available - returning null');
    return null;
  }
  return await client.get(key);
}

async function del(key: string): Promise<number> {
  if (!client || !isConnected) {
    console.log('⚠️  Redis not available - skipping delete operation');
    return 0;
  }
  return await client.del(key);
}

async function exists(key: string): Promise<boolean> {
  if (!client || !isConnected) {
    console.log('⚠️  Redis not available - returning false');
    return false;
  }
  const result = await client.exists(key);
  return result === 1;
}

async function ttl(key: string): Promise<number> {
  if (!client || !isConnected) {
    console.log('⚠️  Redis not available - returning -1');
    return -1;
  }
  return await client.ttl(key);
}

async function keys(pattern: string): Promise<string[]> {
  if (!client || !isConnected) {
    console.log('⚠️  Redis not available - returning empty array');
    return [];
  }
  return await client.keys(pattern);
}

async function flushAll(): Promise<void> {
  if (!client || !isConnected) {
    console.log('⚠️  Redis not available - skipping flush operation');
    return;
  }
  await client.flushAll();
}

function isReady(): boolean {
  return isConnected && client !== null;
}

const redisClient = {
  connect,
  disconnect,
  set,
  get,
  del,
  exists,
  ttl,
  keys,
  flushAll,
  isReady,
};

export default redisClient;
