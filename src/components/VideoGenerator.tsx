/**
 * Main video generation component
 */
import React, { useState } from 'react';
import { Video, Send, Download, Upload, Image } from 'lucide-react';
import { viduApi } from '../services/viduApi';
import { ViduVideoResponse, ViduTaskCreation } from '../types/vidu';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';

export const VideoGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('url');
  const [imageModel, setImageModel] = useState<'viduq1' | 'vidu2.0' | 'vidu1.5'>('viduq1');
  const [imageDuration, setImageDuration] = useState<number>(5);
  const [imageBgm, setImageBgm] = useState<boolean>(false);
  const [taskIdInput, setTaskIdInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingFromImage, setIsGeneratingFromImage] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [videoHistory, setVideoHistory] = useState<ViduVideoResponse[]>([]);
  const [currentTaskResponse, setCurrentTaskResponse] = useState<ViduVideoResponse | null>(null);
  const [taskCreationsResponse, setTaskCreationsResponse] = useState<ViduTaskCreationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [activeTab, setActiveTab] = useState<'generate' | 'image' | 'lookup'>('generate');

  /**
   * Handle form submission for video generation
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setCurrentTaskResponse(null);
    setTaskCreationsResponse(null);
    setIsPolling(false);

    try {
      const response = await viduApi.generateVideo({
        prompt: prompt.trim(),
        model: 'viduq1',
        duration: '5',
        aspect_ratio: '16:9',
        style: 'general',
        seed: '0',
        resolution: '1080p',
        movement_amplitude: 'auto'
      });

      setCurrentTaskResponse(response);
      // Add to history
      setVideoHistory(prev => [response, ...prev]);
      
      // Start polling for task creations to get the generated video
      if (response.task_id) {
        setIsPolling(true);
        pollTaskCreations(response.task_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate video');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Handle image file selection
   */
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
    }
  };

  /**
   * Convert file to base64 data URL
   */
  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  /**
   * Handle form submission for image-to-video generation
   */
  const handleImageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGeneratingFromImage) return;

    let finalImageUrl = '';
    
    if (uploadMethod === 'url') {
      if (!imageUrl.trim()) {
        setError('Please provide an image URL');
        return;
      }
      finalImageUrl = imageUrl.trim();
    } else {
      if (!imageFile) {
        setError('Please select an image file');
        return;
      }
      
      try {
        // Convert file to proper base64 data URL with content type
        const dataUrl = await fileToDataUrl(imageFile);
        finalImageUrl = dataUrl;
      } catch (err) {
        setError('Failed to process image file');
        return;
      }
    }

    // Set default duration based on model
    const defaultDuration = imageModel === 'viduq1' ? 5 : 4;
    const finalDuration = imageDuration || defaultDuration;
    setIsGeneratingFromImage(true);
    setError(null);
    setCurrentTaskResponse(null);
    setTaskCreationsResponse(null);
    setIsPolling(false);

    try {
      const response = await viduApi.generateVideoFromImage({
        images: [finalImageUrl],
        model: imageModel,
        duration: finalDuration.toString(),
        movement_amplitude: 'auto',
        bgm: imageBgm,
        ...(imagePrompt.trim() && { prompt: imagePrompt.trim() })
      });

      setCurrentTaskResponse(response);
      // Add to history
      setVideoHistory(prev => [response, ...prev]);
      
      // Start polling for task creations to get the generated video
      if (response.task_id) {
        setIsPolling(true);
        pollTaskCreations(response.task_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate video from image');
    } finally {
      setIsGeneratingFromImage(false);
    }
  };
  /**
   * Poll task creations until video is ready
   */
  const pollTaskCreations = async (taskId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await viduApi.getTaskCreations(taskId);
        
        setTaskCreationsResponse(response);
        
        if (response.state === 'success' && response.creations && response.creations.length > 0) {
          // Video is ready
          clearInterval(pollInterval);
          setIsPolling(false);
        } else if (response.state === 'error' || response.err_code) {
          // Error occurred
          clearInterval(pollInterval);
          setIsPolling(false);
          setError(response.err_code || 'Video generation failed');
        }
        // If state is not success and no error, continue polling
      } catch (err) {
        // On error, stop polling and show error
        clearInterval(pollInterval);
        setIsPolling(false);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to check video status');
        }
      }
    }, 5000); // Poll every 5 seconds

    // Stop polling after 10 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      setIsPolling(false);
      if (!taskCreationsResponse?.creations?.length) {
        setError('Video generation timed out. Please try again.');
      }
    }, 600000);
  };

  /**
   * Get the first generated video from creations
   */
  const getGeneratedVideo = (): ViduTaskCreation | null => {
    if (taskCreationsResponse?.state === 'success' && taskCreationsResponse.creations?.length > 0) {
      return taskCreationsResponse.creations[0];
    }
    return null;
  };

  /**
   * Get current status for display
   */
  const getCurrentStatus = (): string => {
    if (isPolling) return 'processing';
    if (taskCreationsResponse?.state === 'success' && taskCreationsResponse.creations?.length > 0) {
      return 'completed';
    }
    if (taskCreationsResponse?.state === 'error' || taskCreationsResponse?.err_code) {
      return 'failed';
    }
    if (currentTaskResponse?.task_id) {
      return 'pending';
    }
    return 'idle';
  };

  const generatedVideo = getGeneratedVideo();
  const currentStatus = getCurrentStatus();

  /**
   * Handle retry action
   */
  const handleRetry = () => {
    setError(null);
    setTaskCreationsResponse(null);
    setCurrentTaskResponse(null);
    setIsPolling(false);
  };

  /**
   * Handle task ID lookup
   */
  const handleTaskLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskIdInput.trim() || isLookingUp) return;

    console.log(`🔍 Looking up task ID: ${taskIdInput.trim()}`);
    
    setIsLookingUp(true);
    setError(null);
    setCurrentTaskResponse(null);
    setTaskCreationsResponse(null);
    setIsPolling(false);

    try {
      const response = await viduApi.getTaskCreations(taskIdInput.trim());
      console.log('✅ Task creations response:', response);
      
      setTaskCreationsResponse(response);
      
      // Create a mock task response for display consistency
      const mockResponse = {
        task_id: taskIdInput.trim(),
        state: response.state,
        status: response.state === 'success' ? 'completed' : response.state === 'error' ? 'failed' : 'processing',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        prompt: response.payload || 'Retrieved from task ID',
        model: 'viduq1',
        style: 'general',
        duration: 5,
        aspect_ratio: '16:9',
        resolution: '1080p',
        movement_amplitude: 'auto'
      };
      
      setCurrentTaskResponse(mockResponse);
      // Add to history if not already present
      setVideoHistory(prev => {
        const exists = prev.some(video => video.task_id === taskIdInput.trim());
        if (!exists) {
          return [mockResponse, ...prev];
        }
        return prev;
      });
      
      // Clear the input after successful lookup
      setTaskIdInput('');
      
    } catch (err) {
      console.error('❌ Task lookup error:', err);
      
      // Provide more specific error messages based on the error type
      let errorMessage = 'Failed to retrieve video';
      
      if (err instanceof Error) {
        if (err.message.includes('404') || err.message.toLowerCase().includes('not found')) {
          errorMessage = `Task ID "${taskIdInput.trim()}" was not found. Please verify that:
• The task ID is correct and complete
• The video generation was successful
• The task ID belongs to your account
• The task hasn't expired (tasks may have a limited lifespan)`;
        } else if (err.message.toLowerCase().includes('unauthorized') || err.message.toLowerCase().includes('401')) {
          errorMessage = 'Authentication failed. Please check your API key configuration.';
        } else if (err.message.toLowerCase().includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLookingUp(false);
    }
  };
  /**
   * Handle video download
   */
  const handleDownload = () => {
    if (generatedVideo?.url) {
      const link = document.createElement('a');
      link.href = generatedVideo.url;
      link.download = `vidu-video-${generatedVideo.id}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <>
    <div className="max-w-4xl mx-auto">
      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-lg mb-8">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors duration-200 ${
              activeTab === 'generate'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Generate New Video
          </button>
          <button
            onClick={() => setActiveTab('image')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors duration-200 ${
              activeTab === 'image'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Generate from Image
          </button>
          <button
            onClick={() => setActiveTab('lookup')}
            className={`flex-1 py-4 px-6 text-center font-medium transition-colors duration-200 ${
              activeTab === 'lookup'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Lookup Existing Video
          </button>
        </div>
      </div>

      {/* Video Generation Form */}
      {activeTab === 'generate' && (
      <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
        <div className="flex items-center space-x-3 mb-6">
          <Video className="h-8 w-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-800">Generate Video</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
              Video Prompt
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the video you want to generate..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200"
              required
              disabled={isGenerating}
            />
            <p className="text-sm text-gray-500 mt-2">
              Be descriptive and specific for better results
            </p>
          </div>

          <button
            type="submit"
            disabled={!prompt.trim() || isGenerating}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
          >
            {isGenerating ? (
              <LoadingSpinner size="sm" message="" />
            ) : (
              <>
                <Send className="h-5 w-5" />
                <span>Generate Video</span>
              </>
            )}
          </button>
        </form>

        {/* Video Generation History Table */}
        {videoHistory.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Video Generation History</h3>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
                      Task ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
                      Prompt
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
                      Model
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
                      Created At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {videoHistory.map((video, index) => (
                    <tr key={video.task_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-800 font-mono">{video.task_id}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          video.status === 'completed' || video.state === 'success' ? 'bg-green-100 text-green-800' :
                          video.status === 'failed' || video.state === 'error' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {video.status || video.state || 'created'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800 max-w-xs truncate" title={video.prompt}>
                        {video.prompt}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">{video.model || 'viduq1'}</td>
                      <td className="px-4 py-3 text-sm text-gray-800">{video.duration || 5}s</td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {new Date(video.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Image-to-Video Generation Form */}
      {activeTab === 'image' && (
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <Image className="h-8 w-8 text-purple-600" />
            <h2 className="text-2xl font-bold text-gray-800">Generate Video from Image</h2>
          </div>

          <form onSubmit={handleImageSubmit} className="space-y-6">
            {/* Upload Method Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Image Source
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="url"
                    checked={uploadMethod === 'url'}
                    onChange={(e) => setUploadMethod(e.target.value as 'file' | 'url')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Image URL</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="file"
                    checked={uploadMethod === 'file'}
                    onChange={(e) => setUploadMethod(e.target.value as 'file' | 'url')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Upload File</span>
                </label>
              </div>
            </div>

            {/* Image Input */}
            {uploadMethod === 'url' ? (
              <div>
                <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  Image URL
                </label>
                <input
                  id="imageUrl"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  required
                  disabled={isGeneratingFromImage}
                />
              </div>
            ) : (
              <div>
                <label htmlFor="imageFile" className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Image
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    id="imageFile"
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                    disabled={isGeneratingFromImage}
                  />
                  <label
                    htmlFor="imageFile"
                    className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg border border-gray-300 transition-colors duration-200 flex items-center space-x-2"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Choose File</span>
                  </label>
                  {imageFile && (
                    <span className="text-sm text-gray-600">{imageFile.name}</span>
                  )}
                </div>
              </div>
            )}

            {/* Image Preview */}
            {((uploadMethod === 'url' && imageUrl) || (uploadMethod === 'file' && imageFile)) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image Preview
                </label>
                <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                  <img
                    src={uploadMethod === 'url' ? imageUrl : imageFile ? URL.createObjectURL(imageFile) : ''}
                    alt="Preview"
                    className="max-w-full h-48 object-contain mx-auto rounded"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            {/* Prompt Input */}
            <div>
              <label htmlFor="imagePrompt" className="block text-sm font-medium text-gray-700 mb-2">
                Video Prompt (Optional)
              </label>
              <textarea
                id="imagePrompt"
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Describe how you want the image to animate..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all duration-200"
                disabled={isGeneratingFromImage}
              />
              <p className="text-sm text-gray-500 mt-2">
                Optional: Describe the motion, camera movement, or animation you want to see
              </p>
            </div>

            {/* Model Selection */}
            <div>
              <label htmlFor="imageModel" className="block text-sm font-medium text-gray-700 mb-2">
                Model
              </label>
              <select
                id="imageModel"
                value={imageModel}
                onChange={(e) => {
                  const newModel = e.target.value as 'viduq1' | 'vidu2.0' | 'vidu1.5';
                  setImageModel(newModel);
                  // Update duration default based on model
                  setImageDuration(newModel === 'viduq1' ? 5 : 4);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                disabled={isGeneratingFromImage}
              >
                <option value="viduq1">viduq1</option>
                <option value="vidu2.0">vidu2.0</option>
                <option value="vidu1.5">vidu1.5</option>
              </select>
            </div>

            {/* Duration Selection */}
            <div>
              <label htmlFor="imageDuration" className="block text-sm font-medium text-gray-700 mb-2">
                Duration (seconds)
              </label>
              <select
                id="imageDuration"
                value={imageDuration}
                onChange={(e) => setImageDuration(parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                disabled={isGeneratingFromImage}
              >
                {imageModel === 'viduq1' ? (
                  <option value={5}>5 seconds</option>
                ) : (
                  <>
                    <option value={4}>4 seconds</option>
                    <option value={8}>8 seconds</option>
                  </>
                )}
              </select>
            </div>

            {/* Background Music Option */}
            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={imageBgm}
                  onChange={(e) => setImageBgm(e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  disabled={isGeneratingFromImage}
                />
                <span className="text-sm font-medium text-gray-700">
                  Add background music
                </span>
              </label>
              <p className="text-sm text-gray-500 mt-1 ml-7">
                Automatically add suitable background music to the generated video
              </p>
            </div>
            <button
              type="submit"
              disabled={isGeneratingFromImage || 
                       (uploadMethod === 'url' && !imageUrl.trim()) || 
                       (uploadMethod === 'file' && !imageFile)}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
            >
              {isGeneratingFromImage ? (
                <LoadingSpinner size="sm" message="" />
              ) : (
                <>
                  <Image className="h-5 w-5" />
                  <span>Generate Video from Image</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}
      {/* Task ID Lookup Form */}
      {activeTab === 'lookup' && (
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <Video className="h-8 w-8 text-green-600" />
            <h2 className="text-2xl font-bold text-gray-800">Lookup Video by Task ID</h2>
          </div>

          <form onSubmit={handleTaskLookup} className="space-y-6">
            <div>
              <label htmlFor="taskId" className="block text-sm font-medium text-gray-700 mb-2">
                Task ID
              </label>
              <input
                id="taskId"
                type="text"
                value={taskIdInput}
                onChange={(e) => setTaskIdInput(e.target.value)}
                placeholder="Enter the task ID from a previous generation..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                required
                disabled={isLookingUp}
              />
              <p className="text-sm text-gray-500 mt-2">
                Enter the task ID you received when generating a video
              </p>
            </div>

            <button
              type="submit"
              disabled={!taskIdInput.trim() || isLookingUp}
              className="w-full bg-gradient-to-r from-green-600 to-teal-600 text-white py-4 rounded-lg font-semibold hover:from-green-700 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
            >
              {isLookingUp ? (
                <LoadingSpinner size="sm" message="" />
              ) : (
                <>
                  <Video className="h-5 w-5" />
                  <span>Retrieve Video</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-8">
          <ErrorDisplay error={error} onRetry={handleRetry} />
        </div>
      )}

      {/* Video Status and Result */}
      {(currentTaskResponse || taskCreationsResponse) && (
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Video Generation Status</h3>
          
          <div className="flex items-center space-x-3 mb-6">
            <div className={`w-3 h-3 rounded-full ${
              currentStatus === 'completed' ? 'bg-green-500' :
              currentStatus === 'failed' ? 'bg-red-500' :
              'bg-yellow-500 animate-pulse'
            }`} />
            <span className="font-medium capitalize text-gray-700">
              {currentStatus}
            </span>
            {(currentStatus === 'processing' || currentStatus === 'pending') && (
              <LoadingSpinner size="sm" message="" />
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">Prompt:</p>
            <p className="text-gray-800">{currentTaskResponse?.prompt}</p>
          </div>

          {currentTaskResponse?.task_id && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-600 mb-2">Task ID:</p>
              <p className="text-blue-800 font-mono text-sm">{currentTaskResponse.task_id}</p>
            </div>
          )}

          {/* Show image if this was an image-to-video generation */}
          {currentTaskResponse?.images && currentTaskResponse.images.length > 0 && (
            <div className="bg-purple-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-purple-600 mb-2">Source Image:</p>
              <img
                src={currentTaskResponse.images[0]}
                alt="Source"
                className="max-w-xs h-32 object-contain rounded border"
              />
            </div>
          )}
          {taskCreationsResponse && taskCreationsResponse.state !== 'success' && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-600 mb-2">API Response:</p>
              <p className="text-blue-800 text-sm">State: {taskCreationsResponse.state}</p>
              {taskCreationsResponse.err_code && (
                <p className="text-red-600 text-sm">Error: {taskCreationsResponse.err_code}</p>
              )}
              <p className="text-blue-800 text-sm">Credits used: {taskCreationsResponse.credits}</p>
            </div>
          )}

          {(currentStatus === 'processing' || currentStatus === 'pending') && (
            <div className="text-center py-8">
              <LoadingSpinner size="lg" message="Generating your video..." />
              <p className="text-gray-600 mt-4">This may take a few minutes</p>
            </div>
          )}

          {currentStatus === 'completed' && generatedVideo?.url && (
            <div className="space-y-4">
              <video
                src={generatedVideo.url}
                controls
                className="w-full rounded-lg shadow-md"
                poster={generatedVideo.cover_url}
              >
                Your browser does not support the video tag.
              </video>
              
              {taskCreationsResponse && (
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600 mb-2">Generation Complete!</p>
                  <p className="text-green-800 text-sm">Credits used: {taskCreationsResponse.credits}</p>
                  <p className="text-green-800 text-sm">Video ID: {generatedVideo.id}</p>
                </div>
              )}
              
              <div className="flex justify-center">
                <button
                  onClick={handleDownload}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2"
                >
                  <Download className="h-5 w-5" />
                  <span>Download Video</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
      {/* Video Generation History Table */}
      {videoHistory.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-8 mt-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Video Generation History</h3>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
                    Task ID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
                    Prompt
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
                    Model
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200">
                    Created At
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {videoHistory.map((video, index) => (
                  <tr key={video.task_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                        video.images && video.images.length > 0 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {video.images && video.images.length > 0 ? (
                          <>
                            <Image className="h-3 w-3 mr-1" />
                            Image2Video
                          </>
                        ) : (
                          <>
                            <Video className="h-3 w-3 mr-1" />
                            Text2Video
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 font-mono">{video.task_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        video.status === 'completed' || video.state === 'success' ? 'bg-green-100 text-green-800' :
                        video.status === 'failed' || video.state === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {video.status || video.state || 'created'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800 max-w-xs truncate" title={video.prompt}>
                      {video.prompt}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">{video.model || 'viduq1'}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{video.duration || 5}s</td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      {new Date(video.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};