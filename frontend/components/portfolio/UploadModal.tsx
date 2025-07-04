'use client';

import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { api } from '@/lib/api';
import { usePortfolioStore } from '@/store/portfolioStore';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Section } from '@/types/portfolio';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface UploadFormData {
  title: string;
  description: string;
  sectionId: string;
  newSectionTitle: string;
}

// Supported formats (constants)
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/mpeg'];
const SUPPORTED_IMAGE_EXTENSIONS = ['.jpeg', '.jpg', '.png', '.webp'];
const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mpeg', '.mpg'];

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedData, setUploadedData] = useState<{filename: string; original_name: string; url: string; metadata: {size: number; dimensions?: {width: number; height: number}; duration?: number; format: string}; thumbnail_base64?: string} | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [detectedFileType, setDetectedFileType] = useState<'image' | 'video' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [isCreatingNewSection, setIsCreatingNewSection] = useState(false);

  const { currentPortfolio, addItem } = usePortfolioStore();
  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm<UploadFormData>();
  
  // const selectedSectionId = watch('sectionId');

  // Load sections when modal opens
  useEffect(() => {
    if (isOpen && currentPortfolio) {
      const loadSections = async () => {
        try {
          const sectionsData = await api.listSections(currentPortfolio.id);
          setSections(sectionsData as Section[]);
        } catch (error) {
          console.error('Failed to load sections:', error);
          setSections([]);
        }
      };
      loadSections();
    }
  }, [isOpen, currentPortfolio]);

  // Reset all states
  const resetUploadState = () => {
    setUploadedFile(null);
    setUploadedData(null);
    setDetectedFileType(null);
    setError(null);
    setIsSuccess(false);
    setUploadProgress(0);
    setIsUploading(false);
    setPreviewUrl(null);
    setIsCreatingNewSection(false);
    reset();
  };

  // Handle modal close
  const handleClose = () => {
    resetUploadState();
    onClose();
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

  // Create preview URL for images
  const createPreviewUrl = useCallback((file: File) => {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    return null;
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

    // Create preview URL for images
    const cleanupPreview = createPreviewUrl(file);

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
      if (cleanupPreview) cleanupPreview();
    } finally {
      setIsUploading(false);
    }
  }, [validateFileFormat, createPreviewUrl]);

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
      let sectionId = data.sectionId;

      // Create new section if needed
      if (data.sectionId === 'new' && data.newSectionTitle.trim()) {
        const newSection = await api.createSection(currentPortfolio.id, {
          title: data.newSectionTitle.trim(),
          order: sections.length
        });
        sectionId = newSection.id || newSection._id;
      }

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
        section_id: sectionId !== 'unsorted' ? sectionId : undefined,
        order: currentPortfolio.items.length
      };

      const newItem = await api.createPortfolioItem(currentPortfolio.id, itemData);
      
      addItem({
        ...newItem,
        id: newItem._id || newItem.id,
        originalName: newItem.original_name,
        thumbnailBase64: uploadedData.thumbnail_base64,
        sectionId: sectionId !== 'unsorted' ? sectionId : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Show success and close modal
      handleClose();
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Failed to create portfolio item:', error);
      setError('Failed to save item. Please try again.');
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Upload Media" 
      size="lg"
    >
      <div className="space-y-6">
        {/* Error Display */}
        {error && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-gray-300 rounded-full flex-shrink-0 mt-0.5"></div>
              <div>
                <h4 className="text-gray-900 font-medium text-sm">Upload Error</h4>
                <p className="text-gray-600 text-sm mt-1">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="text-gray-500 hover:text-gray-700 text-sm underline mt-2"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Display */}
        {isSuccess && uploadedData && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 bg-black rounded-full flex-shrink-0 mt-0.5"></div>
              <div>
                <h4 className="text-gray-900 font-medium text-sm">Upload Successful</h4>
                <p className="text-gray-600 text-sm mt-1">File uploaded successfully. Please fill in the details below.</p>
              </div>
            </div>
          </div>
        )}

        {/* Upload Area or Preview */}
        {!uploadedFile ? (
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-200
              ${isDragActive 
                ? 'border-gray-400 bg-gray-50' 
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                <div className="w-6 h-6 border-2 border-gray-400 rounded border-dashed"></div>
              </div>
              {isDragActive ? (
                <p className="text-gray-700 font-medium">Drop the file here</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-gray-700 font-medium">Drag & drop a file here, or click to select</p>
                  <p className="text-sm text-gray-500">
                    Supports: Images (JPEG, PNG, WebP) up to 10MB, Videos (MP4, WebM, MOV, AVI, MPEG) up to 50MB
                  </p>
                  <p className="text-xs text-gray-400">
                    Note: HEIC, GIF, and other formats are not supported
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Media Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Media Preview</h4>
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                {uploadedFile.type.startsWith('image/') ? (
                  previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center">
                      <div className="text-4xl mb-2">🖼️</div>
                      <p className="text-sm text-gray-600">Loading preview...</p>
                    </div>
                  )
                ) : (
                  <div className="text-center">
                    {uploadedData?.thumbnail_base64 ? (
                      <div className="relative">
                        <img
                          src={`data:image/jpeg;base64,${uploadedData.thumbnail_base64}`}
                          alt="Video thumbnail"
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-black bg-opacity-50 rounded-full p-3">
                            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-4xl mb-2">🎥</div>
                        <p className="text-sm text-gray-600">Video File</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* File Info */}
              <div className="mt-3 text-sm text-gray-600">
                <p className="font-medium">{uploadedFile.name}</p>
                <p>{(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                {uploadedData?.metadata.dimensions && (
                  <p>{uploadedData.metadata.dimensions.width} × {uploadedData.metadata.dimensions.height}</p>
                )}
                {uploadedData?.metadata.duration && (
                  <p>{uploadedData.metadata.duration} seconds</p>
                )}
              </div>
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 bg-gray-400 rounded-full animate-pulse flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 font-medium">Uploading... {uploadProgress}%</p>
                    <div className="mt-2 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gray-800 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
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
                    className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 placeholder:text-gray-400 transition-colors"
                    rows={3}
                    placeholder="Add a description (optional)"
                  />
                </div>

                {/* Section Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Section
                  </label>
                  <select
                    {...register('sectionId')}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 transition-colors"
                    onChange={(e) => {
                      setValue('sectionId', e.target.value);
                      setIsCreatingNewSection(e.target.value === 'new');
                    }}
                  >
                    <option value="unsorted">Unsorted</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.title}
                      </option>
                    ))}
                    <option value="new">+ Create New Section</option>
                  </select>
                </div>

                {/* New Section Input */}
                {isCreatingNewSection && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Section Title *
                    </label>
                    <Input
                      {...register('newSectionTitle', { 
                        required: isCreatingNewSection ? 'Section title is required' : false 
                      })}
                      error={errors.newSectionTitle?.message}
                      placeholder="Enter section name"
                    />
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={handleClose}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isUploading}>
                    {isUploading ? 'Uploading...' : 'Add to Portfolio'}
                  </Button>
                </div>
              </form>
            )}

            {/* Reset Button */}
            {!uploadedData && (
              <div className="flex justify-center">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={resetUploadState}
                >
                  Choose Different File
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}