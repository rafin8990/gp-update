"use client";

import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { getSocket } from "@/lib/socket";
import { CheckCircle2, XCircle, Wifi, WifiOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface EPCRead {
  epc: string;
  item_number: string | null;
  item_description: string | null;
  po_number: string | null;
  lot_no: string | null;
  location_code: string | null;
  antenna_id: number;
  rssi: number;
  reader_id: string;
  timestamp: string;
  is_identified: boolean;
}

export default function ShelfPage() {
  const [epcReads, setEpcReads] = useState<EPCRead[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "identified" | "unidentified">("all");

  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('✅ Connected to RFID shelf display');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ Disconnected from RFID shelf display');
    });

    socket.on('epc:read', (data: { event: string; data: EPCRead }) => {
      if (data.data) {
        setEpcReads((prev) => [data.data, ...prev].slice(0, 100)); // Keep last 100 reads
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('epc:read');
    };
  }, []);

  const filteredReads = epcReads.filter((read) => {
    const matchesSearch = 
      read.epc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      read.item_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      read.item_description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      read.po_number?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "identified" && read.is_identified) ||
      (filterStatus === "unidentified" && !read.is_identified);

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: epcReads.length,
    identified: epcReads.filter((r) => r.is_identified).length,
    unidentified: epcReads.filter((r) => !r.is_identified).length,
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <PageLayout activePage="shelf">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">RFID Shelf Display</h1>
            <p className="text-gray-600 mt-1">Real-time EPC tag monitoring</p>
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
              <CardDescription>Total Reads</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Identified</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.identified}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Unidentified</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.unidentified}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Success Rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stats.total > 0 ? Math.round((stats.identified / stats.total) * 100) : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Filter EPC Reads</CardTitle>
            <CardDescription>Search and filter EPC tag reads</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              <Input
                placeholder="Search by EPC, item, PO, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-[300px]"
              />
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === "all" ? "default" : "outline"}
                  onClick={() => setFilterStatus("all")}
                >
                  All
                </Button>
                <Button
                  variant={filterStatus === "identified" ? "default" : "outline"}
                  onClick={() => setFilterStatus("identified")}
                >
                  Identified
                </Button>
                <Button
                  variant={filterStatus === "unidentified" ? "default" : "outline"}
                  onClick={() => setFilterStatus("unidentified")}
                >
                  Unidentified
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* EPC Reads Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent EPC Reads ({filteredReads.length})</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEpcReads([])}
              >
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {filteredReads.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No EPC reads yet. Waiting for RFID tags...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-semibold">Time</th>
                      <th className="text-left py-3 px-4 font-semibold">EPC</th>
                      <th className="text-left py-3 px-4 font-semibold">Item</th>
                      <th className="text-left py-3 px-4 font-semibold">Description</th>
                      <th className="text-left py-3 px-4 font-semibold">PO</th>
                      <th className="text-left py-3 px-4 font-semibold">Location</th>
                      <th className="text-left py-3 px-4 font-semibold">Antenna</th>
                      <th className="text-left py-3 px-4 font-semibold">RSSI</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReads.map((read, index) => (
                      <tr
                        key={`${read.epc}-${read.timestamp}-${index}`}
                        className="border-b hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm">
                          {formatTimestamp(read.timestamp)}
                        </td>
                        <td className="py-3 px-4">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {read.epc}
                          </code>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {read.item_number || "-"}
                        </td>
                        <td className="py-3 px-4 text-sm max-w-xs truncate">
                          {read.item_description || "-"}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {read.po_number || "-"}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {read.location_code || "-"}
                        </td>
                        <td className="py-3 px-4 text-sm text-center">
                          {read.antenna_id}
                        </td>
                        <td className="py-3 px-4 text-sm text-center">
                          {read.rssi} dBm
                        </td>
                        <td className="py-3 px-4">
                          {read.is_identified ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Identified
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="w-3 h-3 mr-1" />
                              Unknown
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

