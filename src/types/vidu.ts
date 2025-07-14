/**
 * Type definitions for Vidu API integration
 */

export interface ViduVideoRequest {
  prompt: string;
  model?: string;
  duration?: string;
  aspect_ratio?: string;
  style?: string;
  seed?: string;
  resolution?: string;
  movement_amplitude?: string;
  images?: string[];
  bgm?: boolean;
  payload?: string;
  callback_url?: string;
}

export interface ViduVideoResponse {
  id?: string;
  task_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  state?: string;
  model?: string;
  style?: string;
  duration?: number;
  seed?: number;
  aspect_ratio?: string;
  resolution?: string;
  movement_amplitude?: string;
  payload?: string;
  video_url?: string;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
  prompt: string;
  error_message?: string;
}

export interface ViduTaskCreation {
  id: string;
  url: string;
  cover_url: string;
}

export interface ViduTaskCreationsResponse {
  state: string;
  err_code: string;
  credits: number;
  payload: string;
  creations: ViduTaskCreation[];
}

export interface ApiError {
  message: string;
  code?: string;
  details?: string;
}