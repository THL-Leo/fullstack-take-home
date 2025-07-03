'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/api';
import { usePortfolioStore } from '@/store/portfolioStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface FileUploadProps {
  onSuccess?: () => void;
}

interface UploadFormData {
  title: string;
  description: string;
}

// Supported formats (constants)
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mpeg'];
const SUPPORTED_IMAGE_EXTENSIONS = ['.jpeg', '.jpg', '.png', '.webp'];
const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mpeg', '.mpg'];

export default function FileUpload({ onSuccess }: FileUploadProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedData, setUploadedData] = useState<{filename: string; original_name: string; url: string; metadata: {size: number; dimensions?: {width: number; height: number}; duration?: number; format: string}; thumbnail_base64?: string} | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [detectedFileType, setDetectedFileType] = useState<'image' | 'video' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const { currentPortfolio, addItem } = usePortfolioStore();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<UploadFormData>();

  // Reset all states
  const resetUploadState = () => {
    setUploadedFile(null);
    setUploadedData(null);
    setDetectedFileType(null);
    setError(null);
    setIsSuccess(false);
    setUploadProgress(0);
    setIsUploading(false);
    reset();
  };

  // Validate file format client-side
  const validateFileFormat = useCallback((file: File): string | null => {
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    const mimeType = file.type.toLowerCase();
    
    // Check if it's a supported image
    if (mimeType.startsWith('image/')) {
      if (!SUPPORTED_IMAGE_TYPES.includes(mimeType) && !SUPPORTED_IMAGE_EXTENSIONS.includes(fileExtension)) {
        return `Unsupported image format. Supported formats: JPEG, PNG, WebP. You uploaded: ${file.name}`;
      }
      return null;
    }
    
    // Check if it's a supported video
    if (mimeType.startsWith('video/') || SUPPORTED_VIDEO_EXTENSIONS.includes(fileExtension)) {
      if (!SUPPORTED_VIDEO_TYPES.includes(mimeType) && !SUPPORTED_VIDEO_EXTENSIONS.includes(fileExtension)) {
        return `Unsupported video format. Supported formats: MP4, WebM, MOV, AVI, MPEG. You uploaded: ${file.name}`;
      }
      return null;
    }
    
    return `File type not supported. Please upload an image (JPEG, PNG, WebP) or video (MP4, WebM, MOV, AVI, MPEG). You uploaded: ${file.name}`;
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Reset any previous errors
    setError(null);
    setIsSuccess(false);

    // Validate file format client-side first
    const validationError = validateFileFormat(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploadedFile(file);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileType = file.type.startsWith('image/') ? 'image' : 'video';
      console.log('Uploading file:', file.name, 'Detected type:', fileType, 'MIME type:', file.type);
      setDetectedFileType(fileType);
      
      const result = await api.uploadFile(file, fileType);
      setUploadedData(result);
      setUploadProgress(100);
      setIsSuccess(true);
    } catch (error: unknown) {
      console.error('Upload failed:', error);
      
      // Extract error message from response
      let errorMessage = 'Upload failed. Please try again.';
      if (error && typeof error === 'object' && 'response' in error) {
        const responseError = error as { response?: { data?: { detail?: string } } };
        if (responseError.response?.data?.detail) {
          errorMessage = responseError.response.data.detail;
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        const messageError = error as { message: string };
        errorMessage = messageError.message;
      }
      
      setError(errorMessage);
      
      // Reset upload state on error
      setUploadedFile(null);
      setUploadedData(null);
      setDetectedFileType(null);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  }, [validateFileFormat]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'video/mp4': ['.mp4'],
      'video/webm': ['.webm'],
      'video/quicktime': ['.mov'],
      'video/x-msvideo': ['.avi'],
      'video/mpeg': ['.mpeg', '.mpg']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
    onDropRejected: (rejectedFiles) => {
      const file = rejectedFiles[0];
      if (file) {
        const errors = file.errors.map(e => e.message).join(', ');
        setError(`File rejected: ${errors}. File: ${file.file.name}`);
      }
    }
  });

  const onSubmit = async (data: UploadFormData) => {
    if (!uploadedData || !currentPortfolio) return;

    try {
      const fileType = detectedFileType || (uploadedFile?.type.startsWith('image/') ? 'image' : 'video');
      console.log('Creating portfolio item with type:', fileType);
      const itemData = {
        type: fileType,
        filename: uploadedData.filename,
        original_name: uploadedData.original_name,
        url: uploadedData.url,
        title: data.title,
        description: data.description,
        metadata: uploadedData.metadata,
        thumbnail_base64: uploadedData.thumbnail_base64,
        order: currentPortfolio.items.length
      };

      const newItem = await api.createPortfolioItem(currentPortfolio.id, itemData);
      
      addItem({
        ...newItem,
        id: newItem._id || newItem.id,
        originalName: newItem.original_name,
        thumbnailBase64: uploadedData.thumbnail_base64,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Reset form
      resetUploadState();
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Failed to create portfolio item:', error);
      alert('Failed to save item. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <div className="text-red-500 text-lg">⚠️</div>
            <div>
              <h4 className="text-red-800 font-medium text-sm">Upload Error</h4>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-600 hover:text-red-800 text-sm underline mt-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Display */}
      {isSuccess && uploadedData && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <div className="text-green-500 text-lg">✅</div>
            <div>
              <h4 className="text-green-800 font-medium text-sm">Upload Successful</h4>
              <p className="text-green-700 text-sm mt-1">File uploaded successfully. Please fill in the details below.</p>
            </div>
          </div>
        </div>
      )}

      {!uploadedFile && !error ? (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
          `}
        >
          <input {...getInputProps()} />
          <div className="space-y-2">
            <div className="text-3xl">📁</div>
            {isDragActive ? (
              <p className="text-blue-600">Drop the file here...</p>
            ) : (
              <div>
                <p className="text-gray-600">Drag & drop a file here, or click to select</p>
                <p className="text-sm text-gray-500 mt-1">
                  Supports: Images (JPEG, PNG, WebP) up to 10MB, Videos (MP4, WebM, MOV, AVI, MPEG) up to 50MB
                </p>
                <p className="text-xs text-red-500 mt-1">
                  ⚠️ HEIC, GIF, and other formats are not supported
                </p>
              </div>
            )}
          </div>
        </div>
      ) : uploadedFile ? (
        <div className="space-y-4">
          {/* File Preview */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">
                {uploadedFile.type.startsWith('image/') ? '🖼️' : '🎥'}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              {isUploading && (
                <div className="text-sm text-blue-600">
                  Uploading... {uploadProgress}%
                </div>
              )}
            </div>
            
            {isUploading && (
              <div className="mt-2">
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Metadata Form */}
          {uploadedData && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Title *"
                {...register('title', { required: 'Title is required' })}
                error={errors.title?.message}
                placeholder="Enter a title for this item"
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                  rows={3}
                  placeholder="Add a description (optional)"
                />
              </div>

              <div className="flex space-x-2">
                <Button type="submit">Add to Portfolio</Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={resetUploadState}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}