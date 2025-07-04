import os
import shutil
from pathlib import Path
from typing import List, Optional
from ..models.portfolio import PortfolioItem


def cleanup_item_files(item: PortfolioItem, upload_dir: str = "uploads") -> None:
    """
    Clean up files associated with a portfolio item.
    
    Args:
        item: Portfolio item containing file information
        upload_dir: Directory where files are stored
    """
    files_to_remove = []
    
    # Add main file
    if item.filename:
        files_to_remove.append(os.path.join(upload_dir, item.filename))
    
    # Add thumbnail file if it exists
    if item.thumbnail_url and not item.thumbnail_url.startswith('data:'):
        # Extract filename from URL path
        thumbnail_filename = item.thumbnail_url.split('/')[-1]
        files_to_remove.append(os.path.join(upload_dir, thumbnail_filename))
    
    # Remove files
    for file_path in files_to_remove:
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f"Removed file: {file_path}")
        except Exception as e:
            print(f"Error removing file {file_path}: {e}")


def cleanup_portfolio_files(items: List[PortfolioItem], upload_dir: str = "uploads") -> None:
    """
    Clean up all files associated with a portfolio.
    
    Args:
        items: List of portfolio items
        upload_dir: Directory where files are stored
    """
    for item in items:
        cleanup_item_files(item, upload_dir)


def ensure_upload_directory(upload_dir: str = "uploads") -> None:
    """
    Ensure the upload directory exists.
    
    Args:
        upload_dir: Directory to create if it doesn't exist
    """
    Path(upload_dir).mkdir(parents=True, exist_ok=True)


def get_file_size(file_path: str) -> Optional[int]:
    """
    Get the size of a file in bytes.
    
    Args:
        file_path: Path to the file
        
    Returns:
        File size in bytes, or None if file doesn't exist
    """
    try:
        return os.path.getsize(file_path)
    except OSError:
        return None


def is_file_type_supported(filename: str, supported_types: List[str]) -> bool:
    """
    Check if a file type is supported based on its extension.
    
    Args:
        filename: Name of the file
        supported_types: List of supported file extensions (e.g., ['.jpg', '.png'])
        
    Returns:
        True if file type is supported, False otherwise
    """
    file_extension = Path(filename).suffix.lower()
    return file_extension in [ext.lower() for ext in supported_types]


def get_safe_filename(filename: str) -> str:
    """
    Generate a safe filename by removing or replacing potentially dangerous characters.
    
    Args:
        filename: Original filename
        
    Returns:
        Safe filename
    """
    # Remove directory traversal attempts
    filename = os.path.basename(filename)
    
    # Replace potentially dangerous characters
    unsafe_chars = ['<', '>', ':', '"', '|', '?', '*', '\\', '/']
    for char in unsafe_chars:
        filename = filename.replace(char, '_')
    
    # Ensure filename is not empty
    if not filename or filename == '.':
        filename = 'unnamed_file'
    
    return filename


def copy_file_safely(source: str, destination: str) -> bool:
    """
    Copy a file safely with error handling.
    
    Args:
        source: Source file path
        destination: Destination file path
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Ensure destination directory exists
        os.makedirs(os.path.dirname(destination), exist_ok=True)
        
        # Copy file
        shutil.copy2(source, destination)
        return True
    except Exception as e:
        print(f"Error copying file from {source} to {destination}: {e}")
        return False