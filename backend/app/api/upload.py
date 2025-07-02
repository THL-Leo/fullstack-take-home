from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
import os
import uuid
from PIL import Image
import aiofiles
import cv2
import numpy as np
import ffmpeg
import subprocess
from typing import Literal, Optional

from app.models import ItemMetadata

router = APIRouter()

UPLOAD_DIR = "uploads"
ALLOWED_IMAGES = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
ALLOWED_VIDEOS = {
    "video/mp4", 
    "video/webm", 
    "video/quicktime",  # .mov files
    "video/x-msvideo",  # .avi files
    "video/mpeg",       # .mpeg files
    "application/mp4"   # Some browsers send mp4 as application/mp4
}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_VIDEO_SIZE = 50 * 1024 * 1024  # 50MB

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    file_type: Literal["image", "video"] = Form(...)
):
    """Upload a file and return file info"""
    
    print(f"Upload request - File: {file.filename}, Type: {file_type}, MIME: {file.content_type}")
    
    # Validate file type
    if file_type == "image" and file.content_type not in ALLOWED_IMAGES:
        print(f"Image validation failed. Got: {file.content_type}, Allowed: {ALLOWED_IMAGES}")
        raise HTTPException(status_code=400, detail=f"Invalid image format: {file.content_type}")
    
    if file_type == "video" and file.content_type not in ALLOWED_VIDEOS:
        print(f"Video validation failed. Got: {file.content_type}, Allowed: {ALLOWED_VIDEOS}")
        raise HTTPException(status_code=400, detail=f"Invalid video format: {file.content_type}")
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    # Validate file size
    if file_type == "image" and file_size > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Image too large (max 10MB)")
    
    if file_type == "video" and file_size > MAX_VIDEO_SIZE:
        raise HTTPException(status_code=400, detail="Video too large (max 50MB)")
    
    # Generate unique filename
    file_extension = file.filename.split(".")[-1] if file.filename else "bin"
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Save file
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)
    
    # Get metadata and generate thumbnail for videos
    metadata = await get_file_metadata(file_path, file_type, file_size, file.content_type)
    
    # Generate thumbnail for videos
    thumbnail_url = None
    if file_type == "video":
        thumbnail_url = await generate_video_thumbnail(file_path, unique_filename)
    
    return JSONResponse({
        "filename": unique_filename,
        "original_name": file.filename,
        "url": f"/uploads/{unique_filename}",
        "thumbnail_url": thumbnail_url,
        "metadata": metadata.dict()
    })

