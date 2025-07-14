/**
 * Node.js Express server for Vidu API proxy
 */
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import 'dotenv/config';

const app = express();
const PORT = 8000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Vidu API Proxy Server is running' });
});

// Generate video endpoint
app.post('/api/text2video', async (req, res) => {
  try {
    const apiKey = process.env.VITE_VIDU_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({
        error: 'API key not configured',
        message: 'VITE_VIDU_API_KEY environment variable is not set'
      });
    }

    const { 
      prompt, 
      model = 'viduq1', 
      duration = '5', 
      aspect_ratio = '16:9', 
      style = 'general',
      seed = '0',
      resolution = '1080p',
      movement_amplitude = 'auto'
    } = req.body;

    // Prepare request data
    const requestData = {
      prompt,
      model,
      duration,
      aspect_ratio,
      style,
      seed,
      resolution,
      movement_amplitude
    };
    

    // Make request to Vidu API
    const response = await axios.post(
      'https://api.vidu.com/ent/v2/text2video',
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${apiKey}`
        },
        timeout: 30000
      }
    );

    res.json(response.data);

  } catch (error) {
    console.error('Error generating video:', error.message);
    
    if (error.response) {
      // Vidu API error
      const errorData = error.response.data || {};
      return res.status(error.response.status).json({
        error: 'Vidu API Error',
        message: errorData.message || `HTTP ${error.response.status}: ${error.response.statusText}`,
        details: errorData
      });
    }
    
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({
        error: 'Request Timeout',
        message: 'The request to Vidu API timed out'
      });
    }
    
    res.status(500).json({
      error: 'Server Error',
      message: `An unexpected error occurred: ${error.message}`
    });
  }
});

// Generate video from image endpoint
app.post('/api/img2video', async (req, res) => {
  try {
    const apiKey = process.env.VITE_VIDU_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({
        error: 'API key not configured',
        message: 'VITE_VIDU_API_KEY environment variable is not set'
      });
    }

    const { 
      images,
      prompt, 
      model = 'viduq1',
      duration,
      seed,
      resolution,
      movement_amplitude = 'auto',
      bgm = false,
      payload,
      callback_url
    } = req.body;

    // Validate required fields
    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'images field is required and must be a non-empty array'
      });
    }

    if (images.length > 1) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Only 1 image is accepted'
      });
    }

    // Validate model
    const validModels = ['viduq1', 'vidu2.0', 'vidu1.5'];
    if (!validModels.includes(model)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Invalid model. Accepted values: ${validModels.join(', ')}`
      });
    }

    // Set default duration based on model
    let finalDuration = duration;
    if (!finalDuration) {
      finalDuration = model === 'viduq1' ? 5 : 4;
    }

    // Set default resolution based on model and duration
    let finalResolution = resolution;
    if (!finalResolution) {
      if (model === 'viduq1') {
        finalResolution = '1080p';
      } else if (finalDuration === 4) {
        finalResolution = '360p';
      } else if (finalDuration === 8) {
        finalResolution = '720p';
      }
    }
    // Prepare request data
    const requestData = {
      model,
      images,
      duration: finalDuration,
      movement_amplitude,
      bgm
    };
    
    // Add optional fields only if provided
    if (prompt) requestData.prompt = prompt;
    if (seed !== undefined) requestData.seed = seed;
    if (finalResolution) requestData.resolution = finalResolution;
    if (payload) requestData.payload = payload;
    if (callback_url) requestData.callback_url = callback_url;
    
    console.log('🖼️ Sending img2video request:', JSON.stringify(requestData, null, 2));

    // Make request to Vidu API
    const response = await axios.post(
      'https://api.vidu.com/ent/v2/img2video',
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${apiKey}`
        },
        timeout: 30000
      }
    );

    console.log('✅ Vidu img2video response:', JSON.stringify(response.data, null, 2));
    res.json(response.data);

  } catch (error) {
    console.error('❌ Error generating video from image:', error.message);
    
    if (error.response) {
      // Vidu API error
      const errorData = error.response.data || {};
      console.error('❌ Vidu API error details:', errorData);
      return res.status(error.response.status).json({
        error: 'Vidu API Error',
        message: errorData.message || `HTTP ${error.response.status}: ${error.response.statusText}`,
        details: errorData
      });
    }
    
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({
        error: 'Request Timeout',
        message: 'The request to Vidu API timed out'
      });
    }
    
    res.status(500).json({
      error: 'Server Error',
      message: `An unexpected error occurred: ${error.message}`
    });
  }
});
// Get video status endpoint
app.get('/api/videos/:videoId', async (req, res) => {
  try {
    const apiKey = process.env.VITE_VIDU_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({
        error: 'API key not configured',
        message: 'VITE_VIDU_API_KEY environment variable is not set'
      });
    }

    const { videoId } = req.params;

    // Make request to Vidu API
    const response = await axios.get(
      `https://api.vidu.com/ent/v2/videos/${videoId}`,
      {
        headers: {
          'Authorization': `Token ${apiKey}`
        },
        timeout: 30000
      }
    );

    res.json(response.data);

  } catch (error) {
    console.error('Error checking video status:', error.message);
    
    if (error.response) {
      // Vidu API error
      const errorData = error.response.data || {};
      return res.status(error.response.status).json({
        error: 'Vidu API Error',
        message: errorData.message || `HTTP ${error.response.status}: ${error.response.statusText}`,
        details: errorData
      });
    }
    
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({
        error: 'Request Timeout',
        message: 'The request to Vidu API timed out'
      });
    }
    
    res.status(500).json({
      error: 'Server Error',
      message: `An unexpected error occurred: ${error.message}`
    });
  }
});

