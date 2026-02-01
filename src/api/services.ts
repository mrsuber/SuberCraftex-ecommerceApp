import { apiClient, uploadFile } from './client';
import { API_ENDPOINTS } from '@/config/api';
import type { Service, ServiceBooking, Material } from '@/types';

// Design Options types
export interface DesignOption {
  id: string;
  name: string;
  imageUrl: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}

export interface DesignCategory {
  id: string;
  name: string;
  description: string | null;
  isRequired: boolean;
  options: DesignOption[];
}

export interface DesignSelection {
  categoryId: string;
  categoryName: string;
  optionIds: Array<{
    optionId: string;
    optionName: string;
    imageUrl: string;
  }>;
}

// Helper function to upload multiple photos
async function uploadPhotos(photoUris: string[]): Promise<string[]> {
  if (!photoUris || photoUris.length === 0) return [];

  const uploadedUrls: string[] = [];

  for (const uri of photoUris) {
    // Create FormData for the image
    const formData = new FormData();

    // Get file extension from URI - handle various URI formats
    let ext = 'jpg';
    const uriLower = uri.toLowerCase();
    if (uriLower.includes('.png')) ext = 'png';
    else if (uriLower.includes('.gif')) ext = 'gif';
    else if (uriLower.includes('.webp')) ext = 'webp';
    else if (uriLower.includes('.jpeg')) ext = 'jpeg';
    else if (uriLower.includes('.jpg')) ext = 'jpg';

    // Get filename from URI
    const uriPaths = uri.split('/');
    const lastPart = uriPaths[uriPaths.length - 1] || '';
    const originalName = lastPart.includes('.') ? lastPart : `photo_${Date.now()}.${ext}`;

    // Determine MIME type
    const mimeType = ext === 'png' ? 'image/png'
      : ext === 'gif' ? 'image/gif'
      : ext === 'webp' ? 'image/webp'
      : 'image/jpeg';

    console.log('Uploading photo:', { uri: uri.substring(0, 50) + '...', name: originalName, type: mimeType });

    // Append file to FormData - React Native format
    formData.append('file', {
      uri: uri,
      type: mimeType,
      name: originalName,
    } as any);

    try {
      const result = await uploadFile(API_ENDPOINTS.upload, formData);
      console.log('Photo uploaded successfully:', result.url);
      uploadedUrls.push(result.url);
    } catch (error: any) {
      console.error('Error uploading photo:', error.message || error);
      // Continue with other photos even if one fails
    }
  }

  return uploadedUrls;
}

interface CreateBookingData {
  serviceId: string;
  serviceType?: 'onsite' | 'custom_production' | 'collect_repair';
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  customerNotes?: string;
  requirementPhotos?: string[];
  desiredOutcome?: string;
  collectionMethod?: 'admin_collects' | 'customer_brings';
  customerProvidedMaterials?: boolean;
  materials?: Array<{ materialId: string; quantity: number }>;
  designSelections?: DesignSelection[];
  deliveryAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export const servicesApi = {
  async getAll(): Promise<Service[]> {
    const response = await apiClient.get(API_ENDPOINTS.services.list);
    // API returns { services, total, limit, offset } or array directly
    if (!response.data) return [];
    if (Array.isArray(response.data)) return response.data;
    return response.data.services || [];
  },

  async getById(id: string): Promise<Service> {
    const response = await apiClient.get(API_ENDPOINTS.services.detail(id));
    return response.data;
  },

  async getByType(serviceType: string): Promise<Service[]> {
    const response = await apiClient.get(
      `${API_ENDPOINTS.services.list}?type=${serviceType}`
    );
    return response.data;
  },

  async getMaterials(serviceId: string): Promise<Material[]> {
    const response = await apiClient.get(
      `${API_ENDPOINTS.services.materials(serviceId)}?isActive=true`
    );
    return response.data || [];
  },

  async getDesignCategories(serviceId: string): Promise<DesignCategory[]> {
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.services.designCategories(serviceId)
      );
      return response.data || [];
    } catch (error) {
      console.error('Error fetching design categories:', error);
      return [];
    }
  },

  async createBooking(data: CreateBookingData): Promise<ServiceBooking> {
    // Upload photos first if there are any
    let uploadedPhotoUrls: string[] = [];
    if (data.requirementPhotos && data.requirementPhotos.length > 0) {
      uploadedPhotoUrls = await uploadPhotos(data.requirementPhotos);
    }

    // Replace local URIs with uploaded URLs
    const bookingData = {
      ...data,
      requirementPhotos: uploadedPhotoUrls,
    };

    const response = await apiClient.post(API_ENDPOINTS.bookings.create, bookingData);
    return response.data;
  },

  async getMyBookings(): Promise<ServiceBooking[]> {
    const response = await apiClient.get(API_ENDPOINTS.bookings.list);
    return response.data || [];
  },

  async getBookingById(id: string): Promise<ServiceBooking> {
    const response = await apiClient.get(API_ENDPOINTS.bookings.detail(id));
    return response.data;
  },

  async approveQuote(bookingId: string): Promise<ServiceBooking> {
    const response = await apiClient.post(
      API_ENDPOINTS.bookings.approveQuote(bookingId)
    );
    return response.data;
  },

  async rejectQuote(bookingId: string, reason?: string): Promise<ServiceBooking> {
    const response = await apiClient.post(
      API_ENDPOINTS.bookings.rejectQuote(bookingId),
      { reason }
    );
    return response.data;
  },

  async cancelBooking(bookingId: string, reason?: string): Promise<ServiceBooking> {
    // Cancel uses DELETE method on the booking detail endpoint
    const response = await apiClient.delete(
      API_ENDPOINTS.bookings.detail(bookingId),
      { data: { reason } }
    );
    return response.data.booking;
  },

  async getBookingReview(bookingId: string) {
    const response = await apiClient.get(API_ENDPOINTS.bookings.review(bookingId));
    return response.data;
  },

  async createBookingReview(bookingId: string, data: { rating: number; title?: string; content?: string }) {
    const response = await apiClient.post(API_ENDPOINTS.bookings.review(bookingId), data);
    return response.data;
  },

  async updateBookingReview(bookingId: string, data: { rating?: number; title?: string; content?: string }) {
    const response = await apiClient.put(API_ENDPOINTS.bookings.review(bookingId), data);
    return response.data;
  },

  async createMaterialRequest(
    bookingId: string,
    data: { description: string; referenceUrl?: string; referencePhotos: string[] }
  ) {
    // Upload reference photos first if any
    let uploadedPhotoUrls: string[] = [];
    if (data.referencePhotos && data.referencePhotos.length > 0) {
      uploadedPhotoUrls = await uploadPhotos(data.referencePhotos);
    }

    const response = await apiClient.post(
      API_ENDPOINTS.bookings.materialRequests(bookingId),
      {
        description: data.description,
        reference_url: data.referenceUrl,
        reference_photos: uploadedPhotoUrls,
      }
    );
    return response.data;
  },
};
