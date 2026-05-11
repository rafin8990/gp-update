/** URL paths for stock detail navigation (segments are encoded for special chars). */
export function stockPoLotPath(poNumber: string, lotNo: string): string {
  return `/stock/po/${encodeURIComponent(poNumber)}/lot/${encodeURIComponent(lotNo)}`;
}

export function stockPoLotItemPath(poNumber: string, lotNo: string, itemNumber: string): string {
  return `${stockPoLotPath(poNumber, lotNo)}/item/${encodeURIComponent(itemNumber)}`;
}
