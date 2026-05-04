import redisClient from '../utils/redisClient';

interface LocationTrackingData {
  epc: string;
  po_number: string;
  item_number: string;
  location_code: string;
  status: 'in' | 'out';
  timestamp: number;
}

// const COOLDOWN_SECONDS = 60; // 60 seconds cooldown to prevent accidental toggles
const COOLDOWN_SECONDS = process.env.COOLDOWN_TIME ? parseInt(process.env.COOLDOWN_TIME) : 60;
const KEY_PREFIX = 'location_tracking:cooldown:';

function generateKey(po_number: string, item_number: string, location_code: string): string {
  // Cooldown is based on PO + item + location combination
  return `${KEY_PREFIX}${po_number}:${item_number}:${location_code}`;
}

function generateEpcKey(epc: string): string {
  // EPC-specific key for per-bundle cooldown (allows multiple bundles of same item)
  return `${KEY_PREFIX}epc:${epc}`;
}

async function canProcessScan(
  po_number: string,
  item_number: string,
  location_code: string,
  epc?: string
): Promise<{ canProcess: boolean; lastStatus?: 'in' | 'out'; timeRemaining?: number }> {
  try {
    if (!redisClient.isReady()) {
      console.log('⚠️  Redis not available - allowing scan processing');
      return { canProcess: true };
    }

    // Use EPC-specific key if provided (for multiple bundles support)
    // Otherwise fall back to PO+item+location key
    const key = epc ? generateEpcKey(epc) : generateKey(po_number, item_number, location_code);
    console.log(`🔍 [Redis] Checking cooldown for key: ${key}`);
    const data = await redisClient.get(key);

    if (!data) {
      console.log(`✅ [Redis] No cooldown found for key: ${key}`);
      return { canProcess: true };
    }

    const trackingData: LocationTrackingData = JSON.parse(data);
    const now = Date.now();
    const timeDiff = now - trackingData.timestamp;
    const timeRemaining = Math.max(0, COOLDOWN_SECONDS * 1000 - timeDiff);

    if (timeDiff < COOLDOWN_SECONDS * 1000) {
      console.log(`⏱️ [Redis] Cooldown active for key: ${key}, remaining: ${Math.ceil(timeRemaining / 1000)}s`);
      return {
        canProcess: false,
        lastStatus: trackingData.status,
        timeRemaining: Math.ceil(timeRemaining / 1000)
      };
    }

    console.log(`✅ [Redis] Cooldown expired for key: ${key}`);
    return {
      canProcess: true,
      lastStatus: trackingData.status
    };
  } catch (error) {
    console.error('Error checking scan cooldown:', error);
    return { canProcess: true };
  }
}

async function recordScan(
  epc: string,
  po_number: string,
  item_number: string,
  location_code: string,
  status: 'in' | 'out'
): Promise<void> {
  try {
    if (!redisClient.isReady()) {
      console.log('⚠️  Redis not available - skipping scan recording');
      return;
    }

    // Use EPC-specific key to allow multiple bundles of same item to be scanned independently
    const key = generateEpcKey(epc);
    const trackingData: LocationTrackingData = {
      epc,
      po_number,
      item_number,
      location_code,
      status,
      timestamp: Date.now()
    };

    // Set TTL to 60 seconds (cooldown period)
    await redisClient.set(key, JSON.stringify(trackingData), COOLDOWN_SECONDS);
    console.log(`📝 [Redis] Recorded scan - EPC: ${epc}, PO: ${po_number}, Item: ${item_number}, Location: ${location_code}, Status: ${status}`);
  } catch (error) {
    console.error('Error recording scan in Redis:', error);
  }
}

async function getLastStatus(
  epc: string
): Promise<'in' | 'out' | null> {
  try {
    if (!redisClient.isReady()) {
      console.log('⚠️  Redis not available - returning null for last status');
      return null;
    }

    // For backward compatibility, search by EPC pattern
    const pattern = `${KEY_PREFIX}*`;
    const keys = await redisClient.keys(pattern);
    
    for (const key of keys) {
      const data = await redisClient.get(key);
      if (data) {
        const trackingData: LocationTrackingData = JSON.parse(data);
        if (trackingData.epc === epc) {
          return trackingData.status;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting last status from Redis:', error);
    return null;
  }
}

async function getLastStatusForCombination(
  po_number: string,
  item_number: string,
  location_code: string
): Promise<'in' | 'out' | null> {
  try {
    if (!redisClient.isReady()) {
      console.log('⚠️  Redis not available - returning null for last status');
      return null;
    }

    const key = generateKey(po_number, item_number, location_code);
    const data = await redisClient.get(key);

    if (!data) {
      return null;
    }

    const trackingData: LocationTrackingData = JSON.parse(data);
    return trackingData.status;
  } catch (error) {
    console.error('Error getting last status from Redis:', error);
    return null;
  }
}

async function clearTrackingData(
  po_number: string,
  item_number: string,
  location_code: string
): Promise<void> {
  try {
    if (!redisClient.isReady()) {
      console.log('⚠️  Redis not available - skipping clear operation');
      return;
    }

    const key = generateKey(po_number, item_number, location_code);
    await redisClient.del(key);
    console.log(`🗑️ Redis: Cleared tracking data for PO: ${po_number}, Item: ${item_number}, Location: ${location_code}`);
  } catch (error) {
    console.error('Error clearing tracking data from Redis:', error);
  }
}

async function getCooldownStatus(
  po_number: string,
  item_number: string,
  location_code: string
): Promise<{ isInCooldown: boolean; timeRemaining: number; lastStatus?: 'in' | 'out' }> {
  try {
    if (!redisClient.isReady()) {
      console.log('⚠️  Redis not available - returning no cooldown status');
      return { isInCooldown: false, timeRemaining: 0 };
    }

    const key = generateKey(po_number, item_number, location_code);
    const data = await redisClient.get(key);

    if (!data) {
      return { isInCooldown: false, timeRemaining: 0 };
    }

    const trackingData: LocationTrackingData = JSON.parse(data);
    const now = Date.now();
    const timeDiff = now - trackingData.timestamp;
    const timeRemaining = Math.max(0, COOLDOWN_SECONDS * 1000 - timeDiff);

    return {
      isInCooldown: timeDiff < COOLDOWN_SECONDS * 1000,
      timeRemaining: Math.ceil(timeRemaining / 1000),
      lastStatus: trackingData.status
    };
  } catch (error) {
    console.error('Error getting cooldown status from Redis:', error);
    return { isInCooldown: false, timeRemaining: 0 };
  }
}

async function getAllActiveTracking(): Promise<LocationTrackingData[]> {
  try {
    if (!redisClient.isReady()) {
      console.log('⚠️  Redis not available - returning empty tracking data');
      return [];
    }

    const pattern = `${KEY_PREFIX}*`;
    const keys = await redisClient.keys(pattern);
    const results: LocationTrackingData[] = [];

    for (const key of keys) {
      const data = await redisClient.get(key);
      if (data) {
        results.push(JSON.parse(data));
      }
    }

    return results;
  } catch (error) {
    console.error('Error getting all active tracking from Redis:', error);
    return [];
  }
}

export const locationTrackingRedis = {
  canProcessScan,
  recordScan,
  getLastStatus,
  getLastStatusForCombination,
  clearTrackingData,
  getCooldownStatus,
  getAllActiveTracking,
};

export default locationTrackingRedis;
