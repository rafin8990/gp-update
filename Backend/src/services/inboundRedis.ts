import redisClient from '../utils/redisClient';

export interface DuplicateCheckData {
  epc: string;
  item_number: string;
  po_number: string;
  timestamp: number;
}

export interface InboundRedisData {
  epc: string;
  item_number: string;
  po_number: string;
  quantity: number;
  timestamp: number;
}

// Constants
const DUPLICATE_CHECK_TTL = 60; // 60 seconds (1 minute) - prevent same EPC+item+PO from being processed multiple times
const LOCATION_TRACKER_TTL = 60; // 60 seconds (1 minute) - prevent same EPC+PO+item+location from being processed multiple times
const PREFIX_EPC_ITEM = 'epc_item';
const PREFIX_INBOUND_SCAN = 'inbound_scan';
const PREFIX_LOCATION_TRACKER = 'location_tracker';
const PREFIX_SERIAL_RANGE = 'inbound_serial_range';

// Helper functions
const createKey = (prefix: string, epc: string, item_number: string): string => 
  `${prefix}:${epc}:${item_number}`;

const createLocationTrackerKey = (epc: string, po_number: string, item_number: string, user_id: string): string => 
  `${PREFIX_LOCATION_TRACKER}:${epc}:${po_number}:${item_number}:${user_id}`;

const createDuplicateCheckData = (epc: string, item_number: string, po_number: string): DuplicateCheckData => ({
  epc,
  item_number,
  po_number,
  timestamp: Date.now()
});

const parseJsonData = <T>(data: string | null): T | null => 
  data ? JSON.parse(data) : null;

const filterScansByPO = (scans: InboundRedisData[], po_number: string): InboundRedisData[] =>
  scans.filter(scan => scan.po_number === po_number);

const createSerialRangeKey = (po_number: string, item_number: string): string =>
  `${PREFIX_SERIAL_RANGE}:${po_number}:${item_number}`;

const createItemSerialRangeKey = (item_number: string): string =>
  `${PREFIX_SERIAL_RANGE}:item:${item_number}`;

type SerialRangeRecord = {
  serial_start?: string;
  serial_end?: string;
};

// Core Redis operations
const checkDuplicate = async (epc: string, item_number: string, po_number: string): Promise<boolean> => {
  const key = `${PREFIX_EPC_ITEM}:${epc}:${item_number}:${po_number}`;
  const existingData = await redisClient.get(key);
  return existingData !== null;
};

const setDuplicateCheck = async (epc: string, item_number: string, po_number: string): Promise<void> => {
  const key = `${PREFIX_EPC_ITEM}:${epc}:${item_number}:${po_number}`;
  const data = createDuplicateCheckData(epc, item_number, po_number);
  await redisClient.set(key, JSON.stringify(data), DUPLICATE_CHECK_TTL);
};

const storeInboundScan = async (data: InboundRedisData, ttlSeconds?: number): Promise<void> => {
  const key = createKey(PREFIX_INBOUND_SCAN, data.epc, data.item_number);
  await redisClient.set(key, JSON.stringify(data), ttlSeconds);
};

const getInboundScan = async (epc: string, item_number: string): Promise<InboundRedisData | null> => {
  const key = createKey(PREFIX_INBOUND_SCAN, epc, item_number);
  const data = await redisClient.get(key);
  return parseJsonData<InboundRedisData>(data);
};

const removeInboundScan = async (epc: string, item_number: string): Promise<void> => {
  const key = createKey(PREFIX_INBOUND_SCAN, epc, item_number);
  await redisClient.del(key);
};

const getAllInboundScans = async (): Promise<InboundRedisData[]> => {
  const pattern = `${PREFIX_INBOUND_SCAN}:*`;
  const keys = await redisClient.keys(pattern);
  
  const scans = await Promise.all(
    keys.map(async (key) => {
      const data = await redisClient.get(key);
      return parseJsonData<InboundRedisData>(data);
    })
  );
  
  return scans.filter((scan): scan is InboundRedisData => scan !== null);
};

const getInboundScansByPO = async (po_number: string): Promise<InboundRedisData[]> => {
  const allScans = await getAllInboundScans();
  return filterScansByPO(allScans, po_number);
};

const clearInboundScansByPO = async (po_number: string): Promise<void> => {
  const scans = await getInboundScansByPO(po_number);
  
  await Promise.all(
    scans.map(scan => 
      removeInboundScan(scan.epc, scan.item_number)
    )
  );
};

const isReady = (): boolean => redisClient.isReady();

const getTTL = async (epc: string, item_number: string): Promise<number> => {
  const key = createKey(PREFIX_EPC_ITEM, epc, item_number);
  return await redisClient.ttl(key);
};

const checkConnection = async (): Promise<boolean> => {
  if (!isReady()) {
    console.log('⚠️ Redis not available for inbound operations');
    return false;
  }
  return true;
};

