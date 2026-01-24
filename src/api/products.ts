import { apiClient } from './client';
import { API_ENDPOINTS } from '@/config/api';
import type { Product } from '@/types';

interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const productsApi = {
  async getAll(filters: ProductFilters = {}): Promise<ProductsResponse> {
    const params = new URLSearchParams();

    // API uses offset-based pagination, calculate offset from page
    const limit = filters.limit || 10;
    if (filters.page && filters.page > 1) {
      const offset = (filters.page - 1) * limit;
      params.append('offset', offset.toString());
    }
    params.append('limit', limit.toString());

    if (filters.search) params.append('search', filters.search);
    if (filters.categoryId) params.append('category', filters.categoryId);
    if (filters.featured) params.append('featured', 'true');
    if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    const url = queryString
      ? `${API_ENDPOINTS.products.list}?${queryString}`
      : API_ENDPOINTS.products.list;

    const response = await apiClient.get(url);
    return response.data;
  },

  async getById(id: string): Promise<Product & { reviews?: any[]; avgRating?: number; reviewCount?: number; userHasReviewed?: boolean }> {
    const endpoint = API_ENDPOINTS.products.detail(id);
    console.log('=== Product API Call ===');
    console.log('Fetching product from:', endpoint);

    const response = await apiClient.get(endpoint);

    // Debug logging to see actual API response structure
    console.log('Response status:', response.status);
    console.log('Response data type:', typeof response.data);
    console.log('Response data keys:', response.data ? Object.keys(response.data) : 'null');
    console.log('Raw response.data:', JSON.stringify(response.data, null, 2));

    // API returns { product: {...}, reviews: [...], avgRating, reviewCount }
    // Extract and flatten the response
    const data = response.data;

    if (!data) {
      console.error('No data in response!');
      throw new Error('No product data received from API');
    }

    // Handle both nested { product: {...} } and flat product response
    const product = data.product || data;
    const reviews = data.reviews || [];
    const avgRating = data.avgRating ?? 0;
    const reviewCount = data.reviewCount ?? 0;
    const userHasReviewed = data.userHasReviewed ?? false;

    console.log('Extracted product type:', typeof product);
    console.log('Extracted product keys:', product ? Object.keys(product) : 'null');
    console.log('Extracted product details:', {
      id: product?.id,
      name: product?.name,
      price: product?.price,
      featured_image: product?.featured_image,
      inventory_count: product?.inventory_count,
      description: product?.description?.substring(0, 50),
    });

    // Validate that we got actual product data
    if (!product || !product.id) {
      console.error('Invalid product data received:', product);
      throw new Error('Invalid product data received from API');
    }

    console.log('=== End Product API Call ===');

    return {
      ...product,
      reviews,
      avgRating,
      reviewCount,
      userHasReviewed,
    };
  },

  async getByCategory(categoryId: string): Promise<ProductsResponse> {
    const response = await apiClient.get(
      `${API_ENDPOINTS.products.list}?category=${categoryId}`
    );
    return response.data;
  },

  async getFeatured(limit: number = 10): Promise<ProductsResponse> {
    const response = await apiClient.get(
      `${API_ENDPOINTS.products.list}?featured=true&limit=${limit}`
    );
    return response.data;
  },

  async search(query: string): Promise<ProductsResponse> {
    const response = await apiClient.get(
      `${API_ENDPOINTS.products.list}?search=${encodeURIComponent(query)}`
    );
    return response.data;
  },
};
