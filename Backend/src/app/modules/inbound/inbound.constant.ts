export const INBOUND_DEDUP_TTL_SEC = 30;
export const INBOUND_SOCKET_EVENT = 'inbound:new-scan';

export const getInboundDedupKey = (
  epc: string,
  locationId: number | string | null,
): string => `inbound:dedup:${epc}:${locationId ?? 'none'}`;
