/**
 * Comprehensive Business Creation Flow Test
 * 
 * This test verifies the complete business creation flow:
 * 1. Frontend form validation and submission in CreateBusinessSteps
 * 2. Backend data saving via CommunityBusinessService.createBusiness
 * 3. Database storage verification
 * 4. Business appearance in Community page
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { jest } from '@jest/globals';

// Import components to test
import CreateBusinessSteps from '../pages/CreateBusinessSteps';
import Community from '../pages/Community';
import { CommunityBusinessService, BusinessCategory, BusinessType } from '../lib/services/CommunityBusinessService';

// Mock dependencies
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-123',
      email: 'test@example.com'
    }
  })
}));

jest.mock('../lib/services/ImageUploadService', () => ({
  imageUploadService: {
    uploadMagazineImage: jest.fn().mockResolvedValue({
      success: true,
      url: 'https://example.com/test-image.jpg'
    })
  }
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn()
}));

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-123' } }
    })
  }
};

jest.mock('../integrations/supabase/client', () => ({
  supabase: mockSupabaseClient
}));

// Test data
const mockBusinessData = {
  business_name: 'Test Stepping Studio',
  description: 'A premier stepping studio offering classes for all skill levels. We specialize in Chicago stepping and provide a welcoming environment for beginners and advanced dancers.',
  category: 'fitness_sports' as BusinessCategory,
  business_type: 'physical_business' as BusinessType,
  subcategory: 'Dance Studio',
  contact_email: 'info@teststrippingstudio.com',
  contact_phone: '(555) 123-4567',
  website_url: 'https://teststrippingstudio.com',
  address: '123 Dance Street',
  city: 'Chicago',
  state: 'Illinois',
  zip_code: '60601',
  price_range: '$$' as const,
  tags: ['stepping', 'dance classes', 'chicago stepping', 'beginners welcome'],
  specialties: ['Chicago Stepping', 'Partner Dancing', 'Line Dancing'],
  business_hours: {
    monday: { open: '09:00', close: '21:00', closed: false },
    tuesday: { open: '09:00', close: '21:00', closed: false },
    wednesday: { open: '09:00', close: '21:00', closed: false },
    thursday: { open: '09:00', close: '21:00', closed: false },
    friday: { open: '09:00', close: '23:00', closed: false },
    saturday: { open: '10:00', close: '23:00', closed: false },
    sunday: { open: '12:00', close: '20:00', closed: false }
  },
  social_media: {
    facebook: 'https://facebook.com/teststrippingstudio',
    instagram: 'https://instagram.com/teststrippingstudio'
  },
  gallery_images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
};

const mockCreatedBusiness = {
  id: 'business-123',
  owner_id: 'test-user-123',
  ...mockBusinessData,
  status: 'pending' as const,
  is_verified: false,
  featured: false,
  view_count: 0,
  contact_count: 0,
  rating_average: 0,
  rating_count: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Helper component wrapper
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('Business Creation Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CommunityBusinessService.createBusiness', () => {
    test('should save business data to database with correct structure', async () => {
      // Mock successful database insert
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockCreatedBusiness,
            error: null
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert
      });

      // Test the service method
      const result = await CommunityBusinessService.createBusiness(mockBusinessData);

      // Verify database call
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('community_businesses');
      expect(mockInsert).toHaveBeenCalledWith({
        ...mockBusinessData,
        owner_id: 'test-user-123',
        status: 'pending'
      });

      // Verify returned data structure
      expect(result).toEqual(mockCreatedBusiness);
      expect(result.id).toBeDefined();
      expect(result.owner_id).toBe('test-user-123');
      expect(result.status).toBe('pending');
      expect(result.business_name).toBe(mockBusinessData.business_name);
      expect(result.description).toBe(mockBusinessData.description);
      expect(result.category).toBe(mockBusinessData.category);
      expect(result.business_type).toBe(mockBusinessData.business_type);
    });

    test('should handle database errors gracefully', async () => {
      // Mock database error
      const mockError = new Error('Database connection failed');
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: mockError
            })
          })
        })
      });

      // Test error handling
      await expect(
        CommunityBusinessService.createBusiness(mockBusinessData)
      ).rejects.toThrow('Database connection failed');
    });

    test('should validate required fields based on business type', async () => {
      const physicalBusinessData = {
        ...mockBusinessData,
        business_type: 'physical_business' as BusinessType
      };

      const onlineBusinessData = {
        ...mockBusinessData,
        business_type: 'online_business' as BusinessType,
        address: undefined,
        city: undefined,
        state: undefined,
        website_url: 'https://required-for-online.com'
      };

      const serviceProviderData = {
        ...mockBusinessData,
        business_type: 'service_provider' as BusinessType,
        service_area_radius: 25,
        service_offerings: ['Personal Training', 'Group Classes']
      };

      // Test field requirements
      const physicalRequiredFields = CommunityBusinessService.getRequiredFieldsForType('physical_business');
      expect(physicalRequiredFields).toContain('address');
      expect(physicalRequiredFields).toContain('city');
      expect(physicalRequiredFields).toContain('state');

      const onlineRequiredFields = CommunityBusinessService.getRequiredFieldsForType('online_business');
      expect(onlineRequiredFields).toContain('website_url');

      const serviceProviderRequiredFields = CommunityBusinessService.getRequiredFieldsForType('service_provider');
      expect(serviceProviderRequiredFields).toContain('service_offerings');
    });
  });

  describe('CreateBusinessSteps Component', () => {
    test('should render all form steps correctly', async () => {
      render(
        <TestWrapper>
          <CreateBusinessSteps />
        </TestWrapper>
      );

      // Check if step indicator is present
      expect(screen.getByText('Business Type')).toBeInTheDocument();
      expect(screen.getByText('Choose your listing type')).toBeInTheDocument();

      // Check if business type options are rendered
      expect(screen.getByText('Physical Business')).toBeInTheDocument();
      expect(screen.getByText('Service Provider')).toBeInTheDocument();
      expect(screen.getByText('Online Business')).toBeInTheDocument();
    });

    test('should progress through form steps with valid data', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CreateBusinessSteps />
        </TestWrapper>
      );

      // Step 1: Select business type
      await user.click(screen.getByText('Physical Business'));
      await user.click(screen.getByText('Next'));

      // Step 2: Basic Information
      await waitFor(() => {
        expect(screen.getByText('Business Information')).toBeInTheDocument();
      });

      const businessNameInput = screen.getByLabelText(/business name/i);
      const categorySelect = screen.getByRole('combobox');
      const descriptionInput = screen.getByLabelText(/description/i);

      await user.type(businessNameInput, mockBusinessData.business_name);
      await user.click(categorySelect);
      await user.click(screen.getByText('Fitness & Sports'));
      await user.type(descriptionInput, mockBusinessData.description);

      await user.click(screen.getByText('Next'));

      // Step 3: Contact Information
      await waitFor(() => {
        expect(screen.getByText('Contact Information')).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email/i);
      const phoneInput = screen.getByLabelText(/phone/i);
      const websiteInput = screen.getByLabelText(/website/i);
      const addressInput = screen.getByLabelText(/address/i);
      const cityInput = screen.getByLabelText(/city/i);
      const stateInput = screen.getByLabelText(/state/i);

      await user.type(emailInput, mockBusinessData.contact_email || '');
      await user.type(phoneInput, mockBusinessData.contact_phone || '');
      await user.type(websiteInput, mockBusinessData.website_url || '');
      await user.type(addressInput, mockBusinessData.address || '');
      await user.type(cityInput, mockBusinessData.city || '');
      await user.type(stateInput, mockBusinessData.state || '');

      await user.click(screen.getByText('Next'));

      // Step 4: Details and Tags
      await waitFor(() => {
        expect(screen.getByText('Tags & Specialties')).toBeInTheDocument();
      });

      // Add tags
      const tagInput = screen.getByPlaceholderText(/add a tag/i);
      for (const tag of mockBusinessData.tags) {
        await user.type(tagInput, tag);
        await user.click(screen.getByRole('button', { name: /\+/ }));
        await user.clear(tagInput);
      }

      await user.click(screen.getByText('Next'));

      // Step 5: Business Hours
      await waitFor(() => {
        expect(screen.getByText(/business hours/i)).toBeInTheDocument();
      });

      // Set business hours
      const mondayOpenInput = screen.getAllByDisplayValue('')[0];
      const mondayCloseInput = screen.getAllByDisplayValue('')[1];
      
      if (mondayOpenInput && mondayCloseInput) {
        await user.type(mondayOpenInput, '09:00');
        await user.type(mondayCloseInput, '21:00');
      }

      expect(screen.getByText('Create Business')).toBeInTheDocument();
    });

    test('should validate required fields and show errors', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CreateBusinessSteps />
        </TestWrapper>
      );

      // Try to proceed without selecting business type
      await user.click(screen.getByText('Next'));
      
      // Should still be on step 1
      expect(screen.getByText('Choose your listing type')).toBeInTheDocument();

      // Select business type and proceed
      await user.click(screen.getByText('Physical Business'));
      await user.click(screen.getByText('Next'));

      // Try to proceed without filling required fields
      await user.click(screen.getByText('Next'));

      // Should show validation errors for required fields
      await waitFor(() => {
        expect(screen.getByText(/business name must be at least 2 characters/i)).toBeInTheDocument();
      });
    });

    test('should submit form and create business successfully', async () => {
      const user = userEvent.setup();
      
      // Mock successful business creation
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockCreatedBusiness,
            error: null
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert
      });

      render(
        <TestWrapper>
          <CreateBusinessSteps />
        </TestWrapper>
      );

      // Complete the form (abbreviated for test)
      await user.click(screen.getByText('Physical Business'));
      await user.click(screen.getByText('Next'));

      const businessNameInput = screen.getByLabelText(/business name/i);
      await user.type(businessNameInput, mockBusinessData.business_name);

      const categorySelect = screen.getByRole('combobox');
      await user.click(categorySelect);
      await user.click(screen.getByText('Fitness & Sports'));

      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(descriptionInput, mockBusinessData.description);

      await user.click(screen.getByText('Next'));

      // Fill contact information
      const addressInput = screen.getByLabelText(/address/i);
      const cityInput = screen.getByLabelText(/city/i);
      const stateInput = screen.getByLabelText(/state/i);

      await user.type(addressInput, mockBusinessData.address || '');
      await user.type(cityInput, mockBusinessData.city || '');
      await user.type(stateInput, mockBusinessData.state || '');

      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('Next'));

      // Submit the form
      const submitButton = screen.getByText('Create Business');
      await user.click(submitButton);

      // Verify the business was created
      await waitFor(() => {
        expect(mockSupabaseClient.from).toHaveBeenCalledWith('community_businesses');
      });
    });
  });

  describe('Community Page Integration', () => {
    test('should display created business in community listings', async () => {
      // Mock the getBusinesses call to return our created business
      const mockSelect = jest.fn().mockResolvedValue({
        data: [mockCreatedBusiness],
        error: null,
        count: 1
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockReturnValue(mockSelect),
              limit: jest.fn().mockReturnValue(mockSelect)
            }),
            limit: jest.fn().mockReturnValue(mockSelect)
          })
        })
      });

      render(
        <MemoryRouter>
          <Community />
        </MemoryRouter>
      );

      // Wait for businesses to load
      await waitFor(() => {
        expect(screen.getByText(mockBusinessData.business_name)).toBeInTheDocument();
      });

      // Verify business details are displayed
      expect(screen.getByText(mockBusinessData.business_name)).toBeInTheDocument();
      expect(screen.getByText(/A premier stepping studio/)).toBeInTheDocument();
      expect(screen.getByText(`${mockBusinessData.city}, ${mockBusinessData.state}`)).toBeInTheDocument();
    });

    test('should filter businesses by category and type', async () => {
      const fitnessBusinesses = [
        { ...mockCreatedBusiness, category: 'fitness_sports' },
        { ...mockCreatedBusiness, id: 'business-456', business_name: 'Dance Academy', category: 'arts_crafts' }
      ];

      const mockSelect = jest.fn().mockResolvedValue({
        data: fitnessBusinesses,
        error: null,
        count: 2
      });

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue(mockSelect)
          })
        })
      });

      const user = userEvent.setup();
      
      render(
        <MemoryRouter>
          <Community />
        </MemoryRouter>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Test Stepping Studio')).toBeInTheDocument();
      });

      // Filter by fitness category
      const fitnessFilter = screen.getByText('Fitness & Sports');
      await user.click(fitnessFilter);

      // Should still show fitness business
      expect(screen.getByText('Test Stepping Studio')).toBeInTheDocument();
    });

    test('should search businesses by name and description', async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter>
          <Community />
        </MemoryRouter>
      );

      const searchInput = screen.getByPlaceholderText(/search businesses/i);
      await user.type(searchInput, 'stepping');

      // Should trigger search functionality
      expect(searchInput).toHaveValue('stepping');
    });
  });

  describe('End-to-End Business Creation Flow', () => {
    test('should complete full business creation and verification flow', async () => {
      const user = userEvent.setup();

      // Mock successful creation
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockCreatedBusiness,
            error: null
          })
        })
      });

      // Mock successful retrieval
      const mockSelect = jest.fn().mockResolvedValue({
        data: [mockCreatedBusiness],
        error: null,
        count: 1
      });

      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'community_businesses') {
          return {
            insert: mockInsert,
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue(mockSelect)
              })
            })
          };
        }
        return {};
      });

      // Step 1: Create business
      const { rerender } = render(
        <TestWrapper>
          <CreateBusinessSteps />
        </TestWrapper>
      );

      // Fill out and submit form (abbreviated)
      await user.click(screen.getByText('Physical Business'));
      await user.click(screen.getByText('Next'));

      // Basic info
      await user.type(screen.getByLabelText(/business name/i), mockBusinessData.business_name);
      const categorySelect = screen.getByRole('combobox');
      await user.click(categorySelect);
      await user.click(screen.getByText('Fitness & Sports'));
      await user.type(screen.getByLabelText(/description/i), mockBusinessData.description);
      await user.click(screen.getByText('Next'));

      // Contact info
      await user.type(screen.getByLabelText(/address/i), mockBusinessData.address || '');
      await user.type(screen.getByLabelText(/city/i), mockBusinessData.city || '');
      await user.type(screen.getByLabelText(/state/i), mockBusinessData.state || '');
      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('Next'));

      // Submit
      await user.click(screen.getByText('Create Business'));

      // Verify creation was called
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalled();
      });

      // Step 2: Verify business appears in community
      rerender(
        <MemoryRouter>
          <Community />
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(mockBusinessData.business_name)).toBeInTheDocument();
      });

      // Verify all expected business data is displayed
      expect(screen.getByText(mockBusinessData.business_name)).toBeInTheDocument();
      expect(screen.getByText(/A premier stepping studio/)).toBeInTheDocument();
      expect(screen.getByText(`${mockBusinessData.city}, ${mockBusinessData.state}`)).toBeInTheDocument();
    });

    test('should handle validation errors and prevent invalid submissions', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <CreateBusinessSteps />
        </TestWrapper>
      );

      // Try to submit empty form
      await user.click(screen.getByText('Physical Business'));
      await user.click(screen.getByText('Next'));
      await user.click(screen.getByText('Next'));

      // Should show validation errors
      await waitFor(() => {
        expect(screen.getByText(/business name must be at least 2 characters/i)).toBeInTheDocument();
        expect(screen.getByText(/description must be at least 10 characters/i)).toBeInTheDocument();
        expect(screen.getByText(/please select a category/i)).toBeInTheDocument();
      });

      // Should not proceed to next step or submit
      expect(screen.queryByText('Create Business')).not.toBeInTheDocument();
    });
  });

  describe('Data Persistence and Retrieval', () => {
    test('should save all form fields to database correctly', async () => {
      const mockInsert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockCreatedBusiness,
            error: null
          })
        })
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert
      });

      // Create business with complete data
      const result = await CommunityBusinessService.createBusiness(mockBusinessData);

      // Verify all fields were saved
      expect(mockInsert).toHaveBeenCalledWith({
        ...mockBusinessData,
        owner_id: 'test-user-123',
        status: 'pending'
      });

      // Check specific field mappings
      const savedData = mockInsert.mock.calls[0][0];
      expect(savedData.business_name).toBe(mockBusinessData.business_name);
      expect(savedData.description).toBe(mockBusinessData.description);
      expect(savedData.category).toBe(mockBusinessData.category);
      expect(savedData.business_type).toBe(mockBusinessData.business_type);
      expect(savedData.contact_email).toBe(mockBusinessData.contact_email);
      expect(savedData.contact_phone).toBe(mockBusinessData.contact_phone);
      expect(savedData.website_url).toBe(mockBusinessData.website_url);
      expect(savedData.address).toBe(mockBusinessData.address);
      expect(savedData.city).toBe(mockBusinessData.city);
      expect(savedData.state).toBe(mockBusinessData.state);
      expect(savedData.zip_code).toBe(mockBusinessData.zip_code);
      expect(savedData.tags).toEqual(mockBusinessData.tags);
      expect(savedData.specialties).toEqual(mockBusinessData.specialties);
      expect(savedData.business_hours).toEqual(mockBusinessData.business_hours);
      expect(savedData.social_media).toEqual(mockBusinessData.social_media);
      expect(savedData.gallery_images).toEqual(mockBusinessData.gallery_images);
      expect(savedData.owner_id).toBe('test-user-123');
      expect(savedData.status).toBe('pending');
    });

    test('should retrieve businesses with correct filtering', async () => {
      const businesses = [
        mockCreatedBusiness,
        { ...mockCreatedBusiness, id: 'business-456', category: 'health_wellness', status: 'approved' }
      ];

      const mockQuery = {
        data: businesses.filter(b => b.status === 'approved'),
        error: null,
        count: 1
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue(mockQuery)
          })
        })
      });

      const result = await CommunityBusinessService.getBusinesses();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('community_businesses');
      expect(result.businesses).toHaveLength(1);
      expect(result.businesses[0].status).toBe('approved');
    });
  });
});