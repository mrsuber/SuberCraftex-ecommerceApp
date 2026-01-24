import { apiClient } from './client';
import { API_ENDPOINTS } from '@/config/api';
import type { Review } from '@/types';

interface SubmitReviewData {
  productId: string;
  rating: number;
  title?: string;
  content?: string;
  images?: string[];
  orderId?: string;
}

interface SubmitReviewResponse {
  review: Review;
  message: string;
}

interface HelpfulResponse {
  helpfulCount: number;
  message: string;
}

export const reviewsApi = {
  /**
   * Submit a new review for a product
   */
  async submit(data: SubmitReviewData): Promise<SubmitReviewResponse> {
    const response = await apiClient.post(API_ENDPOINTS.reviews.create, data);
    return response.data;
  },

  /**
   * Mark a review as helpful
   */
  async markHelpful(reviewId: string): Promise<HelpfulResponse> {
    const response = await apiClient.post(API_ENDPOINTS.reviews.helpful(reviewId));
    return response.data;
  },
};
