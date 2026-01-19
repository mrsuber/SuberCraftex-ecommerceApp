import { apiClient, uploadFile } from './client';
import { API_ENDPOINTS } from '@/config/api';
import type {
  ServiceBooking,
  BookingProgress,
  FittingAppointment,
  CreateProgressUpdateData,
  CreateFittingData,
  Tailor,
  TailorStats,
  ProgressStatus,
} from '@/types';

// Helper function to upload multiple photos
async function uploadPhotos(photoUris: string[]): Promise<string[]> {
  if (!photoUris || photoUris.length === 0) return [];

  const uploadedUrls: string[] = [];

  for (const uri of photoUris) {
    const formData = new FormData();

    // Get file extension from URI
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
    const originalName = lastPart.includes('.') ? lastPart : `progress_${Date.now()}.${ext}`;

    // Determine MIME type
    const mimeType = ext === 'png' ? 'image/png'
      : ext === 'gif' ? 'image/gif'
      : ext === 'webp' ? 'image/webp'
      : 'image/jpeg';

    console.log('Uploading progress photo:', { uri: uri.substring(0, 50) + '...', name: originalName, type: mimeType });

    formData.append('file', {
      uri: uri,
      type: mimeType,
      name: originalName,
    } as any);

    try {
      const result = await uploadFile(API_ENDPOINTS.upload, formData);
      console.log('Progress photo uploaded successfully:', result.url);
      uploadedUrls.push(result.url);
    } catch (error: any) {
      console.error('Error uploading progress photo:', error.message || error);
    }
  }

  return uploadedUrls;
}

export const tailorApi = {
  // Get current tailor profile
  async getMe(): Promise<Tailor> {
    const response = await apiClient.get(API_ENDPOINTS.tailor.me);
    return response.data;
  },

  // Get all bookings (uses the main bookings endpoint which returns all for admin/tailor roles)
  async getBookings(status?: string): Promise<ServiceBooking[]> {
    // Use the main bookings endpoint - it returns all bookings for admin/tailor users
    const params = status ? `?status=${status}` : '';
    const response = await apiClient.get(`${API_ENDPOINTS.bookings.list}${params}`);
    return response.data || [];
  },

  // Get single booking detail
  async getBookingById(id: string): Promise<ServiceBooking> {
    const response = await apiClient.get(API_ENDPOINTS.tailor.bookingDetail(id));
    return response.data;
  },

  // Add progress update with photos
  async addProgressUpdate(
    bookingId: string,
    data: CreateProgressUpdateData
  ): Promise<BookingProgress> {
    // Upload photos first if there are any
    let uploadedPhotoUrls: string[] = [];
    if (data.photos && data.photos.length > 0) {
      uploadedPhotoUrls = await uploadPhotos(data.photos);
    }

    const progressData = {
      status: data.status,
      description: data.description,
      photos: uploadedPhotoUrls,
    };

    const response = await apiClient.post(
      API_ENDPOINTS.tailor.addProgress(bookingId),
      progressData
    );
    return response.data;
  },

  // Update existing progress update
  async updateProgress(
    bookingId: string,
    progressId: string,
    data: Partial<CreateProgressUpdateData>
  ): Promise<BookingProgress> {
    // Upload new photos if provided
    let uploadedPhotoUrls: string[] | undefined;
    if (data.photos && data.photos.length > 0) {
      // Filter out already uploaded URLs vs local URIs
      const localPhotos = data.photos.filter(uri => !uri.startsWith('http'));
      const existingUrls = data.photos.filter(uri => uri.startsWith('http'));

      if (localPhotos.length > 0) {
        const newUrls = await uploadPhotos(localPhotos);
        uploadedPhotoUrls = [...existingUrls, ...newUrls];
      } else {
        uploadedPhotoUrls = existingUrls;
      }
    }

    const updateData = {
      ...(data.status && { status: data.status }),
      ...(data.description && { description: data.description }),
      ...(uploadedPhotoUrls && { photos: uploadedPhotoUrls }),
    };

    const response = await apiClient.patch(
      API_ENDPOINTS.tailor.updateProgress(bookingId, progressId),
      updateData
    );
    return response.data;
  },

  // Get booking progress updates
  async getBookingProgress(bookingId: string): Promise<BookingProgress[]> {
    const response = await apiClient.get(API_ENDPOINTS.tailor.addProgress(bookingId));
    return response.data || [];
  },
};

export const fittingsApi = {
  // Get all fittings for tailor
  async getAll(params?: { status?: string; upcoming?: boolean }): Promise<FittingAppointment[]> {
    let query = '';
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.append('status', params.status);
      if (params.upcoming) queryParams.append('upcoming', 'true');
      query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    }
    const response = await apiClient.get(`${API_ENDPOINTS.fittings.list}${query}`);
    return response.data || [];
  },

  // Create new fitting appointment
  async create(data: CreateFittingData): Promise<FittingAppointment> {
    const response = await apiClient.post(API_ENDPOINTS.fittings.create, {
      bookingId: data.bookingId,
      scheduledDate: data.scheduledDate,
      scheduledTime: data.scheduledTime,
      durationMinutes: data.durationMinutes || 30,
      notes: data.notes,
    });
    return response.data;
  },

  // Get single fitting detail
  async getById(id: string): Promise<FittingAppointment> {
    const response = await apiClient.get(API_ENDPOINTS.fittings.detail(id));
    return response.data;
  },

  // Update fitting (status, reschedule, mark called, etc.)
  async update(
    id: string,
    data: {
      status?: string;
      customerCalled?: boolean;
      attended?: boolean;
      notes?: string;
      scheduledDate?: string;
      scheduledTime?: string;
      durationMinutes?: number;
    }
  ): Promise<FittingAppointment> {
    const response = await apiClient.patch(API_ENDPOINTS.fittings.update(id), data);
    return response.data;
  },

  // Cancel/delete fitting
  async delete(id: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.fittings.delete(id));
  },

  // Helper: Mark customer as called
  async markCalled(id: string): Promise<FittingAppointment> {
    return this.update(id, { customerCalled: true });
  },

  // Helper: Mark attendance
  async markAttendance(id: string, attended: boolean): Promise<FittingAppointment> {
    return this.update(id, { attended });
  },

  // Helper: Get today's fittings
  async getTodaysFittings(): Promise<FittingAppointment[]> {
    const today = new Date().toISOString().split('T')[0];
    const all = await this.getAll({ upcoming: true });
    return all.filter(f => f.scheduled_date.startsWith(today));
  },

  // Helper: Get upcoming fittings (excluding today)
  async getUpcomingFittings(): Promise<FittingAppointment[]> {
    const today = new Date().toISOString().split('T')[0];
    const all = await this.getAll({ upcoming: true });
    return all.filter(f => f.scheduled_date > today);
  },
};
