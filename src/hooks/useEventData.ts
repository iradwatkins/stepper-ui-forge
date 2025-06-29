
import { useState } from 'react';
import { EventData } from '@/types/event-form';

export const useEventData = () => {
  const [eventData, setEventData] = useState<EventData>({
    title: "",
    description: "",
    organizationName: "",
    date: "",
    time: "",
    location: "",
    category: "",
    isPublic: true,
    images: [],
    tickets: [{ name: "General Admission", price: 0, quantity: 100 }]
  });

  const addTicketTier = () => {
    setEventData(prev => ({
      ...prev,
      tickets: [...prev.tickets, { name: "", price: 0, quantity: 0 }]
    }));
  };

  const removeTicketTier = (index: number) => {
    setEventData(prev => ({
      ...prev,
      tickets: prev.tickets.filter((_, i) => i !== index)
    }));
  };

  const updateTicketTier = (index: number, field: string, value: string | number) => {
    setEventData(prev => ({
      ...prev,
      tickets: prev.tickets.map((ticket, i) => 
        i === index ? { ...ticket, [field]: value } : ticket
      )
    }));
  };

  return {
    eventData,
    setEventData,
    addTicketTier,
    removeTicketTier,
    updateTicketTier
  };
};
