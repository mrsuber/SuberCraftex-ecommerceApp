import { apiClient } from './client';
import { API_ENDPOINTS } from '@/config/api';
import type { Category } from '@/types';

export interface CategoryWithChildren extends Category {
  children?: Category[];
  productCount?: number;
}

export const categoriesApi = {
  async getAll(options?: { parentOnly?: boolean; includeChildren?: boolean }): Promise<CategoryWithChildren[]> {
    const params = new URLSearchParams();
    if (options?.parentOnly) params.append('parentOnly', 'true');
    if (options?.includeChildren) params.append('includeChildren', 'true');

    const url = params.toString()
      ? `${API_ENDPOINTS.categories.list}?${params.toString()}`
      : API_ENDPOINTS.categories.list;

    const response = await apiClient.get(url);
    return response.data;
  },

  async getParentCategories(): Promise<CategoryWithChildren[]> {
    return this.getAll({ parentOnly: true, includeChildren: true });
  },

  async getById(id: string): Promise<Category> {
    const response = await apiClient.get(API_ENDPOINTS.categories.detail(id));
    return response.data;
  },
};