// Get task creations endpoint
app.get('/api/tasks/:taskId/creations', async (req, res) => {
  try {
    const { taskId } = req.params;
    
    console.log(`🔍 Looking up task creations for ID: ${taskId}`);
    
    const apiKey = process.env.VITE_VIDU_API_KEY;
    
    if (!apiKey) {
      console.error('❌ API key not configured');
      return res.status(500).json({
        error: 'API key not configured',
        message: 'VITE_VIDU_API_KEY environment variable is not set'
      });
    }

    const apiUrl = `https://api.vidu.com/ent/v2/tasks/${taskId}/creations`;
    console.log(`📡 Making request to: ${apiUrl}`);

    // Make request to Vidu API
    const response = await axios.get(
      apiUrl,
      {
        headers: {
          'Authorization': `Token ${apiKey}`
        },
        timeout: 30000
      }
    );

    console.log(`✅ Vidu API response status: ${response.status}`);
    console.log(`📄 Response data:`, JSON.stringify(response.data, null, 2));
    
    res.json(response.data);

  } catch (error) {
    console.error('❌ Error getting task creations:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      taskId: req.params.taskId,
      url: `https://api.vidu.com/ent/v2/tasks/${req.params.taskId}/creations`
    });
    
    if (error.response) {
      // Vidu API error
      const errorData = error.response.data || {};
      return res.status(error.response.status).json({
        error: 'Vidu API Error',
        message: errorData.message || `HTTP ${error.response.status}: ${error.response.statusText}`,
        details: errorData,
        taskId: req.params.taskId
      });
    }
    
    if (error.code === 'ECONNABORTED') {
      return res.status(408).json({
        error: 'Request Timeout',
        message: 'The request to Vidu API timed out',
        taskId: req.params.taskId
      });
    }
    
    res.status(500).json({
      error: 'Server Error',
      message: `An unexpected error occurred: ${error.message}`,
      taskId: req.params.taskId
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Vidu API Proxy Server running on port ${PORT}`);
  console.log(`📖 Health check: http://localhost:${PORT}/health`);
});