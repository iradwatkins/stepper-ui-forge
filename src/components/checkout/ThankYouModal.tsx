import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Mail, Ticket, ArrowRight, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

interface ThankYouModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderDetails?: {
    orderId: string;
    customerEmail: string;
    totalAmount: number;
    ticketCount: number;
    eventTitle?: string;
    eventDate?: string;
  };
}

export function ThankYouModal({ isOpen, onClose, orderDetails }: ThankYouModalProps) {
  const navigate = useNavigate();
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen && orderDetails) {
      // Auto close after 30 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, orderDetails]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleViewTickets = () => {
    handleClose();
    navigate('/my-tickets');
  };

  const handleDownloadTickets = () => {
    // TODO: Implement ticket download functionality
    navigate('/my-tickets');
    handleClose();
  };

  if (!orderDetails || !orderDetails.orderId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            Payment Successful!
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            Thank you for your purchase
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Order ID:</span>
              <span className="font-medium text-gray-900">#{orderDetails.orderId?.slice(-8) || 'N/A'}</span>
            </div>
            {orderDetails.eventTitle && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Event:</span>
                <span className="font-medium text-gray-900">{orderDetails.eventTitle}</span>
              </div>
            )}
            {orderDetails.eventDate && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Date:</span>
                <span className="font-medium text-gray-900">{orderDetails.eventDate}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tickets:</span>
              <span className="font-medium text-gray-900">
                {orderDetails.ticketCount} {orderDetails.ticketCount === 1 ? 'ticket' : 'tickets'}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-gray-600">Total Paid:</span>
              <span className="font-bold text-gray-900">${(orderDetails.totalAmount || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Email Confirmation */}
          <div className="flex items-start gap-3 bg-blue-50 rounded-lg p-4">
            <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                Confirmation Sent
              </p>
              <p className="text-sm text-blue-700 mt-1">
                We've sent your tickets and receipt to {orderDetails.customerEmail || 'your email'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handleViewTickets}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Ticket className="w-5 h-5 mr-2" />
              View My Tickets
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            
            <Button
              onClick={handleDownloadTickets}
              variant="outline"
              className="w-full border-gray-300 hover:border-gray-400 h-12 rounded-lg"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Tickets
            </Button>
          </div>

          {/* Additional Info */}
          <p className="text-xs text-center text-gray-500 pt-2">
            You can always access your tickets from the "My Tickets" section in your account
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}