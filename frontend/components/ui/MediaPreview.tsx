import React, { useState } from 'react';
import Image from 'next/image';

interface MediaPreviewProps {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  thumbnailBase64?: string;
  alt: string;
  className?: string;
  showPlayButton?: boolean;
  onClick?: () => void;
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({
  type,
  url,
  thumbnailUrl,
  thumbnailBase64,
  alt,
  className = '',
  showPlayButton = true,
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const getImageSrc = () => {
    if (imageError) {
      return '/placeholder-image.png';
    }
    
    if (type === 'image') {
      return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    }
    
    // For videos, use thumbnail
    if (thumbnailBase64) {
      return thumbnailBase64;
    }
    
    if (thumbnailUrl) {
      return thumbnailUrl.startsWith('http') ? thumbnailUrl : `${API_BASE_URL}${thumbnailUrl}`;
    }
    
    return '/placeholder-video.png';
  };

  const handleImageError = () => {
    setImageError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className={`relative ${className}`} onClick={onClick}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 rounded-md">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
      
      <Image
        src={getImageSrc()}
        alt={alt}
        fill
        className={`object-cover rounded-md transition-opacity duration-200 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${onClick ? 'cursor-pointer hover:opacity-80' : ''}`}
        onError={handleImageError}
        onLoad={handleImageLoad}
      />
      
      {type === 'video' && showPlayButton && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-black bg-opacity-50 rounded-full p-3">
            <svg
              className="w-8 h-8 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </div>
        </div>
      )}
      
      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-md">
          <div className="text-gray-400 text-center">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">Failed to load {type}</p>
          </div>
        </div>
      )}
    </div>
  );
};