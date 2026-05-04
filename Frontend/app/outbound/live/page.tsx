"use client";

import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/page-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/page-header';
import { Radio, Package, Hash, Clock, ArrowRight, ArrowLeft, Activity } from 'lucide-react';
import { getSocket } from '@/lib/socket';

interface IUnifiedOutboundEvent {
  id?: number;
  type: 'scan' | 'location' | 'stock';
  requisition_id?: number;
  requisition_number?: string;
  item_number: string;
  item_description?: string;
  quantity: number;
  scanned_quantity?: number;
  requested_quantity?: number;
  lot_no?: string;
  status?: 'in' | 'out';
  epc?: string;
  timestamp: string;
  location_tracker_cooldown?: boolean;
}

interface RequisitionProgress {
  requisition_id: number;
  requisition_number: string;
  total_requested: number;
  total_scanned: number;
  items: Array<{
    item_number: string;
    item_description: string;
    requested_quantity: number;
    scanned_quantity: number;
  }>;
}

export default function OutboundLivePage() {
  const [events, setEvents] = useState<IUnifiedOutboundEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [requisitionProgress, setRequisitionProgress] = useState<RequisitionProgress[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<number>(0);

  // Load requisition progress from localStorage on page load
  const loadProgressFromStorage = () => {
    try {
      const stored = localStorage.getItem('outbound-requisition-progress');
      if (stored) {
        const progress = JSON.parse(stored);
        setRequisitionProgress(progress);
      }
    } catch (error) {
      console.error('Failed to load progress from localStorage:', error);
    }
  };

  // Save requisition progress to localStorage
  const saveProgressToStorage = (progress: RequisitionProgress[]) => {
    try {
      localStorage.setItem('outbound-requisition-progress', JSON.stringify(progress));
    } catch (error) {
      console.error('Failed to save progress to localStorage:', error);
    }
  };

  // Fetch initial requisition progress data from API
  const fetchInitialProgress = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/v1/outbound');
      const result = await response.json();
      
      if (result.success && result.data) {
        const progressMap = new Map<number, RequisitionProgress>();
        
        result.data.forEach((outbound: any) => {
          const items = Array.isArray(outbound.items) ? outbound.items : JSON.parse(outbound.items);
          const requisitionId = outbound.requisition_id;
          
          if (!progressMap.has(requisitionId)) {
            progressMap.set(requisitionId, {
              requisition_id: requisitionId,
              requisition_number: `Req #${requisitionId}`, // Will be updated with actual number
              total_requested: 0,
              total_scanned: 0,
              items: []
            });
          }
          
          const progress = progressMap.get(requisitionId)!;
          
          // Group items by item_number and sum quantities
          items.forEach((item: any) => {
            const existingItem = progress.items.find(i => i.item_number === item.item_number);
            if (existingItem) {
              existingItem.scanned_quantity += item.quantity || 0;
              // Always update description if we have one
              if (item.item_description) {
                existingItem.item_description = item.item_description;
              }
            } else {
              progress.items.push({
                item_number: item.item_number,
                item_description: item.item_description || '',
                requested_quantity: item.requested_quantity || 0,
                scanned_quantity: item.quantity || 0,
              });
            }
          });
        });
        
        // Calculate totals for each requisition
        progressMap.forEach(progress => {
          progress.total_scanned = progress.items.reduce((sum, item) => sum + item.scanned_quantity, 0);
          progress.total_requested = progress.items.reduce((sum, item) => sum + item.requested_quantity, 0);
        });
        
        const progressArray = Array.from(progressMap.values());
        setRequisitionProgress(progressArray);
        saveProgressToStorage(progressArray);
      }
    } catch (error) {
      console.error('Failed to fetch initial progress:', error);
    }
  };

  // Clear progress on page load - don't show after reload or navigation
  useEffect(() => {
    // Clear progress on mount to prevent showing after page reload
    setRequisitionProgress([]);
    // Also clear localStorage to ensure no stale data
    try {
      localStorage.removeItem('outbound-requisition-progress');
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }, []);

  // Auto-hide progress after 10 seconds of no scanning activity
  useEffect(() => {
    if (isScanning) {
      const timer = setTimeout(() => {
        setIsScanning(false);
      }, 10000); // Hide after 10 seconds of inactivity

      return () => clearTimeout(timer);
    }
  }, [lastScanTime, isScanning]);

  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });


    // Outbound scan events
    socket.on('outbound:new-scan', (data: any) => {
      
      // Show progress and update scan time
      setIsScanning(true);
      setLastScanTime(Date.now());
      
      // payload contains: requisition_id, requisition_number, item_number, item_description, scanned_quantity, requested_quantity, lot_no, epc, timestamp, location_tracker_cooldown
      const unifiedEvent: IUnifiedOutboundEvent = {
        id: Date.now(),
        type: 'scan',
        requisition_id: data.requisition_id,
        requisition_number: data.requisition_number,
        item_number: data.item_number,
        item_description: data.item_description,
        quantity: data.scanned_quantity || data.quantity,
        scanned_quantity: data.scanned_quantity,
        requested_quantity: data.requested_quantity,
        lot_no: data.lot_no,
        epc: data.epc,
        timestamp: data.timestamp,
        location_tracker_cooldown: data.location_tracker_cooldown || false,
      };
      setEvents(prev => [unifiedEvent, ...prev].slice(0, 100));
      
      // Update requisition progress using received_quantities from backend
      setRequisitionProgress(prev => {
        const existing = prev.find(r => r.requisition_id === data.requisition_id);
        
        let newProgress;
        
        // Use received_quantities from backend if available, otherwise fallback to current logic
        if (data.received_quantities) {
          const items = Object.entries(data.received_quantities).map(([item_number, quantities]: [string, any]) => ({
            item_number,
            item_description: data.item_description || '', // Use description from socket event
            requested_quantity: quantities.requested || 0,
            scanned_quantity: quantities.received || 0,
          }));
          
          const total_scanned = items.reduce((sum, item) => sum + item.scanned_quantity, 0);
          const total_requested = items.reduce((sum, item) => sum + item.requested_quantity, 0);
          
          newProgress = prev.map(r => 
            r.requisition_id === data.requisition_id 
              ? { 
                  ...r, 
                  items, 
                  total_scanned, 
                  total_requested,
                  requisition_number: data.requisition_number || r.requisition_number
                }
              : r
          ).concat(
            existing ? [] : [{
              requisition_id: data.requisition_id,
              requisition_number: data.requisition_number || `Req #${data.requisition_id}`,
              total_requested,
              total_scanned,
              items
            }]
          );
        } else {
          // Fallback to old logic if received_quantities not available
          if (existing) {
            const updatedItems = [...existing.items];
            const itemIndex = updatedItems.findIndex(item => item.item_number === data.item_number);
            
            if (itemIndex >= 0) {
              updatedItems[itemIndex].scanned_quantity += data.scanned_quantity || 0;
              // Always update description from socket event
              if (data.item_description) {
                updatedItems[itemIndex].item_description = data.item_description;
              }
            } else {
              updatedItems.push({
                item_number: data.item_number,
                item_description: data.item_description || '',
                requested_quantity: data.requested_quantity || 0,
                scanned_quantity: data.scanned_quantity || 0,
              });
            }
            
            const total_scanned = updatedItems.reduce((sum, item) => sum + item.scanned_quantity, 0);
            const total_requested = updatedItems.reduce((sum, item) => sum + item.requested_quantity, 0);
            
            newProgress = prev.map(r => 
              r.requisition_id === data.requisition_id 
                ? { ...r, items: updatedItems, total_scanned, total_requested }
                : r
            );
          } else {
            const newRequisition: RequisitionProgress = {
              requisition_id: data.requisition_id,
              requisition_number: data.requisition_number || `Req #${data.requisition_id}`,
              total_requested: data.requested_quantity || 0,
              total_scanned: data.scanned_quantity || 0,
              items: [{
                item_number: data.item_number,
                item_description: data.item_description || '',
                requested_quantity: data.requested_quantity || 0,
                scanned_quantity: data.scanned_quantity || 0,
              }]
            };
            newProgress = [...prev, newRequisition];
          }
        }
        
        // Don't save to localStorage - we want fresh state on each page load
        // saveProgressToStorage(newProgress);
        
        return newProgress;
      });
    });

    // Location tracker updates (only show OUT events for outbound)
    socket.on('location-tracker:new-activity', (data: any) => {
      if (data?.status !== 'out') return;
      const unifiedEvent: IUnifiedOutboundEvent = {
        id: data.id || Date.now(),
        type: 'location',
        item_number: data.item_number,
        quantity: data.received_quantity || data.quantity,
        status: data.status,
        epc: data.epc,
        timestamp: data.timestamp || data.created_at,
      };
      setEvents(prev => [unifiedEvent, ...prev].slice(0, 100));
    });

    // Debug all events
    socket.onAny((eventName: string, ...args: any[]) => {
      console.log(`🔍 Socket event received: ${eventName}`, args);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('outbound:new-scan');
      socket.off('location-tracker:new-activity');
    };
  }, []);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Dhaka'
    });
  };

  const getEventIcon = (event: IUnifiedOutboundEvent) => {
    switch (event.type) {
      case 'scan':
        return <Radio className="h-4 w-4" />;
      case 'location':
        return event.status === 'out' ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />;
      case 'stock':
        return <Package className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEventColor = (event: IUnifiedOutboundEvent) => {
    switch (event.type) {
      case 'scan':
        return 'text-emerald-600';
      case 'location':
        return event.status === 'out' ? 'text-blue-600' : 'text-green-600';
      case 'stock':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  const getEventBgColor = (event: IUnifiedOutboundEvent) => {
    switch (event.type) {
      case 'scan':
        return 'bg-emerald-100';
      case 'location':
        return event.status === 'out' ? 'bg-blue-100' : 'bg-green-100';
      case 'stock':
        return 'bg-purple-100';
      default:
        return 'bg-gray-100';
    }
  };

  return (
    <PageLayout activePage="outbound">
      <div className="space-y-4">
        <PageHeader
          title="Outbound Gate - Live Dashboard"
          breadcrumbItems={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Outbound", href: "/outbound/live" },
            { label: "Outbound Gate", href: "/outbound/live" }
          ]}
        />

        {/* Scanning Status Indicator */}
        {isScanning && (
          <Card className="border-2 border-green-500 bg-green-50 mb-4">
            <CardContent className="py-3">
              <div className="flex items-center justify-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-700 font-medium">Scanning Active - Progress Visible</span>
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <div className="text-center mt-2">
                <span className="text-sm text-gray-600">
                  💡 Location tracker posts have 60-second cooldown, but live updates continue
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* RFID Scan Design - Show when no events */}
        {events.length === 0 && (
          <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
            <CardContent className="py-16">
              <div className="text-center">
                <div className="mx-auto w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                  <Radio className="h-12 w-12 text-emerald-600 animate-pulse" />
                </div>
                <h3 className="text-2xl font-bold text-gray-700 mb-4">Ready to Scan RFID for Outbound</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Place your RFID tag near the reader to start outbound scanning. 
                  Scanned items will appear here in real-time.
                </p>
                <div className="flex items-center justify-center gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Scanner is active and ready</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                      {isConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Requisition Progress - Show when data exists (but not after page reload) */}
        {requisitionProgress.length > 0 && (
          <Card className="border-2 border-blue-500 bg-blue-50 mb-4">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-600" />
                  Requisition Progress
                  <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                    {requisitionProgress.length} Active
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  Live Progress Tracking
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requisitionProgress.map((req) => (
                  <div key={req.requisition_id} className="bg-white rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{req.requisition_number}</h3>
                        <p className="text-sm text-gray-600">Requisition #{req.requisition_id}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {req.total_scanned} / {req.total_requested}
                        </div>
                        <div className="text-sm text-gray-600">
                          {Math.round((req.total_scanned / req.total_requested) * 100)}% Complete
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((req.total_scanned / req.total_requested) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="space-y-2">
                      {req.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{item.item_number}</span>
                            {item.item_description && (
                              <span className="text-gray-500 text-xs">
                                - {item.item_description}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-600 font-bold">{item.scanned_quantity}</span>
                            <span className="text-gray-400">/</span>
                            <span className="text-blue-600 font-bold">{item.requested_quantity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Events Summary */}
        {events.length > 0 && (
          <Card className="border-2 border-emerald-500 bg-emerald-50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-600" />
                  Recent Outbound Activity
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-300">
                    {events.length} Events
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-white rounded-lg border">
                  <p className="text-sm font-medium text-gray-700 mb-2">Total Scans</p>
                  <p className="text-4xl font-bold text-emerald-600 mb-2">
                    {events.filter(e => e.type === 'scan').length}
                  </p>
                  <p className="text-sm text-gray-600">Outbound scans</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border">
                  <p className="text-sm font-medium text-gray-700 mb-2">Requisitions</p>
                  <p className="text-4xl font-bold text-blue-600 mb-2">
                    {new Set(events.filter(e => e.type === 'scan').map(e => e.requisition_id).filter(Boolean)).size}
                  </p>
                  <p className="text-sm text-gray-600">Active requisitions</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border">
                  <p className="text-sm font-medium text-gray-700 mb-2">Items Scanned</p>
                  <p className="text-4xl font-bold text-purple-600 mb-2">
                    {new Set(events.filter(e => e.type === 'scan').map(e => e.item_number)).size}
                  </p>
                  <p className="text-sm text-gray-600">Unique items</p>
                </div>
                <div className="text-center p-4 bg-white rounded-lg border">
                  <p className="text-sm font-medium text-gray-700 mb-2">Location Events</p>
                  <p className="text-4xl font-bold text-orange-600 mb-2">
                    {events.filter(e => e.type === 'location' && e.status === 'out').length}
                  </p>
                  <p className="text-sm text-gray-600">Exit events</p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t">
                <p className="text-lg font-semibold text-gray-700 mb-4">Latest Scanned Items:</p>
                <div className="space-y-3">
                  {events
                    .filter(e => e.type === 'scan')
                    .reduce((unique, event) => {
                      const key = `${event.item_number}-${event.requisition_id}`;
                      if (!unique.find(e => `${e.item_number}-${e.requisition_id}` === key)) {
                        unique.push(event);
                      }
                      return unique;
                    }, [] as IUnifiedOutboundEvent[])
                    .slice(0, 3)
                    .map((event, index) => (
                    <div key={event.id || index} className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${getEventBgColor(event)}`}>
                          <div className={getEventColor(event)}>
                            {getEventIcon(event)}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg font-semibold text-gray-900">{event.item_number}</span>
                            <Badge 
                              variant="outline" 
                              className="text-xs font-bold px-2 py-1 bg-emerald-100 text-emerald-700 border-emerald-300"
                            >
                              SCANNED
                            </Badge>
                            {event.location_tracker_cooldown && (
                              <Badge 
                                variant="outline" 
                                className="text-xs font-bold px-2 py-1 bg-orange-100 text-orange-700 border-orange-300"
                              >
                                COOLDOWN
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="text-gray-500">
                              ({event.item_description || `Req #${event.requisition_id || '-'}`})
                            </span>
                            <span className="text-blue-600 font-medium ml-2">
                              [Req #{event.requisition_id}]
                            </span>
                            {event.lot_no && (
                              <span className="text-purple-600 font-medium ml-2">
                                Lot: {event.lot_no}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-700 mb-2">
                          {event.requested_quantity && event.scanned_quantity ? (
                            <span>
                              <span className="text-emerald-600 font-bold text-lg">{event.scanned_quantity.toLocaleString()}</span>
                              <span className="text-gray-400 mx-1">/</span>
                              <span className="text-blue-600 font-bold text-lg">{event.requested_quantity.toLocaleString()}</span>
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-bold text-lg">{event.quantity?.toLocaleString() || 'N/A'}</span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500 font-medium">{formatTime(event.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}


