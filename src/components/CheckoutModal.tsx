// Simplified CheckoutModal for production
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: {
    id: number;
    title: string;
    date: string;
    time: string;
    price: number;
  };
}

export function CheckoutModal({ isOpen, onClose, event }: CheckoutModalProps) {
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    // Simplified checkout process
    setError("Checkout functionality is being rebuilt for production");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
          <DialogDescription>
            Complete your ticket purchase
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {event && (
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold">{event.title}</h3>
              <p className="text-sm text-muted-foreground">
                {event.date} at {event.time}
              </p>
              <p className="text-lg font-bold">${event.price}</p>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleCheckout}>
              Complete Purchase
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}