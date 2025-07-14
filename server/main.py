"""
FastAPI server for Vidu API proxy
"""
import os
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="Vidu API Proxy", description="FastAPI proxy server for Vidu video generation")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response validation
class VideoRequest(BaseModel):
    prompt: str
    model: Optional[str] = "vidu-1"
    duration: Optional[int] = 4
    aspect_ratio: Optional[str] = "16:9"
    style: Optional[str] = None

class VideoResponse(BaseModel):
    id: str
    status: str
    video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    created_at: str
    updated_at: str
    prompt: str
    error_message: Optional[str] = None

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "OK", "message": "Vidu API Proxy Server is running"}

@app.post("/api/text2video", response_model=dict)
async def generate_video(request: VideoRequest):
    """
    Proxy endpoint for Vidu text2video API
    """
    try:
        api_key = os.getenv("VITE_VIDU_API_KEY")
        
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "API key not configured",
                    "message": "VITE_VIDU_API_KEY environment variable is not set"
                }
            )

        # Prepare request data
        request_data = {
            "prompt": request.prompt,
            "model": request.model,
            "duration": request.duration,
            "aspect_ratio": request.aspect_ratio
        }
        
        # Add style if provided
        if request.style:
            request_data["style"] = request.style

        # Make request to Vidu API
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.vidu.com/ent/v2/text2video",
                json=request_data,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}"
                },
                timeout=30.0
            )

        if response.status_code != 200:
            error_data = {}
            try:
                error_data = response.json()
            except:
                pass
            
            raise HTTPException(
                status_code=response.status_code,
                detail={
                    "error": "Vidu API Error",
                    "message": error_data.get("message", f"HTTP {response.status_code}: {response.reason_phrase}"),
                    "details": error_data
                }
            )

        return response.json()

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Network Error",
                "message": f"Failed to connect to Vidu API: {str(e)}"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Server Error",
                "message": f"An unexpected error occurred: {str(e)}"
            }
        )

@app.get("/api/videos/{video_id}", response_model=dict)
async def get_video_status(video_id: str):
    """
    Proxy endpoint for checking video status
    """
    try:
        api_key = os.getenv("VITE_VIDU_API_KEY")
        
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "API key not configured",
                    "message": "VITE_VIDU_API_KEY environment variable is not set"
                }
            )

        # Make request to Vidu API
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.vidu.com/ent/v2/videos/{video_id}",
                headers={
                    "Authorization": f"Bearer {api_key}"
                },
                timeout=30.0
            )

        if response.status_code != 200:
            error_data = {}
            try:
                error_data = response.json()
            except:
                pass
            
            raise HTTPException(
                status_code=response.status_code,
                detail={
                    "error": "Vidu API Error",
                    "message": error_data.get("message", f"HTTP {response.status_code}: {response.reason_phrase}"),
                    "details": error_data
                }
            )

        return response.json()

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Network Error",
                "message": f"Failed to connect to Vidu API: {str(e)}"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Server Error",
                "message": f"An unexpected error occurred: {str(e)}"
            }
        )

@app.get("/api/tasks/{task_id}/creations", response_model=dict)
async def get_task_creations(task_id: str):
    """
    Proxy endpoint for getting task creations from Vidu API
    """
    try:
        api_key = os.getenv("VITE_VIDU_API_KEY")
        
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "API key not configured",
                    "message": "VITE_VIDU_API_KEY environment variable is not set"
                }
            )

        # Make request to Vidu API
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.vidu.com/ent/v2/tasks/{task_id}/creations",
                headers={
                    "Authorization": f"Token {api_key}"
                },
                timeout=30.0
            )

        if response.status_code != 200:
            error_data = {}
            try:
                error_data = response.json()
            except:
                pass
            
            raise HTTPException(
                status_code=response.status_code,
                detail={
                    "error": "Vidu API Error",
                    "message": error_data.get("message", f"HTTP {response.status_code}: {response.reason_phrase}"),
                    "details": error_data
                }
            )

        return response.json()

    except httpx.RequestError as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Network Error",
                "message": f"Failed to connect to Vidu API: {str(e)}"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Server Error",
                "message": f"An unexpected error occurred: {str(e)}"
            }
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
</parameter>