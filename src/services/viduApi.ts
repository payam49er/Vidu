/**
 * Vidu API service using axios for HTTP requests
 */
import axios, { AxiosResponse } from 'axios';
import { ViduVideoRequest, ViduVideoResponse, ViduTaskCreationsResponse } from '../types/vidu';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    console.error('API Error:', error);
    console.error('API Error Response:', error.response?.data);
    console.error('API Error Status:', error.response?.status);
    
    if (error.response?.data?.detail) {
      // FastAPI error format
      const detail = error.response.data.detail;
      if (typeof detail === 'object' && detail.message) {
        throw new Error(detail.message);
      } else if (typeof detail === 'string') {
        throw new Error(detail);
      }
    }
    
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    
    if (error.response?.status === 404) {
      throw new Error('Task not found on Vidu API. The task ID may be invalid, expired, or belong to a different account.');
    }
    
    if (error.response?.status === 401) {
      throw new Error('Unauthorized access. Please check your API key configuration.');
    }
    
    if (error.response?.status === 403) {
      throw new Error('Access forbidden. Please verify your API key permissions.');
    }
    
    if (error.response?.status) {
      throw new Error(`API request failed with status ${error.response.status}: ${error.response.statusText || 'Unknown error'}`);
    }
    
    if (error.message) {
      throw new Error(error.message);
    }
    
    throw new Error('An unexpected error occurred');
  }
);

class ViduApiService {
  /**
   * Generate a video from text prompt
   */
  async generateVideo(request: ViduVideoRequest): Promise<ViduVideoResponse> {
    try {
      const response = await apiClient.post<ViduVideoResponse>('/text2video', request);
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while generating the video.');
    }
  }

  /**
   * Generate a video from image
   */
  async generateVideoFromImage(request: ViduVideoRequest): Promise<ViduVideoResponse> {
    try {
      const response = await apiClient.post<ViduVideoResponse>('/img2video', request);
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while generating the video from image.');
    }
  }
  /**
   * Get task creations to retrieve the generated video
   */
  async getTaskCreations(taskId: string): Promise<ViduTaskCreationsResponse> {
    try {
      const response = await apiClient.get<ViduTaskCreationsResponse>(`/tasks/${taskId}/creations`);
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while getting task creations.');
    }
  }

  /**
   * Check the status of a video generation job
   */
  async getVideoStatus(videoId: string): Promise<ViduVideoResponse> {
    try {
      const response = await apiClient.get<ViduVideoResponse>(`/videos/${videoId}`);
      return response.data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred while checking video status.');
    }
  }
}

export const viduApi = new ViduApiService();