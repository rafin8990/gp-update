"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";
import { useToast } from "@/components/ui/use-toast";
import { Wifi, WifiOff, Package, TrendingUp, TrendingDown, AlertTriangle, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ItemState {
  item_number: string;
  item_description: string | null;
  po_number: string;
  lot_no: string;
  available_quantity: number;
  base_quantity: number;
  active_epc_count: number;
  location_code: string | null;
  last_updated: string;
}

interface IllegalRemovalAlert {
  epc: string;
  item_number: string;
  item_description: string | null;
  po_number: string;
  lot_no: string;
  location_code: string | null;
  timestamp: string;
  alert_type: 'illegal_removal';
}

export default function SelfTrackerPage() {
  const [items, setItems] = useState<ItemState[]>([]);
  const [filteredItems, setFilteredItems] = useState<ItemState[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedItem, setHighlightedItem] = useState<string | null>(null);
  const [illegalAlerts, setIllegalAlerts] = useState<IllegalRemovalAlert[]>([]);
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const illegallyRemovedItemsRef = useRef<Set<string>>(new Set());

  // Initialize audio and unlock on user interaction - CRITICAL for instant playback
  useEffect(() => {
    let audioUnlocked = false;

    const unlockAudio = async () => {
      if (audioUnlocked) return;

      try {
        // Preload and unlock audio for instant playback
        const testAudio = new Audio('/warning.mp3');
        testAudio.volume = 0.01; // Very quiet test
        testAudio.preload = 'auto';

        // Try to unlock autoplay
        await testAudio.play();
        testAudio.pause();
        testAudio.currentTime = 0;

        // Pre-create and cache a ready-to-play audio instance
        audioRef.current = new Audio('/warning.mp3');
        audioRef.current.volume = 0.9;
        audioRef.current.preload = 'auto';

        audioUnlocked = true;
        console.log('✅ Audio unlocked and preloaded for INSTANT playback');
      } catch (err) {
        console.log('⚠️ Audio unlock attempt:', err);
      }
    };

    // Unlock on any user interaction (more events = better chance)
    const events = ['click', 'keydown', 'touchstart', 'mousedown', 'mouseenter', 'focus', 'scroll'];
    events.forEach(event => {
      document.addEventListener(event, unlockAudio, { once: true, passive: true });
    });

    // Also try to unlock immediately if possible (some browsers allow this)
    unlockAudio();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, unlockAudio);
      });
    };
  }, []);

  // Don't fetch initial items - start with empty state
  // Items will appear only when RFID reads them in real-time

  // WebSocket connection and event handlers
  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('✅ Connected to self-tracker dashboard');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ Disconnected from self-tracker dashboard');
    });

    // Quantity update handler
    socket.on('item:quantity-update', (data: Omit<ItemState, 'last_updated'> & { change_type?: string }) => {
      console.log(`📦 Received quantity update: ${data.item_number} (${data.change_type}), Qty: ${data.available_quantity}, EPCs: ${data.active_epc_count}`);
      const itemKey = `${data.item_number}:${data.po_number}:${data.lot_no}`;

      // If item is being added back, remove any illegal alerts for this item
      if (data.change_type === 'add') {
        // Clear illegal removal flag for this item
        illegallyRemovedItemsRef.current.delete(itemKey);

        setIllegalAlerts((prevAlerts) => {
          // Remove alerts for items that match this item (same item_number, po_number, lot_no)
          return prevAlerts.filter(
            (alert) =>
              !(
                alert.item_number === data.item_number &&
                alert.po_number === data.po_number &&
                alert.lot_no === data.lot_no
              )
          );
        });
      }

      setItems((prev) => {
        const existing = prev.find(
          (i) =>
            i.item_number === data.item_number &&
            i.po_number === data.po_number &&
            i.lot_no === data.lot_no
        );

        // If quantity is 0 or active_epc_count is 0, REMOVE the item (don't show it)
        if (data.available_quantity <= 0 || data.active_epc_count <= 0) {
          if (existing) {
            console.log(`🗑️ Removing item ${data.item_number} (quantity/EPC count is 0)`);
            // Remove the item from the list
            return prev.filter(
              (i) =>
                !(
                  i.item_number === data.item_number &&
                  i.po_number === data.po_number &&
                  i.lot_no === data.lot_no
                )
            );
          }
          return prev; // Already not in list
        }

        if (existing) {
          // Only update if quantity actually changed (prevent unnecessary re-renders)
          if (
            existing.available_quantity !== data.available_quantity ||
            existing.active_epc_count !== data.active_epc_count
          ) {
            return prev.map((i) =>
              i.item_number === data.item_number &&
                i.po_number === data.po_number &&
                i.lot_no === data.lot_no
                ? { ...data, last_updated: new Date().toISOString() }
                : i
            );
          }
          return prev; // No change, return same array
        } else {
          // Add new item (only if quantity > 0 and EPC count > 0)
          if (data.available_quantity > 0 && data.active_epc_count > 0) {
            return [
              ...prev,
              { ...data, last_updated: new Date().toISOString() },
            ];
          }
          return prev;
        }
      });
    });

    // Illegal removal handler
    socket.on('item:illegal-removal', (data: IllegalRemovalAlert) => {
      console.log('🚨 Illegal removal event received:', data);

      const itemKey = `${data.item_number}:${data.po_number}:${data.lot_no}`;

      // Check if this item is currently in the items list (means it was just added back)
      // If item exists with quantity > 0, it means it was added back, so don't show alert
      const itemExists = items.some(
        (item) =>
          item.item_number === data.item_number &&
          item.po_number === data.po_number &&
          item.lot_no === data.lot_no &&
          item.available_quantity > 0
      );

      if (itemExists) {
        console.log('⚠️ Item is currently on shelf (was added back), skipping illegal removal alert');
        return;
      }

      // Check if this item was just added back (in which case, don't show alert)
      if (illegallyRemovedItemsRef.current.has(itemKey)) {
        console.log('⚠️ Item was just added back, skipping illegal removal alert');
        return;
      }

      // Mark this item as illegally removed
      illegallyRemovedItemsRef.current.add(itemKey);

      // Play alert sound IMMEDIATELY (no delay)
      playAlertSound();

      // Add to alerts list
      setIllegalAlerts((prev) => [data, ...prev].slice(0, 10)); // Keep last 10 alerts

      // Show toast notification
      toast({
        variant: 'destructive',
        title: '⚠️ Illegal Removal Detected',
        description: `EPC ${data.epc} removed illegally from ${data.location_code || 'unknown location'}`,
      });

      // Highlight the item
      setHighlightedItem(data.item_number);
      setTimeout(() => {
        setHighlightedItem(null);
      }, 5000); // Remove highlight after 5 seconds
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('item:quantity-update');
      socket.off('item:illegal-removal');
    };
  }, [toast]);

  // Filter items (quantity > 0 and search query)
  useEffect(() => {
    let filtered = items.filter((item) => item.available_quantity > 0);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.item_number.toLowerCase().includes(query) ||
          item.item_description?.toLowerCase().includes(query) ||
          item.po_number.toLowerCase().includes(query) ||
          item.lot_no.toLowerCase().includes(query)
      );
    }

    // Sort by last_updated (most recent first)
    filtered.sort((a, b) =>
      new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
    );

    setFilteredItems(filtered);
  }, [items, searchQuery]);

  // Play alert sound function - INSTANT PLAYBACK
  const playAlertSound = () => {
    console.log('🔊 Attempting to play alert sound INSTANTLY...');

    // Strategy 1: Try cached audio first (FASTEST - instant playback)
    if (audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        const playPromise = audioRef.current.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('✅ Alert sound played INSTANTLY using cached audio');
              return; // Success - exit early
            })
            .catch((error) => {
              console.log('⚠️ Cached audio failed, trying new instance...', error);
              // Fall through to create new instance
            });
        } else {
          // If play() returned undefined, it means it's already playing or ready
          console.log('✅ Alert sound triggered (cached audio ready)');
          return;
        }
      } catch (error) {
        console.log('⚠️ Cached audio error, trying new instance...', error);
      }
    }

    // Strategy 2: Create new audio instance and play immediately (NO DELAY)
    try {
      const audio = new Audio('/warning.mp3');
      audio.volume = 0.9; // High volume for alert
      audio.preload = 'auto';

      // Play immediately - don't await, just fire and forget
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Alert sound played INSTANTLY');
            audioRef.current = audio; // Cache for next time
          })
          .catch((error: any) => {
            console.error('❌ Failed to play alert sound:', error);

            // Immediate retry with new instance (NO DELAY)
            try {
              const retryAudio = new Audio('/warning.mp3');
              retryAudio.volume = 0.9;
              retryAudio.play()
                .then(() => {
                  console.log('✅ Alert sound played on immediate retry');
                  audioRef.current = retryAudio;
                })
                .catch((retryError) => {
                  console.error('❌ Immediate retry also failed:', retryError);

                  // Last resort: minimal delay retry (only if browser blocks)
                  setTimeout(async () => {
                    try {
                      const lastAttempt = new Audio('/warning.mp3');
                      lastAttempt.volume = 0.9;
                      await lastAttempt.play();
                      console.log('✅ Alert sound played after minimal delay');
                      audioRef.current = lastAttempt;
                    } catch (finalError) {
                      console.error('❌ All attempts failed:', finalError);
                      toast({
                        variant: 'destructive',
                        title: '⚠️ Alert Sound Blocked by Browser',
                        description: `To enable sound in Microsoft Edge:
1. Click the lock icon in the address bar
2. Select "Site permissions"
3. Find "Media autoplay" or "Sound"
4. Set it to "Allow"
5. Reload this page

Or: Go to edge://settings/content/mediaAutoplay and allow autoplay for this site`,
                        duration: 10000,
                      });
                    }
                  }, 50); // Minimal delay only as last resort
                });
            } catch (retryErr) {
              console.error('❌ Retry attempt error:', retryErr);
            }
          });
      }
    } catch (error) {
      console.error('❌ Error creating audio:', error);
    }
  };

  // Calculate statistics
  const stats = {
    totalItems: filteredItems.length,
    totalQuantity: filteredItems.reduce((sum, item) => sum + item.available_quantity, 0),
    totalEpcs: filteredItems.reduce((sum, item) => sum + item.active_epc_count, 0),
    illegalRemovals: illegalAlerts.length,
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <PageLayout activePage="self-tracker">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shelf Tracker Dashboard</h1>
            <p className="text-gray-600 mt-1">Real-time item tracking with quantity monitoring</p>
          </div>
          <div className="flex items-center gap-4">
            {isConnected ? (
              <Badge variant="default" className="bg-green-500">
                <Wifi className="w-4 h-4 mr-2" />
                Connected
              </Badge>
            ) : (
              <Badge variant="destructive">
                <WifiOff className="w-4 h-4 mr-2" />
                Disconnected
              </Badge>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Items</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalItems}</div>
              <p className="text-xs text-gray-500 mt-1">Items with quantity &gt; 0</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Quantity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.totalQuantity}</div>
              <p className="text-xs text-gray-500 mt-1">Available quantity across all items</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active EPCs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.totalEpcs}</div>
              <p className="text-xs text-gray-500 mt-1">Total RFID tags detected</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Illegal Removals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.illegalRemovals}</div>
              <p className="text-xs text-gray-500 mt-1">Unauthorized removals detected</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Search Items</CardTitle>
            <CardDescription>Filter by item number, description, PO, or lot number</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by item number, description, PO, lot number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setSearchQuery("")}
                disabled={!searchQuery}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Illegal Alerts Panel */}
        {illegalAlerts.length > 0 && (
          <Card className="border-red-500 border-2">
            <CardHeader className="bg-red-50">
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                Illegal Removal Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {illegalAlerts.map((alert, index) => (
                  <div
                    key={`${alert.epc}-${alert.timestamp}-${index}`}
                    className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-red-800">
                        {alert.item_number} - {alert.item_description || 'N/A'}
                      </div>
                      <div className="text-sm text-red-600">
                        EPC: {alert.epc} | Location: {alert.location_code || 'Unknown'} | {formatTimestamp(alert.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Items Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Items ({filteredItems.length})</CardTitle>
                <CardDescription>Items with available quantity greater than 0</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No items available on shelf</p>
                <p className="text-sm mt-2">Waiting for RFID tags to be detected...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item Number</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Lot Number</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Active EPCs</TableHead>
                      <TableHead className="text-right">Available Qty</TableHead>
                      <TableHead>Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item, index) => {
                      const isHighlighted = highlightedItem === item.item_number;
                      return (
                        <TableRow
                          key={`${item.item_number}-${item.po_number}-${item.lot_no}-${index}`}
                          className={isHighlighted ? 'bg-red-100 border-red-300 animate-pulse' : ''}
                        >
                          <TableCell className="font-medium">{item.item_number}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {item.item_description || '-'}
                          </TableCell>
                          <TableCell>{item.po_number}</TableCell>
                          <TableCell>{item.lot_no}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.location_code || 'Unknown'}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{item.active_epc_count}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold text-blue-600">
                              {item.available_quantity}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {formatTimestamp(item.last_updated)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
