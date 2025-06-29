
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
    tickets: [{ 
      name: "General Admission", 
      description: "",
      price: 0, 
      quantity: 100,
      hasEarlyBird: false 
    }]
  });

  const addTicketTier = () => {
    setEventData(prev => ({
      ...prev,
      tickets: [...prev.tickets, { 
        name: "", 
        description: "",
        price: 0, 
        quantity: 0,
        hasEarlyBird: false 
      }]
    }));
  };

  const removeTicketTier = (index: number) => {
    setEventData(prev => ({
      ...prev,
      tickets: prev.tickets.filter((_, i) => i !== index)
    }));
  };

  const updateTicketTier = (index: number, field: string, value: string | number | boolean) => {
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
