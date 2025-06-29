
import { z } from "zod";

export interface EventType {
  id: 'simple' | 'ticketed' | 'premium';
  title: string;
}

export const eventFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100, "Title too long"),
  description: z.string().min(10, "Description must be at least 10 characters").max(2000, "Description too long"),
  organizationName: z.string().min(2, "Organization/Promoter name is required").max(100, "Name too long"),
  date: z.string().refine(date => new Date(date) > new Date(), "Event date must be in the future"),
  time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  address: z.string().min(10, "Please enter a complete address").max(200, "Address too long"),
  categories: z.array(z.string()).min(1, "At least one category must be selected"),
  capacity: z.number().positive().optional(),
  displayPrice: z.object({
    amount: z.number().min(0, "Price cannot be negative"),
    label: z.string().min(1, "Price label is required")
  }).optional(),
  isPublic: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
  timezone: z.string().optional(),
  images: z.object({
    banner: z.object({
      original: z.string(),
      medium: z.string(),
      small: z.string(),
      thumbnail: z.string(),
      webp: z.object({
        original: z.string(),
        medium: z.string(),
        small: z.string(),
        thumbnail: z.string()
      }),
      metadata: z.object({
        originalSize: z.number(),
        compressedSize: z.number(),
        compressionRatio: z.number(),
        format: z.string(),
        dimensions: z.object({
          width: z.number(),
          height: z.number()
        })
      })
    }).optional(),
    postcard: z.object({
      original: z.string(),
      medium: z.string(),
      small: z.string(),
      thumbnail: z.string(),
      webp: z.object({
        original: z.string(),
        medium: z.string(),
        small: z.string(),
        thumbnail: z.string()
      }),
      metadata: z.object({
        originalSize: z.number(),
        compressedSize: z.number(),
        compressionRatio: z.number(),
        format: z.string(),
        dimensions: z.object({
          width: z.number(),
          height: z.number()
        })
      })
    }).optional()
  }).optional()
}).refine((data) => {
  if (data.endDate && data.date) {
    return new Date(data.endDate) >= new Date(data.date);
  }
  return true;
}, {
  message: "End date must be after start date",
  path: ["endDate"]
}).refine((data) => {
  if (data.endTime && !data.endDate) {
    return false;
  }
  return true;
}, {
  message: "End time requires an end date",
  path: ["endTime"]
});

export type EventFormData = z.infer<typeof eventFormSchema>;

export interface EventData {
  title: string;
  description: string;
  organizationName: string;
  date: string;
  time: string;
  endDate?: string;
  endTime?: string;
  location: string;
  category: string;
  capacity?: number;
  displayPrice?: {
    amount: number;
    label: string;
  };
  isPublic: boolean;
  images: string[];
  tickets: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
}