async def generate_video_thumbnail(video_path: str, original_filename: str) -> Optional[str]:
    """Generate thumbnail from video using FFmpeg (more reliable than OpenCV)"""
    try:
        print(f"Generating thumbnail for: {video_path}")
        
        # Create thumbnail filename
        name_without_ext = os.path.splitext(original_filename)[0]
        thumbnail_filename = f"{name_without_ext}_thumb.jpg"
        thumbnail_path = os.path.join(UPLOAD_DIR, thumbnail_filename)
        
        print(f"Thumbnail will be saved to: {thumbnail_path}")
        
        # Check if video file exists
        if not os.path.exists(video_path):
            print(f"Video file not found: {video_path}")
            return None
        
        try:
            # First, let's check video info
            probe = ffmpeg.probe(video_path)
            video_info = next(s for s in probe['streams'] if s['codec_type'] == 'video')
            duration = float(probe['format']['duration'])
            print(f"Video duration: {duration} seconds, resolution: {video_info['width']}x{video_info['height']}")
            
            # Adjust timestamp based on video length
            timestamp = min(3.0, duration * 0.1)  # Use 3 seconds or 10% of video, whichever is smaller
            print(f"Extracting frame at {timestamp} seconds")
            
            # Use FFmpeg to extract thumbnail
            (
                ffmpeg
                .input(video_path, ss=timestamp)
                .filter('scale', 300, -1)  # Scale to 300px width, maintain aspect ratio
                .output(thumbnail_path, vframes=1, format='image2', vcodec='mjpeg', loglevel='verbose')
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )
            
            # Check if thumbnail was created successfully
            if os.path.exists(thumbnail_path) and os.path.getsize(thumbnail_path) > 0:
                print(f"Thumbnail saved successfully with FFmpeg: {thumbnail_filename} (size: {os.path.getsize(thumbnail_path)} bytes)")
                return f"/uploads/{thumbnail_filename}"
            else:
                print("FFmpeg thumbnail creation failed or empty file")
                
        except Exception as e:
            print(f"FFmpeg failed: {e}")
            print(f"FFmpeg error details: {str(e)}")
            # Fallback to first frame if 3-second extraction fails
            try:
                print("Trying first frame extraction...")
                result = (
                    ffmpeg
                    .input(video_path, ss=0)  # Start at beginning
                    .filter('scale', 300, -1)
                    .output(thumbnail_path, vframes=1, format='image2', vcodec='mjpeg')
                    .overwrite_output()
                    .run(capture_stdout=True, capture_stderr=True)
                )
                print(f"FFmpeg stderr: {result[1].decode() if result[1] else 'No stderr'}")
                
                if os.path.exists(thumbnail_path) and os.path.getsize(thumbnail_path) > 0:
                    print(f"Thumbnail saved with first frame fallback: {thumbnail_filename}")
                    return f"/uploads/{thumbnail_filename}"
                else:
                    print(f"Fallback failed - file exists: {os.path.exists(thumbnail_path)}, size: {os.path.getsize(thumbnail_path) if os.path.exists(thumbnail_path) else 'N/A'}")
                    
            except Exception as fallback_e:
                print(f"Fallback also failed: {fallback_e}")
        
        # Final fallback to OpenCV if FFmpeg fails completely
        print("Trying OpenCV as final fallback...")
        return await generate_opencv_thumbnail(video_path, thumbnail_path, thumbnail_filename)
        
    except Exception as e:
        print(f"Failed to generate video thumbnail: {e}")
        import traceback
        traceback.print_exc()
        return None

async def generate_opencv_thumbnail(video_path: str, thumbnail_path: str, thumbnail_filename: str) -> Optional[str]:
    """Fallback OpenCV thumbnail generation"""
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return None
            
        # Try frame at 3 seconds
        fps = cap.get(cv2.CAP_PROP_FPS)
        if fps > 0:
            frame_at_3sec = int(fps * 3)
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_at_3sec)
        
        ret, frame = cap.read()
        cap.release()
        
        if ret and frame is not None:
            # Resize to 300px width
            height, width = frame.shape[:2]
            new_width = 300
            new_height = int(height * (300 / width))
            
            thumbnail = cv2.resize(frame, (new_width, new_height))
            success = cv2.imwrite(thumbnail_path, thumbnail)
            
            if success:
                print(f"OpenCV fallback thumbnail saved: {thumbnail_filename}")
                return f"/uploads/{thumbnail_filename}"
        
        return None
        
    except Exception as e:
        print(f"OpenCV fallback failed: {e}")
        return None

async def get_file_metadata(file_path: str, file_type: str, size: int, content_type: str) -> ItemMetadata:
    """Extract metadata from uploaded file"""
    
    metadata = ItemMetadata(
        size=size,
        format=content_type.split("/")[1]
    )
    
    if file_type == "image":
        try:
            with Image.open(file_path) as img:
                metadata.dimensions = {"width": img.width, "height": img.height}
        except Exception:
            pass
    elif file_type == "video":
        try:
            # Get video dimensions and duration
            cap = cv2.VideoCapture(file_path)
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = int(frame_count / fps) if fps > 0 else 0
            cap.release()
            
            metadata.dimensions = {"width": width, "height": height}
            metadata.duration = duration
        except Exception:
            pass
    
    return metadata