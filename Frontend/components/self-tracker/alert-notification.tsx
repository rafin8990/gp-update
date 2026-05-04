"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

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

interface AlertNotificationProps {
  alerts: IllegalRemovalAlert[];
  onDismiss?: (epc: string, timestamp: string) => void;
}

export function AlertNotification({ alerts, onDismiss }: AlertNotificationProps) {
  if (alerts.length === 0) {
    return null;
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Card className="border-red-500 border-2 shadow-lg">
      <CardHeader className="bg-red-50">
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          Illegal Removal Alerts ({alerts.length})
        </CardTitle>
        <CardDescription className="text-red-600">
          Unauthorized removals detected from shelf
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {alerts.map((alert, index) => (
            <div
              key={`${alert.epc}-${alert.timestamp}-${index}`}
              className="flex items-start justify-between p-3 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="destructive" className="text-xs">
                    Illegal
                  </Badge>
                  <span className="font-semibold text-red-800">
                    {alert.item_number}
                  </span>
                </div>
                <div className="text-sm text-gray-700 mb-1">
                  {alert.item_description || 'No description'}
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                  <span>
                    <strong>EPC:</strong> {alert.epc}
                  </span>
                  <span>•</span>
                  <span>
                    <strong>PO:</strong> {alert.po_number}
                  </span>
                  <span>•</span>
                  <span>
                    <strong>Lot:</strong> {alert.lot_no}
                  </span>
                  <span>•</span>
                  <span>
                    <strong>Location:</strong> {alert.location_code || 'Unknown'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatTimestamp(alert.timestamp)}
                </div>
              </div>
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDismiss(alert.epc, alert.timestamp)}
                  className="ml-2 text-red-600 hover:text-red-800"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
