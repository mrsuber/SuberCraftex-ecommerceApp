import { API_BASE_URL, API_ENDPOINTS } from '@/config/api';
import { BlogPost } from '@/types';
import { tokenStorage } from '@/utils/storage';

export interface BlogPostsResponse {
  data: BlogPost[];
  total: number;
}

export async function getBlogPosts(): Promise<BlogPostsResponse> {
  try {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.blog.list}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch blog posts');
    }

    const result = await response.json();
    // API returns array directly for public endpoint
    const posts = Array.isArray(result) ? result : (result.data || []);

    return {
      data: posts.filter((post: BlogPost) => post.status === 'published'),
      total: posts.filter((post: BlogPost) => post.status === 'published').length,
    };
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    throw error;
  }
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost> {
  try {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.blog.detail(slug)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch blog post');
    }

    const result = await response.json();
    return result.data || result;
  } catch (error) {
    console.error('Error fetching blog post:', error);
    throw error;
  }
}

// Engagement types
export interface BlogEngagement {
  postId: string;
  likes: {
    count: number;
    hasLiked: boolean;
  };
  comments: {
    count: number;
  };
  shares: {
    count: number;
  };
  isAuthenticated: boolean;
  currentUserId?: string;
}

export interface BlogComment {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export interface CommentsResponse {
  comments: BlogComment[];
  commentCount: number;
}

// Get engagement data for a post
export async function getBlogEngagement(postId: string): Promise<BlogEngagement> {
  try {
    const token = await tokenStorage.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.blog.engagement(postId)}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch engagement data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching engagement:', error);
    throw error;
  }
}

// Like a post
export async function likePost(postId: string): Promise<{ likeCount: number; hasLiked: boolean }> {
  const token = await tokenStorage.getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.blog.like(postId)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to like post');
  }

  return data;
}

// Unlike a post
export async function unlikePost(postId: string): Promise<{ likeCount: number; hasLiked: boolean }> {
  const token = await tokenStorage.getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.blog.like(postId)}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to unlike post');
  }

  return data;
}

// Get comments for a post
export async function getComments(postId: string): Promise<CommentsResponse> {
  const response = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.blog.comment(postId)}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch comments');
  }

  return await response.json();
}

// Add a comment
export async function addComment(postId: string, content: string): Promise<{ comment: BlogComment; commentCount: number }> {
  const token = await tokenStorage.getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.blog.comment(postId)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to add comment');
  }

  return data;
}

// Delete a comment
export async function deleteComment(postId: string, commentId: string): Promise<{ commentCount: number }> {
  const token = await tokenStorage.getToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.blog.comment(postId)}?commentId=${commentId}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to delete comment');
  }

  return data;
}

// Record a share
export async function recordShare(postId: string): Promise<{ shareCount: number }> {
  const response = await fetch(
    `${API_BASE_URL}${API_ENDPOINTS.blog.share(postId)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to record share');
  }

  return data;
}
