export const INBOUND_DEDUP_TTL_SEC = 30;
export const INBOUND_SOCKET_EVENT = 'inbound:new-scan';
/** Emitted when OUT at location_id=1 is blocked — EPC not on a released pick slip */
export const OUTBOUND_INVALID_EPC_EVENT = 'outbound:invalid-epc';

export const getInboundDedupKey = (
  epc: string,
  locationId: number | string | null,
): string => `inbound:dedup:${epc}:${locationId ?? 'none'}`;
