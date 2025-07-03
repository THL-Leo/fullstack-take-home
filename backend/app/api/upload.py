from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
import os
import uuid
import base64
from PIL import Image
import aiofiles
import ffmpeg
import subprocess
from typing import Literal, Optional, Tuple

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
    
    # Ensure upload directory exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    print(f"Ensured upload directory exists: {UPLOAD_DIR}")
    
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
    thumbnail_base64 = None
    if file_type == "video":
        thumbnail_base64 = await generate_video_thumbnail(file_path, unique_filename)
    
    return JSONResponse({
        "filename": unique_filename,
        "original_name": file.filename,
        "url": f"/uploads/{unique_filename}",
        "thumbnail_base64": thumbnail_base64,
        "metadata": metadata.dict()
    })

async def generate_video_thumbnail(video_path: str, original_filename: str) -> Optional[str]:
    """Generate thumbnail from video using FFmpeg and return base64 string"""
    try:
        print(f"🎥 Starting thumbnail generation for: {video_path}")
        
        # Check if video file exists
        if not os.path.exists(video_path):
            print(f"❌ Video file not found: {video_path}")
            return None
        
        # Get video duration to determine timestamp
        try:
            print(f"🔍 Probing video with FFmpeg...")
            probe = ffmpeg.probe(video_path)
            duration = float(probe['format']['duration'])
            timestamp = min(3.0, duration * 0.1)  # Use 3 seconds or 10% of video, whichever is smaller
            print(f"ℹ️ Video duration: {duration}s, extracting frame at {timestamp}s")
        except Exception as e:
            print(f"⚠️ Failed to probe video, using 3 second timestamp: {e}")
            timestamp = 3.0
        
        # Use FFmpeg to extract thumbnail directly to stdout as base64
        print(f"⚙️ Running FFmpeg thumbnail extraction...")
        try:
            result = (
                ffmpeg
                .input(video_path, ss=timestamp)
                .filter('scale', 300, -1)  # Scale to 300px width, maintain aspect ratio
                .output('pipe:', vframes=1, format='image2', vcodec='mjpeg')
                .run(capture_stdout=True, capture_stderr=True)
            )
            
            if result[0]:  # stdout contains the image data
                # Encode the image data to base64
                thumbnail_base64 = base64.b64encode(result[0]).decode('utf-8')
                print(f"✅ Successfully generated thumbnail with base64 data ({len(thumbnail_base64)} chars)")
                return thumbnail_base64
            else:
                print(f"❌ FFmpeg returned no image data")
                
        except Exception as e:
            print(f"FFmpeg failed: {e}")
            # Fallback to first frame
            try:
                print("Trying first frame extraction...")
                result = (
                    ffmpeg
                    .input(video_path, ss=0)  # Start at beginning
                    .filter('scale', 300, -1)
                    .output('pipe:', vframes=1, format='image2', vcodec='mjpeg')
                    .run(capture_stdout=True, capture_stderr=True)
                )
                
                if result[0]:
                    thumbnail_base64 = base64.b64encode(result[0]).decode('utf-8')
                    print(f"✅ Generated thumbnail with first frame fallback ({len(thumbnail_base64)} chars)")
                    return thumbnail_base64
                else:
                    print(f"❌ Fallback also returned no image data")
                    
            except Exception as fallback_e:
                print(f"Fallback also failed: {fallback_e}")
        
        print(f"❌ All FFmpeg thumbnail generation attempts failed for: {video_path}")
        return None
        
    except Exception as e:
        print(f"Failed to generate video thumbnail: {e}")
        import traceback
        traceback.print_exc()
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
            # Get video dimensions and duration using FFmpeg
            print(f"🔍 Extracting video metadata with FFmpeg for: {file_path}")
            probe = ffmpeg.probe(file_path)
            
            # Get video stream info
            video_streams = [stream for stream in probe['streams'] if stream['codec_type'] == 'video']
            if video_streams:
                video_stream = video_streams[0]
                width = int(video_stream['width'])
                height = int(video_stream['height'])
                
                # Get duration from format or stream
                duration = 0
                if 'duration' in probe['format']:
                    duration = int(float(probe['format']['duration']))
                elif 'duration' in video_stream:
                    duration = int(float(video_stream['duration']))
                
                metadata.dimensions = {"width": width, "height": height}
                metadata.duration = duration
                print(f"✅ Video metadata extracted - {width}x{height}, {duration}s")
            else:
                print(f"⚠️ No video streams found in file")
        except Exception as e:
            print(f"❌ Failed to extract video metadata: {e}")
            pass
    
    return metadata