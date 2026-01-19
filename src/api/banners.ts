import { apiClient } from './client';
import { API_ENDPOINTS } from '@/config/api';

export interface HeroBanner {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  type: string;
  image_url: string;
  mobile_image_url: string | null;
  cta_text: string | null;
  cta_link: string | null;
  cta_style: string;
  background_color: string;
  text_color: string;
  order: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
}

export const bannersApi = {
  getAll: async (): Promise<HeroBanner[]> => {
    const response = await apiClient.get<HeroBanner[]>(API_ENDPOINTS.banners.list);
    return response.data;
  },
};
