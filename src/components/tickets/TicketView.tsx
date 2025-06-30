import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Clock, Download, Share2, QrCode } from "lucide-react";

interface TicketViewProps {
  ticket: {
    id: string;
    ticketType: string;
    holderName: string;
    holderEmail: string;
    status: 'active' | 'used' | 'refunded' | 'cancelled';
    qrCode: string;
    event: {
      title: string;
      date: string;
      time: string;
      location: string;
      organizationName?: string;
    };
    createdAt: string;
  };
  showActions?: boolean;
  onDownload?: () => void;
  onShare?: () => void;
}

const TicketView: React.FC<TicketViewProps> = ({ 
  ticket, 
  showActions = true, 
  onDownload, 
  onShare 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'used':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'refunded':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Valid';
      case 'used':
        return 'Used';
      case 'refunded':
        return 'Refunded';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto overflow-hidden">
      {/* Header */}
      <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold">{ticket.event.title}</CardTitle>
            <CardDescription className="text-blue-100">
              {ticket.event.organizationName || 'Event Ticket'}
            </CardDescription>
          </div>
          <Badge className={`${getStatusColor(ticket.status)} text-xs`}>
            {getStatusText(ticket.status)}
          </Badge>
        </div>
      </CardHeader>

      {/* Event Details */}
      <CardContent className="p-6 space-y-4">
        {/* Event Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{ticket.event.date}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{ticket.event.time}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{ticket.event.location}</span>
          </div>
        </div>

        {/* Ticket Details */}
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ticket Type:</span>
            <span className="font-medium">{ticket.ticketType}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ticket Holder:</span>
            <span className="font-medium">{ticket.holderName}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ticket ID:</span>
            <span className="font-mono text-xs">{ticket.id.substring(0, 8)}...</span>
          </div>
        </div>

        {/* QR Code */}
        <div className="border-t pt-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <QrCode className="h-4 w-4" />
              <span className="text-sm font-medium">Entry QR Code</span>
            </div>
            
            <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 mx-auto w-fit">
              {ticket.qrCode.startsWith('data:') ? (
                <img 
                  src={ticket.qrCode} 
                  alt="QR Code" 
                  className="w-32 h-32 mx-auto"
                />
              ) : (
                <div className="w-32 h-32 bg-gray-100 flex items-center justify-center rounded">
                  <span className="text-xs text-center text-gray-500 p-2">
                    QR: {ticket.qrCode}
                  </span>
                </div>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mt-2">
              Show this QR code at the event entrance
            </p>
          </div>
        </div>

        {/* Actions */}
        {showActions && (ticket.status === 'active' || ticket.status === 'used') && (
          <div className="border-t pt-4 flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onDownload}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onShare}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Purchased on {new Date(ticket.createdAt).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
};

export default TicketView;