// Location Tracker Redis operations
const checkLocationTrackerDuplicate = async (epc: string, po_number: string, item_number: string, user_id: string): Promise<boolean> => {
  const key = createLocationTrackerKey(epc, po_number, item_number, user_id);
  const existingData = await redisClient.get(key);
  return existingData !== null;
};

const setLocationTrackerDuplicate = async (epc: string, po_number: string, item_number: string, user_id: string): Promise<void> => {
  const key = createLocationTrackerKey(epc, po_number, item_number, user_id);
  const data = {
    epc,
    po_number,
    item_number,
    user_id,
    timestamp: Date.now()
  };
  await redisClient.set(key, JSON.stringify(data), LOCATION_TRACKER_TTL);
};

const getLocationTrackerTTL = async (epc: string, po_number: string, item_number: string, user_id: string): Promise<number> => {
  const key = createLocationTrackerKey(epc, po_number, item_number, user_id);
  return await redisClient.ttl(key);
};

const getSerialRange = async (po_number: string, item_number: string): Promise<SerialRangeRecord | null> => {
  const key = createSerialRangeKey(po_number, item_number);
  const data = await redisClient.get(key);
  return parseJsonData<SerialRangeRecord>(data);
};

const updateSerialRange = async (
  po_number: string,
  item_number: string,
  serial_start?: string,
  serial_end?: string
): Promise<SerialRangeRecord> => {
  const key = createSerialRangeKey(po_number, item_number);
  const existing = (await getSerialRange(po_number, item_number)) ?? {};

  const toBigInt = (value?: string) => {
    if (!value) return undefined;
    try {
      return BigInt(value);
    } catch {
      return undefined;
    }
  };

  const currentStartBig = toBigInt(existing.serial_start);
  const currentEndBig = toBigInt(existing.serial_end);
  const newStartBig = toBigInt(serial_start);
  const newEndBig = toBigInt(serial_end);

  let updatedStart = existing.serial_start;
  const shouldReplaceStart = () => {
    if (!serial_start) return false;
    if (!existing.serial_start) return true;
    if (newStartBig === undefined || currentStartBig === undefined) return true;
    return newStartBig < currentStartBig;
  };
  if (shouldReplaceStart()) {
    updatedStart = serial_start;
  }

  let updatedEnd = existing.serial_end;
  const shouldReplaceEnd = () => {
    if (!serial_end) return false;
    if (!existing.serial_end) return true;
    if (newEndBig === undefined || currentEndBig === undefined) return true;
    return newEndBig > currentEndBig;
  };
  if (shouldReplaceEnd()) {
    updatedEnd = serial_end;
  }

  const payload: SerialRangeRecord = {
    serial_start: updatedStart,
    serial_end: updatedEnd,
  };

  await redisClient.set(key, JSON.stringify(payload));
  return payload;
};

// New function to check if EPC+item combination already exists in inbound JSON
const checkInboundJsonDuplicate = async (epc: string, item_number: string, po_number: string): Promise<boolean> => {
  const key = `inbound_json:${po_number}:${epc}:${item_number}`;
  const existingData = await redisClient.get(key);
  return existingData !== null;
};

// New function to set EPC+item combination as processed in inbound JSON
const setInboundJsonDuplicate = async (epc: string, item_number: string, po_number: string): Promise<void> => {
  const key = `inbound_json:${po_number}:${epc}:${item_number}`;
  const data = {
    epc,
    item_number,
    po_number,
    timestamp: Date.now()
  };
  await redisClient.set(key, JSON.stringify(data), 3600); // 1 hour TTL
};

// Function to clear all inbound JSON duplicate flags (for testing)
const clearInboundJsonDuplicates = async (): Promise<void> => {
  const pattern = `inbound_json:*`;
  const keys = await redisClient.keys(pattern);
  if (keys.length > 0) {
    for (const key of keys) {
      await redisClient.del(key);
    }
  }
};

// New function to check location tracker status with 60-second cooldown logic
const checkLocationTrackerStatus = async (
  epc: string, 
  user_id: string, 
  item_number: string
): Promise<{ shouldCreate: boolean; newStatus: 'in' | 'out' }> => {
  const key = `location_tracker_status:${epc}:${user_id}:${item_number}`;
  const existingData = await redisClient.get(key);
  
  if (!existingData) {
    // No previous record, create with 'in' status
    const data = {
      epc,
      user_id,
      item_number,
      status: 'in',
      timestamp: Date.now()
    };
    await redisClient.set(key, JSON.stringify(data), 60); // 60 seconds TTL
    return { shouldCreate: true, newStatus: 'in' };
  }
  
  const parsedData = JSON.parse(existingData);
  const timeDiff = Date.now() - parsedData.timestamp;
  
  if (timeDiff < 60000) { // 60 seconds cooldown
    // Still within cooldown period, skip creation
    return { shouldCreate: false, newStatus: 'in' };
  } else {
    // Cooldown period passed, toggle status
    const newStatus = parsedData.status === 'in' ? 'out' : 'in';
    const data = {
      epc,
      user_id,
      item_number,
      status: newStatus,
      timestamp: Date.now()
    };
    await redisClient.set(key, JSON.stringify(data), 60); // 60 seconds TTL
    return { shouldCreate: true, newStatus };
  }
};

