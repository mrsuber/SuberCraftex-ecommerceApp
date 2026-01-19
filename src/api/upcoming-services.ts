import { API_BASE_URL, API_ENDPOINTS } from '@/config/api';
import { UpcomingService } from '@/types';

export interface UpcomingServicesResponse {
  data: UpcomingService[];
  total: number;
}

export async function getUpcomingServices(): Promise<UpcomingServicesResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.upcomingServices.list}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch upcoming services');
    }

    const result = await response.json();
    return {
      data: result.data || result || [],
      total: result.total || (result.data || result || []).length,
    };
  } catch (error) {
    console.error('Error fetching upcoming services:', error);
    throw error;
  }
}

export async function getUpcomingServiceById(id: string): Promise<UpcomingService> {
  try {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.upcomingServices.detail(id)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch upcoming service');
    }

    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error('Error fetching upcoming service:', error);
    throw error;
  }
}
