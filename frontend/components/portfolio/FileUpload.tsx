'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/api';
import { usePortfolioStore } from '@/store/portfolioStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface FileUploadProps {
  sectionId: string;
  onSuccess?: () => void;
}

interface UploadFormData {
  title: string;
  description: string;
}

export default function FileUpload({ sectionId, onSuccess }: FileUploadProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedData, setUploadedData] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [detectedFileType, setDetectedFileType] = useState<'image' | 'video' | null>(null);

  const { currentPortfolio, addItem } = usePortfolioStore();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<UploadFormData>();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

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
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
      'video/*': ['.mp4', '.webm', '.mov', '.avi', '.mpeg', '.mpg']
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024 // 50MB
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
        section_id: sectionId,
        order: 0
      };

      const newItem = await api.createPortfolioItem(currentPortfolio.id, itemData);
      
      addItem({
        ...newItem,
        id: newItem._id || newItem.id,
        originalName: newItem.original_name,
        sectionId: newItem.section_id,
        thumbnailUrl: uploadedData.thumbnail_url,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Reset form
      setUploadedFile(null);
      setUploadedData(null);
      setDetectedFileType(null);
      reset();
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Failed to create portfolio item:', error);
      alert('Failed to save item. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      {!uploadedFile ? (
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
                  Supports: Images (JPEG, PNG, WebP) up to 10MB, Videos (MP4, WebM) up to 50MB
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
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
                  onClick={() => {
                    setUploadedFile(null);
                    setUploadedData(null);
                    reset();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}