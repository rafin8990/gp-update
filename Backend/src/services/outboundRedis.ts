import redisClient from '../utils/redisClient';

export interface OutboundRedisData {
  epc: string;
  item_number: string;
  requisition_id: number;
  quantity: number;
  timestamp: number;
}

// Constants
const DUPLICATE_CHECK_TTL = 60; // 60 seconds (1 minute) - prevent same EPC+user_id from being processed multiple times
const LOCATION_TRACKER_COOLDOWN_TTL = 60; // 60 seconds cooldown for location tracker posts
const PREFIX_EPC_USER = 'epc_user_outbound';
const PREFIX_OUTBOUND_SCAN = 'outbound_scan';
const PREFIX_LOCATION_TRACKER_COOLDOWN = 'location_tracker_cooldown';

// Helper functions
const createKey = (prefix: string, epc: string, user_id: string): string => 
  `${prefix}:${epc}:${user_id}`;

const createOutboundScanKey = (epc: string, item_number: string): string => 
  `${PREFIX_OUTBOUND_SCAN}:${epc}:${item_number}`;

const createLocationTrackerCooldownKey = (epc: string, user_id: string, item_number: string): string => 
  `${PREFIX_LOCATION_TRACKER_COOLDOWN}:${epc}:${user_id}:${item_number}`;

const parseJsonData = <T>(data: string | null): T | null => 
  data ? JSON.parse(data) : null;

// Core Redis operations
const checkEpcUserDuplicate = async (epc: string, user_id: string): Promise<boolean> => {
  const key = `epc_user_outbound:${epc}:${user_id}`;
  const existingData = await redisClient.get(key);
  return existingData !== null;
};

const setEpcUserDuplicate = async (epc: string, user_id: string): Promise<void> => {
  const key = `epc_user_outbound:${epc}:${user_id}`;
  const data = {
    epc,
    user_id,
    timestamp: Date.now()
  };
  await redisClient.set(key, JSON.stringify(data), 60); // 60 seconds TTL
};

const storeOutboundScan = async (data: OutboundRedisData, ttlSeconds?: number): Promise<void> => {
  const key = createOutboundScanKey(data.epc, data.item_number);
  await redisClient.set(key, JSON.stringify(data), ttlSeconds);
};

const getOutboundScan = async (epc: string, item_number: string): Promise<OutboundRedisData | null> => {
  const key = createOutboundScanKey(epc, item_number);
  const data = await redisClient.get(key);
  return parseJsonData<OutboundRedisData>(data);
};

const removeOutboundScan = async (epc: string, item_number: string): Promise<void> => {
  const key = createOutboundScanKey(epc, item_number);
  await redisClient.del(key);
};

const getAllOutboundScans = async (): Promise<OutboundRedisData[]> => {
  const pattern = `${PREFIX_OUTBOUND_SCAN}:*`;
  const keys = await redisClient.keys(pattern);
  
  const scans = await Promise.all(
    keys.map(async (key) => {
      const data = await redisClient.get(key);
      return parseJsonData<OutboundRedisData>(data);
    })
  );
  
  return scans.filter((scan): scan is OutboundRedisData => scan !== null);
};

const getOutboundScansByRequisition = async (requisition_id: number): Promise<OutboundRedisData[]> => {
  const allScans = await getAllOutboundScans();
  return allScans.filter(scan => scan.requisition_id === requisition_id);
};

const clearOutboundScansByRequisition = async (requisition_id: number): Promise<void> => {
  const scans = await getOutboundScansByRequisition(requisition_id);
  
  await Promise.all(
    scans.map(scan => 
      removeOutboundScan(scan.epc, scan.item_number)
    )
  );
};

const isReady = (): boolean => redisClient.isReady();

const getTTL = async (epc: string, user_id: string): Promise<number> => {
  const key = `epc_user_outbound:${epc}:${user_id}`;
  return await redisClient.ttl(key);
};

const getKeyInfo = async (epc: string, user_id: string): Promise<{exists: boolean, ttl: number, data: any}> => {
  const key = `epc_user_outbound:${epc}:${user_id}`;
  const data = await redisClient.get(key);
  const ttl = await redisClient.ttl(key);
  return {
    exists: data !== null,
    ttl,
    data: data ? JSON.parse(data) : null
  };
};

const checkConnection = async (): Promise<boolean> => {
  if (!isReady()) {
    console.log('⚠️ Redis not available for outbound operations');
    return false;
  }
  return true;
};

// Location Tracker Cooldown Functions
const checkLocationTrackerCooldown = async (epc: string, user_id: string, item_number: string): Promise<boolean> => {
  const key = createLocationTrackerCooldownKey(epc, user_id, item_number);
  const existingData = await redisClient.get(key);
  return existingData !== null;
};

const setLocationTrackerCooldown = async (epc: string, user_id: string, item_number: string): Promise<void> => {
  const key = createLocationTrackerCooldownKey(epc, user_id, item_number);
  const data = {
    epc,
    user_id,
    item_number,
    timestamp: Date.now()
  };
  await redisClient.set(key, JSON.stringify(data), LOCATION_TRACKER_COOLDOWN_TTL);
};

const getLocationTrackerCooldownStatus = async (epc: string, user_id: string, item_number: string): Promise<{ isInCooldown: boolean; timeRemaining: number }> => {
  const key = createLocationTrackerCooldownKey(epc, user_id, item_number);
  const data = await redisClient.get(key);
  
  if (!data) {
    return { isInCooldown: false, timeRemaining: 0 };
  }
  
  const parsedData = JSON.parse(data);
  const timeDiff = Date.now() - parsedData.timestamp;
  const timeRemaining = Math.max(0, LOCATION_TRACKER_COOLDOWN_TTL * 1000 - timeDiff);
  
  return {
    isInCooldown: timeDiff < LOCATION_TRACKER_COOLDOWN_TTL * 1000,
    timeRemaining: Math.ceil(timeRemaining / 1000)
  };
};

// Export functional API
const outboundRedis = {
  checkEpcUserDuplicate,
  setEpcUserDuplicate,
  storeOutboundScan,
  getOutboundScan,
  removeOutboundScan,
  getOutboundScansByRequisition,
  clearOutboundScansByRequisition,
  isReady,
  getTTL,
  getKeyInfo,
  checkConnection,
  getAllOutboundScans,
  // Location Tracker Cooldown functions
  checkLocationTrackerCooldown,
  setLocationTrackerCooldown,
  getLocationTrackerCooldownStatus
};

export default outboundRedis;