// New function to check if EPC+user_id combination was scanned within 60 seconds
const checkEpcUserDuplicate = async (epc: string, user_id: string): Promise<boolean> => {
  const key = `epc_user_scan:${epc}:${user_id}`;
  const existingData = await redisClient.get(key);
  return existingData !== null;
};

// New function to set EPC+user_id combination as scanned with 60-second TTL
const setEpcUserDuplicate = async (epc: string, user_id: string): Promise<void> => {
  const key = `epc_user_scan:${epc}:${user_id}`;
  const data = {
    epc,
    user_id,
    timestamp: Date.now()
  };
  await redisClient.set(key, JSON.stringify(data), 60); // 60 seconds TTL
};

// Item-level serial range functions (across all POs)
const getItemSerialRange = async (item_number: string): Promise<SerialRangeRecord | null> => {
  const key = createItemSerialRangeKey(item_number);
  const data = await redisClient.get(key);
  return parseJsonData<SerialRangeRecord>(data);
};

/**
 * Update item-wise serial number range in Redis.
 * Each item maintains its own independent serial number tracking.
 * 
 * Logic:
 * - Serial Start: Always stores the SMALLEST serial number for this specific item
 * - Serial End: Always stores the LARGEST serial number for this specific item
 * - Comparison is done per item, not globally across all items
 * 
 * @param item_number - The item number (each item has its own cache)
 * @param serial_start - New serial start value (will replace if smaller than existing)
 * @param serial_end - New serial end value (will replace if larger than existing)
 * @returns Updated serial range record for this item
 */
const updateItemSerialRange = async (
  item_number: string,
  serial_start?: string,
  serial_end?: string
): Promise<SerialRangeRecord> => {
  const key = createItemSerialRangeKey(item_number);
  const existing = (await getItemSerialRange(item_number)) ?? {};

  const toBigInt = (value?: string) => {
    if (!value) return undefined;
    try {
      return BigInt(value);
    } catch {
      return undefined;
    }
  };

  // Get existing values for THIS ITEM ONLY
  const currentStartBig = toBigInt(existing.serial_start);
  const currentEndBig = toBigInt(existing.serial_end);
  const newStartBig = toBigInt(serial_start);
  const newEndBig = toBigInt(serial_end);

  // Serial Start Logic: Keep the SMALLEST serial number for this item
  let updatedStart = existing.serial_start;
  const shouldReplaceStart = () => {
    // Skip if null or empty string
    if (!serial_start || serial_start.trim() === '') return false;
    if (!existing.serial_start || existing.serial_start.trim() === '') return true; // No existing value, use new one
    if (newStartBig === undefined || currentStartBig === undefined) return true; // Invalid values, replace
    return newStartBig < currentStartBig; // Replace if new is smaller
  };
  if (shouldReplaceStart()) {
    updatedStart = serial_start;
  }

  // Serial End Logic: Keep the LARGEST serial number for this item
  let updatedEnd = existing.serial_end;
  const shouldReplaceEnd = () => {
    // Skip if null or empty string
    if (!serial_end || serial_end.trim() === '') return false;
    if (!existing.serial_end || existing.serial_end.trim() === '') return true; // No existing value, use new one
    if (newEndBig === undefined || currentEndBig === undefined) return true; // Invalid values, replace
    return newEndBig > currentEndBig; // Replace if new is larger
  };
  if (shouldReplaceEnd()) {
    updatedEnd = serial_end;
  }

  const payload: SerialRangeRecord = {
    serial_start: updatedStart,
    serial_end: updatedEnd,
  };

  await redisClient.set(key, JSON.stringify(payload));
  return payload;
};

// Export functional API
const inboundRedis = {
  checkDuplicate,
  setDuplicateCheck,
  storeInboundScan,
  getInboundScan,
  removeInboundScan,
  getInboundScansByPO,
  clearInboundScansByPO,
  isReady,
  getTTL,
  checkConnection,
  getAllInboundScans,
  // Location Tracker functions
  checkLocationTrackerDuplicate,
  setLocationTrackerDuplicate,
  getLocationTrackerTTL,
  getSerialRange,
  updateSerialRange,
  // Item-level serial range functions
  getItemSerialRange,
  updateItemSerialRange,
  // Inbound JSON duplicate functions
  checkInboundJsonDuplicate,
  setInboundJsonDuplicate,
  clearInboundJsonDuplicates,
  // New location tracker status check function
  checkLocationTrackerStatus,
  // New EPC+user_id duplicate check functions
  checkEpcUserDuplicate,
  setEpcUserDuplicate
};

export default inboundRedis;
